/**
 * Simple Proxy Utility
 * 
 * Forwards requests to microservices without any auth logic.
 * Services handle their own JWT verification.
 */

import type { Context } from 'hono';
import type { Env, ProxyOptions } from '../types';

/**
 * Forward request to a microservice
 * 
 * @param c - Hono context
 * @param options - Proxy configuration
 * @returns Response from the target service
 */
export async function proxyRequest(
  c: Context<{ Bindings: Env }>,
  options: ProxyOptions
): Promise<Response> {
  const { serviceUrl, stripPrefix = '', timeout = 30000 } = options;

  try {
    // Build target URL
    let path = c.req.path;
    if (stripPrefix && path.startsWith(stripPrefix)) {
      path = path.slice(stripPrefix.length);
    }

    const targetUrl = new URL(path, serviceUrl);
    
    // Copy query parameters
    const searchParams = new URL(c.req.url).searchParams;
    searchParams.forEach((value, key) => {
      targetUrl.searchParams.append(key, value);
    });

    // Forward request with all headers (including Authorization)
    const headers = new Headers(c.req.raw.headers);
    
    // Add forwarding headers for tracing
    headers.set('X-Forwarded-For', c.req.header('CF-Connecting-IP') || 'unknown');
    headers.set('X-Forwarded-Host', c.req.header('Host') || 'unknown');
    headers.set('X-Gateway-Timestamp', new Date().toISOString());

    // Create request
    const requestInit: RequestInit = {
      method: c.req.method,
      headers,
      // @ts-expect-error - Cloudflare Workers supports timeout
      timeout,
    };

    // Add body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)) {
      requestInit.body = await c.req.raw.clone().arrayBuffer();
    }

    console.log(`[Proxy] ${c.req.method} ${c.req.path} → ${targetUrl.toString()}`);

    // Forward request to service
    const response = await fetch(targetUrl.toString(), requestInit);

    // Return response as-is
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

  } catch (error) {
    console.error('[Proxy Error]', error);

    if (error instanceof Error && error.name === 'TimeoutError') {
      return c.json(
        {
          error: 'Gateway Timeout',
          code: 'gateway/timeout',
          message: 'The service took too long to respond',
          service: options.serviceUrl,
        },
        504
      );
    }

    return c.json(
      {
        error: 'Bad Gateway',
        code: 'gateway/service-error',
        message: 'Failed to connect to service',
        service: options.serviceUrl,
      },
      502
    );
  }
}
