/**
 * Service Call Utilities
 *
 * Simplifies calling internal services via service bindings.
 * Handles headers, JSON serialization, and response parsing.
 */

// ============================================================================
// TYPES
// ============================================================================

interface ServiceCallOptions<T = unknown> {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: T;
}

interface ServiceResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

// ============================================================================
// SERVICE CALL HELPER
// ============================================================================

/**
 * Call an internal service via service binding
 *
 * @param service - The service binding (e.g., env.TELEGRAM_SERVICE)
 * @param serviceSecret - The SERVICE_SECRET for authentication
 * @param options - Request options (path, method, body)
 * @returns Parsed JSON response
 * @throws Error if the service call fails
 *
 * @example
 * const result = await callService(env.SHOPIFY_SYNC_SERVICE, env.SERVICE_SECRET, {
 *   path: '/sync/deduct',
 *   method: 'POST',
 *   body: { products: [...] }
 * });
 */
export async function callService<TRequest = unknown, TResponse = unknown>(
  service: Fetcher,
  serviceSecret: string,
  options: ServiceCallOptions<TRequest>
): Promise<ServiceResponse<TResponse>> {
  const { path, method = 'POST', body } = options;

  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-Service-Token': serviceSecret,
  });

  const request = new Request(`https://dummy${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const response = await service.fetch(request);
  const data = (await response.json()) as TResponse;

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

/**
 * Call service and return data only (throws on non-ok response)
 *
 * @example
 * const result = await callServiceOrThrow(env.SHOPIFY_SYNC_SERVICE, env.SERVICE_SECRET, {
 *   path: '/inventory/check',
 *   method: 'POST',
 *   body: { products: [...] }
 * });
 */
export async function callServiceOrThrow<TRequest = unknown, TResponse = unknown>(
  service: Fetcher,
  serviceSecret: string,
  options: ServiceCallOptions<TRequest>
): Promise<TResponse> {
  const response = await callService<TRequest, TResponse>(service, serviceSecret, options);

  if (!response.ok) {
    throw new Error(`Service call failed: ${options.path} (${response.status})`);
  }

  return response.data;
}
