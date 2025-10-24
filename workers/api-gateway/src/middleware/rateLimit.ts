/**
 * Rate Limiting Middleware
 * 
 * Uses hono-rate-limiter for robust rate limiting based on IP address
 */

import { rateLimiter } from 'hono-rate-limiter';
import type { Context, Next, MiddlewareHandler } from 'hono';
import type { Env } from '../types';

/**
 * Rate Limiting Middleware Factory
 * 
 * Creates rate limiter middleware with the following config:
 * - 100 requests per minute per IP address
 * - Automatic cleanup of expired entries
 * - Returns 429 status with rate limit headers when limit exceeded
 * 
 * Note: We create the limiter lazily (on first request) to avoid 
 * global scope issues with Cloudflare Workers
 */
let limiter: MiddlewareHandler | null = null;

export async function rateLimitMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  // Lazy initialization on first request to avoid global scope issues
  if (!limiter) {
    limiter = rateLimiter({
      windowMs: 60 * 1000, // 1 minute
      limit: 100, // 100 requests per window
      standardHeaders: 'draft-6', // Return rate limit info in headers (RateLimit-*)
      keyGenerator: (c: Context) => {
        // Use Cloudflare's connecting IP header for accurate client identification
        return c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For') || 
               'unknown';
      },
      handler: (c: Context) => {
        return c.json(
          {
            error: 'Too Many Requests',
            code: 'rate-limit/exceeded',
            message: 'Rate limit exceeded. Please try again later.',
            statusCode: 429,
          },
          429
        );
      },
    }) as MiddlewareHandler;
  }
  
  return limiter(c as any, next);
}
