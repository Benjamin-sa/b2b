/**
 * Admin Routes
 * 
 * HTTP endpoints for user management (admin only)
 */

import { Hono } from 'hono';
import type { Env, User } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { getSession } from '../utils/session';
import { createAuthError, AuthError } from '../utils/errors';
import { updateStripeCustomer, archiveStripeCustomer } from '../services/stripe.service';
import { hashPassword, validatePassword } from '../utils/password';

const admin = new Hono<{ Bindings: Env }>();

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
      message: err.message || 'An internal error occurred',
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

    let query = 'SELECT id, email, role, company_name, first_name, last_name, phone, btw_number, stripe_customer_id, is_active, is_verified, created_at, updated_at FROM users';
    let countQuery = 'SELECT COUNT(*) as count FROM users';
    const params: any[] = [];

    if (search) {
      const searchPattern = `%${search}%`;
      query += ' WHERE email LIKE ? OR company_name LIKE ? OR first_name LIKE ? OR last_name LIKE ?';
      countQuery += ' WHERE email LIKE ? OR company_name LIKE ? OR first_name LIKE ? OR last_name LIKE ?';
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const users = await c.env.DB.prepare(query)
      .bind(...params, limit, offset)
      .all<User>();

    const countResult = await c.env.DB.prepare(countQuery)
      .bind(...params)
      .first<{ count: number }>();

    return c.json({
      users: users.results || [],
      total: countResult?.count || 0,
      limit,
      offset,
    });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /admin/users/:userId
 * Get user details
 */
admin.get('/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');

    const user = await c.env.DB.prepare(`
      SELECT id, email, role, company_name, first_name, last_name, phone, btw_number,
             address_street, address_house_number, address_postal_code, address_city, address_country,
             stripe_customer_id, is_active, is_verified, created_at, updated_at
      FROM users 
      WHERE id = ?
    `)
      .bind(userId)
      .first<User>();

    if (!user) {
      throw createAuthError('USER_NOT_FOUND');
    }

    return c.json({ user });
  } catch (error) {
    throw error;
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

    // Fetch existing user
    const existingUser = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();

    if (!existingUser) {
      throw createAuthError('USER_NOT_FOUND');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (data.company_name !== undefined) {
      updates.push('company_name = ?');
      values.push(data.company_name);
    }
    if (data.first_name !== undefined) {
      updates.push('first_name = ?');
      values.push(data.first_name);
    }
    if (data.last_name !== undefined) {
      updates.push('last_name = ?');
      values.push(data.last_name);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone);
    }
    if (data.btw_number !== undefined) {
      updates.push('btw_number = ?');
      values.push(data.btw_number);
    }
    if (data.address_street !== undefined) {
      updates.push('address_street = ?');
      values.push(data.address_street);
    }
    if (data.address_house_number !== undefined) {
      updates.push('address_house_number = ?');
      values.push(data.address_house_number);
    }
    if (data.address_postal_code !== undefined) {
      updates.push('address_postal_code = ?');
      values.push(data.address_postal_code);
    }
    if (data.address_city !== undefined) {
      updates.push('address_city = ?');
      values.push(data.address_city);
    }
    if (data.address_country !== undefined) {
      updates.push('address_country = ?');
      values.push(data.address_country);
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      values.push(data.role);
    }
    if (data.is_verified !== undefined) {
      updates.push('is_verified = ?');
      values.push(data.is_verified);
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(data.is_active);
    }

    if (updates.length === 0) {
      throw createAuthError('INVALID_REQUEST', 'No fields to update');
    }

    // Always update updated_at
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());

    // Add userId to values
    values.push(userId);

    // Execute update
    await c.env.DB.prepare(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();

    // Fetch updated user
    const updatedUser = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();

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
    throw error;
  }
});

/**
 * POST /admin/users/:userId/verify
 * Verify a user (approve their account)
 */
admin.post('/users/:userId/verify', async (c) => {
  try {
    const userId = c.req.param('userId');

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();

    if (!user) {
      throw createAuthError('USER_NOT_FOUND');
    }

    if (user.is_verified === 1) {
      return c.json({ message: 'User is already verified', user });
    }

    // Update verification status
    await c.env.DB.prepare('UPDATE users SET is_verified = ?, updated_at = ? WHERE id = ?')
      .bind(1, new Date().toISOString(), userId)
      .run();

    // Fetch updated user
    const updatedUser = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();

    // Update Stripe customer metadata
    if (updatedUser?.stripe_customer_id) {
      await updateStripeCustomer(c.env, updatedUser.stripe_customer_id, updatedUser);
    }

    return c.json({
      message: 'User verified successfully',
      user: updatedUser,
    });
  } catch (error) {
    throw error;
  }
});

/**
 * DELETE /admin/users/:userId
 * Soft delete a user (archive)
 */
admin.delete('/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const adminUserId = c.get('userId') as string;

    // Prevent self-deletion
    if (userId === adminUserId) {
      throw createAuthError('INVALID_REQUEST', 'Cannot delete your own account');
    }

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();

    if (!user) {
      throw createAuthError('USER_NOT_FOUND');
    }

    // Soft delete: deactivate the user
    await c.env.DB.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?')
      .bind(0, new Date().toISOString(), userId)
      .run();

    // Archive Stripe customer if exists
    if (user.stripe_customer_id) {
      await archiveStripeCustomer(
        c.env,
        user.stripe_customer_id,
        userId,
        'deleted_by_admin'
      );
    }

    return c.json({
      message: 'User deactivated successfully',
      userId,
    });
  } catch (error) {
    throw error;
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

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();

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
    await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .bind(passwordHash, new Date().toISOString(), userId)
      .run();

    return c.json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    throw error;
  }
});

export default admin;
