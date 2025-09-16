import { Hono } from 'hono';
import { InventoryService } from '../services/inventoryService';
import { ShopifyService } from '../services/shopifyService';
import { validateWebhookWithResponse } from '../utils/webhookValidator';
import type { Env, ApiResponse, B2BTransferResponse } from '../types/inventory';

export function createInventoryRoutes(app: Hono<{ Bindings: Env }>) {
  const inventory = new Hono<{ Bindings: Env }>();

  // Get all inventory items
  inventory.get('/', async (c) => {

    try {
      const service = new InventoryService(c.env.DB);
      const items = await service.getAllInventory();
      
      const response: ApiResponse = {
        success: true,
        data: items,
        message: `Found ${items.length} inventory items`
      };

      return c.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      return c.json(response, 500);
    }
  });

  // Search products by name or product ID
  inventory.get('/search', async (c) => {
    try {
      const query = c.req.query('q');
      
      if (!query) {
        const response: ApiResponse = {
          success: false,
          error: 'Missing required query parameter: q'
        };
        return c.json(response, 400);
      }

      const service = new InventoryService(c.env.DB);
      const items = await service.searchProducts(query);
      
      const response: ApiResponse = {
        success: true,
        data: items,
        message: `Found ${items.length} items matching query: "${query}"`
      };
      
      return c.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      return c.json(response, 500);
    }
  });

  // Sync products from Shopify (populate database) - Admin only - BATCH VERSION
  inventory.post('/sync-shopify', async (c) => {
    try {
      // Admin key verification
      const adminKey = c.req.header('X-Admin-Key');
      const expectedAdminKey = c.env.ADMIN_KEY;
      
      if (!adminKey) {
        const response: ApiResponse = {
          success: false,
          error: 'Missing admin key. Please provide X-Admin-Key header.'
        };
        return c.json(response, 401);
      }
      
      if (!expectedAdminKey) {
        const response: ApiResponse = {
          success: false,
          error: 'Admin key not configured on server.'
        };
        return c.json(response, 500);
      }
      
      if (adminKey !== expectedAdminKey) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid admin key.'
        };
        return c.json(response, 403);
      }

      // Get batch parameters
      const batchSize = parseInt(c.req.query('batch_size') || '10'); // Default 10 variants per batch
      const offset = parseInt(c.req.query('offset') || '0'); // Default start from 0

      const inventoryService = new InventoryService(c.env.DB);
      const shopifyService = new ShopifyService(c.env.SHOPIFY_STORE_URL, c.env.SHOPIFY_ACCESS_TOKEN);
      
      const products = await shopifyService.getAllProducts();
      
      // Flatten all variants with product info
      const allVariants = [];
      for (const product of products) {
        for (const variant of product.variants) {
          allVariants.push({
            product,
            variant,
            stock: variant.inventory_quantity || 0,
            variantTitle: `${product.title} - Variant ${variant.id}`
          });
        }
      }

      // Get only the batch we need to process
      const batchVariants = allVariants.slice(offset, offset + batchSize);
      const syncedVariants = [];
      let processedCount = 0;
      let skippedCount = 0;

      // Process only this batch
      for (const item of batchVariants) {
        const syncedItem = await inventoryService.syncVariantFromShopify(
          item.product.id.toString(),
          item.variant.id.toString(),
          item.variant.inventory_item_id.toString(),
          item.variantTitle,
          item.stock
        );

        if (syncedItem) {
          syncedVariants.push(syncedItem);
          processedCount++;
        } else {
          skippedCount++;
        }
      }

      // Calculate batch info
      const totalVariants = allVariants.length;
      const nextOffset = offset + batchSize;
      const hasMore = nextOffset < totalVariants;
      const remainingVariants = Math.max(0, totalVariants - nextOffset);

      const response: ApiResponse = {
        success: true,
        data: {
          syncedProducts: syncedVariants,
          batch_info: {
            current_batch_size: batchVariants.length,
            processed_in_batch: processedCount,
            skipped_in_batch: skippedCount,
            total_variants: totalVariants,
            current_offset: offset,
            next_offset: hasMore ? nextOffset : null,
            has_more: hasMore,
            remaining_variants: remainingVariants
          }
        },
        message: hasMore 
          ? `Batch complete: Processed ${processedCount} variants (offset ${offset}-${offset + batchSize}). ${remainingVariants} variants remaining. Use offset=${nextOffset} for next batch.`
          : `Sync complete: Processed ${processedCount} variants in final batch. Total variants: ${totalVariants}`
      };
      
      return c.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      return c.json(response, 500);
    }
  });

  // Transfer stock from B2C to B2B
  inventory.post('/transfer-b2b', async (c) => {
    try {
      const body = await c.req.json();
      const { shopify_variant_id, amount } = body;

      // Validate request
      if (!shopify_variant_id || !amount) {
        const response: ApiResponse = {
          success: false,
          error: 'Missing required fields: shopify_variant_id and amount'
        };
        return c.json(response, 400);
      }

      if (typeof amount !== 'number' || amount <= 0) {
        const response: ApiResponse = {
          success: false,
          error: 'Amount must be a positive number'
        };
        return c.json(response, 400);
      }

      // Create services with Shopify integration for critical inventory updates
      const shopifyService = new ShopifyService(c.env.SHOPIFY_STORE_URL, c.env.SHOPIFY_ACCESS_TOKEN);
      const inventoryService = new InventoryService(c.env.DB, shopifyService);
      
      // Get current item to create transfer response
      const currentItem = await inventoryService.getInventoryByVariantId(shopify_variant_id);
      if (!currentItem) {
        const response: ApiResponse = {
          success: false,
          error: `Product variant with Shopify Variant ID ${shopify_variant_id} not found`
        };
        return c.json(response, 404);
      }

      // Perform the transfer (this will update both local DB and Shopify)
      const updatedItem = await inventoryService.transferB2CToB2B(shopify_variant_id, amount);
      
      const transferResponse: B2BTransferResponse = {
        shopify_product_id: updatedItem.shopify_product_id,
        shopify_variant_id: updatedItem.shopify_variant_id,
        title: updatedItem.title,
        previous_b2c_stock: currentItem.b2c_stock,
        previous_b2b_stock: currentItem.b2b_stock,
        new_b2c_stock: updatedItem.b2c_stock,
        new_b2b_stock: updatedItem.b2b_stock,
        total_stock: updatedItem.total_stock,
        transferred_amount: amount
      };

      const response: ApiResponse = {
        success: true,
        data: transferResponse,
        message: `Successfully transferred ${amount} units from B2C to B2B for product variant: ${updatedItem.title}. Shopify inventory has been updated to reflect the new B2C stock level.`
      };
      
      return c.json(response);
    } catch (error) {
      console.error('B2B transfer error:', error);
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      return c.json(response, 500);
    }
  });

  app.route('/api/inventory', inventory);
}
