/**
 * CORS Middleware
 * 
 * Handles Cross-Origin Resource Sharing
 */

import type { Context, Next } from 'hono';
import type { Env } from '../types';

/**
 * CORS Middleware
 */
export async function corsMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const origin = c.req.header('Origin') || '';
  const allowedOrigins = c.env.ALLOWED_ORIGINS.split(',');

  // Check if origin is allowed
  const isAllowed = allowedOrigins.includes(origin) || c.env.ENVIRONMENT === 'development';

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400', // 24 hours
      },
    });
  }

  await next();

  // Add CORS headers to response
  if (isAllowed) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
  }
}
