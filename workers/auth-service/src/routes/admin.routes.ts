/**
 * Admin Routes
 *
 * HTTP endpoints for user management (admin only)
 */

import { Hono } from 'hono';
import type { Env, User } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { getSession } from '../utils/session';
import { createAuthError, AuthError, getErrorMessage } from '../utils/errors';
import { updateStripeCustomer, archiveStripeCustomer } from '../services/stripe.service';
import { hashPassword, validatePassword } from '../utils/password';
import { createDb } from '@b2b/db';
import * as userOps from '@b2b/db/operations';

const admin = new Hono<{
  Bindings: Env;
  Variables: {
    userId: string;
    userRole: string;
  };
}>();

// Helper function to transform DB user to frontend UserProfile format
function transformUserToProfile(user: User) {
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

  // Build BTW verification data if it exists
  const btwVerification =
    user.btw_verified_name || user.btw_verified_address
      ? {
          verifiedName: user.btw_verified_name || null,
          verifiedAddress: user.btw_verified_address || null,
          verifiedAt: user.btw_verified_at || null,
          isValidated: user.btw_number_validated === 1,
        }
      : undefined;

  return {
    uid: user.id,
    email: user.email,
    role: user.role,
    companyName: user.company_name || '',
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    phone: user.phone || undefined,
    btwNumber: user.btw_number || '',
    btwVerification,
    address,
    isVerified: user.is_verified === 1,
    isActive: user.is_active === 1,
    createdAt: user.created_at,
  };
}

// Error handler middleware
admin.onError((err, c) => {
  console.error('Admin Error:', err);

  if (err instanceof AuthError) {
    return c.json(err.toJSON(), err.statusCode as any);
  }

  return c.json(
    {
      error: 'InternalError',
      code: 'admin/internal-error',
      message: getErrorMessage(err),
      statusCode: 500,
    },
    500
  );
});

/**
 * Middleware: Verify admin access
 */
admin.use('*', async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createAuthError('UNAUTHORIZED', 'Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    // Verify token
    const payload = await verifyAccessToken(token, c.env.JWT_SECRET);

    // Check session
    const session = await getSession(c.env.SESSIONS, payload.sessionId);
    if (!session) {
      throw createAuthError('SESSION_EXPIRED');
    }

    // Check if user is admin
    if (payload.role !== 'admin') {
      throw createAuthError('FORBIDDEN', 'Admin access required');
    }

    // Store user info in context
    c.set('userId', payload.uid);
    c.set('userRole', payload.role);

    await next();
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw createAuthError('UNAUTHORIZED', 'Invalid token');
  }
});

/**
 * GET /admin/users
 * List all users (with pagination)
 */
admin.get('/users', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    const search = c.req.query('search') || '';

    const db = createDb(c.env.DB);
    const result = await userOps.getUsers(db, { limit, offset, search });

    // Transform users to frontend format (camelCase)
    const transformedUsers = result.users.map(transformUserToProfile);

    return c.json({
      users: transformedUsers,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    return c.json(
      {
        error: 'InternalError',
        code: 'admin/internal-error',
        message: getErrorMessage(error),
      },
      500
    );
  }
});

/**
 * GET /admin/users/:userId
 * Get user details
 */
admin.get('/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');

    const db = createDb(c.env.DB);
    const user = await userOps.getUserById(db, userId);

    if (!user) {
      throw createAuthError('USER_NOT_FOUND');
    }

    // Transform user to frontend format (camelCase)
    const transformedUser = transformUserToProfile(user);

    return c.json({ user: transformedUser });
  } catch (error) {
    return c.json(
      {
        error: 'InternalError',
        code: 'admin/internal-error',
        message: getErrorMessage(error),
      },
      500
    );
  }
});

/**
 * PUT /admin/users/:userId
 * Update user details
 */
admin.put('/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const data = await c.req.json<Partial<User>>();

    const db = createDb(c.env.DB);

    // Fetch existing user
    const existingUser = await userOps.getUserById(db, userId);

    if (!existingUser) {
      throw createAuthError('USER_NOT_FOUND');
    }

    // Build update data object
    const updateData: Partial<Omit<User, 'id' | 'email' | 'password_hash' | 'created_at'>> = {};

    if (data.company_name !== undefined) updateData.company_name = data.company_name;
    if (data.first_name !== undefined) updateData.first_name = data.first_name;
    if (data.last_name !== undefined) updateData.last_name = data.last_name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.btw_number !== undefined) updateData.btw_number = data.btw_number;
    if (data.address_street !== undefined) updateData.address_street = data.address_street;
    if (data.address_house_number !== undefined)
      updateData.address_house_number = data.address_house_number;
    if (data.address_postal_code !== undefined)
      updateData.address_postal_code = data.address_postal_code;
    if (data.address_city !== undefined) updateData.address_city = data.address_city;
    if (data.address_country !== undefined) updateData.address_country = data.address_country;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.is_verified !== undefined) updateData.is_verified = data.is_verified;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    if (Object.keys(updateData).length === 0) {
      throw createAuthError('INVALID_REQUEST', 'No fields to update');
    }

    // Execute update
    const updatedUser = await userOps.updateUser(db, userId, updateData);

    if (!updatedUser) {
      throw createAuthError('DATABASE_ERROR', 'Failed to fetch updated user');
    }

    // Update Stripe customer if exists
    if (updatedUser.stripe_customer_id) {
      await updateStripeCustomer(c.env, updatedUser.stripe_customer_id, updatedUser);
    }

    return c.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    return c.json(
      {
        error: 'InternalError',
        code: 'admin/internal-error',
        message: getErrorMessage(error),
      },
      500
    );
  }
});

/**
 * POST /admin/users/:userId/verify
 * Verify a user (approve their account)
 */
admin.post('/users/:userId/verify', async (c) => {
  try {
    const userId = c.req.param('userId');

    const db = createDb(c.env.DB);
    const user = await userOps.getUserById(db, userId);

    if (!user) {
      throw createAuthError('USER_NOT_FOUND');
    }

    if (user.is_verified === 1) {
      return c.json({ message: 'User is already verified', user });
    }

    // Update verification status
    const updatedUser = await userOps.verifyUser(db, userId);

    return c.json({
      message: 'User verified successfully',
      user: updatedUser,
    });
  } catch (error) {
    return c.json(
      {
        error: 'InternalError',
        code: 'admin/internal-error',
        message: getErrorMessage(error),
      },
      500
    );
  }
});

/**
 * DELETE /admin/users/:userId
 * Soft delete a user (archive)
 */
admin.delete('/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const adminUserId = c.get('userId');

    // Prevent self-deletion
    if (userId === adminUserId) {
      throw createAuthError('INVALID_REQUEST', 'Cannot delete your own account');
    }

    const db = createDb(c.env.DB);
    const user = await userOps.getUserById(db, userId);

    if (!user) {
      throw createAuthError('USER_NOT_FOUND');
    }

    // Soft delete: deactivate the user
    await userOps.deactivateUser(db, userId);

    // Archive Stripe customer if exists
    if (user.stripe_customer_id) {
      await archiveStripeCustomer(c.env, user.stripe_customer_id, userId, 'deleted_by_admin');
    }

    return c.json({
      message: 'User deactivated successfully',
      userId,
    });
  } catch (error) {
    return c.json(
      {
        error: 'InternalError',
        code: 'admin/internal-error',
        message: getErrorMessage(error),
      },
      500
    );
  }
});

/**
 * POST /admin/users/:userId/reset-password
 * Admin can reset user password
 */
admin.post('/users/:userId/reset-password', async (c) => {
  try {
    const userId = c.req.param('userId');
    const data = await c.req.json<{ newPassword: string }>();

    if (!data.newPassword) {
      throw createAuthError('MISSING_FIELDS', 'New password is required');
    }

    const db = createDb(c.env.DB);
    const user = await userOps.getUserById(db, userId);

    if (!user) {
      throw createAuthError('USER_NOT_FOUND');
    }

    // Validate password
    const passwordValidation = validatePassword(
      data.newPassword,
      parseInt(c.env.PASSWORD_MIN_LENGTH)
    );
    if (!passwordValidation.valid) {
      throw createAuthError('WEAK_PASSWORD', passwordValidation.errors.join(', '));
    }

    // Hash new password
    const passwordHash = await hashPassword(data.newPassword);

    // Update password
    await userOps.updateUserPassword(db, userId, passwordHash);

    return c.json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    return c.json(
      {
        error: 'InternalError',
        code: 'admin/internal-error',
        message: getErrorMessage(error),
      },
      500
    );
  }
});

export default admin;
