/**
 * Auth Service Types
 * 
 * Type definitions for the authentication service
 */

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  REFRESH_SECRET: string;
  ENVIRONMENT: 'development' | 'production';
  ACCESS_TOKEN_TTL: string;
  REFRESH_TOKEN_TTL: string;
  PASSWORD_MIN_LENGTH: string;
  ALLOWED_ORIGINS: string;
  STRIPE_SERVICE: Fetcher; // Service binding to stripe-service worker
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'customer';
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  btw_number: string | null;
  address_street: string | null;
  address_house_number: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  address_country: string | null;
  stripe_customer_id: string | null; // Stripe customer ID
  is_active: number; // SQLite boolean (0 or 1)
  is_verified: number; // SQLite boolean (0 or 1)
  created_at: string;
  updated_at: string;
}

export interface UserClaims {
  uid: string; // User ID (matches Firebase Auth naming)
  email: string;
  role: 'admin' | 'customer';
  companyName?: string;
  firstName?: string;
  lastName?: string;
  isVerified: boolean;
  isActive: boolean;
}

export interface AccessTokenPayload extends UserClaims {
  sessionId: string; // Session ID for validation
  iat: number; // Issued at
  exp: number; // Expires at
}

export interface RefreshTokenPayload {
  uid: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export interface Session {
  userId: string;
  sessionId: string;
  refreshToken: string;
  createdAt: string;
  expiresAt: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    uid: string;
    email: string;
    role: string;
    companyName?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    btwNumber?: string;
    address?: {
      street: string;
      houseNumber: string;
      postalCode: string;
      city: string;
      country: string;
    };
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  companyName: string;
  firstName: string;
  lastName: string;
  phone?: string;
  btwNumber?: string;
  address?: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    country: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ApiError {
  error: string;
  code: string;
  message: string;
  statusCode: number;
}
