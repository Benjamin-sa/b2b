/**
 * Auth Service
 *
 * Core authentication business logic
 */

import { nanoid } from 'nanoid';
import { createDb } from '@b2b/db';
import {
  createUser as insertUser,
  deleteUserById,
  getUserByEmail,
  getUserById,
  updateUserStripeCustomerId,
} from '@b2b/db/operations';
import type { NewUser } from '@b2b/db/types';
import type { Env, User, UserClaims, AuthResponse, RegisterRequest, LoginRequest } from '../types';
import { hashPassword, verifyPassword, validatePassword, validateEmail } from '../utils/password';
import { createAccessToken, createRefreshToken } from '../utils/jwt';
import { generateSessionId, storeSession } from '../utils/session';
import { createAuthError } from '../utils/errors';
import { createStripeCustomer } from './stripe.service';

/**
 * Register a new user
 */
export async function registerUser(
  env: Env,
  data: RegisterRequest,
  userAgent?: string,
  ipAddress?: string
): Promise<AuthResponse> {
  const db = createDb(env.DB);

  // Validate email
  if (!validateEmail(data.email)) {
    throw createAuthError('INVALID_EMAIL');
  }

  // Validate password
  const passwordValidation = validatePassword(data.password, parseInt(env.PASSWORD_MIN_LENGTH));
  if (!passwordValidation.valid) {
    throw createAuthError('WEAK_PASSWORD', passwordValidation.errors.join(', '));
  }

  // Check if email already exists
  const normalizedEmail = data.email.toLowerCase();
  const existingUser = await getUserByEmail(db, normalizedEmail);

  if (existingUser) {
    throw createAuthError('EMAIL_ALREADY_IN_USE');
  }

  // Hash password
  const passwordHash = await hashPassword(data.password);

  // Generate user ID
  const userId = nanoid(28); // Firebase-like ID length

  // Insert user into database
  const now = new Date().toISOString();

  const newUser: NewUser = {
    id: userId,
    email: normalizedEmail,
    password_hash: passwordHash,
    role: 'customer',
    company_name: data.company_name,
    first_name: data.first_name,
    last_name: data.last_name,
    phone: data.phone || null,
    btw_number: data.btw_number || null,
    address_street: data.address?.street || null,
    address_house_number: data.address?.house_number || null,
    address_postal_code: data.address?.postal_code || null,
    address_city: data.address?.city || null,
    address_country: data.address?.country || null,
    stripe_customer_id: null,
    is_active: 1,
    is_verified: 0,
    created_at: now,
    updated_at: now,
  };

  await insertUser(db, newUser);

  // Fetch the created user
  const user = (await getUserById(db, userId)) as User | undefined;

  if (!user) {
    throw createAuthError('DATABASE_ERROR', 'Failed to create user');
  }

  // Create Stripe customer - BLOCKING (if Stripe is configured)
  // If Stripe fails, we roll back the user creation
  let stripeCustomerId: string | null = null;

  try {
    stripeCustomerId = await createStripeCustomer(env, user, ipAddress);

    // Update user with Stripe customer ID if created successfully
    if (stripeCustomerId) {
      await updateUserStripeCustomerId(db, userId, stripeCustomerId);

      // Update the user object with Stripe ID for the session
      user.stripe_customer_id = stripeCustomerId;
    }
  } catch (error) {
    // Stripe creation failed - rollback user creation
    console.error('❌ Stripe customer creation failed, rolling back user creation:', error);

    // Delete the user we just created
    await deleteUserById(db, userId);

    // Re-throw the error to fail the registration
    throw createAuthError(
      'INTERNAL_ERROR',
      'Failed to create payment account. Please try again or contact support.'
    );
  }

  // Generate tokens and session
  return await createUserSession(env, user, userAgent, ipAddress);
}

/**
 * Login with email and password
 */
export async function loginUser(
  env: Env,
  data: LoginRequest,
  userAgent?: string,
  ipAddress?: string
): Promise<AuthResponse> {
  const db = createDb(env.DB);

  // Fetch user by email
  const user = (await getUserByEmail(db, data.email.toLowerCase())) as User | undefined;

  if (!user) {
    throw createAuthError('USER_NOT_FOUND');
  }

  // Check if user is active
  if (user.is_active === 0) {
    throw createAuthError('USER_DISABLED');
  }

  // Verify password
  const isValidPassword = await verifyPassword(data.password, user.password_hash);
  if (!isValidPassword) {
    throw createAuthError('WRONG_PASSWORD');
  }

  // Generate tokens and session
  return await createUserSession(env, user, userAgent, ipAddress);
}

/**
 * Create user session and tokens
 */
async function createUserSession(
  env: Env,
  user: User,
  userAgent?: string,
  ipAddress?: string
): Promise<AuthResponse> {
  // Build user claims
  const claims: UserClaims = {
    uid: user.id,
    email: user.email,
    role: user.role,
    companyName: user.company_name || undefined,
    firstName: user.first_name || undefined,
    lastName: user.last_name || undefined,
    isVerified: user.is_verified === 1,
    isActive: user.is_active === 1,
  };

  // Generate session ID
  const sessionId = generateSessionId();

  // Token TTLs
  const accessTokenTtl = parseInt(env.ACCESS_TOKEN_TTL);
  const refreshTokenTtl = parseInt(env.REFRESH_TOKEN_TTL);

  // Generate tokens
  const accessToken = await createAccessToken(claims, sessionId, env.JWT_SECRET, accessTokenTtl);
  const refreshToken = await createRefreshToken(
    user.id,
    sessionId,
    env.REFRESH_SECRET,
    refreshTokenTtl
  );

  // Store session in KV
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + refreshTokenTtl * 1000).toISOString();

  await storeSession(
    env.SESSIONS,
    {
      userId: user.id,
      sessionId,
      refreshToken,
      createdAt: now,
      expiresAt,
      userAgent,
      ipAddress,
    },
    refreshTokenTtl
  );

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

  return {
    accessToken,
    refreshToken,
    expiresIn: accessTokenTtl,
    user: {
      uid: user.id,
      email: user.email,
      role: user.role,
      companyName: user.company_name || undefined,
      firstName: user.first_name || undefined,
      lastName: user.last_name || undefined,
      phone: user.phone || undefined,
      btwNumber: user.btw_number || undefined,
      address,
      isVerified: user.is_verified === 1,
      isActive: user.is_active === 1,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
  };
}

/**
 * Convert User to UserClaims
 */
export function userToClaims(user: User): UserClaims {
  return {
    uid: user.id,
    email: user.email,
    role: user.role,
    companyName: user.company_name || undefined,
    firstName: user.first_name || undefined,
    lastName: user.last_name || undefined,
    isVerified: user.is_verified === 1,
    isActive: user.is_active === 1,
  };
}
