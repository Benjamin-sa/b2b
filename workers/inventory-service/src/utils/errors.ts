/**
 * Error Utilities
 * 
 * Standardized error handling for the inventory service
 */

import { InventoryError } from '../types';

/**
 * Create a standardized error
 */
export function createError(
  code: string,
  message: string,
  statusCode: number = 500,
  details?: any
): InventoryError {
  return new InventoryError(code, message, statusCode, details);
}

/**
 * Common error factories
 */
export const errors = {
  notFound: (resource: string, id: string) =>
    createError('NOT_FOUND', `${resource} with id '${id}' not found`, 404),

  alreadyExists: (resource: string, field: string, value: string) =>
    createError(
      'ALREADY_EXISTS',
      `${resource} with ${field} '${value}' already exists`,
      409
    ),

  validationError: (message: string, details?: any) =>
    createError('VALIDATION_ERROR', message, 400, details),

  unauthorized: (message: string = 'Unauthorized') =>
    createError('UNAUTHORIZED', message, 401),

  forbidden: (message: string = 'Forbidden') =>
    createError('FORBIDDEN', message, 403),

  conflict: (message: string, details?: any) =>
    createError('CONFLICT', message, 409, details),

  badRequest: (message: string, details?: any) =>
    createError('BAD_REQUEST', message, 400, details),

  internalError: (message: string = 'Internal server error', details?: any) =>
    createError('INTERNAL_ERROR', message, 500, details),

  databaseError: (message: string, details?: any) =>
    createError('DATABASE_ERROR', message, 500, details),
};
