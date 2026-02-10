# AI Coding Agent Instructions - B2B Platform

## Architecture overview

**Modular monolith** on Cloudflare Workers with Vue 3 SPA frontend.

```
┌─────────────────┐     ┌──────────────────────────────────────────┐
│  Vue 3 SPA      │────▶│  API Gateway (Hono)                      │
│  (Pinia, i18n)  │     │  - Direct D1 via @b2b/db                 │
└─────────────────┘     │  - Service bindings for external workers │
                        └──────────┬───────────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
      ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
      │ Stripe Svc   │    │ Shopify Sync │    │ Telegram Svc │
      │ (payments)   │    │ (webhooks)   │    │ (notifs)     │
      └──────────────┘    └──────────────┘    └──────────────┘
```

**Key packages**:

- `packages/db` — Drizzle ORM schema + operations (single source of DB logic)
- `workers/api-gateway` — Hono routes + business logic + orchestration
- `src/` — Vue 3 SPA (Pinia stores, Vue Router, i18n with 4 locales)

## Critical conventions

| Rule                                                              | Why                                                                                                   |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| All DB access via `@b2b/db` from gateway                          | Eliminates HTTP overhead, single source of truth                                                      |
| Service bindings only for: Stripe, Shopify, Telegram, Email Queue | External APIs or async processing                                                                     |
| Use `product_inventory` table for stock                           | `products.stock`, `products.in_stock`, `products.shopify_*` are **DEPRECATED** (D1 can't DROP COLUMN) |
| Frontend API payloads use **snake_case**                          | `category_id`, `in_stock`, not camelCase                                                              |

## Code patterns

### Gateway routes (`workers/api-gateway/src/routes/*.routes.ts`)

```typescript
import { createDb } from '@b2b/db';
import { getProducts, getInventoryByProductId } from '@b2b/db/operations';

products.get('/', async (c) => {
  const db = createDb(c.env.DB);
  const result = await getProducts(db, options);
  // ...
});
```

### Service binding calls (`src/utils/service-calls.ts`)

```typescript
import { callService } from '../utils/service-calls';

await callService(c.env.TELEGRAM_SERVICE, c.env.SERVICE_SECRET, {
  path: '/notify',
  method: 'POST',
  body: { message: '...' },
});
```

### Frontend test mounting (`src/tests/helpers.ts`)

```typescript
import { mountWithPlugins } from '@/tests/helpers';
const wrapper = mountWithPlugins(MyComponent, { locale: 'nl' });
```

## Commands

```bash
# Frontend (root)
pnpm dev                   # Vite dev server
pnpm test                  # Vitest watch mode
pnpm test:i18n             # Validate i18n keys across locales
pnpm deploy:frontend       # Build + deploy to Cloudflare Pages

# API Gateway
cd workers/api-gateway
pnpm dev                   # Local worker dev
pnpm deploy:dev            # Deploy to dev environment
pnpm test                  # Integration tests (requires deploy:dev first)

# Database migrations
wrangler d1 execute b2b-dev --file=migrations/XXX.sql  # Dev
wrangler d1 execute b2b-prod --file=migrations/XXX.sql # Prod
```

## Key files

| Purpose                    | Location                              |
| -------------------------- | ------------------------------------- |
| Gateway entry + middleware | `workers/api-gateway/src/index.ts`    |
| DB schema (Drizzle)        | `packages/db/src/schema.ts`           |
| DB operations              | `packages/db/src/operations/*.ts`     |
| Frontend stores            | `src/stores/*.ts`                     |
| i18n locales               | `src/i18n/locales/{en,nl,fr,de}.json` |
| D1 database IDs            | `migrations/D1_CONFIG.md`             |
| Worker bindings config     | `workers/api-gateway/wrangler.toml`   |

## ⚠️ Important notes

1. **README files may be outdated** — `workers/api-gateway/README.md` describes old microservices architecture. This file is the source of truth.
2. **Integration tests hit deployed worker** — Run `pnpm deploy:dev` before `pnpm test` in api-gateway.
3. **i18n tests are strict** — All 4 locales must have matching keys; run `pnpm test:i18n` after adding translations.
