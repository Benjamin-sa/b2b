/**
 * Product Routes
 *
 * HTTP endpoints for product management
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';
import {
  getProductById,
  getProducts,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../services/product.service';
import { validatePagination, validateSort } from '../utils/validation';
import { errors } from '../utils/errors';

const products = new Hono<{ Bindings: Env }>();

// ============================================================================
// PUBLIC ROUTES (No auth required for GET operations)
// ============================================================================

/**
 * GET /products
 * Get all products with pagination and filters
 */
products.get('/', optionalAuth, async (c) => {
  try {
    // Parse pagination
    const page = c.req.query('page');
    const limit = c.req.query('limit');
    const maxLimit = parseInt(c.env.MAX_PAGE_SIZE);
    const defaultLimit = parseInt(c.env.DEFAULT_PAGE_SIZE);

    const pagination = validatePagination(page, limit || defaultLimit, maxLimit);

    // Parse sort
    const sortBy = c.req.query('sortBy');
    const sortOrder = c.req.query('sortOrder');
    const sort = validateSort(sortBy, sortOrder, [
      'name',
      'price',
      'created_at',
      'updated_at',
      'stock',
    ]);

    // Parse filters
    const filters = {
      categoryId: c.req.query('categoryId'),
      brand: c.req.query('brand'),
      inStock: c.req.query('inStock') === 'true' ? true : undefined,
      comingSoon: c.req.query('comingSoon') === 'true' ? true : undefined,
      minPrice: c.req.query('minPrice') ? parseFloat(c.req.query('minPrice')!) : undefined,
      maxPrice: c.req.query('maxPrice') ? parseFloat(c.req.query('maxPrice')!) : undefined,
      searchTerm: c.req.query('search'),
    };

    const result = await getProducts(c.env.DB, filters, {
      ...pagination,
      ...sort,
    });

    return c.json(result);
  } catch (error) {
    throw error;
  }
});

/**
 * GET /products/:id
 * Get a single product by ID
 */
products.get('/:id', optionalAuth, async (c) => {
  try {
    const productId = c.req.param('id');

    const product = await getProductById(c.env.DB, productId);

    return c.json(product);
  } catch (error) {
    throw error;
  }
});

/**
 * GET /products/category/:categoryId
 * Get products by category with pagination
 */
products.get('/category/:categoryId', optionalAuth, async (c) => {
  try {
    const categoryId = c.req.param('categoryId');

    // Parse pagination
    const page = c.req.query('page');
    const limit = c.req.query('limit');
    const maxLimit = parseInt(c.env.MAX_PAGE_SIZE);
    const defaultLimit = parseInt(c.env.DEFAULT_PAGE_SIZE);

    const pagination = validatePagination(page, limit || defaultLimit, maxLimit);

    // Parse sort
    const sortBy = c.req.query('sortBy');
    const sortOrder = c.req.query('sortOrder');
    const sort = validateSort(sortBy, sortOrder, [
      'name',
      'price',
      'created_at',
      'updated_at',
      'stock',
    ]);

    const result = await getProductsByCategory(c.env.DB, categoryId, {
      ...pagination,
      ...sort,
    });

    return c.json(result);
  } catch (error) {
    throw error;
  }
});

// ============================================================================
// ADMIN ROUTES (Require authentication + admin role)
// ============================================================================

/**
 * POST /products
 * Create a new product (admin only)
 *
 * NOTE: Stripe product/price creation is handled at the API Gateway orchestration layer.
 * This endpoint expects stripe_product_id and stripe_price_id to be passed in the request body.
 */
products.post('/', requireAuth, requireAdmin, async (c) => {
  try {
    const data = await c.req.json();

    const product = await createProduct(c.env.DB, data);

    return c.json(product, 201);
  } catch (error) {
    throw error;
  }
});

/**
 * PATCH /products/:id
 * Partially update a product (admin only)
 *
 * NOTE: Stripe updates are handled at the API Gateway orchestration layer.
 * If a price change requires a new stripe_price_id, it will be passed in the request body.
 */
products.patch('/:id', requireAuth, requireAdmin, async (c) => {
  try {
    const productId = c.req.param('id');
    const data = await c.req.json();

    const product = await updateProduct(c.env.DB, productId, data);

    return c.json(product);
  } catch (error) {
    throw error;
  }
});

/**
 * DELETE /products/:id
 * Delete a product (admin only)
 *
 * NOTE: Stripe archival is handled at the API Gateway orchestration layer.
 * This endpoint only handles D1 database deletion.
 */
products.delete('/:id', requireAuth, requireAdmin, async (c) => {
  try {
    const productId = c.req.param('id');

    await deleteProduct(c.env.DB, productId);

    return c.json({ message: 'Product deleted successfully' });
  } catch (error) {
    throw error;
  }
});

/**
 * POST /inventory/:id/stock
 * Update product inventory - admin only
 * Simplified: Single stock value, Shopify is source of truth
 *
 * Request body:
 * - stock: Available stock quantity
 * - shopifyInventoryItemId: Optional Shopify inventory item ID for sync
 */
products.post('/inventory/:id/stock', requireAuth, requireAdmin, async (c) => {
  try {
    const productId = c.req.param('id');
    const body = await c.req.json<{
      stock?: number;
      totalStock?: number; // Legacy support
      shopifyInventoryItemId?: string | null;
    }>();

    // Support both 'stock' and legacy 'totalStock' field names
    const stock = body.stock ?? body.totalStock;

    console.log(`🛠️ Admin updating stock for product ${productId}: Stock=${stock}`);

    // Validation
    if (typeof stock !== 'number' || stock < 0) {
      throw errors.validationError('Stock must be a non-negative number');
    }

    // Check if product exists
    const product = await c.env.DB.prepare('SELECT id FROM products WHERE id = ?')
      .bind(productId)
      .first();

    if (!product) {
      throw errors.notFound('Product', productId);
    }

    // Check if inventory record exists
    const existingInventory = await c.env.DB.prepare(
      'SELECT * FROM product_inventory WHERE product_id = ?'
    )
      .bind(productId)
      .first();

    const now = new Date().toISOString();
    const shopifyInventoryItemId = body.shopifyInventoryItemId;

    if (existingInventory) {
      const previousStock =
        (existingInventory.stock as number) ?? (existingInventory.total_stock as number) ?? 0;

      // Update existing inventory - set only the stock column
      await c.env.DB.prepare(
        `
        UPDATE product_inventory 
        SET 
          stock = ?,
          shopify_inventory_item_id = COALESCE(?, shopify_inventory_item_id),
          updated_at = ?
        WHERE product_id = ?
      `
      )
        .bind(stock, shopifyInventoryItemId, now, productId)
        .run();

      // Log the change
      const stockChange = stock - previousStock;
      await c.env.DB.prepare(
        `
        INSERT INTO inventory_sync_log (
          id, product_id, action, source,
          stock_change, stock_after,
          created_at
        ) VALUES (?, ?, 'manual_update', 'admin_stock_management', ?, ?, ?)
      `
      )
        .bind(crypto.randomUUID(), productId, stockChange, stock, now)
        .run();

      console.log(`✅ Stock updated for ${productId}: ${previousStock} → ${stock}`);

      // Sync to Shopify if inventory item ID exists
      const finalShopifyId = shopifyInventoryItemId || existingInventory.shopify_inventory_item_id;
      if (finalShopifyId) {
        try {
          const syncRequest = new Request(`http://shopify-sync/sync/${productId}`, {
            method: 'POST',
            headers: { 'X-Service-Token': c.env.SERVICE_SECRET },
          });

          const syncResponse = await c.env.SHOPIFY_SYNC_SERVICE.fetch(syncRequest);
          const syncResult = (await syncResponse.json()) as { success: boolean; error?: string };

          if (syncResult.success) {
            console.log(`✅ Synced stock to Shopify for ${productId}`);
          } else {
            console.error(`❌ Shopify sync failed: ${syncResult.error}`);
          }
        } catch (syncError: any) {
          console.error(`❌ Shopify sync error:`, syncError.message);
        }
      }
    } else {
      // Create new inventory record
      await c.env.DB.prepare(
        `
        INSERT INTO product_inventory (
          product_id, stock,
          shopify_inventory_item_id, sync_enabled, created_at, updated_at
        ) VALUES (?, ?, ?, 0, ?, ?)
      `
      )
        .bind(productId, stock, shopifyInventoryItemId || null, now, now)
        .run();

      // Log the initial stock creation
      await c.env.DB.prepare(
        `
        INSERT INTO inventory_sync_log (
          id, product_id, action, source,
          stock_change, stock_after,
          created_at
        ) VALUES (?, ?, 'initial_stock', 'admin_stock_management', ?, ?, ?)
      `
      )
        .bind(crypto.randomUUID(), productId, stock, stock, now)
        .run();

      console.log(`✅ Created inventory for ${productId} with stock=${stock}`);

      // Sync to Shopify if inventory item ID provided
      if (shopifyInventoryItemId) {
        try {
          const syncRequest = new Request(`http://shopify-sync/sync/${productId}`, {
            method: 'POST',
            headers: { 'X-Service-Token': c.env.SERVICE_SECRET },
          });

          const syncResponse = await c.env.SHOPIFY_SYNC_SERVICE.fetch(syncRequest);
          const syncResult = (await syncResponse.json()) as { success: boolean; error?: string };

          if (syncResult.success) {
            console.log(`✅ Synced initial stock to Shopify for ${productId}`);
          } else {
            console.error(`❌ Shopify sync failed: ${syncResult.error}`);
          }
        } catch (syncError: any) {
          console.error(`❌ Shopify sync error:`, syncError.message);
        }
      }
    }

    // Fetch and return updated product with inventory
    const updatedProduct = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?')
      .bind(productId)
      .first();

    const inventory = await c.env.DB.prepare('SELECT * FROM product_inventory WHERE product_id = ?')
      .bind(productId)
      .first();

    return c.json({
      ...updatedProduct,
      inventory,
    });
  } catch (error) {
    throw error;
  }
});

export default products;
