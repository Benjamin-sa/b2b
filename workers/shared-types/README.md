# Shared Types & Middleware

Shared TypeScript types and middleware for B2B Cloudflare Workers.

## 📦 Installation

```bash
cd workers/shared-types
npm install
```

## 🔐 Service Authentication

The `service-auth.ts` middleware prevents direct HTTP access to workers in production.

### Quick Setup

**1. Generate and set SERVICE_SECRET for all workers:**

```bash
# From project root
chmod +x scripts/setup-service-auth.sh
./scripts/setup-service-auth.sh
```

**2. Apply middleware to each worker:**

```typescript
// workers/<service>/src/index.ts
import { Hono } from 'hono';
import { createServiceAuthMiddleware } from '../shared-types/service-auth';

const app = new Hono<{ Bindings: Env }>();

// Apply BEFORE other middleware (order matters!)
app.use('*', createServiceAuthMiddleware());
app.use('*', corsMiddleware);
app.use('*', authMiddleware);

// ... routes
```

**3. Update API Gateway to pass token:**

```typescript
// workers/api-gateway/src/routes/*.routes.ts
import { addServiceToken } from '../shared-types/service-auth';

app.get('/products', async (c) => {
  const request = new Request('https://dummy/products', {
    method: 'GET',
    headers: addServiceToken(
      {
        Authorization: c.req.header('Authorization') || '',
      },
      c.env.SERVICE_SECRET
    ),
  });

  const response = await c.env.INVENTORY_SERVICE.fetch(request);
  return response;
});
```

**4. Update Env types:**

```typescript
// workers/<service>/src/types/index.ts
export interface Env {
  DB: D1Database;
  SERVICE_SECRET: string; // 👈 Add this
  // ... other bindings
}
```

### Configuration Options

```typescript
// Default: Only enforce in production, allow health checks
app.use('*', createServiceAuthMiddleware());

// Custom: Enforce in all environments
app.use(
  '*',
  createServiceAuthMiddleware({
    enforceInEnv: 'all',
  })
);

// Custom: Allow additional public paths
app.use(
  '*',
  createServiceAuthMiddleware({
    allowedPaths: ['/', '/health', '/public/status'],
  })
);
```

### Testing

```bash
# Development (no auth required by default)
curl http://localhost:8787/products

# Production (requires X-Service-Token)
curl https://b2b-inventory-service.workers.dev/products
# Returns: {"error":"Forbidden","code":"service/forbidden"}

# With token
curl -H "X-Service-Token: your-secret" https://b2b-inventory-service.workers.dev/products
# Returns: product data
```

## 📧 Email Queue Types

Shared types for email queue messages between API Gateway and Email Service.

```typescript
import type { EmailQueueMessage } from '../shared-types/email-queue';

// Type-safe email queuing
const message: EmailQueueMessage = {
  type: 'welcome',
  email: 'user@example.com',
  firstName: 'John',
  timestamp: new Date().toISOString(),
};
```

## 🔄 Syncing Across Workers

When you update shared types/middleware:

```bash
# No npm publish needed - workers import directly via relative paths
# Just redeploy affected workers:

cd workers/inventory-service
npm run deploy  # Production
npm run deploy:dev  # Development
```

## 🛡️ Security Notes

- **Never commit SERVICE_SECRET** to git
- Use `wrangler secret put` to set secrets
- Same secret across all workers (simplifies management)
- Rotate secret by running `setup-service-auth.sh` again
- Health checks (`/`, `/health`) always bypass auth for monitoring
