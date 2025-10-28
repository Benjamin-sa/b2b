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

export interface StripeService extends Fetcher {
  // Stripe service is callable via service binding
  fetch: (request: Request) => Promise<Response>;
}

export interface ShopifySyncService extends Fetcher {
  // Shopify Sync service is callable via service binding
  fetch: (request: Request) => Promise<Response>;
}

export interface TelegramService extends Fetcher {
  // Telegram notification service is callable via service binding
  fetch: (request: Request) => Promise<Response>;
}

export interface Env {
  ENVIRONMENT: 'development' | 'production';
  
  // Service Bindings (direct worker-to-worker calls - FAST!)
  AUTH_SERVICE: AuthService;
  EMAIL_SERVICE: EmailService;
  INVENTORY_SERVICE: InventoryService;
  STRIPE_SERVICE: StripeService;
  SHOPIFY_SYNC_SERVICE: ShopifySyncService;
  TELEGRAM_SERVICE: TelegramService;
  
  // Queue Bindings (for async email processing)
  EMAIL_QUEUE: Queue;
  
  // D1 Database binding (for invoice persistence)
  DB: D1Database;
  
  // Allowed origins for CORS
  ALLOWED_ORIGINS: string;
  
  // Rate limiting (optional KV namespace)
  RATE_LIMIT?: KVNamespace;
}

// Context variables that can be set in middleware
export type ContextVariables = {
  user: {
    userId: string;
    email: string;
    stripeCustomerId: string | null;
  };
}

export interface ProxyOptions {
  serviceUrl: string;
  stripPrefix?: string;
  timeout?: number;
}
