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

  // Shopify webhook for product creation
  inventory.post('/webhook/inventory-create', async (c) => {
    try {
      // 1. Get raw body for signature validation
      const rawBody = await c.req.text();
      const signature = c.req.header('X-Shopify-Hmac-Sha256');

      const validation = await validateWebhookWithResponse(signature, rawBody, c.env.WEBHOOK_SECRET);
      if (!validation.isValid) {
        return c.json({ success: false, error: validation.error }, validation.statusCode);
      }
      
      // 2. Parse the webhook payload
      const payload = JSON.parse(rawBody);
      
      // Validate payload
      if (!payload) {
        return c.json({ 
          success: false, 
          error: 'Empty webhook payload' 
        }, 400);
      }

      const { id: productId, title, variants } = payload;
      
      if (!productId || !title || !variants) {
        return c.json({ 
          success: false, 
          error: 'Missing required fields: id, title, or variants',
          receivedPayload: payload
        }, 400);
      }

      // 3. Create inventory entries for each variant
      const inventoryService = new InventoryService(c.env.DB);
      const createdItems = [];
      let processedCount = 0;
      let skippedCount = 0;

      for (const variant of variants) {
        const stock = variant.inventory_quantity || 0;
        const variantTitle = variant.title 
          ? `${title} - ${variant.title}`
          : `${title} - Variant ${variant.id}`;

        try {
          const createdItem = await inventoryService.syncVariantFromShopify(
            productId.toString(),
            variant.id.toString(),
            variant.inventory_item_id.toString(),
            variantTitle,
            stock
          );

          if (createdItem) {
            createdItems.push(createdItem);
            processedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          skippedCount++;
          // Continue processing other variants even if one fails
        }
      }

      const response: ApiResponse = {
        success: true,
        message: `Successfully processed product creation for: ${title}`,
        data: {
          product_id: productId,
          product_title: title,
          variants_processed: processedCount,
          variants_skipped: skippedCount,
          created_items: createdItems
        }
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

  // Shopify webhook for inventory level updates
  inventory.post('/webhook/inventory-update', async (c) => {
    try {
      // 1. Get raw body for signature validation
      const rawBody = await c.req.text();
      const signature = c.req.header('X-Shopify-Hmac-Sha256');

      const validation = await validateWebhookWithResponse(signature, rawBody, c.env.WEBHOOK_SECRET);
      if (!validation.isValid) {
        return c.json({ success: false, error: validation.error }, validation.statusCode);
      }

      // 2. Parse the webhook payload
      const payload = JSON.parse(rawBody);

          // Log incoming request in JSON format
    console.log(JSON.stringify(payload));
      
      // Validate payload
      if (!payload) {
        return c.json({ 
          success: false, 
          error: 'Empty webhook payload' 
        }, 400);
      }
      
      const { inventory_item_id, available } = payload;
      
      if (!inventory_item_id || available === undefined) {
        return c.json({ 
          success: false, 
          error: 'Missing required fields: inventory_item_id or available',
          receivedPayload: payload
        }, 400);
      }

      // Extract numeric ID from Shopify GID format: gid://shopify/InventoryItem/{id}
      const extractInventoryItemId = (gid: string): string => {
        if (typeof gid !== 'string') {
          return String(gid);
        }
        if (gid.startsWith('gid://shopify/InventoryItem/')) {
          return gid.split('/').pop() || gid;
        }
        return gid; // Return as-is if not in GID format
      };

      const numericInventoryItemId = extractInventoryItemId(inventory_item_id);

      // 3. Update B2C stock directly using inventory_item_id
      const inventoryService = new InventoryService(c.env.DB);
      
      // Update B2C stock for this inventory item
      const updatedItem = await inventoryService.updateB2CStockByInventoryItemId(numericInventoryItemId, available);

      if (!updatedItem) {
        return c.json({ 
          success: false, 
          error: `Inventory item with inventory_item_id ${inventory_item_id} (numeric: ${numericInventoryItemId}) not found in database. Please ensure the product was created via the product-create webhook first.` 
        }, 404);
      }

      const response: ApiResponse = {
        success: true,
        message: `Successfully updated B2C stock for ${updatedItem.title}`,
        data: {
          inventory_item_id: inventory_item_id,
          numeric_inventory_item_id: numericInventoryItemId,
          shopify_variant_id: updatedItem.shopify_variant_id,
          title: updatedItem.title,
          new_b2c_stock: updatedItem.b2c_stock,
          b2b_stock: updatedItem.b2b_stock,
          total_stock: updatedItem.total_stock
        }
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


  app.route('/api/inventory', inventory);
}
