/**
 * Database Utilities for Invoice Management
 * 
 * Handles D1 database operations for:
 * - Product inventory management
 * - Order creation and retrieval
 * - Order line items
 * - Inventory audit logging
 */

import type { Env } from '../types';

export interface InventoryItem {
  product_id: string;
  total_stock: number;
  b2b_stock: number;
  b2c_stock: number;
  reserved_stock: number;
}

export interface OrderItem {
  stripePriceId: string;
  quantity: number;
  metadata: {
    productId: string;
    productName?: string;
    shopifyVariantId: string;
  };
}

export interface StockUpdateResult {
  success: boolean;
  errors?: string[];
}

/**
 * Validate stock availability and prepare stock updates for multiple items
 */
export async function validateAndPrepareStockUpdates(
  db: D1Database, 
  items: OrderItem[], 
  userId: string
): Promise<{
  success: boolean;
  errors: string[];
  updates: D1PreparedStatement[];
  logs: D1PreparedStatement[];
}> {
  const now = new Date().toISOString();
  const stockUpdates: D1PreparedStatement[] = [];
  const stockLogs: D1PreparedStatement[] = [];
  const stockValidationErrors: string[] = [];

  for (const item of items) {
    const productId = item.metadata.productId;
    const quantity = item.quantity;

    // Get current inventory
    const inventory = await db.prepare(
      'SELECT total_stock, b2b_stock, b2c_stock FROM product_inventory WHERE product_id = ?'
    ).bind(productId).first();

    if (!inventory) {
      stockValidationErrors.push(`Product ${productId} has no inventory record`);
      continue;
    }

    const currentB2BStock = (inventory as any).b2b_stock;
    const currentB2CStock = (inventory as any).b2c_stock;
    const currentTotalStock = (inventory as any).total_stock;

    // Validate sufficient B2B stock
    if (currentB2BStock < quantity) {
      stockValidationErrors.push(
        `Insufficient stock for product ${productId}: need ${quantity}, have ${currentB2BStock} available`
      );
      continue;
    }

    // Calculate new stock levels
    const newB2BStock = currentB2BStock - quantity;
    const newTotalStock = currentTotalStock - quantity;

    // Prepare stock update query
    stockUpdates.push(
      db.prepare(`
        UPDATE product_inventory
        SET 
          total_stock = ?,
          b2b_stock = ?,
          updated_at = ?
        WHERE product_id = ?
      `).bind(newTotalStock, newB2BStock, now, productId)
    );

    // Prepare audit log entry
    stockLogs.push(
      db.prepare(`
        INSERT INTO inventory_sync_log (
          id, product_id, action, source,
          total_change, b2b_change, b2c_change,
          total_stock_after, b2b_stock_after, b2c_stock_after,
          reference_id, reference_type, created_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        productId,
        'b2b_order',
        'invoice_creation',
        -quantity,
        -quantity,
        0,
        newTotalStock,
        newB2BStock,
        currentB2CStock,
        'pending', // Will be updated with invoice ID after creation
        'invoice',
        now,
        userId
      )
    );

    console.log(`📉 Stock reduction prepared for ${productId}: ${currentB2BStock} → ${newB2BStock} (-${quantity})`);
  }

  return {
    success: stockValidationErrors.length === 0,
    errors: stockValidationErrors,
    updates: stockUpdates,
    logs: stockLogs
  };
}

/**
 * Execute stock updates and logs in a single transaction
 */
export async function executeStockUpdates(
  db: D1Database,
  updates: D1PreparedStatement[],
  logs: D1PreparedStatement[]
): Promise<void> {
  if (updates.length === 0) return;

  await db.batch([...updates, ...logs]);
  console.log(`✅ Reduced stock for ${updates.length} products`);
}

/**
 * Rollback stock changes for given items (restore inventory)
 */
export async function rollbackStockChanges(
  db: D1Database,
  items: OrderItem[]
): Promise<void> {
  if (items.length === 0) return;

  console.log('⚠️  Rolling back stock changes...');
  const rollbackUpdates: D1PreparedStatement[] = [];
  
  for (const item of items) {
    const productId = item.metadata.productId;
    const quantity = item.quantity;
    
    // Get current stock (after our reduction)
    const currentInventory = await db.prepare(
      'SELECT total_stock, b2b_stock FROM product_inventory WHERE product_id = ?'
    ).bind(productId).first();
    
    if (currentInventory) {
      const currentTotal = (currentInventory as any).total_stock;
      const currentB2B = (currentInventory as any).b2b_stock;
      
      // Restore stock
      rollbackUpdates.push(
        db.prepare(`
          UPDATE product_inventory
          SET 
            total_stock = ?,
            b2b_stock = ?,
            updated_at = ?
          WHERE product_id = ?
        `).bind(currentTotal + quantity, currentB2B + quantity, new Date().toISOString(), productId)
      );
    }
  }
  
  if (rollbackUpdates.length > 0) {
    await db.batch(rollbackUpdates);
    console.log('✅ Stock rollback completed');
  }
}

/**
 * Update inventory log entries with actual invoice ID (after invoice creation)
 */
export async function updateInventoryLogWithInvoiceId(
  db: D1Database,
  invoiceId: string,
  items: OrderItem[],
  createdAt: string
): Promise<void> {
  try {
    const updateLogQueries = items.map(item => 
      db.prepare(`
        UPDATE inventory_sync_log
        SET reference_id = ?
        WHERE product_id = ? AND reference_id = 'pending' AND created_at = ?
      `).bind(invoiceId, item.metadata.productId, createdAt)
    );
    
    await db.batch(updateLogQueries);
    console.log('✅ Updated inventory logs with invoice ID');
  } catch (error) {
    console.warn('⚠️  Failed to update inventory log reference_id (non-critical):', error);
  }
}

/**
 * Store order record in D1 database
 */
export async function storeOrder(
  db: D1Database,
  orderData: {
    orderId: string;
    userId: string;
    stripeInvoiceId: string;
    totalAmount: number;
    invoiceUrl: string;
    invoicePdf: string;
    invoiceNumber: string;
    shippingAddress?: any;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const shippingAddr = orderData.shippingAddress;

  await db.prepare(`
    INSERT INTO orders (
      id, user_id, stripe_invoice_id, status, stripe_status,
      total_amount, subtotal, tax, shipping,
      order_date, invoice_url, invoice_pdf, invoice_number, due_date,
      shipping_address_street, shipping_address_city, shipping_address_zip_code, shipping_address_country,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    orderData.orderId,
    orderData.userId,
    orderData.stripeInvoiceId,
    'pending', // Order status
    'draft', // Stripe status (webhook will update to 'open' when finalized)
    orderData.totalAmount / 100, // Convert cents to euros
    orderData.totalAmount / 100, // Subtotal (we'll calculate from items later)
    0, // Tax (we'll calculate from items later)
    0, // Shipping (we'll calculate from items later)
    now, // order_date
    orderData.invoiceUrl,
    orderData.invoicePdf,
    orderData.invoiceNumber,
    null, // due_date (webhook will set this)
    shippingAddr?.street || '',
    shippingAddr?.city || '',
    shippingAddr?.zipCode || '',
    shippingAddr?.country || '',
    now,
    now
  ).run();

  console.log(`✅ Stored order ${orderData.orderId} with Stripe invoice ${orderData.stripeInvoiceId} in D1`);
}

/**
 * Store order line items in D1 database
 */
export async function storeOrderLineItems(
  db: D1Database,
  orderId: string,
  lineItems: any[]
): Promise<void> {
  if (lineItems.length === 0) return;

  const now = new Date().toISOString();
  
  // Batch insert all line items (more efficient than individual inserts)
  const lineItemInserts = lineItems.map((item: any) => {
    return db.prepare(`
      INSERT INTO order_items (
        id, order_id, product_id,
        product_name, product_sku, b2b_sku, brand, image_url,
        quantity, unit_price, total_price, tax_cents,
        shopify_variant_id, stripe_price_id, stripe_invoice_item_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      orderId,
      item.metadata?.product_id || item.metadata?.productId || '',
      item.product_name || '',
      item.sku || '',
      item.b2b_sku || '', // ✅ Store B2B SKU for historical tracking
      item.brand || '',
      item.image_url || '',
      item.quantity,
      item.unit_price_cents / 100, // Convert cents to euros
      item.total_price_cents / 100, // Convert cents to euros
      item.tax_cents,
      item.metadata?.shopify_variant_id || item.metadata?.shopifyVariantId || '',
      item.metadata?.stripe_price_id || item.metadata?.stripePriceId || '',
      item.id, // Stripe line item ID
      now
    );
  });

  await db.batch(lineItemInserts);
  console.log(`✅ Stored ${lineItems.length} order items in D1 for order ${orderId}`);
}

/**
 * Fetch user's orders (invoices) with line items from D1
 */
export async function fetchUserInvoices(
  db: D1Database,
  userId: string,
  limit = 100
): Promise<any[]> {
  // Query D1 database for user's orders (which contain invoice data)
  const ordersResult = await db.prepare(`
    SELECT 
      id,
      stripe_invoice_id,
      stripe_status,
      status as order_status,
      total_amount,
      subtotal,
      tax,
      shipping,
      shipping_cost_cents,
      invoice_pdf,
      invoice_url,
      invoice_number,
      due_date,
      paid_at,
      order_date,
      created_at,
      updated_at
    FROM orders
    WHERE user_id = ? AND stripe_invoice_id IS NOT NULL
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(userId, limit).all();

  console.log(`📋 Fetched ${ordersResult.results?.length || 0} orders/invoices for user ${userId}`);
  
  // Fetch order items for all orders in a single query (more efficient)
  const orderIds = (ordersResult.results || []).map((order: any) => order.id);
  let lineItemsMap = new Map<string, any[]>();

  if (orderIds.length > 0) {
    // Build dynamic query with placeholders for all order IDs
    const placeholders = orderIds.map(() => '?').join(',');
    const lineItemsResult = await db.prepare(`
      SELECT 
        order_id,
        id,
        stripe_invoice_item_id,
        product_id,
        product_name,
        product_sku,
        brand,
        image_url,
        quantity,
        unit_price,
        total_price,
        tax_cents,
        shopify_variant_id,
        stripe_price_id
      FROM order_items
      WHERE order_id IN (${placeholders})
      ORDER BY created_at ASC
    `).bind(...orderIds).all();

    // Group line items by order_id
    (lineItemsResult.results || []).forEach((item: any) => {
      if (!lineItemsMap.has(item.order_id)) {
        lineItemsMap.set(item.order_id, []);
      }
      lineItemsMap.get(item.order_id)!.push(item);
    });

    console.log(`📦 Fetched line items for ${lineItemsMap.size} orders`);
  }
  
  // Transform to frontend format (camelCase) and attach line items
  return (ordersResult.results || []).map((order: any) => {
    const items = (lineItemsMap.get(order.id) || []).map((item: any) => ({
      id: item.id,
      stripeLineItemId: item.stripe_invoice_item_id,
      productId: item.product_id,
      productName: item.product_name,
      sku: item.product_sku,
      brand: item.brand,
      imageUrl: item.image_url,
      quantity: item.quantity,
      unitPrice: item.unit_price, // Already in euros
      totalPrice: item.total_price, // Already in euros
      tax: item.tax_cents ? item.tax_cents / 100 : 0, // Convert cents to euros
      currency: 'eur',
      metadata: {
        shopifyVariantId: item.shopify_variant_id,
        stripePriceId: item.stripe_price_id,
        productId: item.product_id,
      },
    }));

    // Calculate totals from line items if available
    const subtotal = items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
    const totalTax = items.reduce((sum: number, item: any) => sum + (item.tax || 0), 0);

    return {
      id: order.id,
      stripeInvoiceId: order.stripe_invoice_id,
      status: order.stripe_status || order.order_status,
      amount: order.total_amount * 100, // Convert euros to cents for consistency
      amountPaid: order.paid_at ? order.total_amount * 100 : 0,
      currency: 'eur',
      invoicePdf: order.invoice_pdf,
      hostedInvoiceUrl: order.invoice_url,
      invoiceNumber: order.invoice_number,
      dueDate: order.due_date,
      paidAt: order.paid_at,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      
      // Financial breakdown
      subtotal: order.subtotal || subtotal, // Use DB value if available, else calculate
      tax: order.tax || totalTax, // Tax in euros (from DB or calculated)
      shipping: order.shipping || 0, // Shipping in euros
      shippingCents: order.shipping_cost_cents || 0, // Shipping in cents (for precision)
      totalAmount: order.total_amount, // Total in euros
      
      items, // ⭐ Include line items with historical pricing
    };
  });
}