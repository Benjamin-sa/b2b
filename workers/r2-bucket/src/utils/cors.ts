/**
 * CORS Configuration and Handler
 * Manages Cross-Origin Resource Sharing for the worker
 */

import type { CorsConfig } from '../types';

// Configuration for allowed origins
const corsConfig: CorsConfig = {
  allowedOrigins: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://motordash-cf401.web.app',
    'https://4tparts.com',
    'http://192.168.129.22:3000'
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin');
  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': corsConfig.allowedMethods.join(', '),
    'Access-Control-Allow-Headers': corsConfig.allowedHeaders.join(', '),
    'Access-Control-Max-Age': '86400' // 24 hours
  };

  // Only set Access-Control-Allow-Origin if origin is in allowed list
  if (origin && corsConfig.allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

/**
 * Handle CORS preflight requests
 */
export function handleCors(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request)
  });
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return !origin || corsConfig.allowedOrigins.includes(origin);
}
