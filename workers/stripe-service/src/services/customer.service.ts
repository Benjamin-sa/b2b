/**
 * Stripe Customer Service
 * 
 * Handles all Stripe customer operations:
 * - Create customer with full B2B details
 * - Update customer information
 * - Archive/soft-delete customer
 * - Get or create customer (for migrations)
 * 
 * Maintains compatibility with Firebase Functions implementation
 */

import type Stripe from 'stripe';
import type { Env, CustomerInput, CustomerUpdateInput } from '../types';
import { getStripeClient, handleStripeError, validateRequired } from '../utils/stripe.utils';

/**
 * Build Stripe customer data from input
 * Following Stripe API best practices for B2B customers
 */
function buildCustomerData(input: CustomerInput): Stripe.CustomerCreateParams {
  // Build individual name
  const individualName = `${input.first_name || ''} ${input.last_name || ''}`.trim();
  
  const customerData: Stripe.CustomerCreateParams = {
    email: input.email,
    name: input.company_name || individualName || undefined,
    description: `B2B Customer - ${input.company_name || 'Individual'}`,
    phone: input.phone || undefined,
    metadata: {
      userId: input.user_id || '',
      role: input.role || 'customer',
      companyName: input.company_name || '',
      isVerified: input.is_verified ? 'true' : 'false',
      source: 'b2b_stripe_service',
      createdAt: new Date().toISOString(),
    },
    preferred_locales: input.address_country 
      ? [input.address_country.toLowerCase()] 
      : undefined,
  };

  // Add address if available (required for automatic tax calculation)
  if (input.address_street || input.address_city || input.address_postal_code) {
    customerData.address = {
      line1: input.address_street || undefined,
      line2: input.address_house_number 
        ? `Unit ${input.address_house_number}` 
        : undefined,
      city: input.address_city || undefined,
      postal_code: input.address_postal_code || undefined,
      country: input.address_country || undefined, // ISO 3166-1 alpha-2
    };
  }

  // Handle BTW/VAT number with EU reverse charge mechanism
  if (input.btw_number) {
    if (!customerData.metadata) {
      customerData.metadata = {};
    }
    customerData.metadata.btwNumber = input.btw_number;
    
    // Detect EU VAT format
    const euVatPattern = /^[A-Z]{2}[A-Z0-9]+$/;
    if (euVatPattern.test(input.btw_number)) {
      // EU B2B reverse charge mechanism
      customerData.tax_exempt = 'reverse';
      
      // Add as tax_id_data for Stripe Tax
      customerData.tax_id_data = [
        {
          type: 'eu_vat',
          value: input.btw_number,
        },
      ];
    }
  }

  // Add tax configuration with IP for automatic tax calculation
  if (input.ip_address || input.address_country) {
    customerData.tax = {
      ip_address: input.ip_address,
      // Validate immediately if we have complete address
      validate_location: (input.address_country && input.address_postal_code) 
        ? 'immediately' 
        : 'deferred',
    };
  }

  return customerData;
}

/**
 * Create a Stripe customer
 * 
 * @param env - Cloudflare environment with Stripe key
 * @param input - Customer data from registration
 * @returns Stripe customer ID
 */
export async function createCustomer(
  env: Env,
  input: CustomerInput
): Promise<string> {
  try {
    // Validate required fields
    validateRequired(input, ['email']);

    const stripe = getStripeClient(env);
    const customerData = buildCustomerData(input);

    console.log(`Creating Stripe customer for ${input.email}`, {
      userId: input.user_id,
      companyName: input.company_name,
    });

    const customer = await stripe.customers.create(customerData);

    console.log(`✅ Created Stripe customer ${customer.id} for user ${input.user_id}`);

    return customer.id;
  } catch (error: any) {
    return handleStripeError(error, 'create customer');
  }
}

/**
 * Update an existing Stripe customer
 * 
 * @param env - Cloudflare environment with Stripe key
 * @param input - Updated customer data with stripe_customer_id
 */
export async function updateCustomer(
  env: Env,
  input: CustomerUpdateInput
): Promise<void> {
  try {
    // Validate required fields
    validateRequired(input, ['stripe_customer_id', 'email']);

    const stripe = getStripeClient(env);
    const customerData = buildCustomerData(input as CustomerInput);

    console.log(`Updating Stripe customer ${input.stripe_customer_id}`);

    await stripe.customers.update(input.stripe_customer_id, customerData);

    console.log(`✅ Updated Stripe customer ${input.stripe_customer_id}`);
  } catch (error: any) {
    return handleStripeError(error, 'update customer');
  }
}

/**
 * Archive/soft-delete a Stripe customer
 * 
 * We don't actually delete to preserve transaction history
 * 
 * @param env - Cloudflare environment with Stripe key
 * @param stripeCustomerId - Stripe customer ID to archive
 * @param userId - Our internal user ID
 * @param reason - Reason for archiving
 */
export async function archiveCustomer(
  env: Env,
  stripeCustomerId: string,
  userId: string,
  reason?: string
): Promise<void> {
  try {
    // Validate required fields
    if (!stripeCustomerId) {
      throw new Error('stripe_customer_id is required');
    }

    const stripe = getStripeClient(env);

    console.log(`Archiving Stripe customer ${stripeCustomerId} for user ${userId}`);

    // Update metadata to mark as deleted
    await stripe.customers.update(stripeCustomerId, {
      metadata: {
        deleted: 'true',
        deletedAt: new Date().toISOString(),
        deletedBy: 'stripe_service',
        deletionReason: reason || 'user_account_deleted',
        originalUserId: userId,
      },
    });

    console.log(`✅ Archived Stripe customer ${stripeCustomerId}`);
  } catch (error: any) {
    return handleStripeError(error, 'archive customer');
  }
}

/**
 * Get or create Stripe customer
 * Useful for migrating existing users without Stripe customer IDs
 * 
 * @param env - Cloudflare environment with Stripe key
 * @param input - Customer data
 * @returns Stripe customer ID (existing or newly created)
 */
export async function getOrCreateCustomer(
  env: Env,
  input: CustomerInput
): Promise<string> {
  try {
    // Validate required fields
    validateRequired(input, ['email']);

    const stripe = getStripeClient(env);

    // Search for existing customer by email
    const existingCustomers = await stripe.customers.list({
      email: input.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      const existingCustomer = existingCustomers.data[0];
      console.log(`✅ Found existing Stripe customer ${existingCustomer.id} for ${input.email}`);

      // Update metadata to link with userId if provided
      if (input.user_id) {
        await stripe.customers.update(existingCustomer.id, {
          metadata: {
            ...existingCustomer.metadata,
            userId: input.user_id,
            source: 'b2b_stripe_service',
          },
        });
      }

      return existingCustomer.id;
    }

    // Create new customer if not found
    return await createCustomer(env, input);
  } catch (error: any) {
    return handleStripeError(error, 'get or create customer');
  }
}
