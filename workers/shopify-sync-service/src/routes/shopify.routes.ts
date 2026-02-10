/**
 * Shopify search routes
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { searchShopifyProducts } from '../services/product-search.service';

const shopifyRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /shopify/products
 * Search Shopify products for linking with B2B products
 * Query params: query, productId, variantId, sku, limit
 */
shopifyRoutes.get('/products', async (c) => {
  try {
    const query = c.req.query('query');
    const productId = c.req.query('productId');
    const variantId = c.req.query('variantId');
    const sku = c.req.query('sku');
    const limit = parseInt(c.req.query('limit') || '20', 10);

    const variants = await searchShopifyProducts(c.env, {
      query,
      productId,
      variantId,
      sku,
      limit,
    });

    return c.json({
      success: true,
      data: variants,
      count: variants.length,
    });
  } catch (error: any) {
    console.error('Error searching Shopify products:', error);
    return c.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      500
    );
  }
});

export default shopifyRoutes;
