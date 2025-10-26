/**
 * Stripe Service Client for Inventory Worker
 * 
 * Wrapper around the stripe-service worker via service binding
 * Handles product and price operations in Stripe
 */

import type { Env, Product } from '../types';

interface StripeServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Create Stripe product with price
 * 
 * @param env - Cloudflare environment with Stripe service binding
 * @param product - Product data from D1
 * @returns Object with stripe_product_id and stripe_price_id
 */
export async function createStripeProductWithPrice(
  env: Env,
  product: Partial<Product>
): Promise<{ stripeProductId: string; stripePriceId: string }> {
  try {
    console.log(`Creating Stripe product: ${product.name}`, {
      productId: product.id,
      price: product.price,
    });

    const response = await env.STRIPE_SERVICE.fetch(
      new Request('http://stripe-service/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          description: product.description || undefined,
          price: product.price,
          images: product.image_url ? [product.image_url] : undefined,
          category: product.category_id || undefined,
          brand: product.brand || undefined,
          part_number: product.part_number || undefined,
          shopify_product_id: product.shopify_product_id || undefined,
          shopify_variant_id: product.shopify_variant_id || undefined,
          product_id: product.id,
        }),
      })
    );

    const result = (await response.json()) as StripeServiceResponse;

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to create Stripe product');
    }

    console.log(
      `✅ Created Stripe product ${result.data.stripe_product_id} with price ${result.data.stripe_price_id}`
    );

    return {
      stripeProductId: result.data.stripe_product_id,
      stripePriceId: result.data.stripe_price_id,
    };
  } catch (error: any) {
    console.error('❌ Failed to create Stripe product:', error);
    throw new Error(`Stripe product creation failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Update Stripe product details
 * 
 * @param env - Cloudflare environment with Stripe service binding
 * @param product - Updated product data from D1
 */
export async function updateStripeProduct(
  env: Env,
  product: Partial<Product>
): Promise<void> {
  if (!product.stripe_product_id) {
    console.warn(`⚠️ No Stripe product ID for product ${product.id}, skipping update`);
    return;
  }

  try {
    console.log(`Updating Stripe product ${product.stripe_product_id}`);

    const response = await env.STRIPE_SERVICE.fetch(
      new Request('http://stripe-service/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripe_product_id: product.stripe_product_id,
          name: product.name,
          description: product.description || undefined,
          images: product.image_url ? [product.image_url] : undefined,
          category: product.category_id || undefined,
          brand: product.brand || undefined,
          part_number: product.part_number || undefined,
          shopify_product_id: product.shopify_product_id || undefined,
          shopify_variant_id: product.shopify_variant_id || undefined,
          product_id: product.id,
        }),
      })
    );

    const result = (await response.json()) as StripeServiceResponse;

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to update Stripe product');
    }

    console.log(`✅ Updated Stripe product ${product.stripe_product_id}`);
  } catch (error: any) {
    console.error('❌ Failed to update Stripe product:', error);
    throw new Error(`Stripe product update failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Replace Stripe price (prices are immutable)
 * 
 * @param env - Cloudflare environment with Stripe service binding
 * @param product - Product data with current price info
 * @param newPrice - New price in euros
 * @returns New Stripe price ID
 */
export async function replaceStripePrice(
  env: Env,
  product: Partial<Product>,
  newPrice: number
): Promise<string> {
  if (!product.stripe_product_id || !product.stripe_price_id) {
    throw new Error(
      `Product ${product.id} is missing stripe_product_id or stripe_price_id`
    );
  }

  try {
    console.log(`Replacing Stripe price for product ${product.id}`, {
      oldPriceId: product.stripe_price_id,
      newPrice,
    });

    const response = await env.STRIPE_SERVICE.fetch(
      new Request('http://stripe-service/products/price', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripe_product_id: product.stripe_product_id,
          stripe_price_id: product.stripe_price_id,
          new_price: newPrice,
          product_id: product.id,
        }),
      })
    );

    const result = (await response.json()) as StripeServiceResponse;

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to replace Stripe price');
    }

    console.log(`✅ Created new Stripe price ${result.data.new_price_id}`);

    return result.data.new_price_id;
  } catch (error: any) {
    console.error('❌ Failed to replace Stripe price:', error);
    throw new Error(`Stripe price replacement failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Archive Stripe product and price
 * 
 * @param env - Cloudflare environment with Stripe service binding
 * @param product - Product data with Stripe IDs
 */
export async function archiveStripeProduct(
  env: Env,
  product: Partial<Product>
): Promise<void> {
  if (!product.stripe_product_id) {
    console.warn(`⚠️ No Stripe product ID for product ${product.id}, skipping archive`);
    return;
  }

  try {
    console.log(`Archiving Stripe product ${product.stripe_product_id}`);

    const response = await env.STRIPE_SERVICE.fetch(
      new Request(`http://stripe-service/products/${product.stripe_product_id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_id: product.stripe_price_id || undefined,
        }),
      })
    );

    const result = (await response.json()) as StripeServiceResponse;

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to archive Stripe product');
    }

    console.log(`✅ Archived Stripe product ${product.stripe_product_id}`);
  } catch (error: any) {
    console.error('❌ Failed to archive Stripe product:', error);
    throw new Error(`Stripe product archive failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get Stripe price details
 * 
 * @param env - Cloudflare environment with Stripe service binding
 * @param priceId - Stripe price ID
 * @returns Stripe price data
 */
export async function getStripePrice(
  env: Env,
  priceId: string
): Promise<{ id: string; unit_amount: number; currency: string; active: boolean }> {
  try {
    const response = await env.STRIPE_SERVICE.fetch(
      new Request(`http://stripe-service/products/price/${priceId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = (await response.json()) as StripeServiceResponse;

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to get Stripe price');
    }

    return result.data;
  } catch (error: any) {
    console.error('❌ Failed to get Stripe price:', error);
    throw new Error(`Failed to get Stripe price: ${error.message || 'Unknown error'}`);
  }
}
