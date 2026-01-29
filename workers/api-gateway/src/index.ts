/**
 * API Gateway - Consolidated Backend
 *
 * Architecture:
 * - Direct D1 database operations via @b2b/db (products, categories, orders, inventory)
 * - Service bindings only for external services (Stripe, Shopify, Telegram)
 * - Email via Queue for reliability
 *
 * This replaces the microservices proxy pattern with direct database access,
 * eliminating HTTP overhead and simplifying the codebase.
 */
import { Hono } from 'hono';
import type { Env, ContextVariables } from './types';
import { corsMiddleware } from './middleware/cors';
import { loggingMiddleware } from './middleware/logging';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { authMiddleware } from './middleware/auth';

// Routes - Direct database operations
import productsRoutes from './routes/products.routes';
import categoriesRoutes from './routes/categories.routes';
import invoicesRoutes from './routes/invoices.routes';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';

const app = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

// ============================================================================
// GLOBAL MIDDLEWARE
// ============================================================================

app.use('*', loggingMiddleware);
app.use('*', corsMiddleware);
app.use('*', rateLimitMiddleware);

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/', (c) => {
  return c.json({
    service: 'B2B API Gateway',
    version: '3.0.0',
    architecture: 'Consolidated - Direct D1 via @b2b/db',
    status: 'healthy',
    environment: c.env.ENVIRONMENT,
    description: 'Unified backend with direct database access',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// AUTH ROUTES → Direct D1 Database
// ============================================================================
app.route('/auth', authRoutes);

// ============================================================================
// PRODUCTS ROUTES → Direct D1 Database (Authentication Required)
// ============================================================================
app.use('/api/products/*', authMiddleware);
app.route('/api/products', productsRoutes);

// ============================================================================
// CATEGORIES ROUTES → Direct D1 Database (Authentication Required)
// ============================================================================
app.use('/api/categories/*', authMiddleware);
app.route('/api/categories', categoriesRoutes);

// ============================================================================
// INVOICES ROUTES → Direct D1 + Stripe Service (Authentication Required)
// ============================================================================
app.use('/api/invoices/*', authMiddleware);
app.route('/api/invoices', invoicesRoutes);

// ============================================================================
// SHOPIFY ROUTES → Shopify Sync Service (external API) (Authentication Required)
// ============================================================================
app.use('/api/shopify/*', authMiddleware);
app.all('/api/shopify/*', async (c) => {
  const path = c.req.path.replace('/api/shopify', '');
  const url = new URL(c.req.url);
  const queryString = url.search;
  const fullPath = `${path || '/'}${queryString}`;

  const headers = new Headers(c.req.raw.headers);
  headers.set('X-Service-Token', c.env.SERVICE_SECRET);

  const request = new Request(`https://dummy${fullPath}`, {
    method: c.req.method,
    headers,
    body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : undefined,
  });

  return c.env.SHOPIFY_SYNC_SERVICE.fetch(request);
});

// ============================================================================
// ADMIN ROUTES → Direct D1 Database (Authentication Required)
// ============================================================================
app.use('/admin/*', authMiddleware);
app.route('/admin', adminRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      code: 'gateway/not-found',
      message: 'The requested endpoint does not exist',
      path: c.req.path,
      timestamp: new Date().toISOString(),
    },
    404
  );
});

app.onError((err, c) => {
  console.error('[Gateway Error]', err);

  return c.json(
    {
      error: 'Internal Server Error',
      code: 'gateway/internal-error',
      message: err.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    },
    500
  );
});

export default app;
