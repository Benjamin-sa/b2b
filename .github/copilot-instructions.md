# AI Coding Agent Instructions - B2B Platform

**Platform**: B2B E-commerce on Cloudflare Workers + Vue 3  
**Status**: Active migration from Firebase to Cloudflare (feature/cloudflare-migration branch)  
**Architecture**: Microservices with Service Bindings + D1 Database + KV Sessions

---

## 🏗️ Architecture Overview

### Microservices Architecture (Cloudflare Workers)

```
Frontend (Vue 3 + Vite)
    ↓
API Gateway (Orchestrator)
    ↓ ↓ ↓ ↓
    ├─→ Auth Service (D1 + KV)
    ├─→ Inventory Service (D1)
    ├─→ Stripe Service (Stripe API wrapper)
    └─→ Email Service (SendGrid)
```

**Service Boundaries**:
- **API Gateway** (`/workers/api-gateway`): Orchestrates multi-service workflows using **service bindings** (NOT HTTP proxying)
- **Auth Service** (`/workers/auth-service`): JWT authentication, D1 users table, KV sessions
- **Inventory Service** (`/workers/inventory-service`): Product/category CRUD, D1 database
- **Stripe Service** (`/workers/stripe-service`): Centralized Stripe operations (customers, products, invoices)
- **Email Service** (`/workers/email-service`): Transactional emails via SendGrid
- **Frontend** (`/src`): Vue 3 SPA, Pinia stores, Vue Router, i18n

### Key Data Flows

1. **User Registration**: Frontend → API Gateway → Auth Service (creates user in D1) + Email Service (sends welcome email) ← **Orchestrated workflow**
2. **Product Listing**: Frontend → API Gateway → Inventory Service → D1 products table
3. **Invoice Creation**: Frontend → API Gateway → Stripe Service (creates Stripe invoice) → Returns invoice URL

---

## 🛠️ Critical Development Patterns

### 1. Cloudflare Worker Structure (MANDATORY)

**Every worker follows this exact structure:**

```typescript
// workers/<service>/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// GLOBAL MIDDLEWARE (Always in this order)
// ============================================================================
app.use('*', loggingMiddleware);  // Log all requests
app.use('*', corsMiddleware);     // Handle CORS
app.use('*', authMiddleware);     // Validate JWT (if protected routes)

// ============================================================================
// HEALTH CHECK (Always first route)
// ============================================================================
app.get('/', (c) => {
  return c.json({
    service: 'Service Name',
    version: '1.0.0',
    status: 'healthy',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// ROUTES (Use Hono router)
// ============================================================================
app.route('/auth', authRoutes);   // Sub-routers for organization

// ============================================================================
// ERROR HANDLING (Always last)
// ============================================================================
app.notFound((c) => {
  return c.json({ error: 'Not Found', code: 'service/not-found' }, 404);
});

app.onError((err, c) => {
  console.error('[Service Error]', err);
  return c.json({ error: 'Internal Error', code: 'service/error' }, 500);
});

export default app;
```

### 2. Service Bindings Pattern (API Gateway)

**DO NOT use HTTP fetch() between workers. Use service bindings:**

```typescript
// ❌ WRONG: HTTP fetch between workers
const response = await fetch('https://auth-service.workers.dev/auth/validate', {
  method: 'POST',
  body: JSON.stringify({ token })
});

// ✅ CORRECT: Service binding (direct worker-to-worker)
const request = new Request('https://dummy.url/auth/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
});
const response = await c.env.AUTH_SERVICE.fetch(request);
```

**wrangler.toml configuration:**
```toml
[[services]]
binding = "AUTH_SERVICE"
service = "b2b-auth-service"
```

### 3. D1 Database Operations

**Always use parameterized queries (prevent SQL injection):**

```typescript
// ✅ CORRECT: Parameterized query
const result = await c.env.DB.prepare(
  'SELECT * FROM users WHERE email = ?'
).bind(email).first();

// ❌ WRONG: String concatenation
const result = await c.env.DB.prepare(
  `SELECT * FROM users WHERE email = '${email}'`
).first();
```

**Transaction pattern for multi-table operations:**
```typescript
await c.env.DB.batch([
  c.env.DB.prepare('INSERT INTO users (id, email) VALUES (?, ?)').bind(userId, email),
  c.env.DB.prepare('INSERT INTO user_profile (user_id, company) VALUES (?, ?)').bind(userId, company)
]);
```

### 4. JWT Authentication Flow

**Token validation middleware (reusable pattern):**

```typescript
// workers/<service>/src/middleware/auth.ts
import { Context, Next } from 'hono';
import { verifyAccessToken } from '../utils/jwt';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', code: 'auth/missing-token' }, 401);
  }
  
  const token = authHeader.substring(7);
  
  try {
    const user = await verifyAccessToken(token, c.env.JWT_SECRET);
    c.set('user', user);  // Attach user to context
    await next();
  } catch (error) {
    return c.json({ error: 'Unauthorized', code: 'auth/invalid-token' }, 401);
  }
}
```

**Access user in route handlers:**
```typescript
app.get('/profile', authMiddleware, async (c) => {
  const user = c.get('user');  // Get user from context
  return c.json({ user });
});
```

### 5. Frontend Auth Store Pattern

**Token management with automatic refresh:**

```typescript
// src/stores/auth.ts
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${accessToken.value}`
  };

  let response = await fetch(url, { ...options, headers });

  // Auto-refresh on 401
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${accessToken.value}`;
      response = await fetch(url, { ...options, headers });
    } else {
      clearAuthData();
      router.push('/auth');
      throw new Error('Session expired');
    }
  }

  return response;
};
```

### 6. Error Handling Standard

**Consistent error response format:**

```typescript
// All services return errors in this format:
{
  "error": "Validation Error",
  "code": "service/validation-error",  // service/error-type pattern
  "message": "Email is required",
  "statusCode": 400
}
```

**Custom error class pattern:**
```typescript
// workers/<service>/src/types/errors.ts
export class ServiceError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

// Usage:
throw new ServiceError('auth/user-not-found', 'User not found', 404);
```

### 7. Environment Variable Management

**wrangler.toml structure (EVERY worker):**

```toml
name = "service-name"
main = "src/index.ts"
compatibility_date = "2024-11-01"

# Top-level = production (default)
[[d1_databases]]
binding = "DB"
database_name = "b2b-prod"
database_id = "..."

[vars]
ENVIRONMENT = "production"
ALLOWED_ORIGINS = "https://yourdomain.com"

# Dev environment
[env.dev]
name = "service-name-dev"

[[env.dev.d1_databases]]
binding = "DB"
database_name = "b2b-dev"
database_id = "..."

[env.dev.vars]
ENVIRONMENT = "development"
ALLOWED_ORIGINS = "http://localhost:5173"
```

**Secrets (never in wrangler.toml):**
```bash
# Set secrets per environment
wrangler secret put JWT_SECRET
wrangler secret put JWT_SECRET --env dev
```

---

## 🚀 Critical Workflows

### Deploy a Worker

```bash
cd workers/<service-name>

# Deploy to dev
npm run deploy:dev
# OR: wrangler deploy --env dev

# Deploy to prod (default)
npm run deploy
# OR: wrangler deploy

# Monitor logs
wrangler tail                  # Production logs
wrangler tail --env dev        # Dev logs
```

### Database Migrations

```bash
# Create migration file
# /migrations/00X_description.sql

# Apply to dev
wrangler d1 execute b2b-dev --env dev --file ./migrations/00X_description.sql

# Apply to prod (AFTER testing in dev!)
wrangler d1 execute b2b-prod --remote --file ./migrations/00X_description.sql

# Query database
wrangler d1 execute b2b-prod --remote --command "SELECT * FROM users LIMIT 5"
```

### Frontend Development

```bash
# Start dev server (connects to production workers by default!)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Frontend connects to workers via:**
```typescript
// src/stores/auth.ts
const VITE_API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8787'
```

---

## ⚠️ Common Mistakes to AVOID

### 1. ❌ Using Firebase patterns in Cloudflare workers

```typescript
// ❌ WRONG: Firebase-style imports
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ✅ CORRECT: D1 database binding
const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
```

### 2. ❌ HTTP fetch between workers

```typescript
// ❌ WRONG: HTTP overhead, can fail
const response = await fetch('https://stripe-service.workers.dev/customers', {...});

// ✅ CORRECT: Service binding (direct)
const request = new Request('https://dummy/customers', {...});
const response = await c.env.STRIPE_SERVICE.fetch(request);
```

### 3. ❌ Hardcoded URLs/secrets

```typescript
// ❌ WRONG: Hardcoded
const JWT_SECRET = 's87R+vvfw+qLIp5S7lyb...';

// ✅ CORRECT: From environment
const user = await verifyAccessToken(token, c.env.JWT_SECRET);
```

### 4. ❌ SQL injection vulnerabilities

```typescript
// ❌ WRONG: String concatenation
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ CORRECT: Parameterized
const result = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
```

### 5. ❌ Missing CORS headers

```typescript
// ❌ WRONG: No CORS middleware
app.get('/api/products', async (c) => {...});

// ✅ CORRECT: CORS middleware on ALL routes
app.use('*', corsMiddleware);
app.get('/api/products', async (c) => {...});
```

---

## 📋 Code Quality Standards

### File Organization (STRICT)

```
workers/<service>/
├── src/
│   ├── index.ts              # Main entry point (Hono app)
│   ├── types/
│   │   ├── index.ts          # Export all types
│   │   └── errors.ts         # Custom error classes
│   ├── routes/
│   │   ├── auth.routes.ts    # Route handlers
│   │   └── admin.routes.ts
│   ├── middleware/
│   │   ├── cors.ts           # CORS middleware
│   │   ├── logging.ts        # Request logging
│   │   └── auth.ts           # JWT validation
│   ├── services/
│   │   └── user.service.ts   # Business logic (DB ops)
│   └── utils/
│       ├── jwt.ts            # JWT helpers
│       └── validators.ts     # Input validation
├── wrangler.toml             # Cloudflare config
├── package.json
└── tsconfig.json
```

### TypeScript Standards

```typescript
// ALWAYS use strict TypeScript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}

// ALWAYS define Env type
// workers/<service>/src/types/index.ts
export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  ENVIRONMENT: 'development' | 'production';
  ALLOWED_ORIGINS: string;
}

// ALWAYS type function parameters and returns
async function getUserById(
  db: D1Database,
  userId: string
): Promise<User | null> {
  const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  return result as User | null;
}
```

### Naming Conventions

```typescript
// Files: kebab-case
auth.routes.ts
user.service.ts
jwt.ts

// Variables/Functions: camelCase
const accessToken = '...';
async function createUser() {}

// Classes/Interfaces/Types: PascalCase
interface UserProfile {}
class ServiceError extends Error {}
type AuthTokens = { accessToken: string };

// Constants: UPPER_SNAKE_CASE
const ACCESS_TOKEN_KEY = 'b2b_access_token';
const DEFAULT_PAGE_SIZE = 20;

// Environment bindings: UPPER_CASE
c.env.DB
c.env.JWT_SECRET
c.env.STRIPE_SERVICE
```

---

## 🔐 Security Checklist

**Before deploying ANY worker:**

- [ ] All routes use CORS middleware
- [ ] Protected routes use `authMiddleware`
- [ ] All DB queries use parameterized statements (`.bind()`)
- [ ] No secrets in `wrangler.toml` (use `wrangler secret put`)
- [ ] Input validation on ALL user inputs
- [ ] Error messages don't leak sensitive data
- [ ] JWT tokens have expiration (`exp` claim)
- [ ] KV sessions invalidated on logout
- [ ] Rate limiting on public endpoints (API Gateway)

---

## �️ Database Schema - Inventory Management (CRITICAL)

### ⚠️ DEPRECATED COLUMNS - DO NOT USE!

**The `products` table has DEPRECATED columns that MUST NOT be used in any code:**

```sql
-- ❌ DEPRECATED - DO NOT USE THESE COLUMNS:
products.stock              -- Use product_inventory.total_stock instead
products.in_stock           -- Compute from product_inventory (b2b_stock + b2c_stock > 0)
products.shopify_product_id -- Use product_inventory.shopify_product_id instead
products.shopify_variant_id -- Use product_inventory.shopify_variant_id instead
```

**Why they still exist:** D1 doesn't support `DROP COLUMN`, so they remain in the schema but are completely ignored.

### ✅ Inventory Management - Single Source of Truth

**ALWAYS use the `product_inventory` table for ALL stock operations:**

```typescript
// ✅ CORRECT: Query inventory table
const inventory = await c.env.DB.prepare(
  'SELECT * FROM product_inventory WHERE product_id = ?'
).bind(productId).first();

// Access stock:
const totalStock = inventory.total_stock;
const b2bStock = inventory.b2b_stock;
const b2cStock = inventory.b2c_stock;
const isInStock = (inventory.b2b_stock + inventory.b2c_stock) > 0;

// ❌ WRONG: Never query products table for stock
const product = await c.env.DB.prepare(
  'SELECT stock FROM products WHERE id = ?'
).bind(productId).first();
```

### Product Inventory Table Schema

```sql
CREATE TABLE product_inventory (
  product_id TEXT PRIMARY KEY,
  
  -- Stock allocation (B2B/B2C split)
  total_stock INTEGER NOT NULL DEFAULT 0,      -- Total available units
  b2b_stock INTEGER NOT NULL DEFAULT 0,        -- Allocated to B2B platform
  b2c_stock INTEGER NOT NULL DEFAULT 0,        -- Allocated to B2C (Shopify)
  reserved_stock INTEGER NOT NULL DEFAULT 0,   -- In checkout (pending)
  
  -- Shopify synchronization
  shopify_product_id TEXT,
  shopify_variant_id TEXT,
  shopify_inventory_item_id TEXT,              -- Required for Shopify API updates
  shopify_location_id TEXT,
  sync_enabled INTEGER DEFAULT 0,              -- 1 = auto-sync to Shopify
  last_synced_at TEXT,
  sync_error TEXT,
  
  -- Constraints
  CHECK (b2b_stock >= 0),
  CHECK (b2c_stock >= 0),
  CHECK (reserved_stock >= 0),
  CHECK (total_stock >= 0),
  CHECK (b2b_stock + b2c_stock <= total_stock),
  CHECK (reserved_stock <= total_stock)
);
```

### Stock Operations Pattern

**Always JOIN products with product_inventory:**

```typescript
// ✅ CORRECT: Get product with inventory
const query = `
  SELECT 
    p.*,
    i.total_stock,
    i.b2b_stock,
    i.b2c_stock,
    i.reserved_stock,
    i.shopify_variant_id,
    i.sync_enabled
  FROM products p
  LEFT JOIN product_inventory i ON p.id = i.product_id
  WHERE p.id = ?
`;
const result = await c.env.DB.prepare(query).bind(productId).first();
```

**Update stock (B2B order example):**

```typescript
// ✅ CORRECT: Update via product_inventory table
await c.env.DB.prepare(`
  UPDATE product_inventory 
  SET 
    total_stock = total_stock - ?,
    b2b_stock = b2b_stock - ?,
    updated_at = ?
  WHERE product_id = ? AND b2b_stock >= ?
`).bind(quantity, quantity, new Date().toISOString(), productId, quantity).run();

// Log the change
await c.env.DB.prepare(`
  INSERT INTO inventory_sync_log (id, product_id, action, source, total_change, b2b_change, created_at)
  VALUES (?, ?, 'b2b_order', 'checkout', ?, ?, ?)
`).bind(nanoid(), productId, -quantity, -quantity, new Date().toISOString()).run();
```

### Audit Trail

**All inventory changes MUST be logged:**

```typescript
// After any stock change, log it:
await c.env.DB.prepare(`
  INSERT INTO inventory_sync_log (
    id, product_id, action, source,
    total_change, b2b_change, b2c_change,
    total_stock_after, b2b_stock_after, b2c_stock_after,
    reference_id, reference_type, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).bind(
  nanoid(),
  productId,
  'b2b_order',           // action
  'checkout',            // source
  -quantity,             // total_change
  -quantity,             // b2b_change
  0,                     // b2c_change
  newTotalStock,         // snapshot after
  newB2BStock,
  b2cStock,
  orderId,               // reference
  'order',
  new Date().toISOString()
).run();
```

---

## �📚 Key Files Reference

| File | Purpose |
|------|---------|
| `/workers/api-gateway/src/index.ts` | Service orchestration logic |
| `/workers/auth-service/src/index.ts` | JWT auth implementation |
| `/workers/auth-service/src/utils/jwt.ts` | JWT sign/verify functions |
| `/src/stores/auth.ts` | Frontend auth state + auto-refresh |
| `/src/router/index.ts` | Route guards (requiresAuth, requiresVerified) |
| `/migrations/001_initial_schema.sql` | Complete D1 schema (19 tables) |
| `/migrations/003_product_inventory_system.sql` | **Inventory management system (B2B/B2C)** |
| `/workers/stripe-service/src/index.ts` | Stripe API wrapper |

---

## 🎯 When Starting a New Task

1. **Identify the service** - Which worker does this belong to?
2. **Check existing patterns** - Look at similar routes/functions in that service
3. **Follow the structure** - Use the exact file organization above
4. **Use service bindings** - Never HTTP fetch between workers
5. **Test locally first** - `wrangler dev` before deploying
6. **Check types** - Ensure TypeScript compiles without errors
7. **Deploy to dev** - Test in dev environment before prod

---

## 🚨 Emergency Rollback

```bash
# View deployment history
wrangler deployments list

# Rollback to previous version
wrangler rollback

# Check logs for errors
wrangler tail
```

---

**Last Updated**: October 24, 2025  
**Questions?**: Check worker-specific README.md files in `/workers/<service>/`
