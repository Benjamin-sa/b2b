/**
 * Auth Service Types
 *
 * Type definitions for the authentication service
 */

import type { User as DbUser } from '@b2b/db/types';

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  REFRESH_SECRET: string;
  SERVICE_SECRET: string; // Service-to-service authentication
  ENVIRONMENT: 'development' | 'production';
  ACCESS_TOKEN_TTL: string;
  REFRESH_TOKEN_TTL: string;
  PASSWORD_MIN_LENGTH: string;
  ALLOWED_ORIGINS: string;
  STRIPE_SERVICE: Fetcher; // Service binding to stripe-service worker
}

export type User = DbUser;

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
  company_name: string;
  first_name: string;
  last_name: string;
  phone?: string;
  btw_number?: string;
  address?: {
    street: string;
    house_number: string;
    postal_code: string;
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
