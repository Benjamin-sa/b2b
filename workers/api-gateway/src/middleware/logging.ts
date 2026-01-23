/**
 * Logging Middleware
 *
 * Logs requests and responses
 */

import type { Context, Next } from 'hono';
import type { Env } from '../types';

/**
 * Request Logging Middleware
 */
export async function loggingMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  const userAgent = c.req.header('User-Agent');
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';

  console.log(`→ ${method} ${path} from ${ip}`);

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  console.log(`← ${method} ${path} ${status} (${duration}ms)`);
}
