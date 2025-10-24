/**
 * Stripe Service for Auth Worker
 * 
 * Manages Stripe customer lifecycle in sync with user auth operations
 */

import type { Env, User } from '../types';
import { createAuthError } from '../utils/errors';

/**
 * Stripe Customer Data Interface
 * Based on Stripe API v2024-06-20
 */
interface StripeCustomerData {
  email: string;
  name?: string; // Full name or business name (generic)
  individual_name?: string; // Individual's full name (up to 150 chars)
  business_name?: string; // Business name (up to 150 chars)
  description?: string;
  phone?: string;
  metadata?: Record<string, string>;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    postal_code?: string;
    country?: string; // ISO 3166-1 alpha-2 for tax features
    state?: string;
  };
  tax?: {
    ip_address?: string;
    validate_location?: 'deferred' | 'immediately'; // Validate tax location
  };
  tax_exempt?: 'none' | 'exempt' | 'reverse';
  tax_id_data?: Array<{
    type: string;
    value: string;
  }>;
  preferred_locales?: string[];
}

/**
 * Initialize Stripe with API key
 */
function getStripeClient(env: Env): any {
  if (!env.STRIPE_SECRET_KEY) {
    throw createAuthError('CONFIG_ERROR', 'Stripe secret key not configured');
  }

  // Using dynamic import pattern for Stripe (will be bundled by worker build)
  // Note: You need to install stripe package: npm install stripe
  // @ts-ignore - Dynamic require for Cloudflare Workers
  const Stripe = require('stripe');
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(), // Use fetch for Cloudflare Workers
  });
}

/**
 * Build Stripe customer data from user registration
 * Following Stripe API best practices for B2B customers
 */
function buildCustomerData(user: User, ipAddress?: string): StripeCustomerData {
  // Build individual name
  const individualName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  
  const customerData: StripeCustomerData = {
    email: user.email,
    // Use individual_name and business_name for clarity (Stripe best practice)
    individual_name: individualName || undefined,
    business_name: user.company_name || undefined,
    // Generic name field for backward compatibility
    name: user.company_name || individualName || undefined,
    description: `B2B Customer - ${user.company_name || 'Individual'}`,
    phone: user.phone || undefined,
    metadata: {
      userId: user.id,
      role: user.role,
      companyName: user.company_name || '',
      isVerified: user.is_verified ? 'true' : 'false',
      source: 'b2b_auth_service',
      createdAt: user.created_at,
    },
    // Set preferred locales based on country (optional enhancement)
    preferred_locales: user.address_country ? [user.address_country.toLowerCase()] : undefined,
  };

  // Add address if available (required for tax calculation)
  if (user.address_street || user.address_city || user.address_postal_code) {
    customerData.address = {
      line1: user.address_street || undefined,
      line2: user.address_house_number ? `Unit ${user.address_house_number}` : undefined,
      city: user.address_city || undefined,
      postal_code: user.address_postal_code || undefined,
      country: user.address_country || undefined, // ISO 3166-1 alpha-2 format
    };
  }

  // Handle BTW/VAT number properly
  if (user.btw_number) {
    // Ensure metadata exists
    if (!customerData.metadata) {
      customerData.metadata = {};
    }
    customerData.metadata.btwNumber = user.btw_number;
    
    // Detect EU VAT format and set tax_exempt
    const euVatPattern = /^[A-Z]{2}[A-Z0-9]+$/;
    if (euVatPattern.test(user.btw_number)) {
      // EU B2B reverse charge mechanism
      customerData.tax_exempt = 'reverse';
      
      // Add as tax_id_data for Stripe Tax
      // Extract country code (first 2 chars) and map to Stripe tax ID type
      const countryCode = user.btw_number.substring(0, 2).toLowerCase();
      const taxIdType = countryCode === 'nl' ? 'eu_vat' : 'eu_vat'; // All EU VATs use eu_vat
      
      customerData.tax_id_data = [
        {
          type: taxIdType,
          value: user.btw_number,
        },
      ];
    }
  }

  // Add tax configuration with IP for automatic tax calculation
  if (ipAddress || user.address_country) {
    customerData.tax = {
      ip_address: ipAddress,
      // Validate immediately if we have address (recommended for tax calculation)
      validate_location: (user.address_country && user.address_postal_code) ? 'immediately' : 'deferred',
    };
  }

  return customerData;
}

/**
 * Create a Stripe customer when user registers
 */
export async function createStripeCustomer(
  env: Env,
  user: User,
  ipAddress?: string
): Promise<string> {

  try {
    const stripe = getStripeClient(env);
    const customerData = buildCustomerData(user, ipAddress);

    console.log(`Creating Stripe customer for user ${user.id} (${user.email})`);
    
    const customer = await stripe.customers.create(customerData);

    console.log(`✅ Created Stripe customer ${customer.id} for user ${user.id}`);
    
    return customer.id;
  } catch (error: any) {
    console.error('❌ Failed to create Stripe customer:', error);
    
    // Throw error to block the operation
    throw new Error(`Stripe customer creation failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Update Stripe customer when user data changes
 */
export async function updateStripeCustomer(
  env: Env,
  stripeCustomerId: string,
  user: User,
  ipAddress?: string
): Promise<void> {
  if (!env.STRIPE_SECRET_KEY) {
    console.warn('⚠️ Stripe not configured, skipping customer update');
    return;
  }

  if (!stripeCustomerId) {
    console.warn(`⚠️ No Stripe customer ID for user ${user.id}, skipping update`);
    return;
  }

  try {
    const stripe = getStripeClient(env);
    const customerData = buildCustomerData(user, ipAddress);

    console.log(`Updating Stripe customer ${stripeCustomerId} for user ${user.id}`);
    
    await stripe.customers.update(stripeCustomerId, customerData);

    console.log(`✅ Updated Stripe customer ${stripeCustomerId}`);
  } catch (error: any) {
    console.error('❌ Failed to update Stripe customer:', error);
    
    // Throw error to block the update operation
    throw new Error(`Stripe customer update failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Archive/soft-delete Stripe customer when user is deleted
 * 
 * We don't actually delete the customer to preserve transaction history
 */
export async function archiveStripeCustomer(
  env: Env,
  stripeCustomerId: string,
  userId: string,
  reason?: string
): Promise<void> {
  if (!env.STRIPE_SECRET_KEY) {
    console.warn('⚠️ Stripe not configured, skipping customer archive');
    return;
  }

  if (!stripeCustomerId) {
    console.warn(`⚠️ No Stripe customer ID for user ${userId}, skipping archive`);
    return;
  }

  try {
    const stripe = getStripeClient(env);

    console.log(`Archiving Stripe customer ${stripeCustomerId} for user ${userId}`);
    
    // Update metadata to mark as deleted
    await stripe.customers.update(stripeCustomerId, {
      metadata: {
        deleted: 'true',
        deletedAt: new Date().toISOString(),
        deletedBy: 'auth_service',
        deletionReason: reason || 'user_account_deleted',
      },
      // Optionally remove PII (uncomment if needed)
      // name: '[DELETED]',
      // phone: null,
      // address: null,
    });

    console.log(`✅ Archived Stripe customer ${stripeCustomerId}`);
  } catch (error: any) {
    console.error('❌ Failed to archive Stripe customer:', error);
    
    // Throw error to block the delete operation
    throw new Error(`Stripe customer archive failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get or create Stripe customer
 * Useful for migrating existing users without Stripe customer IDs
 */
export async function getOrCreateStripeCustomer(
  env: Env,
  user: User,
  ipAddress?: string
): Promise<string> {
  try {
    if (!env.STRIPE_SECRET_KEY) {
      return '';
    }

    const stripe = getStripeClient(env);

    // Search for existing customer by email
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      const existingCustomer = existingCustomers.data[0];
      console.log(`✅ Found existing Stripe customer ${existingCustomer.id} for ${user.email}`);
      
      // Update metadata to link with userId
      await stripe.customers.update(existingCustomer.id, {
        metadata: {
          userId: user.id,
          source: 'b2b_auth_service',
        },
      });
      
      return existingCustomer.id;
    }

    // Create new customer if not found
    return await createStripeCustomer(env, user, ipAddress);
  } catch (error: any) {
    console.error('❌ Failed to get or create Stripe customer:', error);
    return '';
  }
}
