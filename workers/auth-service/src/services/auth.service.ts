/**
 * Auth Service
 * 
 * Core authentication business logic
 */

import { nanoid } from 'nanoid';
import type {
  Env,
  User,
  UserClaims,
  AuthResponse,
  RegisterRequest,
  LoginRequest,
} from '../types';
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
  // Validate email
  if (!validateEmail(data.email)) {
    throw createAuthError('INVALID_EMAIL');
  }

  // Validate password
  const passwordValidation = validatePassword(
    data.password,
    parseInt(env.PASSWORD_MIN_LENGTH)
  );
  if (!passwordValidation.valid) {
    throw createAuthError('WEAK_PASSWORD', passwordValidation.errors.join(', '));
  }

  // Check if email already exists
  const existingUser = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  )
    .bind(data.email.toLowerCase())
    .first<{ id: string }>();

  if (existingUser) {
    throw createAuthError('EMAIL_ALREADY_IN_USE');
  }

  // Hash password
  const passwordHash = await hashPassword(data.password);

  // Generate user ID
  const userId = nanoid(28); // Firebase-like ID length

  // Insert user into database
  const now = new Date().toISOString();
  
  await env.DB.prepare(`
    INSERT INTO users (
      id, email, password_hash, role, company_name, first_name, last_name,
      phone, btw_number, address_street, address_house_number, address_postal_code,
      address_city, address_country, stripe_customer_id, is_active, is_verified, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    userId,
    data.email.toLowerCase(),
    passwordHash,
    'customer', // Default role
    data.companyName,
    data.firstName,
    data.lastName,
    data.phone || null,
    data.btwNumber || null,
    data.address?.street || null,
    data.address?.houseNumber || null,
    data.address?.postalCode || null,
    data.address?.city || null,
    data.address?.country || null,
    null, // stripe_customer_id (will be set after creation)
    1, // is_active
    0, // is_verified (requires admin approval)
    now,
    now
  ).run();

  // Fetch the created user
  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  )
    .bind(userId)
    .first<User>();

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
      await env.DB.prepare(
        'UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE id = ?'
      )
        .bind(stripeCustomerId, new Date().toISOString(), userId)
        .run();
      
      // Update the user object with Stripe ID for the session
      user.stripe_customer_id = stripeCustomerId;
    }
  } catch (error) {
    // Stripe creation failed - rollback user creation
    console.error('❌ Stripe customer creation failed, rolling back user creation:', error);
    
    // Delete the user we just created
    await env.DB.prepare('DELETE FROM users WHERE id = ?')
      .bind(userId)
      .run();
    
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
  // Fetch user by email
  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE email = ?'
  )
    .bind(data.email.toLowerCase())
    .first<User>();

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
      isVerified: user.is_verified === 1,
      isActive: user.is_active === 1,
      btwNumber: user.btw_number || undefined,
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
