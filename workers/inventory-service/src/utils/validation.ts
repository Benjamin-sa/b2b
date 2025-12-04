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
 * Map frontend camelCase field names to backend snake_case
 */
const FIELD_NAME_MAP: Record<string, string> = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  categoryId: 'category_id',
  partNumber: 'part_number',
  minOrderQuantity: 'min_order_quantity',
  maxOrderQuantity: 'max_order_quantity',
  imageUrl: 'image_url',
  originalPrice: 'original_price',
  inStock: 'in_stock',
  comingSoon: 'coming_soon',
  popularity: 'created_at', // Map popularity to created_at (newest first) as fallback
};

/**
 * Validate sort parameters
 * Supports both camelCase (frontend) and snake_case (database) field names
 */
export function validateSort(
  sortBy: any,
  sortOrder: any,
  allowedFields: string[]
): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  let field = sortBy || 'created_at';
  const order = sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  // Map camelCase to snake_case if needed
  if (FIELD_NAME_MAP[field]) {
    field = FIELD_NAME_MAP[field];
  }

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
