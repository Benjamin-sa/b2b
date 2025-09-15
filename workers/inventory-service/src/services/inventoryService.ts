import type { 
  InventoryItem, 
} from '../types/inventory';
import { ShopifyService } from './shopifyService';

export class InventoryService {
  private db: D1Database;
  private shopifyService?: ShopifyService;

  constructor(db: D1Database, shopifyService?: ShopifyService) {
    this.db = db;
    this.shopifyService = shopifyService;
  }

  /**
   * Get all inventory items
   */
  async getAllInventory(): Promise<InventoryItem[]> {
    const result = await this.db
      .prepare('SELECT * FROM inventory ORDER BY title ASC')
      .all();
    
    return result.results as InventoryItem[];
  }

  /**
   * Get inventory by SKU (product ID) - NOTE: This may return multiple variants for products with variants
   */
  async getInventoryBySku(shopifyProductId: string): Promise<InventoryItem | null> {
    const result = await this.db
      .prepare('SELECT * FROM inventory WHERE shopify_product_id = ?')
      .bind(shopifyProductId)
      .first();
    
    return result as InventoryItem | null;
  }

  /**
   * Get inventory by Shopify Variant ID (more precise for products with variants)
   */
  async getInventoryByVariantId(shopifyVariantId: string): Promise<InventoryItem | null> {
    const result = await this.db
      .prepare('SELECT * FROM inventory WHERE shopify_variant_id = ?')
      .bind(shopifyVariantId)
      .first();
    
    return result as InventoryItem | null;
  }

  /**
   * Search inventory items by name or product ID
   */
  async searchProducts(query: string): Promise<InventoryItem[]> {
    // Search by both title (name) and shopify_product_id
    const result = await this.db
      .prepare(`
        SELECT * FROM inventory 
        WHERE title LIKE ? OR shopify_product_id LIKE ?
        ORDER BY title ASC
        LIMIT 50
      `)
      .bind(`%${query}%`, `%${query}%`)
      .all();
    
    return result.results as InventoryItem[];
  }
  /**
   * Sync variant from Shopify - create or update inventory for individual variants
   */
  async syncVariantFromShopify(
    shopifyProductId: string, 
    shopifyVariantId: string,
    inventoryItemId: string,
    title: string, 
    stock: number
  ): Promise<InventoryItem | null> {
    // Skip variants with negative stock
    if (stock < 0) {
      return null;
    }

    const existingItem = await this.db
      .prepare('SELECT * FROM inventory WHERE shopify_variant_id = ?')
      .bind(shopifyVariantId)
      .first();

    if (existingItem) {
      // Update existing variant - keep existing B2B stock, update B2C with new stock, recalculate total
      const existingB2bStock = (existingItem as InventoryItem).b2b_stock || 0;
      const newTotalStock = stock + existingB2bStock;
      
      await this.db
        .prepare(`
          UPDATE inventory 
          SET shopify_product_id = ?, title = ?, b2c_stock = ?, total_stock = ?, inventory_item_id = ?
          WHERE shopify_variant_id = ?
        `)
        .bind(shopifyProductId, title, stock, newTotalStock, inventoryItemId, shopifyVariantId)
        .run();
    } else {
      // Create new variant - all stock goes to B2C initially
      await this.db
        .prepare(`
          INSERT INTO inventory (shopify_product_id, shopify_variant_id, inventory_item_id, title, b2c_stock, b2b_stock, total_stock)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(shopifyProductId, shopifyVariantId, inventoryItemId, title, stock, 0, stock)
        .run();
    }

    // Return updated item
    const result = await this.db
      .prepare('SELECT * FROM inventory WHERE shopify_variant_id = ?')
      .bind(shopifyVariantId)
      .first();

    return result as InventoryItem;
  }


  /**
   * Update B2C stock
   */
  async updateB2CStock(shopifyProductId: string, newB2cStock: number): Promise<InventoryItem> {
    const item = await this.getInventoryBySku(shopifyProductId);

    if (!item) {
      throw new Error(`Shopify Product ID ${shopifyProductId} not found`);
    }

    const newTotalStock = newB2cStock + item.b2b_stock;

    if (newB2cStock < 0) {
      throw new Error(`B2C stock cannot be negative. Requested: ${newB2cStock}`);
    }

    // Update local database
    await this.db
      .prepare('UPDATE inventory SET b2c_stock = ?, total_stock = ? WHERE shopify_product_id = ?')
      .bind(newB2cStock, newTotalStock, shopifyProductId)
      .run();

    return await this.getInventoryBySku(shopifyProductId);
  }

  /**
   * Transfer stock from B2C to B2B using Shopify Variant ID (more precise than product ID)
   */
  async transferB2CToB2B(shopifyVariantId: string, amount: number): Promise<InventoryItem> {
    const item = await this.getInventoryByVariantId(shopifyVariantId);

    if (!item) {
      throw new Error(`Shopify Variant ID ${shopifyVariantId} not found`);
    }

    if (amount <= 0) {
      throw new Error(`Transfer amount must be greater than 0. Requested: ${amount}`);
    }

    const newB2cStock = item.b2c_stock - amount;
    const newB2bStock = item.b2b_stock + amount;
    
    if (newB2cStock < 0) {
      throw new Error(`Insufficient B2C stock for transfer. Current B2C stock: ${item.b2c_stock}, Requested transfer: ${amount}`);
    }

    // Update local database first using variant ID for precision
    await this.db
      .prepare('UPDATE inventory SET b2c_stock = ?, b2b_stock = ? WHERE shopify_variant_id = ?')
      .bind(newB2cStock, newB2bStock, shopifyVariantId)
      .run();

    // CRITICAL: Update Shopify with the new B2C stock level
    // This ensures customers can only purchase what's actually available for B2C
    if (this.shopifyService) {
      try {
        await this.shopifyService.updateInventoryLevel(item.inventory_item_id, newB2cStock);
        console.log(`✅ Successfully updated Shopify inventory for variant ${shopifyVariantId} (inventory_item_id: ${item.inventory_item_id}) to ${newB2cStock} units`);
      } catch (shopifyError) {
        console.error(`❌ CRITICAL: Failed to update Shopify inventory after local DB update:`, shopifyError);
        
        // This is a critical error - we have inconsistent state
        // Attempt to rollback the local database change using variant ID
        let rollbackSuccessful = false;
        let rollbackError: Error | null = null;
        
        try {
          await this.db
            .prepare('UPDATE inventory SET b2c_stock = ?, b2b_stock = ? WHERE shopify_variant_id = ?')
            .bind(item.b2c_stock, item.b2b_stock, shopifyVariantId)
            .run();
          
          rollbackSuccessful = true;
          console.log(`✅ Successfully rolled back local database changes for variant ${shopifyVariantId}`);
        } catch (error) {
          rollbackError = error instanceof Error ? error : new Error('Unknown rollback error');
          console.error(`❌ CRITICAL: Failed to rollback local database changes:`, rollbackError);
        }

        // Now throw the appropriate error based on rollback success
        if (rollbackSuccessful) {
          throw new Error(`Transfer failed: Unable to update Shopify inventory. Local changes have been rolled back successfully. Shopify error: ${shopifyError instanceof Error ? shopifyError.message : 'Unknown Shopify error'}`);
        } else {
          throw new Error(`CRITICAL ERROR: Transfer partially completed. Local database was updated but Shopify update failed AND rollback also failed. Manual intervention required immediately. Shopify error: ${shopifyError instanceof Error ? shopifyError.message : 'Unknown'}. Rollback error: ${rollbackError?.message || 'Unknown'}`);
        }
      }
    } else {
      console.warn(`⚠️ WARNING: No Shopify service provided. Skipping Shopify inventory update for variant ${shopifyVariantId} (inventory_item_id: ${item.inventory_item_id})`);
    }

    const updatedItem = await this.getInventoryByVariantId(shopifyVariantId);
    return updatedItem!;
  }

  /**
   * Update B2C stock by inventory_item_id (for webhooks)
   */
  async updateB2CStockByInventoryItemId(inventoryItemId: string, newB2cStock: number): Promise<InventoryItem | null> {
    // First, find the item by inventory_item_id
    const item = await this.db
      .prepare('SELECT * FROM inventory WHERE inventory_item_id = ?')
      .bind(inventoryItemId)
      .first() as InventoryItem | null;

    if (!item) {
      return null;
    }

    const newTotalStock = newB2cStock + item.b2b_stock;

    if (newB2cStock < 0) {
      throw new Error(`B2C stock cannot be negative. Requested: ${newB2cStock}`);
    }

    // Update local database
    await this.db
      .prepare('UPDATE inventory SET b2c_stock = ?, total_stock = ? WHERE inventory_item_id = ?')
      .bind(newB2cStock, newTotalStock, inventoryItemId)
      .run();

    // Return updated item
    const updatedItem = await this.db
      .prepare('SELECT * FROM inventory WHERE inventory_item_id = ?')
      .bind(inventoryItemId)
      .first();

    return updatedItem as InventoryItem;
  }
}
