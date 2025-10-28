/**
 * Admin Invoice Routes
 * 
 * Allows admins to view all invoices/orders from all customers
 * Provides pagination, filtering, and sorting capabilities
 */

import { Hono } from 'hono';
import type { Env } from '../../types';

const invoicesRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /admin/invoices
 * Fetch all invoices with pagination and filtering
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - status: Filter by status (pending, confirmed, processing, shipped, delivered, cancelled, refunded)
 * - user_id: Filter by specific user
 * - search: Search by invoice number, customer email, or company name
 * - date_from: Filter by date range (ISO format)
 * - date_to: Filter by date range (ISO format)
 * - sort: Sort field (created_at, total_amount, status) - default: created_at
 * - order: Sort order (asc, desc) - default: desc
 */
invoicesRoutes.get('/', async (c) => {
  try {
    // Parse query parameters
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const status = c.req.query('status');
    const userId = c.req.query('user_id');
    const search = c.req.query('search');
    const dateFrom = c.req.query('date_from');
    const dateTo = c.req.query('date_to');
    const sortField = c.req.query('sort') || 'created_at';
    const sortOrder = c.req.query('order') || 'desc';

    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push('o.status = ?');
      params.push(status);
    }

    if (userId) {
      conditions.push('o.user_id = ?');
      params.push(userId);
    }

    if (search) {
      conditions.push(`(
        o.invoice_number LIKE ? OR 
        u.email LIKE ? OR 
        u.company_name LIKE ? OR
        o.shipping_address_company LIKE ?
      )`);
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (dateFrom) {
      conditions.push('o.created_at >= ?');
      params.push(dateFrom);
    }

    if (dateTo) {
      conditions.push('o.created_at <= ?');
      params.push(dateTo);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // Validate sort field
    const allowedSortFields = ['created_at', 'total_amount', 'status', 'invoice_number'];
    const validSortField = allowedSortFields.includes(sortField) ? sortField : 'created_at';
    const validSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Query to get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
    `;

    const countResult = await c.env.DB.prepare(countQuery)
      .bind(...params)
      .first<{ total: number }>();

    const total = countResult?.total || 0;

    // Query to get paginated invoices with user details
    const query = `
      SELECT 
        o.id,
        o.user_id,
        o.invoice_number,
        o.stripe_invoice_id,
        o.total_amount,
        o.subtotal,
        o.tax,
        o.shipping,
        o.status,
        o.stripe_status,
        o.order_date,
        o.created_at,
        o.updated_at,
        o.paid_at,
        o.due_date,
        o.invoice_url,
        o.invoice_pdf,
        o.shipping_address_company,
        o.shipping_address_contact,
        o.shipping_address_street,
        o.shipping_address_city,
        o.shipping_address_country,
        u.email as customer_email,
        u.company_name as customer_company,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY o.${validSortField} ${validSortOrder}
      LIMIT ? OFFSET ?
    `;

    const invoices = await c.env.DB.prepare(query)
      .bind(...params, limit, offset)
      .all();

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return c.json({
      success: true,
      data: {
        invoices: invoices.results || [],
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
          field: validSortField,
          order: validSortOrder,
        },
      },
    });
  } catch (error: any) {
    console.error('[Admin Invoices] Failed to fetch invoices:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_INVOICES_FAILED',
          message: error.message || 'Failed to fetch invoices',
        },
      },
      500
    );
  }
});

/**
 * GET /admin/invoices/:id
 * Get detailed invoice information including line items
 */
invoicesRoutes.get('/:id', async (c) => {
  try {
    const invoiceId = c.req.param('id');

    // Get invoice with user details
    const invoice = await c.env.DB.prepare(`
      SELECT 
        o.*,
        u.email as customer_email,
        u.company_name as customer_company,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        u.phone as customer_phone,
        u.btw_number as customer_btw
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `)
      .bind(invoiceId)
      .first();

    if (!invoice) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVOICE_NOT_FOUND',
            message: 'Invoice not found',
          },
        },
        404
      );
    }

    // Get order items
    const items = await c.env.DB.prepare(`
      SELECT 
        oi.*,
        p.name as product_name,
        p.sku as product_sku,
        p.image_url as product_image
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
      ORDER BY oi.created_at ASC
    `)
      .bind(invoiceId)
      .all();

    return c.json({
      success: true,
      data: {
        invoice,
        items: items.results || [],
      },
    });
  } catch (error: any) {
    console.error('[Admin Invoices] Failed to fetch invoice details:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_INVOICE_FAILED',
          message: error.message || 'Failed to fetch invoice details',
        },
      },
      500
    );
  }
});

/**
 * GET /admin/invoices/stats/summary
 * Get summary statistics for dashboard
 */
invoicesRoutes.get('/stats/summary', async (c) => {
  try {
    // Get overall statistics
    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_invoices,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_count,
        SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped_count,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value
      FROM orders
    `).first();

    // Get recent invoices count (last 30 days)
    const recentStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as recent_count,
        SUM(total_amount) as recent_revenue
      FROM orders
      WHERE created_at >= datetime('now', '-30 days')
    `).first();

    return c.json({
      success: true,
      data: {
        overall: stats,
        recent: recentStats,
      },
    });
  } catch (error: any) {
    console.error('[Admin Invoices] Failed to fetch statistics:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_STATS_FAILED',
          message: error.message || 'Failed to fetch statistics',
        },
      },
      500
    );
  }
});

export default invoicesRoutes;
