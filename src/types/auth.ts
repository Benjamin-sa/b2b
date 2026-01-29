/**
 * Auth Types - Re-exports from @b2b/types
 *
 * DEPRECATED: Import directly from '@b2b/types' or '@b2b/types/user' instead.
 */

// Re-export all auth types from @b2b/types
export type {
  User,
  UserProfile,
  UserRole,
  LoginCredentials,
  RegisterData,
  AuthTokens,
  AuthResponse,
  TokenValidationResponse as ValidationResponse,
  PasswordResetRequest,
  PasswordResetConfirm,
  Session,
  JwtPayload,
} from '@b2b/types';
