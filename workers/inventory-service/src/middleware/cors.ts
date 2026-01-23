/**
 * CORS Middleware
 *
 * Handle Cross-Origin Resource Sharing for browser requests
 */

import { Context, Next } from 'hono';
import type { Env } from '../types';

export async function corsMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const allowedOrigins = c.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  const origin = c.req.header('Origin') || '';

  // Check if origin is allowed
  const isAllowed =
    allowedOrigins.includes(origin) ||
    allowedOrigins.includes('*') ||
    c.env.ENVIRONMENT === 'development';

  if (isAllowed) {
    c.header('Access-Control-Allow-Origin', origin || '*');
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    c.header('Access-Control-Max-Age', '86400'); // 24 hours
  }

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }

  await next();
}
