/**
 * Auth Middleware
 *
 * Validates user tokens directly using JWT verification and attaches user data to request context
 */

import type { Context, Next } from 'hono';
import type { Env } from '../types';
import { verifyAccessToken, extractBearerToken } from '../utils/jwt';
import { createDb } from '@b2b/db';
import { getSessionById, updateSessionActivity } from '@b2b/db/operations/sessions';
import { getUserById } from '@b2b/db/operations/users';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: 'admin' | 'customer';
  stripeCustomerId: string | null;
  isVerified: boolean;
  isActive: boolean;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
}

/**
 * Validate user token via direct JWT verification
 */
async function validateUserToken(
  env: Env,
  authHeader: string | undefined
): Promise<AuthenticatedUser> {
  const token = extractBearerToken(authHeader);

  if (!token) {
    throw new Error('Missing or invalid Authorization header');
  }

  // Verify JWT token
  const payload = await verifyAccessToken(token, env.JWT_SECRET);

  // Verify session is still valid in database
  const db = createDb(env.DB);
  const session = await getSessionById(db, payload.sessionId);

  if (!session || new Date(session.expires_at) < new Date()) {
    throw new Error('Session expired or invalid');
  }

  // Get fresh user data from database
  const user = await getUserById(db, payload.uid);

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.is_active) {
    throw new Error('Account is deactivated');
  }

  // Update session activity
  await updateSessionActivity(db, session.id);

  return {
    userId: user.id,
    email: user.email,
    role: user.role as 'admin' | 'customer',
    stripeCustomerId: user.stripe_customer_id ?? null,
    isVerified: user.is_verified === 1,
    isActive: user.is_active === 1,
    firstName: user.first_name ?? null,
    lastName: user.last_name ?? null,
    companyName: user.company_name ?? null,
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
export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>,
  next: Next
) {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await validateUserToken(c.env, authHeader);

    // Attach user to context for use in route handlers
    c.set('user', user);

    await next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';

    return c.json(
      {
        error: 'unauthenticated',
        message: errorMessage,
      },
      401
    );
  }
}

/**
 * Auth middleware that also requires Stripe customer ID
 *
 * Use this for routes that need Stripe operations (like invoice creation)
 */
export async function requireStripeCustomerMiddleware(
  c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>,
  next: Next
) {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await validateUserToken(c.env, authHeader);

    if (!user.stripeCustomerId) {
      return c.json(
        {
          error: 'failed-precondition',
          message: 'User must have a Stripe customer ID. Please complete your profile first.',
        },
        400
      );
    }

    // Attach user to context for use in route handlers
    c.set('user', user);

    await next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';

    return c.json(
      {
        error: 'unauthenticated',
        message: errorMessage,
      },
      401
    );
  }
}

/**
 * Admin-only middleware - requires admin role
 */
export async function adminMiddleware(
  c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>,
  next: Next
) {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await validateUserToken(c.env, authHeader);

    if (user.role !== 'admin') {
      return c.json(
        {
          error: 'forbidden',
          message: 'Admin access required',
        },
        403
      );
    }

    // Attach user to context for use in route handlers
    c.set('user', user);

    await next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';

    return c.json(
      {
        error: 'unauthenticated',
        message: errorMessage,
      },
      401
    );
  }
}

/**
 * Verified-only middleware - requires verified account
 */
export async function verifiedMiddleware(
  c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>,
  next: Next
) {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await validateUserToken(c.env, authHeader);

    if (!user.isVerified) {
      return c.json(
        {
          error: 'failed-precondition',
          message: 'Account must be verified to access this resource',
        },
        403
      );
    }

    // Attach user to context for use in route handlers
    c.set('user', user);

    await next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';

    return c.json(
      {
        error: 'unauthenticated',
        message: errorMessage,
      },
      401
    );
  }
}
