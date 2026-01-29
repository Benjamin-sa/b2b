/**
 * @b2b/types
 *
 * Single source of truth for all types in the B2B platform.
 * ALL types use snake_case to match D1 database schema.
 *
 * Usage:
 *   import type { Product, Order, User } from '@b2b/types';
 *   import type { ProductFilter } from '@b2b/types/product';
 *   import type { ApiGatewayEnv } from '@b2b/types/api';
 */

// ============================================================================
// RE-EXPORT ALL TYPES
// ============================================================================

// Common types
export * from './common';

// Entity types
export * from './user';
export * from './product';
export * from './category';
export * from './order';
export * from './cart';
export * from './inventory';

// API types
export * from './api';

// Service middleware
export * from './service-auth';
