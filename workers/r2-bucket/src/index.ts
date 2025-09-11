/**
 * Main Cloudflare Worker Entry Point
 * Handles routing for different services (images, emails, etc.)
 */

import { handleImageRequest } from './handlers/imageHandler';
import { handleCors } from './utils/cors';
import { createErrorResponse } from './utils/response';
import type { Env } from './types';

// Define ExecutionContext interface locally
interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return handleCors(request);
      }

      // Route requests to appropriate handlers
      if (path.startsWith('/api/images')) {
        return await handleImageRequest(request, env);
      }

      // Health check endpoint
      if (path === '/health' || path === '/') {
        return new Response(
          JSON.stringify({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            version: '1.0.0' 
          }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 404 for unknown routes
      return createErrorResponse('Not Found', 404, request);

    } catch (error) {
      console.error('Worker error:', error);
      return createErrorResponse('Internal Server Error', 500, request);
    }
  }
};
