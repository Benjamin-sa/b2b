import { eq, sql, desc, and, inArray, gte, lte, or, like } from 'drizzle-orm';
import { orders, order_items, order_item_tax_amounts } from '../schema';
import type { DbClient } from '../db';
import type {
  Order,
  NewOrder,
  OrderItem,
  NewOrderItem,
  OrderItemTaxAmount,
  NewOrderItemTaxAmount,
  OrderStatus,
  OrderWithItems,
} from '../types';

// ============================================================================
// ORDER CRUD
// ============================================================================

export async function getOrderById(db: DbClient, orderId: string): Promise<Order | undefined> {
  return db.select().from(orders).where(eq(orders.id, orderId)).get();
}

export async function getOrderByStripeInvoiceId(
  db: DbClient,
  stripeInvoiceId: string
): Promise<Order | undefined> {
  return db.select().from(orders).where(eq(orders.stripe_invoice_id, stripeInvoiceId)).get();
}

export async function createOrder(db: DbClient, data: NewOrder): Promise<Order | undefined> {
  await db.insert(orders).values(data).run();
  return getOrderById(db, data.id);
}

export async function updateOrder(
  db: DbClient,
  orderId: string,
  data: Partial<Omit<Order, 'id' | 'created_at'>>
): Promise<Order | undefined> {
  await db
    .update(orders)
    .set({ ...data, updated_at: new Date().toISOString() })
    .where(eq(orders.id, orderId))
    .run();
  return getOrderById(db, orderId);
}

export async function deleteOrder(db: DbClient, orderId: string): Promise<void> {
  // Delete related items first
  const items = await getOrderItems(db, orderId);
  for (const item of items) {
    await db
      .delete(order_item_tax_amounts)
      .where(eq(order_item_tax_amounts.order_item_id, item.id))
      .run();
  }
  await db.delete(order_items).where(eq(order_items.order_id, orderId)).run();
  await db.delete(orders).where(eq(orders.id, orderId)).run();
}

// ============================================================================
// ORDER LISTING
// ============================================================================

export interface GetOrdersOptions {
  limit?: number;
  offset?: number;
  user_id?: string;
  status?: string | string[];
  search?: string;
  from_date?: string;
  to_date?: string;
}

export interface GetOrdersResult {
  orders: Order[];
  total: number;
}

export async function getOrders(
  db: DbClient,
  options: GetOrdersOptions = {}
): Promise<GetOrdersResult> {
  const { limit = 50, offset = 0, user_id, status, search, from_date, to_date } = options;

  const conditions: any[] = [];

  if (user_id) {
    conditions.push(eq(orders.user_id, user_id));
  }

  if (status) {
    if (Array.isArray(status)) {
      conditions.push(inArray(orders.status, status));
    } else {
      conditions.push(eq(orders.status, status));
    }
  }

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        like(orders.id, searchPattern),
        like(orders.invoice_number, searchPattern),
        like(orders.shipping_address_company, searchPattern),
        like(orders.shipping_address_contact, searchPattern)
      )!
    );
  }

  if (from_date) {
    conditions.push(gte(orders.order_date, from_date));
  }

  if (to_date) {
    conditions.push(lte(orders.order_date, to_date));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [ordersList, countResult] = await Promise.all([
    whereClause
      ? db
          .select()
          .from(orders)
          .where(whereClause)
          .orderBy(desc(orders.order_date))
          .limit(limit)
          .offset(offset)
      : db.select().from(orders).orderBy(desc(orders.order_date)).limit(limit).offset(offset),
    whereClause
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(orders)
          .where(whereClause)
          .get()
      : db
          .select({ count: sql<number>`count(*)` })
          .from(orders)
          .get(),
  ]);

  return {
    orders: ordersList,
    total: countResult?.count || 0,
  };
}

export async function getOrdersByUserId(
  db: DbClient,
  userId: string,
  limit = 50,
  offset = 0
): Promise<Order[]> {
  return db
    .select()
    .from(orders)
    .where(eq(orders.user_id, userId))
    .orderBy(desc(orders.order_date))
    .limit(limit)
    .offset(offset);
}

export async function getOrdersWithItemsByUserId(
  db: DbClient,
  userId: string,
  limit = 50,
  offset = 0
): Promise<OrderWithItems[]> {
  const userOrders = await getOrdersByUserId(db, userId, limit, offset);

  const ordersWithItems: OrderWithItems[] = await Promise.all(
    userOrders.map(async (order) => {
      const items = await getOrderItems(db, order.id);
      return { ...order, items };
    })
  );

  return ordersWithItems;
}

export async function getRecentOrders(db: DbClient, limit = 10): Promise<Order[]> {
  return db.select().from(orders).orderBy(desc(orders.order_date)).limit(limit);
}

// ============================================================================
// ORDER STATUS
// ============================================================================

export async function updateOrderStatus(
  db: DbClient,
  orderId: string,
  status: OrderStatus
): Promise<Order | undefined> {
  return updateOrder(db, orderId, { status });
}

export async function updateStripeStatus(
  db: DbClient,
  orderId: string,
  stripeStatus: string,
  paidAt?: string
): Promise<Order | undefined> {
  const data: Partial<Order> = { stripe_status: stripeStatus };
  if (paidAt) {
    data.paid_at = paidAt;
  }
  return updateOrder(db, orderId, data);
}

export async function setOrderInvoice(
  db: DbClient,
  orderId: string,
  invoiceData: {
    stripe_invoice_id: string;
    invoice_number?: string;
    invoice_url?: string;
    invoice_pdf?: string;
    due_date?: string;
  }
): Promise<Order | undefined> {
  return updateOrder(db, orderId, invoiceData);
}

export async function setOrderTracking(
  db: DbClient,
  orderId: string,
  trackingNumber: string,
  estimatedDelivery?: string
): Promise<Order | undefined> {
  return updateOrder(db, orderId, {
    tracking_number: trackingNumber,
    estimated_delivery: estimatedDelivery,
    status: 'shipped',
  });
}

// ============================================================================
// ORDER ITEMS
// ============================================================================

export async function getOrderItems(db: DbClient, orderId: string): Promise<OrderItem[]> {
  return db.select().from(order_items).where(eq(order_items.order_id, orderId));
}

export async function getOrderItemById(
  db: DbClient,
  itemId: string
): Promise<OrderItem | undefined> {
  return db.select().from(order_items).where(eq(order_items.id, itemId)).get();
}

export async function createOrderItem(
  db: DbClient,
  data: NewOrderItem
): Promise<OrderItem | undefined> {
  await db.insert(order_items).values(data).run();
  return getOrderItemById(db, data.id);
}

export async function createOrderItems(db: DbClient, items: NewOrderItem[]): Promise<void> {
  if (items.length === 0) return;
  await db.insert(order_items).values(items).run();
}

export async function updateOrderItem(
  db: DbClient,
  itemId: string,
  data: Partial<Omit<OrderItem, 'id' | 'order_id' | 'created_at'>>
): Promise<OrderItem | undefined> {
  await db.update(order_items).set(data).where(eq(order_items.id, itemId)).run();
  return getOrderItemById(db, itemId);
}

export async function deleteOrderItem(db: DbClient, itemId: string): Promise<void> {
  await db
    .delete(order_item_tax_amounts)
    .where(eq(order_item_tax_amounts.order_item_id, itemId))
    .run();
  await db.delete(order_items).where(eq(order_items.id, itemId)).run();
}

// ============================================================================
// ORDER WITH ITEMS
// ============================================================================

export async function getOrderWithItems(
  db: DbClient,
  orderId: string
): Promise<OrderWithItems | null> {
  const order = await getOrderById(db, orderId);
  if (!order) return null;

  const items = await getOrderItems(db, orderId);
  return { ...order, items };
}

export async function getOrdersWithItems(
  db: DbClient,
  options: GetOrdersOptions = {}
): Promise<{ orders: OrderWithItems[]; total: number }> {
  const { orders: ordersList, total } = await getOrders(db, options);

  const ordersWithItems: OrderWithItems[] = await Promise.all(
    ordersList.map(async (order) => {
      const items = await getOrderItems(db, order.id);
      return { ...order, items };
    })
  );

  return { orders: ordersWithItems, total };
}

// ============================================================================
// ORDER ITEM TAX AMOUNTS
// ============================================================================

export async function getOrderItemTaxAmounts(
  db: DbClient,
  orderItemId: string
): Promise<OrderItemTaxAmount[]> {
  return db
    .select()
    .from(order_item_tax_amounts)
    .where(eq(order_item_tax_amounts.order_item_id, orderItemId));
}

export async function createOrderItemTaxAmount(
  db: DbClient,
  data: NewOrderItemTaxAmount
): Promise<void> {
  await db.insert(order_item_tax_amounts).values(data).run();
}

// ============================================================================
// ORDER STATISTICS
// ============================================================================

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
}

export async function getOrderStats(db: DbClient, userId?: string): Promise<OrderStats> {
  const conditions = userId ? [eq(orders.user_id, userId)] : [];

  const [totalResult, revenueResult, pendingResult, completedResult] = await Promise.all([
    conditions.length > 0
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(orders)
          .where(and(...conditions))
          .get()
      : db
          .select({ count: sql<number>`count(*)` })
          .from(orders)
          .get(),
    conditions.length > 0
      ? db
          .select({ sum: sql<number>`coalesce(sum(total_amount), 0)` })
          .from(orders)
          .where(and(...conditions))
          .get()
      : db
          .select({ sum: sql<number>`coalesce(sum(total_amount), 0)` })
          .from(orders)
          .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        conditions.length > 0
          ? and(...conditions, eq(orders.status, 'pending'))
          : eq(orders.status, 'pending')
      )
      .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        conditions.length > 0
          ? and(...conditions, eq(orders.status, 'delivered'))
          : eq(orders.status, 'delivered')
      )
      .get(),
  ]);

  return {
    totalOrders: totalResult?.count || 0,
    totalRevenue: revenueResult?.sum || 0,
    pendingOrders: pendingResult?.count || 0,
    completedOrders: completedResult?.count || 0,
  };
}

export async function getOrdersByStatus(db: DbClient): Promise<Map<string, number>> {
  const results = await db
    .select({
      status: orders.status,
      count: sql<number>`count(*)`,
    })
    .from(orders)
    .groupBy(orders.status);

  return new Map(results.map((r) => [r.status, r.count]));
}
