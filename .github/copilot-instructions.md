# Copilot Instructions for B2B Platform

## ⚠️ MIGRATION STATUS: PRODUCTION-ONLY TESTING PHASE

**Current Strategy (Updated: October 24, 2025)**
- **🚨 DOWNTIME ACCEPTED**: Website is in maintenance mode during migration
- **🎯 PRODUCTION-ONLY TESTING**: NO dev environment - all testing happens directly in PRODUCTION
- **📊 Database**: Production D1 database (b2b-prod) is the ONLY active database
- **⚡ Speed Priority**: Fast iteration over safe staging (downtime allows this)
- **🔒 Auth Service**: Cloudflare Workers with production D1 + KV (fully deployed)
- **🔑 Secrets**: JWT_SECRET and REFRESH_SECRET configured in production worker

### 🎪 Why Production-Only Testing?
**The website is in DOWNTIME**, which allows us to:
1. ✅ **Skip dev environment entirely** - No need to maintain separate dev database
2. ✅ **Test with real data** - Users, products, and categories from old system already migrated
3. ✅ **Single source of truth** - One database (b2b-prod) to manage and monitor
4. ✅ **Faster iteration** - No dev→prod sync delays, deploy and test immediately
5. ✅ **Reduced complexity** - No environment switching, config is simpler
6. ✅ **Real-world validation** - Test in actual production conditions from day one

### 🚀 Data Migration Completed
- ✅ Schema deployed to production D1 (19 tables + indexes)
- ✅ User data migrated (3 users with passwords hashed)
- ✅ Product catalog migrated (35 products with images and specs)
- ✅ Categories migrated (1 main category)
- ✅ JWT secrets generated and set (base64-encoded)

**⚠️ CRITICAL**: Every deployment goes DIRECTLY to production. Test thoroughly before deploying!

### 🔄 Deployment Workflow
```bash
# 1. Make changes to code
# 2. Deploy immediately to production
cd workers/auth-service
npm run deploy  # No --env flag needed, goes straight to prod

# 3. Test immediately with frontend
npm run dev  # Frontend connects to production worker

# 4. Monitor production logs in real-time
wrangler tail  # Live logs from production worker
```

## Architecture Overview

This is a **B2B e-commerce platform** transitioning from Firebase to Cloudflare Workers. Currently in hybrid state with Cloudflare auth-service in production.

### Key Services & Boundaries
- **Frontend (Vue 3 + Vite)**: `/src` - SPA with Vue Router, Pinia stores, i18n
- **Auth (Cloudflare Workers)**: `/workers/auth-service` - JWT auth with D1 + KV (PRODUCTION)
- **Firebase Functions**: `/functions` - Node.js backend for payments, webhooks, emails (LEGACY)
- **Cloudflare Workers**: `/workers` - Edge services (inventory, email, R2 image storage)
- **Database**: Cloudflare D1 (production) for auth, Firebase Firestore for orders/products (transitioning)

### Data Flow Pattern
1. **Authentication**: Frontend → Auth Worker (D1 + KV) → JWT tokens
2. **Inventory Sync**: Shopify → Inventory Worker (D1) → Firebase Functions → Firestore → Frontend
3. **Orders**: Frontend → Firebase Functions → Stripe Invoice → Webhook → Stock Update
4. **Images**: Frontend → R2 Worker → Cloudflare R2 Bucket

## Critical Developer Workflows

### Production Deployment (Current Strategy)
```bash
# Deploy auth-service to PRODUCTION
cd workers/auth-service
npm run deploy  # Goes directly to production, no --env flag

# Frontend dev (connects to production auth worker)
npm run dev  # Vite on :5173

# Check production auth worker
wrangler tail  # View live logs from production
wrangler secret list  # View configured secrets
```

### Database Management (Production D1 Only)
```bash
# Query production D1 database (ONLY database in use)
wrangler d1 execute b2b-prod --remote --command "SELECT * FROM users LIMIT 5"

# Run migrations on production
wrangler d1 execute b2b-prod --remote --file ./migrations/001_initial_schema.sql

# Backup production data before making changes
wrangler d1 export b2b-prod --remote --output backup-$(date +%Y%m%d).sql

# Import data to production
wrangler d1 execute b2b-prod --remote --file ./data-import.sql

# Check production database size and stats
wrangler d1 info b2b-prod
```

**Note**: There is NO dev database. All database operations happen on `b2b-prod`.

### Environment Variables (Production-Focused)
Frontend `.env` file (or Vite env vars):
- `VITE_AUTH_SERVICE_URL=https://b2b-auth-service.benkee-sauter.workers.dev` (PRODUCTION)
- `VITE_INVENTORY_SERVICE_URL` - Inventory worker URL (when deployed)
- `VITE_CLOUDFLARE_WORKER_URL` - R2 image upload worker URL
- `VITE_FIREBASE_*` - Firebase config (LEGACY, being phased out)

**All services point to PRODUCTION Cloudflare Workers - no local/dev alternatives.**


## Project-Specific Patterns

### Auth & Authorization (Cloudflare Workers)
- **JWT-based**: Custom auth service using Cloudflare D1 + KV
- **Role-based access**: Users have `role: 'admin' | 'customer'` in D1 `users` table
- **Verification flow**: New customers need admin approval (`is_verified: 0` → `1`)
- **Route guards** in `/src/router/index.ts`: Check `requiresAuth`, `requiresAdmin`, `requiresVerified`
- **Security model**: `useAuthStore` provides `isAdmin`, `isVerified`, `canAccess` computed properties
- **Session management**: KV namespace `SESSIONS` for instant token revocation
- **Secrets**: JWT_SECRET and REFRESH_SECRET set via `wrangler secret put`

### Auth Worker Endpoints
- `POST /auth/register` - Create new user account
- `POST /auth/login` - Authenticate and get tokens
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Invalidate session
- `POST /auth/validate` - Validate token and get user data (used by other services)
- `POST /auth/password-reset/request` - Request password reset
- `POST /auth/password-reset/confirm` - Confirm password reset

### CORS Configuration
All Cloudflare Workers use Hono's built-in CORS middleware:
```typescript
import { cors } from 'hono/cors';

app.use('*', async (c, next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  
  return cors({
    origin: allowedOrigins,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
  })(c, next);
});
```

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

See `/MIGRATION.md` for complete strategy, timelines, and phase details.

## Notes
- This platform serves a dual inventory model: Shopify B2C + Firebase B2B
- Telegram notifications configured for invoice events (check `functions/src/config/telegram.js`)
- VAT validation utilities in `src/utils/vatValidation.ts`
- Image gallery component supports multiple images per product
