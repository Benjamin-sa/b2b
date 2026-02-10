/**
 * Shopify Sync Service
 *
 * Handles bidirectional inventory synchronization between B2B platform and Shopify
 *
 * Routes:
 * - POST /sync/:productId - Sync single product to Shopify
 * - POST /webhooks/inventory-update - Shopify inventory level webhook
 * - GET /health - Health check
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createServiceAuthMiddleware } from '@b2b/types';
import type { Env } from './types';
import { ensureWebhookRegistration } from './utils/webhook-registration';
import webhooksRoutes from './routes/webhooks.routes';
import shopifyRoutes from './routes/shopify.routes';
import inventoryRoutes from './routes/inventory.routes';
import syncRoutes from './routes/sync.routes';

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// 🔐 Service authentication - blocks direct HTTP access in production
app.use(
  '*',
  createServiceAuthMiddleware({
    allowedPaths: [
      '/',
      '/health',
      '/webhooks/inventory-update',
      '/webhooks/check',
      '/webhooks/ensure',
      '/sync/pull-all',
    ], // Allow Shopify webhooks + registration + manual sync endpoints
  })
);

// CORS
app.use(
  '*',
  cors({
    origin: (origin) => origin, // Allow all origins for webhooks
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Shopify-*'],
  })
);

// Logging
app.use('*', async (c, next) => {
  const start = Date.now();
  console.log(`➡️ ${c.req.method} ${c.req.url}`);
  await next();
  const duration = Date.now() - start;
  console.log(`⬅️ ${c.req.method} ${c.req.url} - ${c.res.status} (${duration}ms)`);
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/', (c) => {
  return c.json({
    service: 'Shopify Sync Service',
    version: '1.0.0',
    status: 'healthy',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', async (c) => {
  // Auto-ensure webhook registration on every health check
  // This guarantees webhook stays registered as long as the worker is live
  let webhookStatus: { registered: boolean; action?: string; error?: string } = {
    registered: false,
  };

  try {
    const result = await ensureWebhookRegistration(c.env);
    webhookStatus = {
      registered: true,
      action: result.action,
    };
  } catch (error: any) {
    console.error('⚠️ Failed to ensure webhook registration:', error.message);
    webhookStatus = {
      registered: false,
      error: error.message,
    };
  }

  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    webhook: webhookStatus,
  });
});

// ============================================================================
// ROUTES
// ============================================================================

app.route('/webhooks', webhooksRoutes);
app.route('/shopify', shopifyRoutes);
app.route('/inventory', inventoryRoutes);
app.route('/sync', syncRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      code: 'shopify-sync/not-found',
    },
    404
  );
});

app.onError((err, c) => {
  console.error('[Shopify Sync Error]', err);
  return c.json(
    {
      error: 'Internal Server Error',
      code: 'shopify-sync/error',
      message: err.message,
    },
    500
  );
});

export default app;
