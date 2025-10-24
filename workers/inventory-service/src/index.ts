/**
 * Inventory Service - Main Entry Point
 * 
 * Product management and inventory tracking for B2B platform
 * 
 * Architecture:
 * - Validates JWT tokens via auth-service
 * - Admin-only operations: CREATE, UPDATE, DELETE
 * - Public operations: GET (with optional auth for personalization)
 * 
 * Endpoints:
 * - GET    /products                 - List all products with pagination & filters
 * - GET    /products/:id             - Get single product by ID
 * - GET    /products/category/:id    - Get products by category
 * - POST   /products                 - Create product (admin only)
 * - PUT    /products/:id             - Update product (admin only)
 * - PATCH  /products/:id             - Partial update (admin only)
 * - DELETE /products/:id             - Delete product (admin only)
 * - POST   /products/:id/stock       - Update stock (admin only)
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, InventoryError } from './types';
import { loggingMiddleware } from './middleware/logging';
import productRoutes from './routes/product.routes';

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// GLOBAL MIDDLEWARE
// ============================================================================

app.use('*', loggingMiddleware);

// CORS middleware - allow requests from frontend
app.use('*', async (c, next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  
  return cors({
    origin: allowedOrigins,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400, // 24 hours
  })(c, next);
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/', (c) => {
  return c.json({
    service: 'B2B Inventory Service',
    version: '1.0.0',
    status: 'healthy',
    environment: c.env.ENVIRONMENT,
    description: 'Product management and inventory tracking',
    timestamp: new Date().toISOString(),
    features: [
      'Product CRUD operations',
      'Pagination and filtering',
      'Category-based queries',
      'JWT authentication via auth-service',
      'Admin-only write operations',
    ],
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// PRODUCT ROUTES
// ============================================================================

app.route('/products', productRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      code: 'inventory/not-found',
      message: 'The requested endpoint does not exist',
      path: c.req.path,
      timestamp: new Date().toISOString(),
    },
    404
  );
});

app.onError((err, c) => {
  console.error('[Inventory Service Error]', err);

  // Handle InventoryError
  if ((err as InventoryError).toJSON) {
    const inventoryError = err as InventoryError;
    return c.json(inventoryError.toJSON(), inventoryError.statusCode as any);
  }

  // Handle generic errors
  return c.json(
    {
      error: 'Internal Server Error',
      code: 'inventory/internal-error',
      message: err.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    },
    500
  );
});

export default app;
