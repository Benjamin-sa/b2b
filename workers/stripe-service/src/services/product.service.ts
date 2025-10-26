/**
 * Stripe Product Service
 * 
 * Handles all Stripe product and pricing operations:
 * - Create product with price
 * - Update product details
 * - Replace price (Stripe prices are immutable)
 * - Archive product and price
 * 
 * Maintains exact compatibility with Firebase Functions implementation
 * including tax codes, metadata structure, and error handling
 */

import type Stripe from 'stripe';
import type { 
  Env, 
  ProductInput, 
  ProductUpdateInput, 
  PriceUpdateInput,
  CreateProductResponse 
} from '../types';
import { getStripeClient, handleStripeError, validateRequired } from '../utils/stripe.utils';

/**
 * Create Stripe product with initial price
 * 
 * Tax code: txcd_99999999 (General - Tangible Goods)
 * Tax behavior: exclusive (tax added on top of price)
 * 
 * @param env - Cloudflare environment with Stripe key
 * @param input - Product data
 * @returns Object with stripe_product_id and stripe_price_id
 */
export async function createProductWithPrice(
  env: Env,
  input: ProductInput
): Promise<CreateProductResponse> {
  try {
    // Validate required fields
    validateRequired(input, ['name', 'price', 'product_id']);

    const stripe = getStripeClient(env);

    console.log(`Creating Stripe product: ${input.name}`, {
      productId: input.product_id,
      price: input.price,
    });

    // Create product
    const stripeProduct = await stripe.products.create({
      name: input.name,
      description: input.description || undefined,
      images: (input.images && input.images.length > 0) 
        ? [input.images[0]] // Stripe uses first image as primary
        : undefined,
      tax_code: 'txcd_99999999', // General - Tangible Goods
      metadata: {
        firebaseId: input.product_id, // For backward compatibility
        productId: input.product_id,
        category: input.category || '',
        brand: input.brand || '',
        partNumber: input.part_number || '',
        shopifyProductId: input.shopify_product_id || '',
        shopifyVariantId: input.shopify_variant_id || '',
      },
    });

    console.log(`✅ Created Stripe product ${stripeProduct.id}`);

    // Create price (convert euros to cents)
    const priceInCents = Math.round(input.price * 100);
    
    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: priceInCents,
      currency: 'eur',
      tax_behavior: 'exclusive', // Tax added on top
      metadata: {
        firebaseId: input.product_id, // For backward compatibility
        productId: input.product_id,
      },
    });

    console.log(`✅ Created Stripe price ${stripePrice.id} (€${input.price})`);

    return {
      stripe_product_id: stripeProduct.id,
      stripe_price_id: stripePrice.id,
    };
  } catch (error: any) {
    return handleStripeError(error, 'create product with price');
  }
}

/**
 * Update Stripe product details
 * 
 * Note: Prices are NOT updated here - use replacePrice() for price changes
 * 
 * @param env - Cloudflare environment with Stripe key
 * @param input - Updated product data with stripe_product_id
 */
export async function updateProduct(
  env: Env,
  input: ProductUpdateInput
): Promise<void> {
  try {
    // Validate required fields
    validateRequired(input, ['stripe_product_id', 'name', 'product_id']);

    const stripe = getStripeClient(env);

    console.log(`Updating Stripe product ${input.stripe_product_id}`);

    await stripe.products.update(input.stripe_product_id, {
      name: input.name,
      description: input.description || undefined,
      images: (input.images && input.images.length > 0) 
        ? [input.images[0]] 
        : undefined,
      tax_code: 'txcd_99999999',
      metadata: {
        firebaseId: input.product_id,
        productId: input.product_id,
        category: input.category || '',
        brand: input.brand || '',
        partNumber: input.part_number || '',
        shopifyProductId: input.shopify_product_id || '',
        shopifyVariantId: input.shopify_variant_id || '',
      },
    });

    console.log(`✅ Updated Stripe product ${input.stripe_product_id}`);
  } catch (error: any) {
    return handleStripeError(error, 'update product');
  }
}

/**
 * Replace Stripe price (prices are immutable in Stripe)
 * 
 * Process:
 * 1. Deactivate old price
 * 2. Create new price with updated amount
 * 3. Return new price ID
 * 
 * @param env - Cloudflare environment with Stripe key
 * @param input - Price update data
 * @returns New Stripe price ID
 */
export async function replacePrice(
  env: Env,
  input: PriceUpdateInput
): Promise<string> {
  try {
    // Validate required fields
    validateRequired(input, [
      'stripe_product_id', 
      'stripe_price_id', 
      'new_price', 
      'product_id'
    ]);

    const stripe = getStripeClient(env);
    const newPriceInCents = Math.round(input.new_price * 100);

    console.log(`Replacing Stripe price ${input.stripe_price_id}`, {
      oldPriceId: input.stripe_price_id,
      newPrice: input.new_price,
    });

    // Deactivate old price
    await stripe.prices.update(input.stripe_price_id, {
      active: false,
    });

    console.log(`✅ Deactivated old price ${input.stripe_price_id}`);

    // Create new price
    const newPrice = await stripe.prices.create({
      product: input.stripe_product_id,
      unit_amount: newPriceInCents,
      currency: 'eur',
      tax_behavior: 'exclusive',
      metadata: {
        firebaseId: input.product_id,
        productId: input.product_id,
        replacedPriceId: input.stripe_price_id, // Track price history
      },
    });

    console.log(`✅ Created new price ${newPrice.id} (€${input.new_price})`);

    return newPrice.id;
  } catch (error: any) {
    return handleStripeError(error, 'replace price');
  }
}

/**
 * Archive Stripe product and price
 * 
 * Sets both product and price to inactive (soft delete)
 * Preserves data for historical orders
 * 
 * @param env - Cloudflare environment with Stripe key
 * @param stripeProductId - Stripe product ID
 * @param stripePriceId - Stripe price ID (optional)
 */
export async function archiveProduct(
  env: Env,
  stripeProductId: string,
  stripePriceId?: string
): Promise<void> {
  try {
    // Validate required fields
    if (!stripeProductId) {
      throw new Error('stripe_product_id is required');
    }

    const stripe = getStripeClient(env);

    console.log(`Archiving Stripe product ${stripeProductId}`);

    // Deactivate price first (if provided)
    if (stripePriceId) {
      await stripe.prices.update(stripePriceId, {
        active: false,
      });
      console.log(`✅ Deactivated price ${stripePriceId}`);
    }

    // Deactivate product
    await stripe.products.update(stripeProductId, {
      active: false,
    });

    console.log(`✅ Archived Stripe product ${stripeProductId}`);
  } catch (error: any) {
    return handleStripeError(error, 'archive product');
  }
}

/**
 * Get Stripe price details
 * 
 * Used for validation and displaying price information
 * 
 * @param env - Cloudflare environment with Stripe key
 * @param priceId - Stripe price ID
 * @returns Stripe price object
 */
export async function getPrice(
  env: Env,
  priceId: string
): Promise<Stripe.Price> {
  try {
    if (!priceId) {
      throw new Error('price_id is required');
    }

    const stripe = getStripeClient(env);
    const price = await stripe.prices.retrieve(priceId);

    if (!price || typeof price.unit_amount !== 'number') {
      throw new Error(
        `Stripe price ${priceId} is not configured with a fixed unit amount`
      );
    }

    return price;
  } catch (error: any) {
    return handleStripeError(error, 'get price');
  }
}
