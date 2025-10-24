/**
 * Auth Middleware
 * 
 * Validates JWT tokens by calling the auth-service /auth/validate endpoint
 * Attaches user context to Hono context for use in route handlers
 */

import { Context, Next } from 'hono';
import type { Env, AuthValidationResponse, UserContext } from '../types';
import { createError } from '../utils/errors';

// Extend Hono context to include user
declare module 'hono' {
  interface ContextVariableMap {
    user: UserContext;
  }
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
}

/**
 * Validate token with auth-service
 */
async function validateToken(
  token: string,
  authServiceUrl: string
): Promise<AuthValidationResponse> {
  const response = await fetch(`${authServiceUrl}/auth/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accessToken: token }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createError(
      'AUTH_FAILED',
      error.message || 'Token validation failed',
      401
    );
  }

  return response.json();
}

/**
 * Middleware: Require authentication
 * 
 * Validates JWT token and attaches user context to request
 */
export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    // Extract token from Authorization header
    const authHeader = c.req.header('Authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      throw createError('NO_TOKEN', 'Authorization token is required', 401);
    }

    // Validate token with auth-service
    const validation = await validateToken(token, c.env.AUTH_SERVICE_URL);

    if (!validation.valid) {
      throw createError('INVALID_TOKEN', 'Token validation failed', 401);
    }

    // Attach user context to Hono context
    c.set('user', {
      uid: validation.user.uid,
      email: validation.user.email,
      role: validation.user.role,
      permissions: validation.permissions,
      isVerified: validation.user.isVerified,
      isActive: validation.user.isActive,
    });

    await next();
  } catch (error) {
    // Pass error to error handler
    throw error;
  }
}

/**
 * Middleware: Require admin role
 * 
 * Must be used AFTER requireAuth middleware
 * Checks if user has admin role
 */
export async function requireAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user');

  if (!user) {
    throw createError('NO_AUTH', 'Authentication required', 401);
  }

  if (user.role !== 'admin') {
    throw createError(
      'FORBIDDEN',
      'Admin access required for this operation',
      403
    );
  }

  await next();
}

/**
 * Middleware: Require specific permission
 * 
 * Must be used AFTER requireAuth middleware
 * Checks if user has a specific permission
 */
export function requirePermission(permission: string) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const user = c.get('user');

    if (!user) {
      throw createError('NO_AUTH', 'Authentication required', 401);
    }

    if (!user.permissions.includes(permission)) {
      throw createError(
        'FORBIDDEN',
        `Permission '${permission}' required for this operation`,
        403
      );
    }

    await next();
  };
}

/**
 * Middleware: Optional authentication
 * 
 * Validates token if present, but doesn't fail if missing
 * Useful for endpoints that behave differently for authenticated users
 */
export async function optionalAuth(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');
    const token = extractBearerToken(authHeader);

    if (token) {
      const validation = await validateToken(token, c.env.AUTH_SERVICE_URL);

      if (validation.valid) {
        c.set('user', {
          uid: validation.user.uid,
          email: validation.user.email,
          role: validation.user.role,
          permissions: validation.permissions,
          isVerified: validation.user.isVerified,
          isActive: validation.user.isActive,
        });
      }
    }
  } catch (error) {
    // Silently ignore auth errors for optional auth
    console.log('[Optional Auth] Token validation failed:', error);
  }

  await next();
}
