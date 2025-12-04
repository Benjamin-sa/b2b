/**
 * Error Utilities
 * 
 * Standardized error responses matching Firebase Auth error patterns
 */

import type { ApiError } from '../types';

export class AuthError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }

  toJSON(): ApiError {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

// Firebase Auth compatible error codes
export const ErrorCodes = {
  // Authentication errors
  INVALID_EMAIL: 'auth/invalid-email',
  USER_NOT_FOUND: 'auth/user-not-found',
  WRONG_PASSWORD: 'auth/wrong-password',
  EMAIL_ALREADY_IN_USE: 'auth/email-already-in-use',
  WEAK_PASSWORD: 'auth/weak-password',
  TOO_MANY_REQUESTS: 'auth/too-many-requests',
  USER_DISABLED: 'auth/user-disabled',
  USER_NOT_VERIFIED: 'auth/user-not-verified',
  
  // Token errors
  INVALID_TOKEN: 'auth/invalid-token',
  TOKEN_EXPIRED: 'auth/token-expired',
  INVALID_REFRESH_TOKEN: 'auth/invalid-refresh-token',
  SESSION_EXPIRED: 'auth/session-expired',
  
  // Authorization errors
  UNAUTHORIZED: 'auth/unauthorized',
  FORBIDDEN: 'auth/forbidden',
  
  // Request errors
  MISSING_FIELDS: 'auth/missing-fields',
  INVALID_REQUEST: 'auth/invalid-request',
  CONFIG_ERROR: 'auth/config-error',
  
  // Server errors
  INTERNAL_ERROR: 'auth/internal-error',
  DATABASE_ERROR: 'auth/database-error',
} as const;

export function createAuthError(
  code: keyof typeof ErrorCodes,
  message?: string
): AuthError {
  const errorCode = ErrorCodes[code];
  
  const defaultMessages: Record<string, string> = {
    [ErrorCodes.INVALID_EMAIL]: 'The email address is invalid',
    [ErrorCodes.USER_NOT_FOUND]: 'No user found with this email',
    [ErrorCodes.WRONG_PASSWORD]: 'Invalid password',
    [ErrorCodes.EMAIL_ALREADY_IN_USE]: 'Email already in use',
    [ErrorCodes.WEAK_PASSWORD]: 'Password does not meet requirements',
    [ErrorCodes.TOO_MANY_REQUESTS]: 'Too many requests. Please try again later',
    [ErrorCodes.USER_DISABLED]: 'This account has been disabled',
    [ErrorCodes.USER_NOT_VERIFIED]: 'Email not verified. Please contact support',
    [ErrorCodes.INVALID_TOKEN]: 'Invalid authentication token',
    [ErrorCodes.TOKEN_EXPIRED]: 'Authentication token has expired',
    [ErrorCodes.INVALID_REFRESH_TOKEN]: 'Invalid refresh token',
    [ErrorCodes.SESSION_EXPIRED]: 'Session has expired',
    [ErrorCodes.UNAUTHORIZED]: 'Unauthorized access',
    [ErrorCodes.FORBIDDEN]: 'Access forbidden',
    [ErrorCodes.MISSING_FIELDS]: 'Required fields are missing',
    [ErrorCodes.INVALID_REQUEST]: 'Invalid request',
    [ErrorCodes.CONFIG_ERROR]: 'Configuration error',
    [ErrorCodes.INTERNAL_ERROR]: 'Internal server error',
    [ErrorCodes.DATABASE_ERROR]: 'Database error',
  };

  const statusCodes: Record<string, number> = {
    [ErrorCodes.INVALID_EMAIL]: 400,
    [ErrorCodes.USER_NOT_FOUND]: 404,
    [ErrorCodes.WRONG_PASSWORD]: 401,
    [ErrorCodes.EMAIL_ALREADY_IN_USE]: 409,
    [ErrorCodes.WEAK_PASSWORD]: 400,
    [ErrorCodes.TOO_MANY_REQUESTS]: 429,
    [ErrorCodes.USER_DISABLED]: 403,
    [ErrorCodes.USER_NOT_VERIFIED]: 403,
    [ErrorCodes.INVALID_TOKEN]: 401,
    [ErrorCodes.TOKEN_EXPIRED]: 401,
    [ErrorCodes.INVALID_REFRESH_TOKEN]: 401,
    [ErrorCodes.SESSION_EXPIRED]: 401,
    [ErrorCodes.UNAUTHORIZED]: 401,
    [ErrorCodes.FORBIDDEN]: 403,
    [ErrorCodes.MISSING_FIELDS]: 400,
    [ErrorCodes.INVALID_REQUEST]: 400,
    [ErrorCodes.CONFIG_ERROR]: 500,
    [ErrorCodes.INTERNAL_ERROR]: 500,
    [ErrorCodes.DATABASE_ERROR]: 500,
  };

  return new AuthError(
    errorCode,
    statusCodes[errorCode] || 500,
    message || defaultMessages[errorCode] || 'An error occurred'
  );
}
