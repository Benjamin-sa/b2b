/**
 * Shared Service Authentication Middleware
 *
 * Prevents direct HTTP access to workers in production.
 * Only allows calls from authorized services via service bindings.
 *
 * Usage:
 * 1. Add SERVICE_SECRET to each worker's secrets (wrangler secret put SERVICE_SECRET)
 * 2. Import and apply middleware: app.use('*', createServiceAuthMiddleware())
 * 3. API Gateway includes X-Service-Token header when calling services
 */

import type { Context, Next } from 'hono';

interface ServiceAuthOptions {
  /**
   * Paths that should bypass service auth (e.g., health checks)
   * Default: ['/', '/health']
   */
  allowedPaths?: string[];

  /**
   * Environment where service auth is enforced
   * Default: 'production'
   */
  enforceInEnv?: 'production' | 'development' | 'all';
}

/**
 * Creates service authentication middleware
 *
 * @param options Configuration options
 * @returns Hono middleware function
 */
export function createServiceAuthMiddleware(options: ServiceAuthOptions = {}) {
  const { allowedPaths = ['/', '/health'], enforceInEnv = 'production' } = options;

  return async (c: Context, next: Next) => {
    const path = c.req.path;
    const environment = c.env.ENVIRONMENT as string;

    // Skip auth for allowed paths
    if (allowedPaths.includes(path)) {
      return next();
    }

    // Determine if we should enforce auth based on environment
    const shouldEnforce =
      enforceInEnv === 'all' ||
      (enforceInEnv === 'production' && environment === 'production') ||
      (enforceInEnv === 'development' && environment === 'development');

    if (!shouldEnforce) {
      return next();
    }

    // Check for service token
    const serviceToken = c.req.header('X-Service-Token');

    if (!serviceToken) {
      console.warn('[Service Auth] Missing X-Service-Token header', {
        path,
        method: c.req.method,
        ip: c.req.header('CF-Connecting-IP'),
        userAgent: c.req.header('User-Agent'),
      });

      return c.json(
        {
          error: 'Forbidden',
          code: 'service/forbidden',
          message: 'Direct access not allowed',
        },
        403
      );
    }

    // Validate token
    const expectedToken = c.env.SERVICE_SECRET as string;

    if (!expectedToken) {
      console.error('[Service Auth] SERVICE_SECRET not configured');
      return c.json(
        {
          error: 'Internal Server Error',
          code: 'service/misconfigured',
        },
        500
      );
    }

    if (serviceToken !== expectedToken) {
      console.error('[Service Auth] Invalid service token', {
        path,
        method: c.req.method,
      });

      return c.json(
        {
          error: 'Forbidden',
          code: 'service/invalid-token',
        },
        403
      );
    }

    // Token valid, proceed
    await next();
  };
}
