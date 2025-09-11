/**
 * Response utilities for consistent API responses
 */

import type { ApiResponse } from '../types';
import { getCorsHeaders } from './cors';

/**
 * Create a successful JSON response
 */
export function createSuccessResponse<T>(
  data: T,
  request: Request,
  status: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(request)
    }
  });
}

/**
 * Create an error response
 */
export function createErrorResponse(
  error: string,
  status: number,
  request: Request
): Response {
  const response: ApiResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString()
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(request)
    }
  });
}

/**
 * Create a validation error response
 */
export function createValidationError(
  message: string,
  request: Request
): Response {
  return createErrorResponse(`Validation Error: ${message}`, 400, request);
}
