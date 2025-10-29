/**
 * Stripe Service Worker - Main Entry Point
 * 
 * Centralized Stripe service for B2B platform
 * Provides service binding interface for:
 * - Customer management
 * - Product management
 * - Invoice creation
 * 
 * Used by: auth-service, inventory-service, order-service (future)
 */

import { Hono } from 'hono';
import { createServiceAuthMiddleware } from '../../shared-types/service-auth';
import type { Env, StripeServiceResponse } from './types';
import { StripeServiceError } from './types';

// Import services
import * as CustomerService from './services/customer.service';
import * as ProductService from './services/product.service';
import * as InvoiceService from './services/invoice.service';

// Import routes
import webhooksRoutes from './routes/webhooks.routes';

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// GLOBAL MIDDLEWARE
// ============================================================================

// 🔐 Service authentication - blocks direct HTTP access in production
app.use('*', createServiceAuthMiddleware({
  allowedPaths: ['/', '/health', '/webhooks'], // Allow webhooks (Stripe calls them directly)
}));

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/', (c) => {
  return c.json({
    service: 'B2B Stripe Service',
    version: '1.0.0',
    status: 'healthy',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// CUSTOMER ROUTES
// ============================================================================

// Create customer
app.post('/customers', async (c) => {
  try {
    const input = await c.req.json();
    const customerId = await CustomerService.createCustomer(c.env, input);
    
    return c.json<StripeServiceResponse>({
      success: true,
      data: { customer_id: customerId },
    });
  } catch (error: any) {
    return handleError(c, error);
  }
});

// Update customer
app.put('/customers', async (c) => {
  try {
    const input = await c.req.json();
    await CustomerService.updateCustomer(c.env, input);
    
    return c.json<StripeServiceResponse>({
      success: true,
      data: { message: 'Customer updated successfully' },
    });
  } catch (error: any) {
    return handleError(c, error);
  }
});

// Archive customer
app.delete('/customers/:id', async (c) => {
  try {
    const customerId = c.req.param('id');
    const { user_id, reason } = await c.req.json();
    
    await CustomerService.archiveCustomer(c.env, customerId, user_id, reason);
    
    return c.json<StripeServiceResponse>({
      success: true,
      data: { message: 'Customer archived successfully' },
    });
  } catch (error: any) {
    return handleError(c, error);
  }
});

// Get or create customer
app.post('/customers/get-or-create', async (c) => {
  try {
    const input = await c.req.json();
    const customerId = await CustomerService.getOrCreateCustomer(c.env, input);
    
    return c.json<StripeServiceResponse>({
      success: true,
      data: { customer_id: customerId },
    });
  } catch (error: any) {
    return handleError(c, error);
  }
});

// ============================================================================
// PRODUCT ROUTES
// ============================================================================

// Create product with price
app.post('/products', async (c) => {
  try {
    const input = await c.req.json();
    const result = await ProductService.createProductWithPrice(c.env, input);
    
    return c.json<StripeServiceResponse>({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return handleError(c, error);
  }
});

// Update product
app.put('/products', async (c) => {
  try {
    const input = await c.req.json();
    await ProductService.updateProduct(c.env, input);
    
    return c.json<StripeServiceResponse>({
      success: true,
      data: { message: 'Product updated successfully' },
    });
  } catch (error: any) {
    return handleError(c, error);
  }
});

// Replace price
app.put('/products/price', async (c) => {
  try {
    const input = await c.req.json();
    const newPriceId = await ProductService.replacePrice(c.env, input);
    
    return c.json<StripeServiceResponse>({
      success: true,
      data: { new_price_id: newPriceId },
    });
  } catch (error: any) {
    return handleError(c, error);
  }
});

// Archive product
app.delete('/products/:id', async (c) => {
  try {
    const productId = c.req.param('id');
    const { price_id } = await c.req.json();
    
    await ProductService.archiveProduct(c.env, productId, price_id);
    
    return c.json<StripeServiceResponse>({
      success: true,
      data: { message: 'Product archived successfully' },
    });
  } catch (error: any) {
    return handleError(c, error);
  }
});

// Get price
app.get('/products/price/:id', async (c) => {
  try {
    const priceId = c.req.param('id');
    const price = await ProductService.getPrice(c.env, priceId);
    
    return c.json<StripeServiceResponse>({
      success: true,
      data: {
        id: price.id,
        unit_amount: price.unit_amount,
        currency: price.currency,
        active: price.active,
      },
    });
  } catch (error: any) {
    return handleError(c, error);
  }
});

// ============================================================================
// INVOICE ROUTES
// ============================================================================

// Create invoice with items
app.post('/invoices', async (c) => {
  try {
    const input = await c.req.json();
    const invoice = await InvoiceService.createInvoiceWithItems(c.env, input);
    
    return c.json<StripeServiceResponse>({
      success: true,
      data: invoice,
    });
  } catch (error: any) {
    return handleError(c, error);
  }
});

// Void invoice
app.post('/invoices/:id/void', async (c) => {
  try {
    const invoiceId = c.req.param('id');
    await InvoiceService.voidInvoice(c.env, invoiceId);
    
    return c.json<StripeServiceResponse>({
      success: true,
      data: { message: 'Invoice voided successfully' },
    });
  } catch (error: any) {
    return handleError(c, error);
  }
});

// Get invoice
app.get('/invoices/:id', async (c) => {
  try {
    const invoiceId = c.req.param('id');
    const invoice = await InvoiceService.getInvoice(c.env, invoiceId);
    
    return c.json<StripeServiceResponse>({
      success: true,
      data: {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amount_due: invoice.amount_due,
        currency: invoice.currency,
        invoice_pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
      },
    });
  } catch (error: any) {
    return handleError(c, error);
  }
});

// ============================================================================
// WEBHOOK ROUTES
// ============================================================================

// Register webhook routes (handles Stripe webhook events)
app.route('/webhooks', webhooksRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

function handleError(c: any, error: any) {
  console.error('[Stripe Service Error]', error);

  if (error instanceof StripeServiceError) {
    return c.json<StripeServiceResponse>(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
      error.statusCode
    );
  }

  return c.json<StripeServiceResponse>(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    },
    500
  );
}

app.notFound((c) => {
  return c.json<StripeServiceResponse>(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested endpoint does not exist',
      },
    },
    404
  );
});

app.onError((err, c) => {
  return handleError(c, err);
});

export default app;
