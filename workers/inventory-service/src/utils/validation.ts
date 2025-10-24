/**
 * Validation Utilities
 * 
 * Input validation helpers
 */

import { errors } from './errors';

/**
 * Validate required fields in an object
 */
export function validateRequired(
  data: Record<string, any>,
  requiredFields: string[]
): void {
  const missing = requiredFields.filter((field) => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    throw errors.validationError(
      `Missing required fields: ${missing.join(', ')}`,
      { missingFields: missing }
    );
  }
}

/**
 * Validate price is a positive number
 */
export function validatePrice(price: any): void {
  if (typeof price !== 'number' || price < 0) {
    throw errors.validationError('Price must be a positive number');
  }
}

/**
 * Validate stock is a non-negative integer
 */
export function validateStock(stock: any): void {
  if (
    typeof stock !== 'number' ||
    stock < 0 ||
    !Number.isInteger(stock)
  ) {
    throw errors.validationError('Stock must be a non-negative integer');
  }
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  page: any,
  limit: any,
  maxLimit: number = 100
): { page: number; limit: number } {
  const parsedPage = parseInt(page) || 1;
  const parsedLimit = parseInt(limit) || 20;

  if (parsedPage < 1) {
    throw errors.validationError('Page must be greater than 0');
  }

  if (parsedLimit < 1 || parsedLimit > maxLimit) {
    throw errors.validationError(
      `Limit must be between 1 and ${maxLimit}`
    );
  }

  return { page: parsedPage, limit: parsedLimit };
}

/**
 * Validate sort parameters
 */
export function validateSort(
  sortBy: any,
  sortOrder: any,
  allowedFields: string[]
): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  const field = sortBy || 'created_at';
  const order = sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  if (!allowedFields.includes(field)) {
    throw errors.validationError(
      `Invalid sort field. Allowed: ${allowedFields.join(', ')}`
    );
  }

  return { sortBy: field, sortOrder: order };
}

/**
 * Validate UUID format
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength: number = 255): string {
  return input.trim().slice(0, maxLength);
}
