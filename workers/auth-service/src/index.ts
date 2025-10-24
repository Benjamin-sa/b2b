/**
 * Auth Service - Main Entry Point
 * 
 * JWT-based authentication service for B2B platform
 * Replaces Firebase Authentication with Cloudflare Workers + D1 + KV
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// GLOBAL MIDDLEWARE
// ============================================================================

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

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'B2B Auth Service',
    version: '1.0.0',
    status: 'healthy',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// AUTH ROUTES
// ============================================================================

// Mount auth routes
app.route('/auth', authRoutes);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

// Mount admin routes (protected by middleware)
app.route('/admin', adminRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: 'The requested endpoint does not exist',
      statusCode: 404,
    },
    404
  );
});

export default app;
