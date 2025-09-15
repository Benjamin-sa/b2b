import { Hono } from 'hono';
import { createInventoryRoutes } from './handlers/inventoryHandlers';
import type { Env } from './types/inventory';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin');
  const allowedOrigins = [
    'http://localhost:5173',  // Development environment
    'https://4tparts.com'     // Production domain
  ];

  // Set CORS headers
  if (origin && allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
  }
  
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key, X-Shopify-Hmac-Sha256');
  c.header('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }

  await next();
});

// Health check endpoint
app.get('/', async (c) => {
  return c.json({
    success: true,
    message: 'Inventory Service API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', async (c) => {
  try {
    // Test database connection
    const result = await c.env.DB.prepare('SELECT 1 as test').first();
    
    return c.json({
      success: true,
      status: 'healthy',
      database: result ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Add inventory routes
createInventoryRoutes(app);

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Endpoint not found',
    available_endpoints: [
      'GET / - Health check',
      'GET /health - Detailed health check',
      'GET /api/inventory - Get all inventory items',
      'GET /api/inventory/search?q={query} - Search products by name or product ID',
      'POST /api/inventory/sync-shopify - Sync products from Shopify',
      'POST /api/inventory/transfer-b2b - Transfer stock from B2C to B2B',
      'POST /api/inventory/webhook/inventory-create - Shopify product creation webhook',
      'POST /api/inventory/webhook/inventory-update - Shopify inventory update webhook'
    ]
  }, 404);
});

// Error handler
app.onError((err, c) => {
  return c.json({
    success: false,
    error: 'Internal server error',
    message: err.message
  }, 500);
});

export default app;
