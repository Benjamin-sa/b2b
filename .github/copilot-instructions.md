# AI Coding Agent Instructions - B2B Platform

## Big picture

- **Architecture**: Modular monolith on Cloudflare Workers. The **API Gateway** is the single entry point and does **direct D1 access** via `@b2b/db` (no internal HTTP for DB). External workers remain separate and are called via **service bindings**.
- **Key packages**:
  - `packages/db` = Drizzle ORM schema + operations (single source of DB logic).
  - `workers/api-gateway` = Hono routes + business logic + orchestrates external services.
  - `src` = Vue 3 SPA (Pinia stores, Vue Router, i18n).

## Critical conventions (project-specific)

- **DB access**: All CRUD must use `@b2b/db` from the gateway. Do not perform DB logic in external workers.
- **Service bindings only for external services**: Stripe, Shopify sync, Telegram, Email Queue.
- **Inventory source of truth**: Use `product_inventory` table only. Deprecated columns in `products` (`stock`, `in_stock`, `shopify_*`) must not be referenced.
- **API naming**: Frontend uses **snake_case** for API payloads and filters.

## Example patterns

- Gateway routes live in `workers/api-gateway/src/routes/*` and should use:
  - `createDb(c.env.DB)` from `@b2b/db`
  - shared error shape: `{ error, code, message, statusCode }`
- External service calls use bindings, e.g.:
  - `c.env.TELEGRAM_SERVICE.fetch(new Request('https://dummy/...'))`

## Testing

### Frontend tests (Vue 3 + Vitest)

```bash
pnpm test              # Watch mode
pnpm test:run          # Single run
pnpm test:coverage     # With coverage report
pnpm test:i18n         # i18n integrity only
```

- **Test location**: Component tests live alongside components (`*.test.ts`)
- **i18n tests** (`src/tests/i18n.test.ts`): Validates all locales have matching keys, no empty translations, consistent placeholders
- **Helpers** (`src/tests/helpers.ts`): `mountWithPlugins()` mounts components with i18n + Pinia
- **Setup** (`src/tests/setup.ts`): Global mocks for localStorage, fetch, router stubs

### API Gateway integration tests

```bash
cd workers/api-gateway
pnpm deploy:dev           # Deploy dev worker first
pnpm test:integration     # Hits deployed worker
```

- Configure `workers/api-gateway/tests/.env` with admin credentials.

## Workflows (non-obvious)

- **Migrations**: SQL files in `migrations/`. Use `wrangler d1 execute ...` (see `migrations/D1_CONFIG.md`).
- **Workers dev/prod**: Each worker has `wrangler.toml` with env-specific bindings and secrets.
- **Deploy frontend**: `pnpm deploy:frontend` (builds + deploys to Cloudflare Pages).

## Integration points

- Shopify sync worker receives webhooks and updates `product_inventory.b2c_stock` (see `workers/shopify-sync-service`).
- Telegram worker sends admin notifications via service binding (see `workers/telegram-service`).
- Email worker handles SendGrid transactional emails (see `workers/email-service`).

## Files to reference

- Gateway entry + middleware: `workers/api-gateway/src/index.ts`
- DB operations: `packages/db/src/operations/*`
- Inventory schema: `migrations/003_product_inventory_system.sql`
- API tests + validators: `workers/api-gateway/tests/helpers/`
- Frontend test setup: `src/tests/setup.ts`, `src/tests/helpers.ts`
- i18n locales: `src/i18n/locales/{en,nl,fr,de}.json`

## Note on docs

- Some README files still describe the **old microservices model**. Treat this file as the source of truth for the current architecture.
