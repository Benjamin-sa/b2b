/**
 * Logging Middleware
 *
 * Log all requests for monitoring and debugging
 */

import { Context, Next } from 'hono';
import type { Env } from '../types';

export async function loggingMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const start = Date.now();
  const { method, url } = c.req;

  console.log(`[Request] ${method} ${url}`);

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  console.log(`[Response] ${method} ${url} - ${status} (${duration}ms)`);
}
