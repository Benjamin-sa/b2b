/**
 * Auth Routes
 *
 * HTTP endpoints for authentication
 */

import { Hono } from 'hono';
import type {
  Env,
  RegisterRequest,
  LoginRequest,
  RefreshRequest,
  PasswordResetRequest,
  PasswordResetConfirm,
} from '../types';
import { registerUser, loginUser, userToClaims } from '../services/auth.service';
import { verifyAccessToken, verifyRefreshToken, createAccessToken } from '../utils/jwt';
import {
  getSession,
  deleteSession,
  storePasswordResetToken,
  getPasswordResetEmail,
  deletePasswordResetToken,
} from '../utils/session';
import { hashPassword, validatePassword } from '../utils/password';
import { createAuthError, AuthError, getErrorMessage } from '../utils/errors';
import { nanoid } from 'nanoid';
import { createDb } from '@b2b/db';
import * as userOps from '@b2b/db/operations';

const auth = new Hono<{ Bindings: Env }>();

// Error handler middleware
auth.onError((err, c) => {
  console.error('Auth Error:', err);

  if (err instanceof AuthError) {
    return c.json(err.toJSON(), err.statusCode as any);
  }

  return c.json(
    {
      error: 'InternalError',
      code: 'auth/internal-error',
      message: getErrorMessage(err),
      statusCode: 500,
    },
    500
  );
});

/**
 * POST /auth/register
 * Register a new user account
 */
auth.post('/register', async (c) => {
  try {
    const data = await c.req.json<RegisterRequest>();

    // Validate required fields
    if (
      !data.email ||
      !data.password ||
      !data.company_name ||
      !data.first_name ||
      !data.last_name
    ) {
      throw createAuthError(
        'MISSING_FIELDS',
        'Email, password, company name, first name, and last name are required'
      );
    }

    const userAgent = c.req.header('User-Agent');
    const ipAddress = c.req.header('CF-Connecting-IP');

    const response = await registerUser(c.env, data, userAgent, ipAddress);

    return c.json(response, 201);
  } catch (error) {
    return c.json(
      {
        error: 'InternalError',
        code: 'auth/internal-error',
        message: getErrorMessage(error),
      },
      500
    );
  }
});

/**
 * POST /auth/login
 * Authenticate with email and password
 */
auth.post('/login', async (c) => {
  try {
    const data = await c.req.json<LoginRequest>();

    if (!data.email || !data.password) {
      throw createAuthError('MISSING_FIELDS', 'Email and password are required');
    }

    const userAgent = c.req.header('User-Agent');
    const ipAddress = c.req.header('CF-Connecting-IP');

    const response = await loginUser(c.env, data, userAgent, ipAddress);

    return c.json(response);
  } catch (error) {
    return c.json(
      {
        error: 'InternalError',
        code: 'auth/internal-error',
        message: getErrorMessage(error),
      },
      500
    );
  }
});

/**
 * POST /auth/refresh
 * Exchange refresh token for new access token
 */
auth.post('/refresh', async (c) => {
  try {
    const data = await c.req.json<RefreshRequest>();

    if (!data.refreshToken) {
      throw createAuthError('MISSING_FIELDS', 'Refresh token is required');
    }

    // Verify refresh token
    const payload = await verifyRefreshToken(data.refreshToken, c.env.REFRESH_SECRET);

    // Get session from KV
    const session = await getSession(c.env.SESSIONS, payload.sessionId);

    if (!session) {
      throw createAuthError('SESSION_EXPIRED');
    }

    // Verify refresh token matches session
    if (session.refreshToken !== data.refreshToken) {
      throw createAuthError('INVALID_REFRESH_TOKEN');
    }

    // Fetch user
    const db = createDb(c.env.DB);
    const user = await userOps.getUserById(db, payload.uid);

    if (!user) {
      throw createAuthError('USER_NOT_FOUND');
    }

    // Check if user is active
    if (user.is_active === 0) {
      throw createAuthError('USER_DISABLED');
    }

    // Generate new access token
    const claims = userToClaims(user);
    const accessTokenTtl = parseInt(c.env.ACCESS_TOKEN_TTL);
    const accessToken = await createAccessToken(
      claims,
      payload.sessionId,
      c.env.JWT_SECRET,
      accessTokenTtl
    );

    return c.json({
      accessToken,
      expiresIn: accessTokenTtl,
    });
  } catch (error) {
    return c.json(
      {
        error: 'InternalError',
        code: 'auth/internal-error',
        message: getErrorMessage(error),
      },
      500
    );
  }
});

/**
 * POST /auth/logout
 * Invalidate refresh token and session
 */
auth.post('/logout', async (c) => {
  try {
    const data = await c.req.json<RefreshRequest>();

    if (!data.refreshToken) {
      throw createAuthError('MISSING_FIELDS', 'Refresh token is required');
    }

    // Verify refresh token
    const payload = await verifyRefreshToken(data.refreshToken, c.env.REFRESH_SECRET);

    // Delete session from KV
    await deleteSession(c.env.SESSIONS, payload.sessionId);

    return c.json({ message: 'Logged out successfully' });
  } catch {
    // Even if token is invalid, return success
    return c.json({ message: 'Logged out successfully' });
  }
});

/**
 * POST /auth/validate
 * Centralized token validation for all services
 *
 * Services call this endpoint to validate every request.
 */
auth.post('/validate', async (c) => {
  try {
    const data = await c.req.json<{ accessToken: string }>();
    console.log('[Auth Validate] Body received:', {
      hasAccessToken: !!data.accessToken,
      tokenLength: data.accessToken?.length,
      tokenPrefix: data.accessToken?.substring(0, 20) + '...',
    });

    if (!data.accessToken) {
      console.log('[Auth Validate] ❌ Missing access token');
      throw createAuthError('MISSING_FIELDS', 'Access token is required');
    }

    // Step 1: Verify JWT signature and decode payload
    const payload = await verifyAccessToken(data.accessToken, c.env.JWT_SECRET);

    const session = await getSession(c.env.SESSIONS, payload.sessionId);

    if (!session) {
      console.log('[Auth Validate] ❌ Session not found or expired:', payload.sessionId);
      throw createAuthError('SESSION_EXPIRED', 'Session has been revoked or expired');
    }

    const db = createDb(c.env.DB);
    const user = await userOps.getUserById(db, payload.uid);

    if (!user) {
      throw createAuthError('USER_NOT_FOUND', 'User no longer exists');
    }

    // Step 4: Check if user is still active
    if (user.is_active === 0) {
      throw createAuthError('USER_DISABLED', 'User account has been disabled');
    }

    // Build address object if any address fields exist
    const address =
      user.address_street ||
      user.address_house_number ||
      user.address_postal_code ||
      user.address_city ||
      user.address_country
        ? {
            street: user.address_street || '',
            houseNumber: user.address_house_number || '',
            postalCode: user.address_postal_code || '',
            city: user.address_city || '',
            country: user.address_country || '',
          }
        : undefined;

    const validationResponse = {
      valid: true,
      user: {
        uid: user.id,
        email: user.email,
        role: user.role,
        companyName: user.company_name,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone || undefined,
        btwNumber: user.btw_number || undefined,
        stripeCustomerId: user.stripe_customer_id || undefined,
        address,
        isVerified: user.is_verified === 1,
        isActive: user.is_active === 1,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      sessionId: payload.sessionId,
      validatedAt: new Date().toISOString(),
    };

    return c.json(validationResponse);
  } catch (error) {
    if (error instanceof Error && error.message.includes('expired')) {
      throw createAuthError('TOKEN_EXPIRED', 'Access token has expired');
    }
    if (error instanceof AuthError) {
      throw error;
    }
    throw createAuthError('INVALID_TOKEN', 'Invalid access token');
  }
});

/**
 * POST /auth/password-reset/request
 * Request a password reset email
 */
auth.post('/password-reset/request', async (c) => {
  try {
    const data = await c.req.json<PasswordResetRequest>();

    if (!data.email) {
      throw createAuthError('MISSING_FIELDS', 'Email is required');
    }

    // Check if user exists
    const db = createDb(c.env.DB);
    const user = await userOps.getUserByEmail(db, data.email.toLowerCase());

    // Always return success even if user doesn't exist (security best practice)
    if (user) {
      const resetToken = nanoid(32);

      // Store in KV with 1 hour TTL
      await storePasswordResetToken(c.env.SESSIONS, user.email, resetToken, 3600);

      // Return token and firstName for email service
      return c.json({
        message: 'Password reset email will be sent',
        resetToken,
        firstName: user.first_name,
      });
    }

    return c.json({
      message: 'Password reset email will be sent',
    });
  } catch (error) {
    return c.json(
      {
        error: 'InternalError',
        code: 'auth/internal-error',
        message: getErrorMessage(error),
      },
      500
    );
  }
});

/**
 * POST /auth/password-reset/confirm
 * Confirm password reset with token
 */
auth.post('/password-reset/confirm', async (c) => {
  try {
    const data = await c.req.json<PasswordResetConfirm>();

    if (!data.token || !data.newPassword) {
      throw createAuthError('MISSING_FIELDS', 'Token and new password are required');
    }

    // Get email from token
    const email = await getPasswordResetEmail(c.env.SESSIONS, data.token);

    if (!email) {
      throw createAuthError('INVALID_TOKEN', 'Invalid or expired reset token');
    }

    // Validate new password
    const passwordValidation = validatePassword(
      data.newPassword,
      parseInt(c.env.PASSWORD_MIN_LENGTH)
    );
    if (!passwordValidation.valid) {
      throw createAuthError('WEAK_PASSWORD', passwordValidation.errors.join(', '));
    }

    // Hash new password
    const passwordHash = await hashPassword(data.newPassword);

    // Update user password
    const db = createDb(c.env.DB);
    await userOps.updateUserPasswordByEmail(db, email, passwordHash);

    // Delete reset token
    await deletePasswordResetToken(c.env.SESSIONS, data.token);

    return c.json({ message: 'Password reset successfully' });
  } catch (error) {
    return c.json(
      {
        error: 'InternalError',
        code: 'auth/internal-error',
        message: getErrorMessage(error),
      },
      500
    );
  }
});

export default auth;
