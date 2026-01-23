/**
 * Test Helpers - Index
 *
 * Exports all test utilities for easy importing
 */

// API Client
export {
  ApiClient,
  createApiClient,
  createAdminClient,
  createUserClient,
  hasAdminCredentials,
  hasUserCredentials,
  type TestConfig,
  type AuthTokens,
  type UserProfile,
  type LoginResponse,
  type ApiResponse,
  type ApiError,
} from './api-client';

// Legacy auth helper (for backwards compatibility)
export { getFreshAdminToken, loginAsUser, loginAsAdmin, verifyToken } from './auth';

// Validators
export * from './validators';

// Test Data Generators
export * from './test-data';
