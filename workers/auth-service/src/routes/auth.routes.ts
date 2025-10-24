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
  User,
} from '../types';
import { registerUser, loginUser, userToClaims } from '../services/auth.service';
import {
  verifyAccessToken,
  verifyRefreshToken,
  createAccessToken,

} from '../utils/jwt';
import {
  getSession,
  deleteSession,
  storePasswordResetToken,
  getPasswordResetEmail,
  deletePasswordResetToken,
} from '../utils/session';
import { hashPassword, validatePassword } from '../utils/password';
import { createAuthError, AuthError } from '../utils/errors';
import { nanoid } from 'nanoid';

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
      message: err.message || 'An internal error occurred',
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
    if (!data.email || !data.password || !data.companyName || !data.firstName || !data.lastName) {
      throw createAuthError('MISSING_FIELDS', 'Email, password, company name, first name, and last name are required');
    }

    const userAgent = c.req.header('User-Agent');
    const ipAddress = c.req.header('CF-Connecting-IP');

    const response = await registerUser(c.env, data, userAgent, ipAddress);

    return c.json(response, 201);
  } catch (error) {
    throw error;
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
    throw error;
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
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(payload.uid)
      .first<User>();

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
    const accessToken = await createAccessToken(claims, payload.sessionId, c.env.JWT_SECRET, accessTokenTtl);

    return c.json({
      accessToken,
      expiresIn: accessTokenTtl,
    });
  } catch (error) {
    throw error;
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
  } catch (error) {
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

    if (!data.accessToken) {
      throw createAuthError('MISSING_FIELDS', 'Access token is required');
    }

    // Step 1: Verify JWT signature and decode payload
    const payload = await verifyAccessToken(data.accessToken, c.env.JWT_SECRET);

    // Step 2: Check if session is still active
    // This is how we achieve instant revocation!
    const session = await getSession(c.env.SESSIONS, payload.sessionId);
    
    if (!session) {
      throw createAuthError('SESSION_EXPIRED', 'Session has been revoked or expired');
    }

    // Step 3: Fetch FRESH user data from D1
    // This ensures we always have the latest user state (isVerified, role, etc.)
    const user = await c.env.DB.prepare(`
      SELECT 
        id, email, role, company_name, first_name, last_name, 
        is_verified, is_active, created_at, updated_at
      FROM users 
      WHERE id = ?
    `)
      .bind(payload.uid)
      .first<User>();

    if (!user) {
      throw createAuthError('USER_NOT_FOUND', 'User no longer exists');
    }

    // Step 4: Check if user is still active
    if (user.is_active === 0) {
      throw createAuthError('USER_DISABLED', 'User account has been disabled');
    }

    // Step 5: Build permissions array based on role and verification status
    const permissions: string[] = [];
    
    // All authenticated users can read products and categories
    permissions.push('read:products', 'read:categories');
    
    // Only verified users can create orders
    if (user.is_verified === 1) {
      permissions.push('create:orders', 'read:orders', 'update:profile');
    }
    
    // Admins get full permissions
    if (user.role === 'admin') {
      permissions.push(
        'create:products',
        'update:products',
        'delete:products',
        'create:categories',
        'update:categories',
        'delete:categories',
        'read:all-orders',
        'update:orders',
        'read:users',
        'update:users',
        'verify:users'
      );
    }

    // Step 6: Return validation result with fresh data
    return c.json({
      valid: true,
      user: {
        uid: user.id,
        email: user.email,
        role: user.role,
        companyName: user.company_name,
        firstName: user.first_name,
        lastName: user.last_name,
        isVerified: user.is_verified === 1,
        isActive: user.is_active === 1,
      },
      permissions,
      sessionId: payload.sessionId,
      validatedAt: new Date().toISOString(),
    });
  } catch (error) {
    // Return proper error responses
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
    const user = await c.env.DB.prepare('SELECT id, email FROM users WHERE email = ?')
      .bind(data.email.toLowerCase())
      .first<{ id: string; email: string }>();

    // Always return success even if user doesn't exist (security best practice)
    if (user) {
      // Generate reset token
      const resetToken = nanoid(32);

      // Store in KV with 1 hour TTL
      await storePasswordResetToken(c.env.SESSIONS, user.email, resetToken, 3600);

      // TODO: Send email with reset link
      // For now, return the token (in production, this should be emailed)
      if (c.env.ENVIRONMENT === 'development') {
        return c.json({
          message: 'Password reset email sent',
          resetToken, // Only in development
        });
      }
    }

    return c.json({ message: 'If the email exists, a password reset link has been sent' });
  } catch (error) {
    throw error;
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
    await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ?')
      .bind(passwordHash, new Date().toISOString(), email)
      .run();

    // Delete reset token
    await deletePasswordResetToken(c.env.SESSIONS, data.token);

    return c.json({ message: 'Password reset successfully' });
  } catch (error) {
    throw error;
  }
});

export default auth;
