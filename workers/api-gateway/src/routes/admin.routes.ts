/**
 * Admin Routes - Direct Database Operations
 *
 * Handles admin operations for user management using direct D1 database access.
 * No service bindings needed - everything goes through @b2b/db package.
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import type { EmailQueueMessage } from '@b2b/types';
import { adminMiddleware, type AuthenticatedUser } from '../middleware/auth';
import { createDb } from '@b2b/db';
import {
  getUsers,
  getUserById,
  updateUser,
  verifyUser,
  deactivateUser,
  updateUserPassword,
} from '@b2b/db/operations/users';
import { deleteUserSessions } from '@b2b/db/operations/sessions';
import { hashPassword } from '../utils/password';
import invoicesRoutes from './admin/invoices.routes';

const admin = new Hono<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>();

// Apply admin middleware to all routes
admin.use('*', adminMiddleware);

// ============================================================================
// LIST USERS
// ============================================================================

admin.get('/users', async (c) => {
  try {
    const url = new URL(c.req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const search = url.searchParams.get('search') || '';

    console.log('🎯 [Admin] Fetching users list, page:', page, 'search:', search);

    const db = createDb(c.env.DB);
    const offset = (page - 1) * limit;

    const result = await getUsers(db, { limit, offset, search });

    // Map users to response format (exclude password_hash)
    const usersResponse = result.users.map((user) => ({
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
      stripe_customer_id: user.stripe_customer_id,
      is_active: user.is_active,
      is_verified: user.is_verified,
      address_street: user.address_street,
      address_house_number: user.address_house_number,
      address_city: user.address_city,
      address_postal_code: user.address_postal_code,
      address_country: user.address_country,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }));

    console.log('✅ [Admin] Users list fetched:', result.total, 'total users');

    return c.json({
      users: usersResponse,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error: any) {
    console.error('❌ [Admin] Error fetching users:', error);
    return c.json(
      {
        error: 'Failed to fetch users',
        code: 'admin/fetch-users-failed',
        message: error.message,
      },
      500
    );
  }
});

// ============================================================================
// GET USER BY ID
// ============================================================================

admin.get('/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');

    console.log('🎯 [Admin] Fetching user details for:', userId);

    const db = createDb(c.env.DB);
    const user = await getUserById(db, userId);

    if (!user) {
      return c.json(
        {
          error: 'User not found',
          code: 'admin/user-not-found',
        },
        404
      );
    }

    // Map to response format (exclude password_hash)
    const userResponse = {
      id: user.id,
      email: user.email,
      role: user.role,
      company_name: user.company_name,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      btw_number: user.btw_number,
      stripe_customer_id: user.stripe_customer_id,
      is_active: user.is_active,
      is_verified: user.is_verified,
      address_street: user.address_street,
      address_house_number: user.address_house_number,
      address_city: user.address_city,
      address_postal_code: user.address_postal_code,
      address_country: user.address_country,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    console.log('✅ [Admin] User details fetched for:', user.email);

    return c.json({ user: userResponse });
  } catch (error: any) {
    console.error('❌ [Admin] Error fetching user:', error);
    return c.json(
      {
        error: 'Failed to fetch user',
        code: 'admin/fetch-user-failed',
        message: error.message,
      },
      500
    );
  }
});

// ============================================================================
// UPDATE USER
// ============================================================================

admin.put('/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json();

    console.log('🎯 [Admin] Updating user:', userId);

    const db = createDb(c.env.DB);

    // Check user exists
    const existingUser = await getUserById(db, userId);
    if (!existingUser) {
      return c.json(
        {
          error: 'User not found',
          code: 'admin/user-not-found',
        },
        404
      );
    }

    // Build update data (only allowed fields)
    const updateData: Record<string, any> = {};

    if (body.role !== undefined) updateData.role = body.role;
    if (body.company_name !== undefined) updateData.company_name = body.company_name;
    if (body.first_name !== undefined) updateData.first_name = body.first_name;
    if (body.last_name !== undefined) updateData.last_name = body.last_name;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.btw_number !== undefined) updateData.btw_number = body.btw_number;
    if (body.address_street !== undefined) updateData.address_street = body.address_street;
    if (body.address_house_number !== undefined)
      updateData.address_house_number = body.address_house_number;
    if (body.address_city !== undefined) updateData.address_city = body.address_city;
    if (body.address_postal_code !== undefined)
      updateData.address_postal_code = body.address_postal_code;
    if (body.address_country !== undefined) updateData.address_country = body.address_country;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.is_verified !== undefined) updateData.is_verified = body.is_verified;

    const updatedUser = await updateUser(db, userId, updateData);

    if (!updatedUser) {
      return c.json(
        {
          error: 'Failed to update user',
          code: 'admin/update-failed',
        },
        500
      );
    }

    // Map to response format (exclude password_hash)
    const userResponse = {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      company_name: updatedUser.company_name,
      first_name: updatedUser.first_name,
      last_name: updatedUser.last_name,
      phone: updatedUser.phone,
      btw_number: updatedUser.btw_number,
      stripe_customer_id: updatedUser.stripe_customer_id,
      is_active: updatedUser.is_active,
      is_verified: updatedUser.is_verified,
      address_street: updatedUser.address_street,
      address_house_number: updatedUser.address_house_number,
      address_city: updatedUser.address_city,
      address_postal_code: updatedUser.address_postal_code,
      address_country: updatedUser.address_country,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at,
    };

    console.log('✅ [Admin] User updated:', updatedUser.email);

    return c.json({
      message: 'User updated successfully',
      user: userResponse,
    });
  } catch (error: any) {
    console.error('❌ [Admin] Error updating user:', error);
    return c.json(
      {
        error: 'Failed to update user',
        code: 'admin/update-failed',
        message: error.message,
      },
      500
    );
  }
});

// ============================================================================
// VERIFY USER
// ============================================================================

admin.post('/users/:userId/verify', async (c) => {
  try {
    const userId = c.req.param('userId');

    console.log('🎯 [Admin] Verifying user:', userId);

    const db = createDb(c.env.DB);

    // Check user exists
    const existingUser = await getUserById(db, userId);
    if (!existingUser) {
      return c.json(
        {
          error: 'User not found',
          code: 'admin/user-not-found',
        },
        404
      );
    }

    if (existingUser.is_verified === 1) {
      return c.json(
        {
          error: 'User is already verified',
          code: 'admin/already-verified',
        },
        400
      );
    }

    // Verify user
    const verifiedUser = await verifyUser(db, userId);

    if (!verifiedUser) {
      return c.json(
        {
          error: 'Failed to verify user',
          code: 'admin/verify-failed',
        },
        500
      );
    }

    console.log('✅ [Admin] User verified:', verifiedUser.email);

    // Queue verification email (NON-BLOCKING)
    try {
      const emailMessage: EmailQueueMessage = {
        type: 'account-verified',
        email: verifiedUser.email,
        firstName: verifiedUser.first_name ?? undefined,
        companyName: verifiedUser.company_name ?? undefined,
        timestamp: new Date().toISOString(),
      };
      await c.env.EMAIL_QUEUE.send(emailMessage);
      console.log('✅ [Admin] Verification email queued');
    } catch (emailError) {
      console.error('⚠️ [Admin] Failed to queue verification email:', emailError);
    }

    // Send Telegram notification (NON-BLOCKING)
    try {
      const telegramMessage = `
✅ <b>User Verified</b>

👤 <b>User:</b> ${verifiedUser.first_name || ''} ${verifiedUser.last_name || ''}
🏢 <b>Company:</b> ${verifiedUser.company_name || 'N/A'}
📧 <b>Email:</b> ${verifiedUser.email}
${verifiedUser.phone ? `📞 <b>Phone:</b> ${verifiedUser.phone}` : ''}
${verifiedUser.btw_number ? `🔖 <b>VAT:</b> ${verifiedUser.btw_number}` : ''}

<i>User has been verified and notified via email.</i>
      `.trim();

      const telegramRequest = new Request('https://dummy/notifications/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Token': c.env.SERVICE_SECRET,
        },
        body: JSON.stringify({
          message: telegramMessage,
          parseMode: 'HTML',
        }),
      });

      await c.env.TELEGRAM_SERVICE.fetch(telegramRequest);
      console.log('✅ [Admin] Telegram notification sent');
    } catch (telegramError) {
      console.error('⚠️ [Admin] Failed to send Telegram notification:', telegramError);
    }

    // Map to response format
    const userResponse = {
      id: verifiedUser.id,
      email: verifiedUser.email,
      role: verifiedUser.role,
      company_name: verifiedUser.company_name,
      first_name: verifiedUser.first_name,
      last_name: verifiedUser.last_name,
      phone: verifiedUser.phone,
      btw_number: verifiedUser.btw_number,
      stripe_customer_id: verifiedUser.stripe_customer_id,
      is_active: verifiedUser.is_active,
      is_verified: verifiedUser.is_verified,
      address_street: verifiedUser.address_street,
      address_house_number: verifiedUser.address_house_number,
      address_city: verifiedUser.address_city,
      address_postal_code: verifiedUser.address_postal_code,
      address_country: verifiedUser.address_country,
      created_at: verifiedUser.created_at,
      updated_at: verifiedUser.updated_at,
    };

    return c.json({
      message: 'User verified successfully',
      user: userResponse,
    });
  } catch (error: any) {
    console.error('❌ [Admin] Error verifying user:', error);
    return c.json(
      {
        error: 'Failed to verify user',
        code: 'admin/verify-failed',
        message: error.message,
      },
      500
    );
  }
});

// ============================================================================
// DEACTIVATE USER
// ============================================================================

admin.delete('/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');

    console.log('🎯 [Admin] Deactivating user:', userId);

    const db = createDb(c.env.DB);

    // Check user exists
    const existingUser = await getUserById(db, userId);
    if (!existingUser) {
      return c.json(
        {
          error: 'User not found',
          code: 'admin/user-not-found',
        },
        404
      );
    }

    // Prevent self-deactivation
    const currentUser = c.get('user');
    if (currentUser.userId === userId) {
      return c.json(
        {
          error: 'Cannot deactivate your own account',
          code: 'admin/self-deactivation',
        },
        400
      );
    }

    // Deactivate user
    await deactivateUser(db, userId);

    // Invalidate all sessions
    await deleteUserSessions(db, userId);

    console.log('✅ [Admin] User deactivated:', existingUser.email);

    return c.json({
      message: 'User deactivated successfully',
    });
  } catch (error: any) {
    console.error('❌ [Admin] Error deactivating user:', error);
    return c.json(
      {
        error: 'Failed to deactivate user',
        code: 'admin/deactivate-failed',
        message: error.message,
      },
      500
    );
  }
});

// ============================================================================
// RESET USER PASSWORD
// ============================================================================

admin.post('/users/:userId/reset-password', async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json();

    if (!body.password) {
      return c.json(
        {
          error: 'Password is required',
          code: 'admin/validation-error',
        },
        400
      );
    }

    console.log('🎯 [Admin] Resetting password for user:', userId);

    const db = createDb(c.env.DB);

    // Check user exists
    const existingUser = await getUserById(db, userId);
    if (!existingUser) {
      return c.json(
        {
          error: 'User not found',
          code: 'admin/user-not-found',
        },
        404
      );
    }

    // Hash and update password
    const passwordHash = await hashPassword(body.password);
    await updateUserPassword(db, userId, passwordHash);

    // Invalidate all sessions (force re-login)
    await deleteUserSessions(db, userId);

    console.log('✅ [Admin] Password reset for:', existingUser.email);

    return c.json({
      message: 'Password reset successfully',
    });
  } catch (error: any) {
    console.error('❌ [Admin] Error resetting password:', error);
    return c.json(
      {
        error: 'Failed to reset password',
        code: 'admin/reset-password-failed',
        message: error.message,
      },
      500
    );
  }
});

// ============================================================================
// INVOICES ROUTES
// ============================================================================
admin.route('/invoices', invoicesRoutes);

export default admin;
