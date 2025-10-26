/**
 * Stripe Service Client for Auth Worker
 * 
 * Wrapper around the stripe-service worker via service binding
 * Manages Stripe customer lifecycle in sync with user auth operations
 */

import type { Env, User } from '../types';

/**
 * Create a Stripe customer when user registers
 * 
 * Calls stripe-service worker via service binding
 */
export async function createStripeCustomer(
  env: Env,
  user: User,
  ipAddress?: string
): Promise<string> {
  try {
    console.log(`Creating Stripe customer for user ${user.id} (${user.email})`);

    const response = await env.STRIPE_SERVICE.fetch(
      new Request('http://stripe-service/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          company_name: user.company_name,
          phone: user.phone,
          btw_number: user.btw_number,
          address_street: user.address_street,
          address_house_number: user.address_house_number,
          address_city: user.address_city,
          address_postal_code: user.address_postal_code,
          address_country: user.address_country,
          user_id: user.id,
          role: user.role,
          is_verified: user.is_verified === 1,
          ip_address: ipAddress,
        }),
      })
    );

    const result = await response.json() as any;

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to create Stripe customer');
    }

    console.log(`✅ Created Stripe customer ${result.data.customer_id} for user ${user.id}`);

    return result.data.customer_id;
  } catch (error: any) {
    console.error('❌ Failed to create Stripe customer:', error);
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
  if (!stripeCustomerId) {
    console.warn(`⚠️ No Stripe customer ID for user ${user.id}, skipping update`);
    return;
  }

  try {
    console.log(`Updating Stripe customer ${stripeCustomerId} for user ${user.id}`);

    const response = await env.STRIPE_SERVICE.fetch(
      new Request('http://stripe-service/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripe_customer_id: stripeCustomerId,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          company_name: user.company_name,
          phone: user.phone,
          btw_number: user.btw_number,
          address_street: user.address_street,
          address_house_number: user.address_house_number,
          address_city: user.address_city,
          address_postal_code: user.address_postal_code,
          address_country: user.address_country,
          user_id: user.id,
          role: user.role,
          is_verified: user.is_verified === 1,
          ip_address: ipAddress,
        }),
      })
    );

    const result = await response.json() as any;

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to update Stripe customer');
    }

    console.log(`✅ Updated Stripe customer ${stripeCustomerId}`);
  } catch (error: any) {
    console.error('❌ Failed to update Stripe customer:', error);
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
  if (!stripeCustomerId) {
    console.warn(`⚠️ No Stripe customer ID for user ${userId}, skipping archive`);
    return;
  }

  try {
    console.log(`Archiving Stripe customer ${stripeCustomerId} for user ${userId}`);

    const response = await env.STRIPE_SERVICE.fetch(
      new Request(`http://stripe-service/customers/${stripeCustomerId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          reason: reason || 'user_account_deleted',
        }),
      })
    );

    const result = await response.json() as any;

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to archive Stripe customer');
    }

    console.log(`✅ Archived Stripe customer ${stripeCustomerId}`);
  } catch (error: any) {
    console.error('❌ Failed to archive Stripe customer:', error);
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
    console.log(`Getting or creating Stripe customer for ${user.email}`);

    const response = await env.STRIPE_SERVICE.fetch(
      new Request('http://stripe-service/customers/get-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          company_name: user.company_name,
          phone: user.phone,
          btw_number: user.btw_number,
          address_street: user.address_street,
          address_house_number: user.address_house_number,
          address_city: user.address_city,
          address_postal_code: user.address_postal_code,
          address_country: user.address_country,
          user_id: user.id,
          role: user.role,
          is_verified: user.is_verified === 1,
          ip_address: ipAddress,
        }),
      })
    );

    const result = await response.json() as any;

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to get or create Stripe customer');
    }

    console.log(`✅ Stripe customer ${result.data.customer_id} for ${user.email}`);

    return result.data.customer_id;
  } catch (error: any) {
    console.error('❌ Failed to get or create Stripe customer:', error);
    return '';
  }
}
