/**
 * @b2b/types - User & Authentication Types
 *
 * Single source of truth for user, authentication, and session types.
 * ALL fields use snake_case to match D1 database schema.
 */

import type { ISODateString, SQLiteBoolean } from './common';

// ============================================================================
// USER TYPES (matches D1 `users` table)
// ============================================================================

/**
 * User roles in the system (for type checking in application code)
 * Note: Database returns generic string, use isValidUserRole() to validate
 */
export type UserRole = 'admin' | 'customer';

/**
 * All valid user role values
 */
export const USER_ROLE_VALUES: readonly UserRole[] = ['admin', 'customer'] as const;

/**
 * Type guard to check if a string is a valid UserRole
 */
export function isValidUserRole(value: string): value is UserRole {
  return USER_ROLE_VALUES.includes(value as UserRole);
}

/**
 * User record from D1 database
 * Note: password_hash is excluded from API responses
 * Note: role is typed as string since Drizzle returns string from TEXT columns
 *
 * REQUIRED fields (enforced at registration):
 * - company_name, first_name, last_name, btw_number
 * - All address fields (street, house_number, postal_code, city, country)
 */
export interface User {
  id: string;
  email: string;
  /** Use isValidUserRole() to validate if needed */
  role: string;

  // Required business fields (enforced at registration)
  company_name: string;
  first_name: string;
  last_name: string;
  btw_number: string;

  // Optional contact
  phone: string | null;

  // VIES (EU VAT) verification data (populated after validation)
  btw_number_validated: SQLiteBoolean;
  btw_verified_name: string | null;
  btw_verified_address: string | null;
  btw_verified_at: ISODateString | null;

  // Required address fields (enforced aistration)
  address_street: string;
  address_house_number: string;
  address_postal_code: string;
  address_city: string;
  address_country: string;

  // Stripe integration (set after customer creation)
  stripe_customer_id: string | null;

  // Account status
  is_active: SQLiteBoolean;
  is_verified: SQLiteBoolean;

  // Timestamps
  created_at: ISODateString | null;
  updated_at: ISODateString | null;
}

/**
 * User profile returned to frontend (excludes sensitive fields)
 * This is what the API returns after authentication
 */
export type UserProfile = Omit<User, 'password_hash'>;

/**
 * User with password hash (internal use only, never exposed via API)
 */
export interface UserWithPassword extends User {
  password_hash: string;
}

/**
 * Input for creating a new user
 * All business-required fields are mandatory
 */
export interface CreateUserInput {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;

  // Required business fields
  company_name: string;
  first_name: string;
  last_name: string;
  btw_number: string;

  // Required address fields
  address_street: string;
  address_house_number: string;
  address_postal_code: string;
  address_city: string;
  address_country: string;

  // Optional fields
  phone?: string | null;
  is_active?: SQLiteBoolean;
  is_verified?: SQLiteBoolean;
}

/**
 * Input for updating user profile
 */
export interface UpdateUserInput {
  company_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  btw_number?: string;
  btw_number_validated?: SQLiteBoolean;
  btw_verified_name?: string | null;
  btw_verified_address?: string | null;
  btw_verified_at?: ISODateString | null;
  address_street?: string;
  address_house_number?: string;
  address_postal_code?: string;
  address_city?: string;
  address_country?: string;
  is_active?: SQLiteBoolean;
  is_verified?: SQLiteBoolean;
  stripe_customer_id?: string;
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

/**
 * Login request credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration form data (frontend format with nested address)
 */
export interface RegisterData {
  email: string;
  password: string;
  confirm_password: string;
  company_name: string;
  first_name: string;
  last_name: string;
  phone?: string;
  btw_number: string;
  address: {
    street: string;
    house_number: string;
    postal_code: string;
    city: string;
    country: string;
  };
}

/**
 * JWT token pair
 */
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

/**
 * Full authentication response from login/register
 */
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: UserProfile;
}

/**
 * Token validation response
 */
export interface TokenValidationResponse {
  valid: boolean;
  user: UserProfile;
  permissions: string[];
  session_id: string;
}

/**
 * JWT payload (decoded token)
 */
export interface JwtPayload {
  user_id: string;
  email: string;
  role: UserRole;
  stripe_customer_id: string | null;
  iat: number;
  exp: number;
}

// ============================================================================
// PASSWORD RESET TYPES
// ============================================================================

/**
 * Password reset request (email submission)
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation (new password submission)
 */
export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

// ============================================================================
// SESSION TYPES (matches D1 `sessions` table)
// ============================================================================

/**
 * User session record
 * Note: timestamps can be null due to D1 defaults
 */
export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: ISODateString;
  user_agent: string | null;
  ip_address: string | null;
  created_at: ISODateString | null;
  last_activity: ISODateString | null;
}

/**
 * Input for creating a new session
 */
export interface CreateSessionInput {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  user_agent?: string | null;
  ip_address?: string | null;
}

// ============================================================================
// TOKEN TYPES (matches D1 token tables)
// ============================================================================

/**
 * Password reset token record
 */
export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: ISODateString;
  used: SQLiteBoolean;
  created_at: ISODateString | null;
  used_at: ISODateString | null;
}

/**
 * Input for creating a password reset token
 */
export interface CreatePasswordResetTokenInput {
  id: string;
  user_id: string;
  token: string;
  expires_at: ISODateString;
}

/**
 * Email verification token record
 */
export interface EmailVerificationToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: ISODateString;
  used: SQLiteBoolean;
  created_at: ISODateString | null;
  used_at: ISODateString | null;
}

/**
 * Input for creating an email verification token
 */
export interface CreateEmailVerificationTokenInput {
  id: string;
  user_id: string;
  token: string;
  expires_at: ISODateString;
}
