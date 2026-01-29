/**
 * @b2b/types - Common Types
 *
 * Shared utility types used across all modules.
 * ALL API types use snake_case to match database schema.
 */

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Standard API error response
 */
export interface ApiError {
  error: string;
  code: string;
  message?: string;
  status_code?: number;
}

/**
 * Standard API success response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

/**
 * Pagination parameters for list requests
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// ============================================================================
// FORM & VALIDATION TYPES
// ============================================================================

/**
 * Form validation error
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Generic form state
 */
export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  is_submitting: boolean;
  is_dirty: boolean;
}

// ============================================================================
// LOADING STATE
// ============================================================================

/**
 * Generic loading state for async operations
 */
export interface LoadingState {
  is_loading: boolean;
  error: string | null;
  last_updated?: string;
}

// ============================================================================
// DATE/TIME HELPERS
// ============================================================================

/**
 * ISO date string (returned by D1/SQLite)
 */
export type ISODateString = string;

/**
 * SQLite boolean (stored as 0 or 1, but Drizzle returns number | null)
 * D1 returns null for columns with defaults before they're explicitly set.
 *
 * Usage:
 * - Truthy check: `if (value)` or `if (value === 1)`
 * - Falsy check: `if (!value)` or `if (value === 0)`
 */
export type SQLiteBoolean = number | null;

/**
 * SQLite boolean that is definitely set to 0 or 1 (runtime validated)
 */
export type SQLiteBooleanRequired = 0 | 1;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific properties optional
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Omit id and timestamp fields for creation
 */
export type CreateInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

/**
 * Partial update input (omits id and timestamps)
 */
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>;
