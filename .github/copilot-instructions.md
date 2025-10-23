# Copilot Instructions for B2B Platform

## Architecture Overview

This is a **B2B e-commerce platform** with Vue 3 frontend, Firebase backend, Cloudflare Workers for services, and Stripe for payments. The system integrates with Shopify for inventory synchronization.

### Key Services & Boundaries
- **Frontend (Vue 3 + Vite)**: `/src` - SPA with Vue Router, Pinia stores, i18n
- **Firebase Functions**: `/functions` - Node.js backend for payments, webhooks, emails
- **Cloudflare Workers**: `/workers` - Edge services (inventory, email, R2 image storage)
- **Firebase Firestore**: Database with emulator support on port 8086

### Data Flow Pattern
1. **Inventory Sync**: Shopify → Inventory Worker (D1) → Firebase Functions → Firestore → Frontend
2. **Orders**: Frontend → Firebase Functions → Stripe Invoice → Webhook → Stock Update (both Firebase & Worker)
3. **Images**: Frontend → R2 Worker → Cloudflare R2 Bucket

## Critical Developer Workflows

### Development Setup
```bash
# Frontend dev with emulators
npm run dev  # Vite on :5173, auto-connects to Firebase emulators

# Firebase emulators (run in separate terminal)
firebase emulators:start  # Auth:9099, Functions:5001, Firestore:8086

# Populate test data in emulator
npm run mock-product:50  # Creates 50 test products

# Worker development (example: inventory-service)
cd workers/inventory-service
npm run dev  # Runs on :8787
```

### Environment Variables
Frontend uses Vite env vars (prefix `VITE_`):
- `VITE_FIREBASE_*` - Firebase config
- `VITE_INVENTORY_SERVICE_URL` - Inventory worker URL (defaults to localhost:8787)
- `VITE_CLOUDFLARE_WORKER_URL` - R2 image upload worker

**DEV MODE AUTO-DETECTION**: `import.meta.env.DEV` auto-connects to Firebase emulators (see `/src/init/firebase.ts`)

### Testing Against Emulators
Firebase emulators are configured in `firebase.json` with `host: "0.0.0.0"` for network access. All frontends requests in dev mode automatically route to emulators.

## Project-Specific Patterns

### Auth & Authorization
- **Role-based access**: Users have `role: 'admin' | 'customer'` in Firestore `/users/{uid}`
- **Verification flow**: New customers need admin approval (`isVerified: false` → `true`)
- **Route guards** in `/src/router/index.ts`: Check `requiresAuth`, `requiresAdmin`, `requiresVerified`
- **Security model**: `useAuthStore` provides `isAdmin`, `isVerified`, `canAccess` computed properties

### State Management with Pinia
All stores in `/src/stores/` follow this pattern:
```typescript
// Standard store structure
export const useXStore = defineStore('x', () => {
  const data = ref<T[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Always cache reads (see /src/services/cache.ts)
  const cacheKey = appCache.generateKey(...)
  const cached = appCache.get<T>(cacheKey)
  if (cached) return cached
  
  // Invalidate on writes
  appCache.invalidate()
})
```

**Cache Service**: `/src/services/cache.ts` - In-memory LRU cache with TTL. Used in `products.ts`, `categories.ts`.

### Inventory Integration
Products have TWO stock fields:
- `stock` (number): B2B allocated stock in Firestore
- Shopify inventory via `shopifyVariantId`: Fetched from inventory-service worker

**Stock sync workflow**:
1. Firebase Functions webhook receives Stripe invoice.sent
2. Reduces `stock` in Firestore products collection
3. Calls inventory-service `/webhook/stock-update` to reduce Shopify inventory
4. On invoice void: Both stocks are restored

See `/functions/src/handlers/webhookHandlers.js` for implementation.

### Type System
All types exported from `/src/types/index.ts` as single import:
```typescript
import type { Product, UserProfile, Order } from '@/types'
```

**Critical types**:
- `Product.shopifyVariantId` - Links to Shopify for real-time inventory
- `UserProfile.isVerified` - Admin approval status
- `OrderStatus` - Mirrors Stripe invoice states

### Stripe Integration
**Invoice-based payments** (NOT checkout sessions):
- Functions create Stripe invoices with metadata: `{ userId, shopifyVariantId, productName }`
- Webhooks in `/functions/src/functions/webhooks.js` handle: `invoice.sent`, `invoice.payment_succeeded`, `invoice.voided`
- All invoice amounts in **cents** (minor currency units)

Expanded invoice fields for tax rates:
```javascript
const EXPANDED_INVOICE_FIELDS = ['lines.data.price', 'total_tax_amounts.tax_rate']
```

### i18n Conventions
- Translation files in `/src/i18n/locales/`
- Use `const { t } = useI18n()` in components
- Notification messages use i18n: `t('auth.welcomeBack')`
- All user-facing errors translated

### Firebase Functions Structure
Entry: `/functions/src/index.js` exports all functions
Organized by feature:
- `/functions/products.js` - Firestore triggers on product changes (sync to Stripe)
- `/functions/customers.js` - Firestore triggers on user changes
- `/functions/webhooks.js` - Stripe webhook handler
- `/functions/welcomeEmail.js`, `/functions/verificationEmail.js` - Email triggers

**Emulator detection**: `isEmulator` flag skips secret requirements in dev.

### Cloudflare Workers Architecture
Three workers in `/workers/`:
1. **inventory-service**: Hono app, D1 database, Shopify API integration
2. **email-service**: SendGrid integration for transactional emails  
3. **r2-bucket**: Image upload/management with R2 storage

All use environment-based configuration in `wrangler.toml` and secrets via `wrangler secret put`.

## Common Gotchas

### Firestore Rules
`firestore.rules` is currently **WIDE OPEN** for emulator testing (`allow read, write: if true`). Production rules commented out - must be enabled before deployment.

### Router Redirect Loops
Watch for verification/auth loops in `/src/router/index.ts`. The guard checks:
1. Auth required → redirect to /auth
2. Verified required → redirect to /verification-pending  
3. Admin bypass for verification

**Pattern**: Always check `authStore.initializing` before navigation decisions.

### Stripe Metadata Extraction
Invoice line items store product context in metadata:
```javascript
lineItem.metadata?.shopifyVariantId
lineItem.metadata?.productName
```
This metadata drives stock reduction. Missing metadata = no stock sync.

### Image Upload Flow
1. Frontend uploads to `/workers/r2-bucket` worker
2. Worker returns public R2 URL: `https://pub-{hash}.r2.dev/{path}`
3. Store URL in `product.imageUrl` or `product.images[]`

**Component**: `/src/components/admin/ImageUpload.vue` handles this flow.

## Key Files Reference

- **Auth flow**: `src/stores/auth.ts` (348 lines, comprehensive error handling)
- **Product management**: `src/stores/products.ts` (client-side search, cache integration)
- **Webhook processing**: `functions/src/handlers/webhookHandlers.js` (stock sync logic)
- **Worker endpoints**: `workers/inventory-service/src/index.ts` (API routes with CORS)
- **Firebase init**: `src/init/firebase.ts` (emulator auto-connect)

## Development Commands Quick Reference

```bash
# Frontend
npm run dev              # Start Vite dev server
npm run build            # Production build
npm run deploy:firebase  # Deploy to Firebase Hosting

# Emulator & Testing
firebase emulators:start           # Start all emulators
npm run populate-emulator          # Seed products
npm run mock-product:100           # Seed 100 products

# Firebase Functions
cd functions && npm run serve      # Functions emulator only
cd functions && npm run deploy     # Deploy functions

# Cloudflare Workers
cd workers/<service> && npm run dev     # Local development
cd workers/<service> && npm run deploy  # Deploy to Cloudflare
wrangler secret put SENDGRID_API_KEY    # Set worker secrets
```

## Active Migration: Firebase → Cloudflare Workers

**STATUS**: Planning phase - See `/MIGRATION.md` for full strategy

This codebase is undergoing a phased migration from Firebase to Cloudflare Workers to reduce costs (~70-85% savings) and improve global performance. Development happens in the `feature/cloudflare-migration` branch.

### Migration Approach
- **Gradual rollout** with feature flags (not big-bang)
- **Parallel systems** during transition (Firebase as fallback)
- **No downtime** deployment strategy
- **Data integrity** as top priority

### Current State (Firebase)
- Frontend: Firebase Hosting
- Backend: Firebase Functions
- Database: Firestore (NoSQL)
- Auth: Firebase Auth
- Partial CF: 3 workers (inventory, email, r2-bucket)

### Target State (Cloudflare)
- Frontend: Cloudflare Pages
- Backend: Cloudflare Workers
- Database: D1 (SQL)
- Auth: Custom JWT-based (Workers + KV)
- Workers: 7+ services (modular architecture)

### Key Migration Decisions
1. **Database**: Firestore → D1 (SQL schema designed in MIGRATION.md)
2. **Auth**: Firebase Auth → Custom JWT + KV sessions
3. **API**: Monolithic Functions → Microservice Workers
4. **Hosting**: Firebase Hosting → Cloudflare Pages

### Feature Flags Pattern
Use environment variables to toggle between systems:
```typescript
export const config = {
  useCloudflareAuth: import.meta.env.VITE_USE_CF_AUTH === 'true',
  useCloudflareAPI: import.meta.env.VITE_USE_CF_API === 'true',
  rolloutPercentage: parseInt(import.meta.env.VITE_ROLLOUT_PERCENT || '0')
}
```

### Adapter Pattern for Services
All API calls go through adapters that switch between Firebase/Cloudflare:
```typescript
// src/services/api/adapter.ts
export const useFirebase = import.meta.env.VITE_USE_FIREBASE === 'true'
export const productsApi = useFirebase ? productsFirebase : productsCloudflare
```

### Migration Branches
```
main (production - Firebase)
  └── feature/cloudflare-migration (active development)
       ├── feature/cf-auth (JWT auth service)
       ├── feature/cf-api (API gateway)
       ├── feature/cf-products (products service)
       └── feature/cf-orders (orders service)
```

### Working with Migration Code
- Always check which system is active via feature flags
- Don't remove Firebase code until migration is 100% complete
- Test both Firebase AND Cloudflare paths
- Document any breaking changes between systems
- Use adapter pattern for all new API integrations

### Testing During Migration
- Local: Run both Firebase emulators AND Wrangler dev
- Use `VITE_USE_FIREBASE=true` to test Firebase path
- Use `VITE_USE_FIREBASE=false` to test Cloudflare path
- E2E tests must pass for BOTH configurations

See `/MIGRATION.md` for complete strategy, timelines, and phase details.

## Notes
- This platform serves a dual inventory model: Shopify B2C + Firebase B2B
- Telegram notifications configured for invoice events (check `functions/src/config/telegram.js`)
- VAT validation utilities in `src/utils/vatValidation.ts`
- Image gallery component supports multiple images per product
