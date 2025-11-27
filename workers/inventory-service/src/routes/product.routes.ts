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
 * Update product inventory (B2B/B2C stock allocation) - admin only
 * This is the new endpoint for managing stock in the product_inventory table
 * 
 * Request body:
 * - totalStock: Total available stock
 * - b2bStock: Stock allocated to B2B (ignored if stockMode='unified')
 * - b2cStock: Stock allocated to B2C/Shopify (ignored if stockMode='unified')
 * - stockMode: 'split' (default) or 'unified' (shared stock pool)
 * - shopifyInventoryItemId: Optional Shopify inventory item ID for sync
 * - syncEnabled: Optional flag to enable/disable Shopify sync
 * 
 * When stockMode='unified':
 * - Both B2B and Shopify share the same stock pool (total_stock)
 * - b2b_stock and b2c_stock are set equal to total_stock for compatibility
 * - Any sale on either platform decrements total_stock
 * - Shopify sync will send total_stock instead of b2c_stock
 */
products.post('/inventory/:id/stock', requireAuth, requireAdmin, async (c) => {
  try {
    const productId = c.req.param('id');
    const { totalStock, b2bStock, b2cStock, shopifyInventoryItemId, stockMode } = await c.req.json<{
      totalStock: number;
      b2bStock: number;
      b2cStock: number;
      shopifyInventoryItemId?: string | null;
      stockMode?: 'split' | 'unified';
      notes?: string;
    }>();

    // Determine stock mode (default to 'split' for backwards compatibility)
    const mode = stockMode || 'split';
    
    // Calculate actual stock values based on mode
    let actualB2BStock: number;
    let actualB2CStock: number;
    
    if (mode === 'unified') {
      // Unified mode: both channels share total_stock
      // Set b2b_stock = total_stock for B2B availability checks
      // Set b2c_stock = 0 (Shopify sync will use total_stock directly)
      actualB2BStock = totalStock;
      actualB2CStock = 0;
      console.log(`🔗 Unified stock mode for product ${productId}: Total=${totalStock} (shared pool)`);
    } else {
      // Split mode: separate allocations (current behavior)
      actualB2BStock = b2bStock;
      actualB2CStock = b2cStock;
      console.log(`📊 Split stock mode for product ${productId}: Total=${totalStock}, B2B=${b2bStock}, B2C=${b2cStock}`);
    }

    console.log(`🛠️ Admin updating stock for product ${productId}: Mode=${mode}, Total=${totalStock}, B2B=${actualB2BStock}, B2C=${actualB2CStock}, ShopifyInventoryItemID=${shopifyInventoryItemId}`);

    // Validation
    if (typeof totalStock !== 'number' || totalStock < 0) {
      throw errors.validationError('Total stock must be a non-negative number');
    }
    
    // Only validate B2B/B2C allocation in split mode
    if (mode === 'split') {
      if (typeof b2bStock !== 'number' || b2bStock < 0) {
        throw errors.validationError('B2B stock must be a non-negative number');
      }
      if (typeof b2cStock !== 'number' || b2cStock < 0) {
        throw errors.validationError('B2C stock must be a non-negative number');
      }
      if (b2bStock + b2cStock > totalStock) {
        throw errors.validationError('B2B + B2C stock cannot exceed total stock');
      }
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
    ).bind(productId).first();

    const now = new Date().toISOString();

    if (existingInventory) {

      // Update existing inventory
      await c.env.DB.prepare(`
        UPDATE product_inventory 
        SET 
          total_stock = ?,
          b2b_stock = ?,
          b2c_stock = ?,
          stock_mode = ?,
          shopify_inventory_item_id = ?,
          updated_at = ?
        WHERE product_id = ?
      `).bind(totalStock, actualB2BStock, actualB2CStock, mode, shopifyInventoryItemId || null, now, productId).run();

      // Log the change
      await c.env.DB.prepare(`
        INSERT INTO inventory_sync_log (
          id, product_id, action, source,
          total_change, b2b_change, b2c_change,
          total_stock_after, b2b_stock_after, b2c_stock_after,
           created_at
        ) VALUES (?, ?, 'manual_update', 'admin_stock_management', ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        productId,
        totalStock - (existingInventory.total_stock as number),
        actualB2BStock - (existingInventory.b2b_stock as number),
        actualB2CStock - (existingInventory.b2c_stock as number),
        totalStock,
        actualB2BStock,
        actualB2CStock,
        now
      ).run();

      // Sync to Shopify if inventory item ID is provided
      if (shopifyInventoryItemId) {
        console.log(`🔄 Stock updated for ${productId}, syncing to Shopify...`);
        
        try {
          // Call Shopify Sync Service via service binding
          const syncRequest = new Request(`http://shopify-sync/sync/${productId}`, {
            method: 'POST',
            headers: { 'X-Service-Token': c.env.SERVICE_SECRET },
          });
          
          const syncResponse = await c.env.SHOPIFY_SYNC_SERVICE.fetch(syncRequest);
          const syncResult = await syncResponse.json() as { success: boolean; error?: string };
          
          if (syncResult.success) {
            console.log(`✅ Successfully synced stock for ${productId} to Shopify`);
          } else {
            console.error(`❌ Failed to sync stock for ${productId} to Shopify: ${syncResult.error}`);
          }
        } catch (syncError: any) {
          console.error(`❌ Error calling Shopify sync service:`, syncError.message);
          // Don't fail the stock update if Shopify sync fails
        }
      }

    } else {
      // Create new inventory record
      await c.env.DB.prepare(`
        INSERT INTO product_inventory (
          product_id, total_stock, b2b_stock, b2c_stock, reserved_stock,
          stock_mode, shopify_inventory_item_id, sync_enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, ?, ?, 0, ?, ?)
      `).bind(productId, totalStock, actualB2BStock, actualB2CStock, mode, shopifyInventoryItemId || null, now, now).run();

      // Log the initial stock creation
      await c.env.DB.prepare(`
        INSERT INTO inventory_sync_log (
          id, product_id, action, source,
          total_change, b2b_change, b2c_change,
          total_stock_after, b2b_stock_after, b2c_stock_after,
          created_at
        ) VALUES (?, ?, 'initial_stock', 'admin_stock_management', ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        productId,
        totalStock,
        actualB2BStock,
        actualB2CStock,
        totalStock,
        actualB2BStock,
        actualB2CStock,
        now
      ).run();

      // Sync initial B2C stock to Shopify if we have B2C stock and inventory item ID
      if (shopifyInventoryItemId) {
        console.log(`🔄 Initial B2C stock set for ${productId}, syncing to Shopify...`);
        
        try {
          // Call Shopify Sync Service via service binding
          const syncRequest = new Request(`http://shopify-sync/sync/${productId}`, {
            method: 'POST',
            headers: { 'X-Service-Token': c.env.SERVICE_SECRET },
          });
          
          const syncResponse = await c.env.SHOPIFY_SYNC_SERVICE.fetch(syncRequest);
          const syncResult = await syncResponse.json() as { success: boolean; error?: string };
          
          if (syncResult.success) {
            console.log(`✅ Successfully synced initial stock for ${productId} to Shopify`);
          } else {
            console.error(`❌ Failed to sync initial stock for ${productId} to Shopify: ${syncResult.error}`);
          }
        } catch (syncError: any) {
          console.error(`❌ Error calling Shopify sync service:`, syncError.message);
          // Don't fail the stock creation if Shopify sync fails
        }
      }
    }

    // Fetch and return updated product with inventory
    const updatedProduct = await c.env.DB.prepare(`
      SELECT * FROM products WHERE id = ?
    `).bind(productId).first();

    const inventory = await c.env.DB.prepare(
      'SELECT * FROM product_inventory WHERE product_id = ?'
    ).bind(productId).first();

    return c.json({
      ...updatedProduct,
      inventory,
    });
  } catch (error) {
    throw error;
  }
});

export default products;
