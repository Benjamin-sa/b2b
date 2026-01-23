/**
 * API Gateway - Orchestration Layer with Service Bindings
 *
 * This gateway orchestrates multi-service workflows using Cloudflare Service Bindings
 * for direct worker-to-worker communication (no HTTP overhead).
 *
 * Architecture:
 * Client → API Gateway (orchestrates) → Services (via bindings)
 *
 * Responsibilities:
 * ✅ Multi-service orchestration (e.g., register + email)
 * ✅ CORS handling for browser requests
 * ✅ Request/response logging for monitoring
 * ✅ Rate limiting to prevent abuse
 * ✅ Error handling for service failures
 * ✅ Critical vs. non-critical operation handling
 *
 */
import { Hono } from 'hono';
import type { Env, ContextVariables } from './types';
import { corsMiddleware } from './middleware/cors';
import { loggingMiddleware } from './middleware/logging';
import { rateLimitMiddleware } from './middleware/rateLimit';
import authOrchestration from './routes/auth.orchestration';
import productsOrchestration from './routes/products.orchestration';
import categoriesOrchestration from './routes/categories.orchestration';
import invoicesOrchestration from './routes/invoices.orchestration';
import adminOrchestration from './routes/admin.orchestration';

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
    version: '2.0.0',
    architecture: 'Microservices - Orchestration with Service Bindings',
    status: 'healthy',
    environment: c.env.ENVIRONMENT,
    description: 'Orchestrates multi-service workflows using service bindings',
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
// AUTH ROUTES → Orchestration Layer
// ============================================================================
// Auth routes with orchestration (register + email, password-reset + email)
app.route('/auth', authOrchestration);

// ============================================================================
// PRODUCTS ROUTES → Inventory Service (via Orchestration)
// ============================================================================
// Product routes proxied to inventory service via service binding
app.route('/api/products', productsOrchestration);

// ============================================================================
// CATEGORIES ROUTES → Inventory Service (via Orchestration)
// ============================================================================
// Category routes proxied to inventory service via service binding
app.route('/api/categories', categoriesOrchestration);

// ============================================================================
// INVOICES ROUTES → Stripe Service (via Orchestration)
// ============================================================================
// Invoice creation routes orchestrated to stripe service via service binding
app.route('/api/invoices', invoicesOrchestration);

// ============================================================================
// SHOPIFY ROUTES → Shopify Sync Service (via Service Binding)
// ============================================================================
// Shopify product search - direct service binding to shopify-sync-service
app.all('/api/shopify/*', async (c) => {
  const path = c.req.path.replace('/api/shopify', '');

  // ✅ CRITICAL: Preserve query parameters when forwarding request
  const url = new URL(c.req.url);
  const queryString = url.search; // Includes the '?' prefix
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
// ADMIN ROUTES → Auth Service (via Orchestration)
// ============================================================================
// Admin routes with orchestration (user verification + email)
app.route('/admin', adminOrchestration);

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
