# AI Coding Agent Instructions - B2B Platform

**Platform**: B2B E-commerce on Cloudflare Workers + Vue 3  
**Status**: Consolidated architecture - Migrated from microservices to modular monolith  
**Architecture**: API Gateway with Direct D1 Access + Shared Database Package + External Service Bindings
**Frontend**: Cloudflare Pages (static SPA deployment)

---

## 🏗️ Architecture Overview

### Consolidated Architecture (Modular Monolith)

```
Frontend (Vue 3 SPA on Cloudflare Pages)
    ↓ HTTPS
API Gateway (Direct D1 + Service Orchestration)
    ├─→ @b2b/db package (D1 operations, Drizzle ORM)
    ├─→ Stripe Service (Stripe API wrapper via service binding)
    ├─→ Email Queue (SendGrid via queue binding)
    ├─→ Shopify Sync Service (Shopify API wrapper via service binding)
    └─→ Telegram Service (Telegram notifications via service binding)
```

**Architecture Philosophy**:

- **API Gateway** (`/workers/api-gateway`): Single entry point with direct D1 database access via `@b2b/db` package
  - Handles all CRUD operations directly (no intermediate services)
  - Orchestrates external services (Stripe, Email, Shopify, Telegram) via service bindings
  - Contains business logic in route handlers and service files
  - Uses JWT tokens directly (no auth-service proxy)
- **@b2b/db Package** (`/packages/db`): Centralized database operations library
  - Drizzle ORM for type-safe queries
  - Schema definitions in `src/schema.ts`
  - Operation modules: `operations/products.ts`, `operations/categories.ts`, etc.
  - Exports individual modules and drizzle-orm functions
  - Used by API Gateway for all D1 database access

- **External Services** (via service bindings):
  - **Stripe Service**: Payment processing, customer management, invoicing
  - **Email Queue**: Transactional emails (welcome, verification, password reset)
  - **Shopify Sync Service**: Inventory synchronization with Shopify B2C store
  - **Telegram Service**: Admin notifications

- **Frontend** (`/src`): Vue 3 SPA, Pinia stores, Vue Router, i18n

### Key Data Flows

1. **User Registration**: Frontend → API Gateway (JWT creation, D1 user insert, Stripe customer creation, Email queue) ← **Direct operations**
2. **Product Listing**: Frontend → API Gateway → `@b2b/db` getProducts() → D1 products table
3. **Invoice Creation**: Frontend → API Gateway → `@b2b/db` (order data) + Stripe Service (invoice) → Returns invoice URL

### Migration from Microservices

**What Changed**:

- ❌ **Removed**: Auth-service (JWT now handled directly in API Gateway)
- ❌ **Removed**: Inventory-service (product operations now in `@b2b/db` + API Gateway routes)
- ✅ **Consolidated**: All database operations centralized in `@b2b/db` package
- ✅ **Simplified**: Direct JWT validation in middleware (no service binding calls)
- ✅ **Kept**: External services (Stripe, Email, Shopify, Telegram) remain as separate workers
- ✅ **Updated**: frontend is changing from camelCase to snake_case for API data consistency

**Benefits**:

- Reduced latency (no service binding overhead for database operations)
- Simplified debugging (single codebase for business logic)
- Type safety across database operations (Drizzle ORM + TypeScript)
- Easier testing (fewer network calls to mock)

---

## 🛠️ Critical Development Patterns

### 1. API Gateway Structure (MANDATORY)

**API Gateway is now a modular monolith:**

```typescript
// workers/api-gateway/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { loggingMiddleware } from './middleware/logging';
import { corsMiddleware } from './middleware/cors';
import { authMiddleware } from './middleware/auth'; // Direct JWT validation

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// GLOBAL MIDDLEWARE (Always in this order)
// ============================================================================
app.use('*', loggingMiddleware); // Log all requests
app.use('*', corsMiddleware); // Handle CORS

// ============================================================================
// HEALTH CHECK (Always first route)
// ============================================================================
app.get('/', (c) => {
  return c.json({
    service: 'B2B API Gateway',
    version: '2.0.0',
    status: 'healthy',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// ROUTES (Direct database operations + external service orchestration)
// ============================================================================
app.route('/auth', authRoutes); // JWT auth, registration, login
app.route('/products', productRoutes); // Product CRUD via @b2b/db
app.route('/categories', categoryRoutes);
app.route('/admin', adminRoutes); // Admin-only operations
app.route('/admin/invoices', invoiceRoutes);

// ============================================================================
// ERROR HANDLING (Always last)
// ============================================================================
app.notFound((c) => {
  return c.json({ error: 'Not Found', code: 'api/not-found' }, 404);
});

app.onError((err, c) => {
  console.error('[API Gateway Error]', err);
  return c.json({ error: 'Internal Error', code: 'api/error' }, 500);
});

export default app;
```

### 2. @b2b/db Package Usage (CRITICAL)

**ALL database operations MUST use the @b2b/db package:**

### 2. @b2b/db Package Usage (CRITICAL)

**ALL database operations MUST use the @b2b/db package:**

```typescript
// workers/api-gateway/src/routes/products.routes.ts
import { createDb } from '@b2b/db';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  type GetProductsOptions,
} from '@b2b/db/operations';

// In route handler
products.get('/', async (c) => {
  const db = createDb(c.env.DB); // Create Drizzle client from D1 binding

  const result = await getProducts(db, {
    limit: 50,
    offset: 0,
    search: 'laptop',
    inStockOnly: true,
  });

  return c.json({
    products: result.products,
    total: result.total,
  });
});
```

**Available operation modules** (all in `/packages/db/src/operations/`):

- `products.ts` - Product CRUD, images, specs, tags, dimensions, bulk operations
- `categories.ts` - Category CRUD, tree building, path traversal
- `inventory.ts` - Stock adjustments, reservations, Shopify sync
- `orders.ts` - Order CRUD, items, status, statistics
- `sessions.ts` - User sessions, password reset tokens, email verification
- `carts.ts` - Cart CRUD, validation, product joins
- `webhooks.ts` - Event tracking, idempotency, cleanup

**@b2b/db exports:**

```typescript
// Main exports (packages/db/src/index.ts)
export { createDb } from './db';
export * from './schema';
export * from './types';

// Drizzle ORM functions
export { sql, eq, and, or, like, gte, lte, desc, asc } from 'drizzle-orm';

// Individual operation modules
import * as productOps from './operations/products';
import * as categoryOps from './operations/categories';
// ... etc
```

### 3. External Service Bindings (Stripe, Email, Shopify, Telegram)

**Use service bindings ONLY for external services (NOT database operations):**

```typescript
// ✅ CORRECT: Service binding for Stripe API
const request = new Request('https://dummy/customers/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, name }),
});
const response = await c.env.STRIPE_SERVICE.fetch(request);

// ✅ CORRECT: Direct database operation
const db = createDb(c.env.DB);
const user = await db.select().from(users).where(eq(users.email, email)).get();

// ❌ WRONG: Using service binding for database operations (old pattern)
const response = await c.env.INVENTORY_SERVICE.fetch(request);
```

**wrangler.toml configuration:**

```toml
[[services]]
binding = "STRIPE_SERVICE"
service = "b2b-stripe-service"

[[services]]
binding = "SHOPIFY_SYNC_SERVICE"
service = "b2b-shopify-sync-service"

[[services]]
binding = "TELEGRAM_SERVICE"
service = "b2b-telegram-service"

[[queues.producers]]
binding = "EMAIL_QUEUE"
queue = "b2b-email-queue"

# Database binding (direct access)
[[d1_databases]]
binding = "DB"
database_name = "b2b-prod"
```

### 4. Product Code Auto-Generation

**B2B SKU and Barcode are automatically generated:**

```typescript
// workers/api-gateway/src/services/product-codes.service.ts
import { generateNextB2BSku, generateNextBarcode } from '../services/product-codes.service';

// In product creation route
products.post('/', async (c) => {
  const body = await c.req.json();

  // Auto-generate SKU if not provided
  const b2bSku = body.b2b_sku || (await generateNextB2BSku(c.env.DB));

  // Auto-generate EAN-13 barcode if not provided
  const barcode = body.barcode || (await generateNextBarcode(c.env.DB));

  const product = await createProduct(db, {
    // ... other fields
    b2b_sku: b2bSku, // TP-00001, TP-00002, etc.
    barcode: barcode, // 2000000000017 (EAN-13 with check digit)
  });
});
```

**SKU Format**: `TP-00001` (auto-incremented, 5-digit padded)
**Barcode Format**: `2XXXXXXXXXXXC` (13-digit EAN-13 with check digit)

### 5. D1 Database Operations

**Always use parameterized queries (prevent SQL injection):**

```typescript
// ✅ CORRECT: Parameterized query
const result = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

// ❌ WRONG: String concatenation
const result = await c.env.DB.prepare(`SELECT * FROM users WHERE email = '${email}'`).first();
```

**Transaction pattern for multi-table operations:**

```typescript
await c.env.DB.batch([
  c.env.DB.prepare('INSERT INTO users (id, email) VALUES (?, ?)').bind(userId, email),
  c.env.DB.prepare('INSERT INTO user_profile (user_id, company) VALUES (?, ?)').bind(
    userId,
    company
  ),
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
    c.set('user', user); // Attach user to context
    await next();
  } catch (error) {
    return c.json({ error: 'Unauthorized', code: 'auth/invalid-token' }, 401);
  }
}
```

**Access user in route handlers:**

```typescript
app.get('/profile', authMiddleware, async (c) => {
  const user = c.get('user'); // Get user from context
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
    Authorization: `Bearer ${accessToken.value}`,
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
npm run build:frontend

# Deploy to Cloudflare Pages
npm run deploy:frontend
```

**Frontend connects to workers via:**

```typescript
// src/stores/auth.ts
const VITE_API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8787';
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
auth.routes.ts;
user.service.ts;
jwt.ts;

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
c.env.DB;
c.env.JWT_SECRET;
c.env.STRIPE_SERVICE;
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
const inventory = await c.env.DB.prepare('SELECT * FROM product_inventory WHERE product_id = ?')
  .bind(productId)
  .first();

// Access stock:
const totalStock = inventory.total_stock;
const b2bStock = inventory.b2b_stock;
const b2cStock = inventory.b2c_stock;
const isInStock = inventory.b2b_stock + inventory.b2c_stock > 0;

// ❌ WRONG: Never query products table for stock
const product = await c.env.DB.prepare('SELECT stock FROM products WHERE id = ?')
  .bind(productId)
  .first();
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

### ⚠️ Test File Maintenance (CRITICAL)

**When modifying workers or API endpoints, ALWAYS check the corresponding test files:**

| Worker/Change      | Test Location                                               |
| ------------------ | ----------------------------------------------------------- |
| API Gateway routes | `/workers/api-gateway/tests/integration/`                   |
| Auth Service       | `/workers/api-gateway/tests/integration/auth.test.ts`       |
| Products API       | `/workers/api-gateway/tests/integration/products.test.ts`   |
| Invoices API       | `/workers/api-gateway/tests/integration/invoices.test.ts`   |
| Categories API     | `/workers/api-gateway/tests/integration/categories.test.ts` |
| Test helpers       | `/workers/api-gateway/tests/helpers/`                       |

**Checklist when changing API behavior:**

- [ ] Update request/response types in test validators (`tests/helpers/validators.ts`)
- [ ] Update test data generators if schema changed (`tests/helpers/test-data.ts`)
- [ ] Add new test cases for new endpoints/features
- [ ] Update existing tests if response format changed
- [ ] Run tests before deploying: `cd workers/api-gateway && npm test`

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

**DO NOT CREATE SUMMARY DOCUMENTATION. ONLY RETURN THE CODE SNIPPET REQUESTED. ONLY DOCUMENTATION WHEN ASKED**
