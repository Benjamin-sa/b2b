export * as schema from './schema';
export * from './db';
export * from './operations';

// Re-export types from @b2b/types for backward compatibility
// New code should import directly from '@b2b/types'
export type * from './types';

// Re-export commonly used drizzle-orm functions for convenience
export {
  sql,
  eq,
  and,
  or,
  like,
  gte,
  lte,
  gt,
  lt,
  ne,
  inArray,
  desc,
  asc,
  isNotNull,
  isNull,
} from 'drizzle-orm';
