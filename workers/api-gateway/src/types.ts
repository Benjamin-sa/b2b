/**
 * API Gateway Types
 * 
 * Orchestration layer using Cloudflare Service Bindings
 * for direct worker-to-worker communication (no HTTP overhead)
 */

// Service binding types (Cloudflare Workers RPC)
export interface AuthService extends Fetcher {
  // Auth service is callable via service binding
  fetch: (request: Request) => Promise<Response>;
}

export interface EmailService extends Fetcher {
  // Email service is callable via service binding
  fetch: (request: Request) => Promise<Response>;
}

export interface InventoryService extends Fetcher {
  // Inventory service is callable via service binding
  fetch: (request: Request) => Promise<Response>;
}

export interface Env {
  ENVIRONMENT: 'development' | 'production';
  
  // Service Bindings (direct worker-to-worker calls - FAST!)
  AUTH_SERVICE: AuthService;
  EMAIL_SERVICE: EmailService;
  INVENTORY_SERVICE: InventoryService;
  
  // Allowed origins for CORS
  ALLOWED_ORIGINS: string;
  
  // Rate limiting (optional KV namespace)
  RATE_LIMIT?: KVNamespace;
}

export interface ProxyOptions {
  serviceUrl: string;
  stripPrefix?: string;
  timeout?: number;
}
