# API Gateway Tests

This directory contains tests for the B2B API Gateway, organized by complexity and purpose.

## Test Structure

### 01 - Health Check Tests (`01-health-check.test.ts`)
**What it tests:**
- Basic gateway health endpoints (`/` and `/health`)
- 404 error handling
- CORS preflight requests
- JSON response formatting

**Why it's important:**
- Fastest tests (no dependencies)
- Verifies gateway is running correctly
- Good smoke test before deployment

**How to run:**
```bash
npm test 01-health-check
```

---

### 02 - Middleware Tests (`02-middleware.test.ts`)
**What it tests:**
- CORS headers for allowed/disallowed origins
- Rate limiting behavior (100 requests/minute)
- Request logging (doesn't break requests)
- OPTIONS preflight handling

**Why it's important:**
- Security layer verification
- Prevents abuse via rate limiting
- Ensures frontend can communicate (CORS)

**How to run:**
```bash
npm test 02-middleware
```

---

### 03 - Database Utilities Tests (`03-database-utils.test.ts`)
**What it tests:**
- Stock validation (sufficient/insufficient stock)
- Multi-item inventory checks
- Stock rollback mechanism
- Batch update execution

**Why it's important:**
- Critical for invoice creation integrity
- Prevents overselling (stock goes negative)
- Tests the "undo" mechanism if Stripe fails

**How to run:**
```bash
npm test 03-database-utils
```

---

### 04 - Product CRUD Tests (`04-products-crud.test.ts`)
**What it tests:**
- Product data validation (required fields, price, stock)
- Product creation requests (full & minimal)
- Product update requests (PUT & PATCH)
- Stock allocation logic (B2B/B2C split)
- Shopify sync orchestration
- Product filtering & pagination
- Error handling

**Why it's important:**
- Validates product data integrity before DB operations
- Tests stock allocation rules (B2B + B2C ≤ total)
- Ensures Shopify sync triggers correctly
- Validates filtering & search logic

**How to run:**
```bash
npm test 04-products-crud
```

---

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test file
```bash
npm test 01-health-check
```

### Run with coverage
```bash
npm run test:coverage
```

### Run in watch mode (during development)
```bash
npm run test:watch
```

### Run tests with UI (interactive)
```bash
npm run test:ui
```

---

## Test Environment

Tests run against a **local Wrangler dev server** with:
- `ENVIRONMENT=test`
- `ALLOWED_ORIGINS=*` (permissive for testing)
- Mock/test service bindings (when needed)

**Note:** Tests do NOT hit production or dev workers by default.

---

## Adding New Tests

### Simple Pattern (Unit Test Style)
```typescript
import { describe, it, expect } from 'vitest'

describe('Feature Name', () => {
  it('should do something specific', () => {
    expect(actual).toBe(expected)
  })
})
```

### Worker Test Pattern (Integration Style)
```typescript
import { unstable_dev } from 'wrangler'
import type { UnstableDevWorker } from 'wrangler'

describe('API Endpoint', () => {
  let worker: UnstableDevWorker

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true }
    })
  })

  afterAll(async () => {
    await worker.stop()
  })

  it('should return data', async () => {
    const response = await worker.fetch('/endpoint')
    expect(response.status).toBe(200)
  })
})
```

---

## Test Coverage Goals

| Area | Target Coverage |
|------|----------------|
| Health checks | 100% |
| Middleware | 90% |
| Database utilities | 85% |
| Orchestration routes | 80% |
| Error handling | 75% |

**Current coverage:** Run `npm run test:coverage` to see.

---

## Common Issues

### "Worker failed to start"
- Check `wrangler.toml` configuration
- Ensure all dependencies are installed (`npm install`)
- Try `npm run dev` first to see detailed error

### "Service binding failed"
- Tests may need mock service bindings
- Check `vitest.config.ts` for service binding configuration
- For now, tests use isolated worker (no external services)

### "Rate limit tests slow"
- Rate limit tests are marked `.skip` by default
- They send 100+ requests which is slow
- Enable only for full test runs

---

## Next Steps

After these basic tests work, we can add:
1. **Auth flow tests** (registration, login, token validation)
2. **Invoice creation E2E tests** (full flow with Stripe sandbox)
3. **Product management tests** (CRUD operations)
4. **Service binding tests** (test actual service-to-service calls)

---

## Questions?

Check the main project docs at `/docs/` or the Copilot instructions at `/.github/copilot-instructions.md`
