/**
 * Frontend Types - Re-exports from @b2b/types
 *
 * This file provides backward compatibility for existing imports.
 * New code should import directly from '@b2b/types'.
 *
 * Usage:
 *   import type { Product, Order, User } from '@b2b/types';
 */

// Re-export everything from @b2b/types
export * from '@b2b/types';

// Legacy compatibility exports (will be removed in future)
export * from './auth';
export * from './product';
export * from './category';
export * from './order';
export * from './common';
