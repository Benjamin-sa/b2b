/**
 * Database Utilities
 *
 * Helper functions for D1 database operations
 */

import type { D1Database } from '@cloudflare/workers-types';
import { errors } from './errors';

/**
 * Execute a query and return the first result
 * Throws NotFoundError if no result
 */
export async function getOne<T>(db: D1Database, query: string, params: any[] = []): Promise<T> {
  const stmt = db.prepare(query);
  const result = await stmt.bind(...params).first<T>();

  if (!result) {
    throw errors.notFound('Resource', 'unknown');
  }

  return result;
}

/**
 * Execute a query and return the first result or null
 */
export async function getOneOrNull<T>(
  db: D1Database,
  query: string,
  params: any[] = []
): Promise<T | null> {
  const stmt = db.prepare(query);
  return stmt.bind(...params).first<T>();
}

/**
 * Execute a query and return all results
 */
export async function getMany<T>(db: D1Database, query: string, params: any[] = []): Promise<T[]> {
  const stmt = db.prepare(query);
  const result = await stmt.bind(...params).all<T>();
  return result.results || [];
}

/**
 * Execute a query with pagination
 */
export async function getPaginated<T>(
  db: D1Database,
  query: string,
  countQuery: string,
  params: any[] = [],
  page: number = 1,
  limit: number = 20
): Promise<{
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}> {
  // Get total count
  const countStmt = db.prepare(countQuery);
  const countResult = await countStmt.bind(...params).first<{ count: number }>();
  const totalItems = countResult?.count || 0;

  // Calculate pagination
  const offset = (page - 1) * limit;
  const totalPages = Math.ceil(totalItems / limit);

  // Get paginated results
  const paginatedQuery = `${query} LIMIT ? OFFSET ?`;
  const stmt = db.prepare(paginatedQuery);
  const result = await stmt.bind(...params, limit, offset).all<T>();

  return {
    items: result.results || [],
    totalItems,
    totalPages,
    currentPage: page,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Execute an INSERT statement and return the ID
 */
export async function insert(db: D1Database, query: string, params: any[] = []): Promise<string> {
  const stmt = db.prepare(query);
  const result = await stmt.bind(...params).run();

  if (!result.success) {
    throw errors.databaseError('Insert operation failed', result.error);
  }

  // For SQLite, we need to get the last inserted ID
  // Since D1 doesn't directly return it, we'll return a success indicator
  return 'success';
}

/**
 * Execute an UPDATE statement
 */
export async function update(db: D1Database, query: string, params: any[] = []): Promise<void> {
  const stmt = db.prepare(query);
  const result = await stmt.bind(...params).run();

  if (!result.success) {
    throw errors.databaseError('Update operation failed', result.error);
  }
}

/**
 * Execute a DELETE statement
 */
export async function remove(db: D1Database, query: string, params: any[] = []): Promise<void> {
  const stmt = db.prepare(query);
  const result = await stmt.bind(...params).run();

  if (!result.success) {
    throw errors.databaseError('Delete operation failed', result.error);
  }
}

/**
 * Execute multiple statements in a batch
 */
export async function batch(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
  const results = await db.batch(statements);

  // Check if all succeeded
  const failed = results.find((r) => !r.success);
  if (failed) {
    throw errors.databaseError('Batch operation failed', failed.error);
  }
}

/**
 * Sanitize search term for SQL LIKE queries
 */
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%_]/g, '\\$&');
}

/**
 * Build WHERE clause from filters
 */
export function buildWhereClause(
  filters: Record<string, any>,
  paramPrefix: string = ''
): { clause: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      conditions.push(`${key} = ?`);
      params.push(value);
    }
  });

  const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { clause, params };
}
