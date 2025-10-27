import { Hono } from 'hono';
import type { Env } from './types';
import notifications from './routes/notifications.routes';

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// GLOBAL MIDDLEWARE
// ============================================================================
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  console.log(`[${c.req.method}] ${c.req.url} - ${c.res.status} (${duration}ms)`);
});

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/', (c) => {
  return c.json({
    service: 'Telegram Notification Service',
    version: '1.0.0',
    status: 'healthy',
    environment: c.env.ENVIRONMENT,
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
// ROUTES
// ============================================================================
app.route('/notifications', notifications);

// ============================================================================
// ERROR HANDLING
// ============================================================================
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      code: 'telegram/not-found',
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404
  );
});

app.onError((err, c) => {
  console.error('[Telegram Service Error]', err);
  return c.json(
    {
      error: 'Internal Server Error',
      code: 'telegram/internal-error',
      message: err.message || 'An unexpected error occurred',
    },
    500
  );
});

export default app;
