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

  // Sync products from Shopify (populate database) - Admin only
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

      const inventoryService = new InventoryService(c.env.DB);
      const shopifyService = new ShopifyService(c.env.SHOPIFY_STORE_URL, c.env.SHOPIFY_ACCESS_TOKEN);
      
      const products = await shopifyService.getAllProducts();
      
      const syncedVariants = [];
      let processedCount = 0;
      let skippedCount = 0;

      for (const product of products) {
        // Iterate through each variant instead of summing them up
        for (const variant of product.variants) {
          const stock = variant.inventory_quantity || 0;
          
          // Create a title that includes the product title and variant info
          const variantTitle = `${product.title} - Variant ${variant.id}`;
          
          const syncedItem = await inventoryService.syncVariantFromShopify(
            product.id.toString(),
            variant.id.toString(),
            variant.inventory_item_id.toString(),
            variantTitle,
            stock
          );

          if (syncedItem) {
            syncedVariants.push(syncedItem);
            processedCount++;
          } else {
            skippedCount++;
          }
        }
        
        // Log progress every 50 items
        if ((processedCount + skippedCount) % 50 === 0) {
        }
      }


      const response: ApiResponse = {
        success: true,
        data: {
          syncedProducts: syncedVariants,
          stats: {
            total_products: products.length,
            total_variants_synced: syncedVariants.length,
            variants_with_sku: syncedVariants.length,
            skipped_products: skippedCount
          }
        },
        message: `Successfully synced ${syncedVariants.length} product variants from ${products.length} Shopify products. Skipped ${skippedCount} variants with zero or negative stock.`
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
