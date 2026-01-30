/**
 * Stripe Service Helpers
 *
 * Wrapper functions for calling the Stripe service via service binding.
 * Used by orchestration routes to manage Stripe products and prices.
 */

import type { Env } from '../types';
import { callService } from './service-calls';

// ============================================================================
// TYPES
// ============================================================================

export interface StripeServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface CreateStripeProductResponse {
  stripe_product_id: string;
  stripe_price_id: string;
}

export interface CreateStripeProductInput {
  product_id: string;
  name: string;
  description?: string;
  price: number;
  images?: string[];
  category?: string;
  brand?: string;
  part_number?: string;
  b2b_sku?: string; // Custom B2B SKU
}

export interface UpdateStripeProductInput {
  product_id: string;
  stripe_product_id: string;
  name: string;
  description?: string;
  images?: string[];
  category?: string;
  brand?: string;
  part_number?: string;
  b2b_sku?: string; // Custom B2B SKU
}

export interface ReplaceStripePriceInput {
  product_id: string;
  stripe_product_id: string;
  stripe_price_id: string;
  new_price: number;
}

export interface CreateInvoiceInput {
  customer_id: string;
  user_id: string;
  items: Array<{
    stripe_price_id: string;
    quantity: number;
    metadata: {
      product_id: string;
      product_name?: string;
      shopify_variant_id?: string;
    };
  }>;
  shipping_cost_cents?: number;
  notes?: string;
  shipping_address?: any;
  locale?: string;
}

export interface CreateInvoiceResponse {
  invoice_id: string;
  invoice_number: string;
  invoice_pdf: string;
  hosted_invoice_url: string;
  status: string;
  amount_due: number;
  currency: string;
  product_line_items: any[];
  shipping_line_item?: any;
}

// ============================================================================
// STRIPE SERVICE HELPERS
// ============================================================================

/**
 * Create Stripe product with price via stripe-service
 */
export async function createStripeProduct(
  env: Env,
  productData: CreateStripeProductInput
): Promise<CreateStripeProductResponse | null> {
  try {
    console.log(`[Stripe] Creating Stripe product: ${productData.name}`);

    const response = await callService<
      CreateStripeProductInput,
      StripeServiceResponse<CreateStripeProductResponse>
    >(env.STRIPE_SERVICE, env.SERVICE_SECRET, {
      path: '/products',
      method: 'POST',
      body: {
        product_id: productData.product_id,
        name: productData.name,
        description: productData.description,
        price: productData.price,
        images: productData.images,
        category: productData.category,
        brand: productData.brand,
        part_number: productData.part_number,
        b2b_sku: productData.b2b_sku,
      },
    });

    if (!response.data.success) {
      console.error('[Stripe] Product creation failed:', response.data.error);
      return null;
    }

    console.log(`[Stripe] ✅ Product created: ${response.data.data?.stripe_product_id}`);
    return response.data.data!;
  } catch (error: any) {
    console.error('[Stripe] ❌ Failed to create product:', error);
    return null;
  }
}

/**
 * Update Stripe product via stripe-service
 */
export async function updateStripeProduct(
  env: Env,
  productData: UpdateStripeProductInput
): Promise<boolean> {
  try {
    console.log(`[Stripe] Updating product: ${productData.stripe_product_id}`);

    const response = await callService<UpdateStripeProductInput, StripeServiceResponse>(
      env.STRIPE_SERVICE,
      env.SERVICE_SECRET,
      {
        path: '/products',
        method: 'PUT',
        body: {
          product_id: productData.product_id,
          stripe_product_id: productData.stripe_product_id,
          name: productData.name,
          description: productData.description,
          images: productData.images,
          category: productData.category,
          brand: productData.brand,
          part_number: productData.part_number,
          b2b_sku: productData.b2b_sku,
        },
      }
    );

    if (!response.data.success) {
      console.error('[Stripe] Product update failed:', response.data.error);
      return false;
    }

    console.log(`[Stripe] ✅ Product updated`);
    return true;
  } catch (error: any) {
    console.error('[Stripe] ❌ Failed to update product:', error);
    return false;
  }
}

/**
 * Replace Stripe price via stripe-service (prices are immutable in Stripe)
 */
export async function replaceStripePrice(
  env: Env,
  priceData: ReplaceStripePriceInput
): Promise<string | null> {
  try {
    console.log(`[Stripe] Replacing price: ${priceData.stripe_price_id}`);

    const response = await callService<
      ReplaceStripePriceInput,
      StripeServiceResponse<{ new_price_id: string }>
    >(env.STRIPE_SERVICE, env.SERVICE_SECRET, {
      path: '/products/price',
      method: 'PUT',
      body: priceData,
    });

    if (!response.data.success) {
      console.error('[Stripe] Price replacement failed:', response.data.error);
      return null;
    }

    console.log(`[Stripe] ✅ New price created: ${response.data.data?.new_price_id}`);
    return response.data.data!.new_price_id;
  } catch (error: any) {
    console.error('[Stripe] ❌ Failed to replace price:', error);
    return null;
  }
}

/**
 * Archive Stripe product via stripe-service
 */
export async function archiveStripeProduct(
  env: Env,
  stripeProductId: string,
  stripePriceId?: string
): Promise<boolean> {
  try {
    console.log(`[Stripe] Archiving product: ${stripeProductId}`);

    const response = await callService<{ price_id?: string }, StripeServiceResponse>(
      env.STRIPE_SERVICE,
      env.SERVICE_SECRET,
      {
        path: `/products/${stripeProductId}`,
        method: 'DELETE',
        body: { price_id: stripePriceId },
      }
    );

    if (!response.data.success) {
      console.error('[Stripe] Product archive failed:', response.data.error);
      return false;
    }

    console.log(`[Stripe] ✅ Product archived`);
    return true;
  } catch (error: any) {
    console.error('[Stripe] ❌ Failed to archive product:', error);
    return false;
  }
}

/**
 * Create Stripe invoice via stripe-service
 */
export async function createInvoice(
  env: Env,
  invoiceData: CreateInvoiceInput
): Promise<CreateInvoiceResponse | null> {
  try {
    console.log(`[Stripe] Creating invoice for customer: ${invoiceData.customer_id}`);

    const response = await callService<
      CreateInvoiceInput,
      StripeServiceResponse<CreateInvoiceResponse>
    >(env.STRIPE_SERVICE, env.SERVICE_SECRET, {
      path: '/invoices',
      method: 'POST',
      body: invoiceData,
    });

    if (!response.data.success || !response.data.data) {
      console.error('[Stripe] Invoice creation failed:', response.data.error);
      return null;
    }

    console.log(`[Stripe] ✅ Invoice created: ${response.data.data.invoice_id}`);
    return response.data.data;
  } catch (error: any) {
    console.error('[Stripe] ❌ Failed to create invoice:', error);
    return null;
  }
}
