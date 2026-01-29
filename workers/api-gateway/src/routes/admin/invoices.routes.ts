/**
 * Admin Invoice Routes - Direct Database Operations
 *
 * Allows admins to view all invoices/orders from all customers using direct D1 access.
 * Provides pagination, filtering, and sorting capabilities.
 */

import { Hono } from 'hono';
import type { Env } from '../../types';
import { adminMiddleware, type AuthenticatedUser } from '../../middleware/auth';
import { createDb } from '@b2b/db';
import { sql, eq, and, like, or, gte, lte, desc, asc } from '@b2b/db';
import { orders, users, order_items, products } from '@b2b/db/schema';

const invoicesRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>();

// Apply admin middleware to all routes
invoicesRoutes.use('*', adminMiddleware);

// ============================================================================
// LIST ALL INVOICES
// ============================================================================

/**
 * GET /admin/invoices
 * Fetch all invoices with pagination, filtering, and user details
 */
invoicesRoutes.get('/', async (c) => {
  try {
    // Parse query parameters
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
    const status = c.req.query('status');
    const userId = c.req.query('user_id');
    const search = c.req.query('search');
    const dateFrom = c.req.query('date_from');
    const dateTo = c.req.query('date_to');
    const sortField = c.req.query('sort') || 'created_at';
    const sortOrder = c.req.query('order') || 'desc';

    const offset = (page - 1) * limit;

    console.log('🎯 [Admin Invoices] Fetching invoices, page:', page, 'limit:', limit);

    const db = createDb(c.env.DB);

    // Build query with joins
    const conditions: any[] = [];

    if (status) {
      conditions.push(eq(orders.status, status));
    }

    if (userId) {
      conditions.push(eq(orders.user_id, userId));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          like(orders.invoice_number, searchPattern),
          like(users.email, searchPattern),
          like(users.company_name, searchPattern),
          like(orders.shipping_address_company, searchPattern)
        )
      );
    }

    if (dateFrom) {
      conditions.push(gte(orders.created_at, dateFrom));
    }

    if (dateTo) {
      conditions.push(lte(orders.created_at, dateTo));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Validate sort field and order
    const allowedSortFields: Record<string, any> = {
      created_at: orders.created_at,
      total_amount: orders.total_amount,
      status: orders.status,
      invoice_number: orders.invoice_number,
    };

    const validSortField = allowedSortFields[sortField] || orders.created_at;
    const orderFn = sortOrder.toLowerCase() === 'asc' ? asc : desc;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .leftJoin(users, eq(orders.user_id, users.id))
      .where(whereClause)
      .get();

    const total = countResult?.count || 0;

    // Get paginated invoices with user details
    let query = db
      .select({
        id: orders.id,
        user_id: orders.user_id,
        invoice_number: orders.invoice_number,
        stripe_invoice_id: orders.stripe_invoice_id,
        total_amount: orders.total_amount,
        subtotal: orders.subtotal,
        tax: orders.tax,
        shipping: orders.shipping,
        status: orders.status,
        stripe_status: orders.stripe_status,
        order_date: orders.order_date,
        created_at: orders.created_at,
        updated_at: orders.updated_at,
        paid_at: orders.paid_at,
        due_date: orders.due_date,
        invoice_url: orders.invoice_url,
        invoice_pdf: orders.invoice_pdf,
        shipping_address_company: orders.shipping_address_company,
        shipping_address_contact: orders.shipping_address_contact,
        shipping_address_street: orders.shipping_address_street,
        shipping_address_city: orders.shipping_address_city,
        shipping_address_country: orders.shipping_address_country,
        customer_email: users.email,
        customer_company: users.company_name,
        customer_first_name: users.first_name,
        customer_last_name: users.last_name,
      })
      .from(orders)
      .leftJoin(users, eq(orders.user_id, users.id))
      .$dynamic();

    if (whereClause) {
      query = query.where(whereClause);
    }

    const invoices = await query.orderBy(orderFn(validSortField)).limit(limit).offset(offset);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    console.log('✅ [Admin Invoices] Fetched', invoices.length, 'invoices of', total, 'total');

    return c.json({
      success: true,
      data: {
        invoices,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
        filters: {
          status,
          userId,
          search,
          dateFrom,
          dateTo,
        },
        sort: {
          field: sortField,
          order: sortOrder.toUpperCase(),
        },
      },
    });
  } catch (error: any) {
    console.error('❌ [Admin Invoices] Failed to fetch invoices:', error);
    return c.json(
      {
        error: 'Failed to fetch invoices',
        code: 'admin/fetch-invoices-failed',
        message: error.message,
      },
      500
    );
  }
});

// ============================================================================
// GET INVOICE BY ID
// ============================================================================

/**
 * GET /admin/invoices/:id
 * Get detailed invoice information including line items
 */
invoicesRoutes.get('/:id', async (c) => {
  try {
    const invoiceId = c.req.param('id');

    console.log('🎯 [Admin Invoices] Fetching invoice:', invoiceId);

    const db = createDb(c.env.DB);

    // Get invoice with user details using Drizzle
    const invoiceData = await db
      .select({
        // Order fields
        id: orders.id,
        user_id: orders.user_id,
        invoice_number: orders.invoice_number,
        stripe_invoice_id: orders.stripe_invoice_id,
        total_amount: orders.total_amount,
        subtotal: orders.subtotal,
        tax: orders.tax,
        shipping: orders.shipping,
        status: orders.status,
        stripe_status: orders.stripe_status,
        order_date: orders.order_date,
        created_at: orders.created_at,
        updated_at: orders.updated_at,
        paid_at: orders.paid_at,
        due_date: orders.due_date,
        invoice_url: orders.invoice_url,
        invoice_pdf: orders.invoice_pdf,
        notes: orders.notes,
        payment_method: orders.payment_method,
        tracking_number: orders.tracking_number,
        estimated_delivery: orders.estimated_delivery,
        // Shipping address
        shipping_address_company: orders.shipping_address_company,
        shipping_address_contact: orders.shipping_address_contact,
        shipping_address_street: orders.shipping_address_street,
        shipping_address_state: orders.shipping_address_state,
        shipping_address_zip_code: orders.shipping_address_zip_code,
        shipping_address_city: orders.shipping_address_city,
        shipping_address_country: orders.shipping_address_country,
        shipping_address_phone: orders.shipping_address_phone,
        // Customer details
        customer_email: users.email,
        customer_company: users.company_name,
        customer_first_name: users.first_name,
        customer_last_name: users.last_name,
        customer_phone: users.phone,
        customer_btw: users.btw_number,
      })
      .from(orders)
      .leftJoin(users, eq(orders.user_id, users.id))
      .where(eq(orders.id, invoiceId))
      .get();

    if (!invoiceData) {
      return c.json(
        {
          error: 'Invoice not found',
          code: 'admin/invoice-not-found',
        },
        404
      );
    }

    // Get order items with product details
    const items = await db
      .select({
        id: order_items.id,
        order_id: order_items.order_id,
        product_id: order_items.product_id,
        quantity: order_items.quantity,
        unit_price: order_items.unit_price,
        total_price: order_items.total_price,
        tax_cents: order_items.tax_cents,
        // Denormalized fields from order_items (fallback if product deleted)
        product_name: order_items.product_name,
        product_sku: order_items.product_sku,
        b2b_sku: order_items.b2b_sku,
        image_url: order_items.image_url,
        created_at: order_items.created_at,
        // Product details (if product still exists)
        current_product_name: products.name,
        current_product_sku: products.part_number,
        current_product_image: products.image_url,
      })
      .from(order_items)
      .leftJoin(products, eq(order_items.product_id, products.id))
      .where(eq(order_items.order_id, invoiceId))
      .orderBy(asc(order_items.created_at));

    // Map items to use current product data if available, otherwise use denormalized data
    const mappedItems = items.map((item) => ({
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      tax_cents: item.tax_cents,
      product_name: item.current_product_name || item.product_name,
      product_sku: item.current_product_sku || item.product_sku,
      b2b_sku: item.b2b_sku,
      product_image: item.current_product_image || item.image_url,
      created_at: item.created_at,
    }));

    console.log('✅ [Admin Invoices] Fetched invoice with', mappedItems.length, 'items');

    return c.json({
      success: true,
      data: {
        invoice: invoiceData,
        items: mappedItems,
      },
    });
  } catch (error: any) {
    console.error('❌ [Admin Invoices] Failed to fetch invoice details:', error);
    return c.json(
      {
        error: 'Failed to fetch invoice details',
        code: 'admin/fetch-invoice-failed',
        message: error.message,
      },
      500
    );
  }
});

// ============================================================================
// INVOICE STATISTICS
// ============================================================================

/**
 * GET /admin/invoices/stats/summary
 * Get summary statistics for dashboard
 */
invoicesRoutes.get('/stats/summary', async (c) => {
  try {
    console.log('🎯 [Admin Invoices] Fetching statistics');

    const db = createDb(c.env.DB);

    // Get overall statistics using Drizzle
    const stats = await db
      .select({
        total_invoices: sql<number>`count(*)`,
        pending_count: sql<number>`sum(case when ${orders.status} = 'pending' then 1 else 0 end)`,
        confirmed_count: sql<number>`sum(case when ${orders.status} = 'confirmed' then 1 else 0 end)`,
        processing_count: sql<number>`sum(case when ${orders.status} = 'processing' then 1 else 0 end)`,
        shipped_count: sql<number>`sum(case when ${orders.status} = 'shipped' then 1 else 0 end)`,
        delivered_count: sql<number>`sum(case when ${orders.status} = 'delivered' then 1 else 0 end)`,
        cancelled_count: sql<number>`sum(case when ${orders.status} = 'cancelled' then 1 else 0 end)`,
        total_revenue: sql<number>`coalesce(sum(${orders.total_amount}), 0)`,
        average_order_value: sql<number>`coalesce(avg(${orders.total_amount}), 0)`,
      })
      .from(orders)
      .get();

    // Get recent invoices statistics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    const recentStats = await db
      .select({
        recent_count: sql<number>`count(*)`,
        recent_revenue: sql<number>`coalesce(sum(${orders.total_amount}), 0)`,
      })
      .from(orders)
      .where(gte(orders.created_at, thirtyDaysAgoISO))
      .get();

    console.log('✅ [Admin Invoices] Fetched statistics');

    return c.json({
      success: true,
      data: {
        overall: stats,
        recent: recentStats,
      },
    });
  } catch (error: any) {
    console.error('❌ [Admin Invoices] Failed to fetch statistics:', error);
    return c.json(
      {
        error: 'Failed to fetch statistics',
        code: 'admin/fetch-stats-failed',
        message: error.message,
      },
      500
    );
  }
});

export default invoicesRoutes;
