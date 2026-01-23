# API Gateway Tests

This directory contains comprehensive integration tests for the B2B API Gateway.  
These tests hit the **real deployed dev worker** to ensure the API contract is maintained.

## 🎯 Purpose

These tests act like the **frontend Vue application**, sending real HTTP requests to validate:

1. **Response structure** - Ensures API responses match expected TypeScript interfaces
2. **Authentication flows** - Login, logout, token refresh work correctly
3. **CRUD operations** - Products, categories, invoices, admin operations
4. **Error handling** - Proper error codes and messages
5. **Authorization** - Admin-only routes are protected

## 📁 Test Structure

```
tests/
├── helpers/
│   ├── index.ts           # Re-exports all helpers
│   ├── api-client.ts      # HTTP client mimicking frontend behavior
│   ├── validators.ts      # Response structure validators
│   ├── test-data.ts       # Test data generators
│   └── auth.ts            # Legacy auth helper (backwards compat)
├── integration/
│   ├── health.test.ts     # Health check endpoints
│   ├── auth.test.ts       # Authentication flows
│   ├── products.test.ts   # Product CRUD operations
│   ├── categories.test.ts # Category CRUD operations
│   ├── invoices.test.ts   # Invoice creation/listing
│   └── admin.test.ts      # Admin user management
├── .env.example           # Example environment variables
└── README.md              # This file
```

## 🚀 Quick Start

### 1. Prerequisites

- Deploy the dev worker:

  ```bash
  cd workers/api-gateway
  npm run deploy:dev
  ```

- Create a test admin user in the dev D1 database:
  ```sql
  -- Via wrangler D1 console or frontend registration
  -- Ensure: role='admin', is_verified=1, is_active=1
  ```

### 2. Configure Environment

```bash
# Copy example env file
cp tests/.env.example tests/.env

# Edit with your test credentials
nano tests/.env
```

Required variables:

```bash
TEST_ADMIN_EMAIL=your-admin@test.local
TEST_ADMIN_PASSWORD=YourSecurePassword123!
```

### 3. Run Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test suites
npm run test:integration:health    # Fast - health checks only
npm run test:integration:auth      # Authentication flows
npm run test:integration:products  # Product CRUD
npm run test:integration:categories
npm run test:integration:invoices
npm run test:integration:admin

# Watch mode (re-runs on file changes)
npm run test:watch

# With verbose API logging
npm run test:verbose
```

## 📊 Test Coverage

| Endpoint Group   | Coverage    |
| ---------------- | ----------- |
| Health Checks    | ✅ Complete |
| Auth Routes      | ✅ Complete |
| Products CRUD    | ✅ Complete |
| Categories CRUD  | ✅ Complete |
| Invoices         | ✅ Complete |
| Admin Operations | ✅ Complete |
| Shopify Routes   | ⏳ Planned  |

## 🔧 API Client

The `ApiClient` class mimics frontend Vue store behavior:

```typescript
import { createApiClient, createAdminClient } from './helpers';

// Public client (no auth)
const client = createApiClient();
const response = await client.get('/api/products');

// Admin client (auto-login)
const admin = await createAdminClient();
const response = await admin.post('/api/products', productData, { auth: true });

// Manual login
const client = createApiClient();
await client.login('user@example.com', 'password');
```

### Features

- **Auto token refresh** - Mimics `authenticatedFetch()` from Vue store
- **Response timing** - Tracks request duration
- **Error handling** - Parses JSON errors consistently
- **State tracking** - `isAuthenticated`, `isAdmin`, `user`

## ✅ Validators

Response validators ensure API contracts:

```typescript
import { validateProduct, validateProductList, expectSuccess } from './helpers';

// Validate response
const response = await client.get('/api/products');
expectSuccess(response);
validateProductList(response.data);

// Each product validates against schema
response.data.items.forEach((product) => {
  validateProduct(product);
});
```

### Available Validators

- `validateHealthCheck` / `validateSimpleHealth`
- `validateAuthResponse` / `validateUserProfile`
- `validateProduct` / `validateProductList` / `validateProductInventory`
- `validateCategory` / `validateCategoryList`
- `validateInvoice` / `validateInvoiceList`
- `validateApiError` / `validate404Error` / `validate401Error`

## 🧪 Test Data Generators

Generate realistic test data:

```typescript
import { generateProduct, generateUser, generateCategory } from './helpers';

const product = generateProduct({
  name: 'Custom Name', // Override defaults
});

const user = generateUser(); // Unique email each time

const category = generateCategory();
```

## 🔒 Security Notes

⚠️ **Never commit credentials to git!**

- `.env` file is in `.gitignore`
- Use dedicated test accounts (not production)
- Test admin should have limited permissions if possible
- Rotate test credentials periodically

## 🐛 Troubleshooting

### Tests fail with 401

1. Check `TEST_ADMIN_EMAIL` and `TEST_ADMIN_PASSWORD` are correct
2. Verify user exists in dev D1 database
3. Ensure user has `role='admin'` and `is_verified=1`

### Tests fail with network errors

1. Ensure dev worker is deployed: `npm run deploy:dev`
2. Check `API_GATEWAY_DEV_URL` is correct
3. Try curl: `curl https://b2b-api-gateway-dev.xxx.workers.dev/health`

### Invoice tests skip

Invoice creation requires:

1. User has `stripe_customer_id` set
2. Product has `stripe_price_id` set
3. Product has available `b2b_stock`

### Tests are slow

- Use specific test files instead of all: `npm run test:integration:health`
- Enable verbose mode to see timing: `npm run test:verbose`
- Check Cloudflare Worker logs: `wrangler tail --env dev`

## 📈 Best Practices

1. **Run health checks first** - Fast sanity check
2. **Clean up test data** - Tests delete created resources in `afterAll`
3. **Use unique identifiers** - `generateTestId()` prevents conflicts
4. **Check response timing** - `expectFastResponse()` catches slow endpoints
5. **Validate error responses** - Use `validateApiError()` for consistent errors

## 🔄 CI/CD Integration

These tests can run in CI:

```yaml
# .github/workflows/test.yml
- name: Run Integration Tests
  env:
    TEST_ADMIN_EMAIL: ${{ secrets.TEST_ADMIN_EMAIL }}
    TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}
    API_GATEWAY_DEV_URL: ${{ secrets.API_GATEWAY_DEV_URL }}
  run: |
    cd workers/api-gateway
    npm run test:integration
```

## 📚 Related Documentation

- [API Gateway README](../README.md)
- [Copilot Instructions](../../../.github/copilot-instructions.md)
- [D1 Database Migrations](../../../migrations/)
