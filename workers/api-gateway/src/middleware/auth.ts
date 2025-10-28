/**
 * Auth Middleware
 * 
 * Validates user tokens via AUTH_SERVICE and attaches user data to request context
 */

import type { Context, Next } from 'hono';
import type { Env } from '../types';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  stripeCustomerId: string | null;
}

/**
 * Validate user token via AUTH_SERVICE and get user details
 * 
 * Uses Cloudflare Service Bindings for direct worker-to-worker communication
 */
async function validateUserToken(env: Env, authHeader: string | null): Promise<AuthenticatedUser> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.substring(7);
  
  // Use service binding for direct worker-to-worker call
  // Note: Service bindings are much faster than HTTP requests
  const validateRequest = new Request('http://auth-service/auth/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: token }), // Auth service expects 'accessToken', not 'token'
  });

  const validateResponse = await env.AUTH_SERVICE.fetch(validateRequest);
  
  if (!validateResponse.ok) {
    const errorText = await validateResponse.text();
    throw new Error(`Token validation failed: ${errorText}`);
  }

  const validationData = await validateResponse.json() as { 
    valid: boolean;
    user: { 
      uid: string; 
      email: string; 
      stripeCustomerId?: string;
    };
    sessionId: string;
    validatedAt: string;
  };
  
  if (!validationData.valid || !validationData.user || !validationData.user.uid) {
    throw new Error('Invalid user data from auth service');
  }

  return { 
    userId: validationData.user.uid, 
    email: validationData.user.email,
    stripeCustomerId: validationData.user.stripeCustomerId || null,
  };
}

/**
 * Auth Middleware - validates JWT and attaches user to context
 * 
 * Usage:
 * app.use('/protected/*', authMiddleware);
 * app.get('/protected/profile', (c) => {
 *   const user = c.get('user'); // AuthenticatedUser
 *   return c.json({ user });
 * });
 */
export async function authMiddleware(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>, next: Next) {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const user = await validateUserToken(c.env, authHeader);
    
    // Attach user to context for use in route handlers
    c.set('user', user);
    
    await next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    
    return c.json({ 
      error: 'unauthenticated',
      message: errorMessage 
    }, 401);
  }
}

/**
 * Auth middleware that also requires Stripe customer ID
 * 
 * Use this for routes that need Stripe operations (like invoice creation)
 */
export async function requireStripeCustomerMiddleware(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>, next: Next) {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const user = await validateUserToken(c.env, authHeader);
    
    if (!user.stripeCustomerId) {
      return c.json({ 
        error: 'failed-precondition',
        message: 'User must have a Stripe customer ID. Please complete your profile first.' 
      }, 400);
    }
    
    // Attach user to context for use in route handlers
    c.set('user', user);
    
    await next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    
    return c.json({ 
      error: 'unauthenticated',
      message: errorMessage 
    }, 401);
  }
}