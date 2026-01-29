/**
 * Auth Routes - Direct Database Operations
 *
 * Handles authentication with direct D1 database access via @b2b/db
 * Eliminates service binding overhead for auth operations
 */

import { Hono } from 'hono';
import { createDb } from '@b2b/db';
import {
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUserById,
  createSession,
  deleteSession,
  getSessionById,
  createPasswordResetToken,
  isPasswordResetTokenValid,
  markPasswordResetTokenUsed,
  deleteUserPasswordResetTokens,
} from '@b2b/db/operations';
import type { Env } from '../types';
import type { EmailQueueMessage } from '@b2b/types';
import {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractBearerToken,
  type UserClaims,
} from '../utils/jwt';
import { hashPassword, verifyPassword, validatePassword, validateEmail } from '../utils/password';

const auth = new Hono<{ Bindings: Env }>();

// ============================================================================
// CONSTANTS
// ============================================================================

const ACCESS_TOKEN_TTL = 3600; // 1 hour
const REFRESH_TOKEN_TTL = 2592000; // 30 days
const PASSWORD_RESET_TTL = 3600; // 1 hour

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildUserClaims(user: any): UserClaims {
  return {
    uid: user.id,
    email: user.email,
    role: user.role as 'admin' | 'customer',
    companyName: user.company_name || undefined,
    firstName: user.first_name || undefined,
    lastName: user.last_name || undefined,
    isVerified: user.is_verified === 1,
    isActive: user.is_active === 1,
    stripeCustomerId: user.stripe_customer_id || null,
  };
}

function buildUserResponse(user: any) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    company_name: user.company_name,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone,
    btw_number: user.btw_number,
    btw_verified_name: user.btw_verified_name,
    btw_verified_address: user.btw_verified_address,
    btw_verified_at: user.btw_verified_at,
    btw_number_validated: user.btw_number_validated,
    address_street: user.address_street,
    address_house_number: user.address_house_number,
    address_postal_code: user.address_postal_code,
    address_city: user.address_city,
    address_country: user.address_country,
    stripe_customer_id: user.stripe_customer_id,
    is_verified: user.is_verified,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

// ============================================================================
// REGISTER
// ============================================================================

auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (
      !body.email ||
      !body.password ||
      !body.company_name ||
      !body.first_name ||
      !body.last_name
    ) {
      return c.json(
        {
          error: 'Missing required fields',
          code: 'auth/missing-fields',
          required: ['email', 'password', 'company_name', 'first_name', 'last_name'],
        },
        400
      );
    }

    // Validate email format
    if (!validateEmail(body.email)) {
      return c.json(
        {
          error: 'Invalid email format',
          code: 'auth/invalid-email',
        },
        400
      );
    }

    // Validate password
    const passwordValidation = validatePassword(body.password);
    if (!passwordValidation.valid) {
      return c.json(
        {
          error: 'Weak password',
          code: 'auth/weak-password',
          details: passwordValidation.errors,
        },
        400
      );
    }

    const db = createDb(c.env.DB);
    const email = body.email.toLowerCase().trim();

    // Check if user exists
    const existingUser = await getUserByEmail(db, email);
    if (existingUser) {
      return c.json(
        {
          error: 'Email already in use',
          code: 'auth/email-already-in-use',
        },
        400
      );
    }

    // Create user
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(body.password);

    const user = await createUser(db, {
      id: userId,
      email,
      password_hash: passwordHash,
      role: 'customer',
      company_name: body.company_name,
      first_name: body.first_name,
      last_name: body.last_name,
      phone: body.phone || null,
      btw_number: body.btw_number || null,
      address_street: body.address?.street || null,
      address_house_number: body.address?.house_number || null,
      address_postal_code: body.address?.postal_code || null,
      address_city: body.address?.city || null,
      address_country: body.address?.country || null,
      is_active: 1,
      is_verified: 0,
    });

    if (!user) {
      return c.json(
        {
          error: 'Failed to create user',
          code: 'auth/create-failed',
        },
        500
      );
    }

    // Create Stripe customer via STRIPE_SERVICE binding
    let stripeCustomerId: string | null = null;
    try {
      const stripeResponse = await c.env.STRIPE_SERVICE.fetch(
        new Request('http://stripe-service/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Token': c.env.SERVICE_SECRET,
          },
          body: JSON.stringify({
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            company_name: user.company_name,
            phone: user.phone,
            btw_number: user.btw_number,
            address_street: user.address_street,
            address_house_number: user.address_house_number,
            address_city: user.address_city,
            address_postal_code: user.address_postal_code,
            address_country: user.address_country,
            user_id: user.id,
            role: user.role,
            ip_address: c.req.header('CF-Connecting-IP'),
          }),
        })
      );

      const stripeResult = (await stripeResponse.json()) as any;

      if (stripeResult.success && stripeResult.data?.customer_id) {
        stripeCustomerId = stripeResult.data.customer_id;
        // Update user with Stripe customer ID
        await updateUser(db, userId, { stripe_customer_id: stripeCustomerId });
        console.log(`[Auth] Created Stripe customer ${stripeCustomerId} for user ${userId}`);
      } else {
        console.error('[Auth] Stripe customer creation failed:', stripeResult);
        // Rollback user creation if Stripe fails
        await deleteUserById(db, userId);
        return c.json(
          {
            error: 'Failed to create payment account',
            code: 'auth/stripe-failed',
            message: 'Please try again or contact support.',
          },
          500
        );
      }
    } catch (stripeError: any) {
      console.error('[Auth] Stripe service error:', stripeError);
      // Rollback user creation if Stripe fails
      await deleteUserById(db, userId);
      return c.json(
        {
          error: 'Failed to create payment account',
          code: 'auth/stripe-failed',
          message: stripeError.message || 'Please try again or contact support.',
        },
        500
      );
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL * 1000);

    await createSession(db, {
      id: sessionId,
      user_id: userId,
      token: sessionId,
      expires_at: expiresAt.toISOString(),
      user_agent: c.req.header('User-Agent') || null,
      ip_address: c.req.header('CF-Connecting-IP') || null,
    });

    // Generate tokens - include stripeCustomerId from Stripe creation
    const userWithStripe = { ...user, stripe_customer_id: stripeCustomerId };
    const userClaims = buildUserClaims(userWithStripe);
    const accessToken = await createAccessToken(
      userClaims,
      sessionId,
      c.env.JWT_SECRET,
      ACCESS_TOKEN_TTL
    );
    const refreshToken = await createRefreshToken(
      userId,
      sessionId,
      c.env.REFRESH_SECRET,
      REFRESH_TOKEN_TTL
    );

    // Queue welcome email
    try {
      const emailMessage: EmailQueueMessage = {
        type: 'welcome',
        email: user.email,
        firstName: user.first_name ?? undefined,
        companyName: user.company_name ?? undefined,
        timestamp: new Date().toISOString(),
      };
      await c.env.EMAIL_QUEUE.send(emailMessage);
    } catch (emailError) {
      console.error('[Auth] Failed to queue welcome email:', emailError);
      // Don't fail registration if email fails
    }

    // Notify admins via Telegram
    try {
      const telegramRequest = new Request('https://dummy/notifications/user/registered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Token': c.env.SERVICE_SECRET,
        },
        body: JSON.stringify({
          email: user.email,
          companyName: user.company_name,
          firstName: user.first_name,
          lastName: user.last_name,
        }),
      });
      await c.env.TELEGRAM_SERVICE.fetch(telegramRequest);
    } catch (telegramError) {
      console.error('[Auth] Failed to send Telegram notification:', telegramError);
    }

    return c.json({
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL,
      user: buildUserResponse(userWithStripe),
    });
  } catch (error: any) {
    console.error('[Auth] Register error:', error);
    return c.json(
      {
        error: 'Registration failed',
        code: 'auth/error',
        message: error.message,
      },
      500
    );
  }
});

// ============================================================================
// LOGIN
// ============================================================================

auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();

    if (!body.email || !body.password) {
      return c.json(
        {
          error: 'Email and password required',
          code: 'auth/missing-credentials',
        },
        400
      );
    }

    const db = createDb(c.env.DB);
    const email = body.email.toLowerCase().trim();

    const user = await getUserByEmail(db, email);
    if (!user) {
      return c.json(
        {
          error: 'Invalid credentials',
          code: 'auth/invalid-credentials',
        },
        401
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(body.password, user.password_hash);
    if (!isValidPassword) {
      return c.json(
        {
          error: 'Invalid credentials',
          code: 'auth/invalid-credentials',
        },
        401
      );
    }

    // Check if user is active
    if (user.is_active !== 1) {
      return c.json(
        {
          error: 'Account is deactivated',
          code: 'auth/account-disabled',
        },
        403
      );
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL * 1000);

    await createSession(db, {
      id: sessionId,
      user_id: user.id,
      token: sessionId,
      expires_at: expiresAt.toISOString(),
      user_agent: c.req.header('User-Agent') || null,
      ip_address: c.req.header('CF-Connecting-IP') || null,
    });

    // Generate tokens
    const userClaims = buildUserClaims(user);
    const accessToken = await createAccessToken(
      userClaims,
      sessionId,
      c.env.JWT_SECRET,
      ACCESS_TOKEN_TTL
    );
    const refreshToken = await createRefreshToken(
      user.id,
      sessionId,
      c.env.REFRESH_SECRET,
      REFRESH_TOKEN_TTL
    );

    return c.json({
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL,
      user: buildUserResponse(user),
    });
  } catch (error: any) {
    console.error('[Auth] Login error:', error);
    return c.json(
      {
        error: 'Login failed',
        code: 'auth/error',
        message: error.message,
      },
      500
    );
  }
});

// ============================================================================
// VALIDATE TOKEN
// ============================================================================

auth.post('/validate', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return c.json(
        {
          error: 'No token provided',
          code: 'auth/no-token',
        },
        401
      );
    }

    const payload = await verifyAccessToken(token, c.env.JWT_SECRET);

    // Check if session is still valid
    const db = createDb(c.env.DB);
    const session = await getSessionById(db, payload.sessionId);

    if (!session || new Date(session.expires_at) < new Date()) {
      return c.json(
        {
          error: 'Session expired',
          code: 'auth/session-expired',
        },
        401
      );
    }

    return c.json({
      valid: true,
      user: {
        uid: payload.uid,
        email: payload.email,
        role: payload.role,
        companyName: payload.companyName,
        firstName: payload.firstName,
        lastName: payload.lastName,
        isVerified: payload.isVerified,
        isActive: payload.isActive,
        stripeCustomerId: payload.stripeCustomerId,
      },
    });
  } catch (error: any) {
    console.error('[Auth] Validate error:', error);
    return c.json(
      {
        error: 'Invalid token',
        code: 'auth/invalid-token',
      },
      401
    );
  }
});

// ============================================================================
// REFRESH TOKEN
// ============================================================================

auth.post('/refresh', async (c) => {
  try {
    const body = await c.req.json();
    const { refreshToken: token } = body;

    if (!token) {
      return c.json(
        {
          error: 'Refresh token required',
          code: 'auth/no-refresh-token',
        },
        400
      );
    }

    // Verify refresh token
    let payload;
    try {
      payload = await verifyRefreshToken(token, c.env.REFRESH_SECRET);
    } catch (error) {
      return c.json(
        {
          error: 'Invalid refresh token',
          code: 'auth/invalid-refresh-token',
        },
        401
      );
    }

    const db = createDb(c.env.DB);

    // Check if session is still valid
    const session = await getSessionById(db, payload.sessionId);
    if (!session || new Date(session.expires_at) < new Date()) {
      return c.json(
        {
          error: 'Session expired',
          code: 'auth/session-expired',
        },
        401
      );
    }

    // Get user
    const user = await getUserById(db, payload.uid);
    if (!user || user.is_active !== 1) {
      return c.json(
        {
          error: 'User not found or inactive',
          code: 'auth/user-not-found',
        },
        401
      );
    }

    // Generate new access token with same session
    const userClaims = buildUserClaims(user);
    const accessToken = await createAccessToken(
      userClaims,
      payload.sessionId,
      c.env.JWT_SECRET,
      ACCESS_TOKEN_TTL
    );

    return c.json({
      accessToken,
      expiresIn: ACCESS_TOKEN_TTL,
      user: buildUserResponse(user),
    });
  } catch (error: any) {
    console.error('[Auth] Refresh error:', error);
    return c.json(
      {
        error: 'Token refresh failed',
        code: 'auth/error',
        message: error.message,
      },
      500
    );
  }
});

// ============================================================================
// LOGOUT
// ============================================================================

auth.post('/logout', async (c) => {
  try {
    const body = await c.req.json();
    const { refreshToken: token } = body;

    if (!token) {
      return c.json(
        {
          error: 'Refresh token required',
          code: 'auth/no-refresh-token',
        },
        400
      );
    }

    // Verify and extract session ID
    let payload;
    try {
      payload = await verifyRefreshToken(token, c.env.REFRESH_SECRET);
    } catch (error) {
      // Token is invalid, but that's okay for logout
      return c.json({ message: 'Logged out' });
    }

    // Delete session
    const db = createDb(c.env.DB);
    await deleteSession(db, payload.sessionId);

    return c.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('[Auth] Logout error:', error);
    return c.json(
      {
        error: 'Logout failed',
        code: 'auth/error',
        message: error.message,
      },
      500
    );
  }
});

// ============================================================================
// PASSWORD RESET REQUEST
// ============================================================================

auth.post('/password-reset/request', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json(
        {
          error: 'Email required',
          code: 'auth/missing-email',
        },
        400
      );
    }

    const db = createDb(c.env.DB);
    const user = await getUserByEmail(db, email.toLowerCase().trim());

    // Always return success (security: don't reveal if email exists)
    const response: any = {
      message: 'If the email exists, a password reset link has been sent',
    };

    if (user) {
      // Delete existing tokens
      await deleteUserPasswordResetTokens(db, user.id);

      // Create new token
      const tokenId = crypto.randomUUID();
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL * 1000);

      await createPasswordResetToken(db, {
        id: tokenId,
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

      // Queue password reset email
      try {
        const emailMessage: EmailQueueMessage = {
          type: 'password-reset',
          email: user.email,
          firstName: user.first_name,
          resetToken: token,
          timestamp: new Date().toISOString(),
        };
        await c.env.EMAIL_QUEUE.send(emailMessage);
      } catch (emailError) {
        console.error('[Auth] Failed to queue password reset email:', emailError);
      }

      // In development, return the token
      if (c.env.ENVIRONMENT === 'development') {
        response.resetToken = token;
        response.firstName = user.first_name;
      }
    }

    return c.json(response);
  } catch (error: any) {
    console.error('[Auth] Password reset request error:', error);
    return c.json(
      {
        error: 'Request failed',
        code: 'auth/error',
        message: error.message,
      },
      500
    );
  }
});

// ============================================================================
// PASSWORD RESET CONFIRM
// ============================================================================

auth.post('/password-reset/confirm', async (c) => {
  try {
    const body = await c.req.json();
    const { token, password } = body;

    if (!token || !password) {
      return c.json(
        {
          error: 'Token and new password required',
          code: 'auth/missing-fields',
        },
        400
      );
    }

    // Validate new password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return c.json(
        {
          error: 'Weak password',
          code: 'auth/weak-password',
          details: passwordValidation.errors,
        },
        400
      );
    }

    const db = createDb(c.env.DB);

    // Validate token
    const validation = await isPasswordResetTokenValid(db, token);
    if (!validation.valid || !validation.tokenRecord) {
      return c.json(
        {
          error: validation.error || 'Invalid token',
          code: 'auth/invalid-reset-token',
        },
        400
      );
    }

    // Update password
    const passwordHash = await hashPassword(password);
    await updateUserPassword(db, validation.tokenRecord.user_id, passwordHash);

    // Mark token as used
    await markPasswordResetTokenUsed(db, validation.tokenRecord.id);

    return c.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('[Auth] Password reset confirm error:', error);
    return c.json(
      {
        error: 'Password reset failed',
        code: 'auth/error',
        message: error.message,
      },
      500
    );
  }
});

// ============================================================================
// GET PROFILE
// ============================================================================

auth.get('/profile', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return c.json(
        {
          error: 'No token provided',
          code: 'auth/no-token',
        },
        401
      );
    }

    let payload;
    try {
      payload = await verifyAccessToken(token, c.env.JWT_SECRET);
    } catch (error) {
      return c.json(
        {
          error: 'Invalid token',
          code: 'auth/invalid-token',
        },
        401
      );
    }

    const db = createDb(c.env.DB);
    const user = await getUserById(db, payload.uid);

    if (!user) {
      return c.json(
        {
          error: 'User not found',
          code: 'auth/user-not-found',
        },
        404
      );
    }

    return c.json({ user: buildUserResponse(user) });
  } catch (error: any) {
    console.error('[Auth] Get profile error:', error);
    return c.json(
      {
        error: 'Failed to get profile',
        code: 'auth/error',
        message: error.message,
      },
      500
    );
  }
});

// ============================================================================
// UPDATE PROFILE
// ============================================================================

auth.patch('/profile', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return c.json(
        {
          error: 'No token provided',
          code: 'auth/no-token',
        },
        401
      );
    }

    let payload;
    try {
      payload = await verifyAccessToken(token, c.env.JWT_SECRET);
    } catch (error) {
      return c.json(
        {
          error: 'Invalid token',
          code: 'auth/invalid-token',
        },
        401
      );
    }

    const body = await c.req.json();
    const db = createDb(c.env.DB);

    // Build update data
    const updateData: any = {};
    if (body.company_name !== undefined) updateData.company_name = body.company_name;
    if (body.first_name !== undefined) updateData.first_name = body.first_name;
    if (body.last_name !== undefined) updateData.last_name = body.last_name;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.btw_number !== undefined) updateData.btw_number = body.btw_number;
    if (body.address) {
      if (body.address.street !== undefined) updateData.address_street = body.address.street;
      if (body.address.house_number !== undefined)
        updateData.address_house_number = body.address.house_number;
      if (body.address.postal_code !== undefined)
        updateData.address_postal_code = body.address.postal_code;
      if (body.address.city !== undefined) updateData.address_city = body.address.city;
      if (body.address.country !== undefined) updateData.address_country = body.address.country;
    }

    const user = await updateUser(db, payload.uid, updateData);

    if (!user) {
      return c.json(
        {
          error: 'User not found',
          code: 'auth/user-not-found',
        },
        404
      );
    }

    return c.json({ user: buildUserResponse(user) });
  } catch (error: any) {
    console.error('[Auth] Update profile error:', error);
    return c.json(
      {
        error: 'Failed to update profile',
        code: 'auth/error',
        message: error.message,
      },
      500
    );
  }
});

// ============================================================================
// CHANGE PASSWORD
// ============================================================================

auth.post('/change-password', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return c.json(
        {
          error: 'No token provided',
          code: 'auth/no-token',
        },
        401
      );
    }

    let payload;
    try {
      payload = await verifyAccessToken(token, c.env.JWT_SECRET);
    } catch (error) {
      return c.json(
        {
          error: 'Invalid token',
          code: 'auth/invalid-token',
        },
        401
      );
    }

    const body = await c.req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return c.json(
        {
          error: 'Current and new password required',
          code: 'auth/missing-fields',
        },
        400
      );
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return c.json(
        {
          error: 'Weak password',
          code: 'auth/weak-password',
          details: passwordValidation.errors,
        },
        400
      );
    }

    const db = createDb(c.env.DB);
    const user = await getUserById(db, payload.uid);

    if (!user) {
      return c.json(
        {
          error: 'User not found',
          code: 'auth/user-not-found',
        },
        404
      );
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      return c.json(
        {
          error: 'Current password is incorrect',
          code: 'auth/wrong-password',
        },
        401
      );
    }

    // Update password
    const passwordHash = await hashPassword(newPassword);
    await updateUserPassword(db, user.id, passwordHash);

    return c.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('[Auth] Change password error:', error);
    return c.json(
      {
        error: 'Failed to change password',
        code: 'auth/error',
        message: error.message,
      },
      500
    );
  }
});

export default auth;
