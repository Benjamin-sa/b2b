import { Hono } from 'hono';
import { InventoryService } from '../services/inventoryService';
import { validateWebhookWithResponse } from '../utils/webhookValidator';
import type { Env, ApiResponse } from '../types/inventory';

export function createWebhookRoutes(app: Hono<{ Bindings: Env }>) {
  const webhooks = new Hono<{ Bindings: Env }>();

  // ===========================================
  // FIREBASE STOCK UPDATE ENDPOINT
  // ===========================================

  /**
   * Firebase stock update endpoint
   * Handles stock updates from Firebase Functions
   * POST /stock-update
   */
  webhooks.post('/stock-update', async (c) => {
    try {
      const authHeader = c.req.header('Authorization');
      const expectedToken = c.env.INVENTORY_WORKER_TOKEN;
      
      // Simple token authentication (if token is set)
      if (expectedToken && (!authHeader || authHeader !== `Bearer ${expectedToken}`)) {
        return c.json({
          success: false,
          error: 'Unauthorized'
        }, 401);
      }

      const payload = await c.req.json();
      console.log('📡 Received stock update from Firebase:', JSON.stringify(payload));

      if (!payload.updates || !Array.isArray(payload.updates)) {
        return c.json({
          success: false,
          error: 'Missing or invalid updates array'
        }, 400);
      }

      const inventoryService = new InventoryService(c.env.DB);
      const results = [];
      let successful = 0;
      let failed = 0;

      // Process each stock update
      for (const update of payload.updates) {
        if (!update.productSku || !update.amount || !update.operation) {
          console.warn('⚠️ Invalid update object:', update);
          results.push({
            productSku: update.productSku || 'unknown',
            success: false,
            error: 'Missing productSku, amount, or operation'
          });
          failed++;
          continue;
        }

        try {
          const { productSku, amount, operation } = update;
          
          // Determine the stock change based on operation
          const stockChange = operation === 'reduce' ? -amount : amount;
          
          // Update B2B stock in the database
          const success = await updateB2BStock(c.env.DB, productSku, stockChange);
          
          if (success) {
            results.push({
              productSku,
              success: true,
              operation,
              amount,
              stockChange
            });
            successful++;
            console.log(`✅ ${operation} stock for ${productSku}: ${stockChange > 0 ? '+' : ''}${stockChange}`);
          } else {
            results.push({
              productSku,
              success: false,
              error: 'Product not found'
            });
            failed++;
          }
        } catch (error) {
          console.error(`❌ Error processing stock update for ${update.productSku}:`, error);
          results.push({
            productSku: update.productSku,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          failed++;
        }
      }

      return c.json({
        success: true,
        message: `Stock updates processed: ${successful} successful, ${failed} failed`,
        data: {
          total_updates: payload.updates.length,
          successful,
          failed,
          results,
          metadata: payload.metadata || null
        }
      });

    } catch (error) {
      console.error('❌ Firebase stock update error:', error);
      return c.json({
        success: false,
        error: 'Stock update processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });

  // ===========================================
  // SHOPIFY WEBHOOKS
  // ===========================================

  /**
   * Shopify webhook for product creation
   * Handles: products/create
   */
  webhooks.post('/shopify/product-create', async (c) => {
    try {
      const rawBody = await c.req.text();
      const signature = c.req.header('X-Shopify-Hmac-Sha256');

      const validation = await validateWebhookWithResponse(signature, rawBody, c.env.WEBHOOK_SECRET);
      if (!validation.isValid) {
        return c.json({ 
          success: false, 
          error: validation.error 
        }, validation.statusCode);
      }
      
      const payload = JSON.parse(rawBody);
      
      if (!payload || !payload.id || !payload.title || !payload.variants) {
        return c.json({ 
          success: false, 
          error: 'Missing required fields: id, title, or variants',
          receivedPayload: payload
        }, 400);
      }

      const { id: productId, title, variants } = payload;
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
          console.error(`Failed to process variant ${variant.id}:`, error);
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
      console.error('❌ Shopify product-create webhook error:', error);
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      return c.json(response, 500);
    }
  });

  /**
   * Shopify webhook for inventory level updates
   * Handles: inventory_levels/update
   */
  webhooks.post('/shopify/inventory-update', async (c) => {
    try {
      const rawBody = await c.req.text();
      const signature = c.req.header('X-Shopify-Hmac-Sha256');

      const validation = await validateWebhookWithResponse(signature, rawBody, c.env.WEBHOOK_SECRET);
      if (!validation.isValid) {
        return c.json({ 
          success: false, 
          error: validation.error 
        }, validation.statusCode);
      }

      const payload = JSON.parse(rawBody);
      console.log('📦 Shopify inventory update:', JSON.stringify(payload));
      
      if (!payload || !payload.inventory_item_id || payload.available === undefined) {
        return c.json({ 
          success: false, 
          error: 'Missing required fields: inventory_item_id or available',
          receivedPayload: payload
        }, 400);
      }
      
      const { inventory_item_id, available } = payload;

      // Extract numeric ID from Shopify GID format: gid://shopify/InventoryItem/{id}
      const extractInventoryItemId = (gid: string): string => {
        if (typeof gid !== 'string') {
          return String(gid);
        }
        if (gid.startsWith('gid://shopify/InventoryItem/')) {
          return gid.split('/').pop() || gid;
        }
        return gid;
      };

      const numericInventoryItemId = extractInventoryItemId(inventory_item_id);
      const inventoryService = new InventoryService(c.env.DB);
      
      const updatedItem = await inventoryService.updateB2CStockByInventoryItemId(numericInventoryItemId, available);

      if (!updatedItem) {
        return c.json({ 
          success: false, 
          error: `Inventory item with inventory_item_id ${inventory_item_id} not found in database` 
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
      console.error('❌ Shopify inventory-update webhook error:', error);
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      return c.json(response, 500);
    }
  });

  // Mount webhook routes
  app.route('/webhook', webhooks);
}

// ===========================================
// STOCK UPDATE HELPER FUNCTIONS
// ===========================================

/**
 * Update B2B stock in inventory using productSku (shopify_variant_id)
 */
async function updateB2BStock(
  db: D1Database,
  productSku: string,
  quantityChange: number
): Promise<boolean> {
  try {
    const { results } = await db.prepare(
      'SELECT b2b_stock, total_stock FROM inventory WHERE shopify_variant_id = ?'
    ).bind(productSku).all();

    if (results.length === 0) {
      console.warn(`Product not found with SKU: ${productSku}`);
      return false;
    }

    const currentRecord = results[0] as { b2b_stock: number; total_stock: number };
    const newB2BStock = Math.max(0, currentRecord.b2b_stock + quantityChange);
    const stockDiff = newB2BStock - currentRecord.b2b_stock;
    const newTotalStock = currentRecord.total_stock + stockDiff;

    await db.prepare(
      'UPDATE inventory SET b2b_stock = ?, total_stock = ? WHERE shopify_variant_id = ?'
    ).bind(newB2BStock, newTotalStock, productSku).run();

    console.log(`✅ Stock updated for ${productSku}: B2B ${currentRecord.b2b_stock} → ${newB2BStock} (${quantityChange > 0 ? '+' : ''}${quantityChange})`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating stock for ${productSku}:`, error);
    return false;
  }
}
