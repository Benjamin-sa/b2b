# Firebase to Cloudflare Workers Migration Strategy

## Overview
This document outlines the phased migration from Firebase (Hosting, Functions, Firestore, Auth) to Cloudflare (Pages, Workers, D1, custom auth) to reduce costs and improve global performance.

## Current Architecture (Firebase-based)
```
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Hosting                         │
│              (Vue 3 + Vite SPA)                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├─► Firebase Auth (User Management)
                   │
                   ├─► Firestore (Database)
                   │   ├── users
                   │   ├── products
                   │   ├── orders
                   │   ├── invoices
                   │   └── categories
                   │
                   ├─► Firebase Functions (Backend)
                   │   ├── Stripe webhooks
                   │   ├── Email triggers
                   │   └── Payment processing
                   │
                   └─► Cloudflare Workers (Partial)
                       ├── inventory-service (D1)
                       ├── email-service (SendGrid)
                       └── r2-bucket (Image storage)
```

## Target Architecture (Cloudflare-based)
```
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare Pages                          │
│              (Vue 3 + Vite SPA)                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├─► Cloudflare Workers (Auth API)
                   │   ├── JWT-based authentication
                   │   ├── Session management (KV)
                   │   └── Password hashing (bcrypt)
                   │
                   ├─► Cloudflare D1 (SQL Database)
                   │   ├── users
                   │   ├── products
                   │   ├── orders
                   │   ├── invoices
                   │   └── categories
                   │
                   └─► Cloudflare Workers (API)
                       ├── api-gateway (routing)
                       ├── auth-service (authentication)
                       ├── products-service (CRUD)
                       ├── orders-service (CRUD)
                       ├── payments-service (Stripe)
                       ├── inventory-service (existing)
                       ├── email-service (existing)
                       └── r2-bucket (existing)
```

## Migration Benefits
- **Cost Reduction**: Cloudflare's free tier is more generous
- **Performance**: Edge computing, global distribution
- **Unified Stack**: All services on one platform
- **Scalability**: Better handling of traffic spikes
- **DX**: Simpler deployment and monitoring

## Migration Phases

### Phase 1: Setup & Planning (Week 1)
**Objective**: Establish infrastructure and development environment

**Tasks**:
- [ ] Create migration branch: `git checkout -b feature/cloudflare-migration`
- [ ] Set up Cloudflare account and projects
- [ ] Create D1 databases (development & production)
- [ ] Design SQL schema from Firestore collections
- [ ] Set up Cloudflare Pages project
- [ ] Configure GitHub Actions for CI/CD

**Commands**:
```bash
# Create migration branch
git checkout -b feature/cloudflare-migration

# Install Wrangler globally if not already
npm install -g wrangler

# Create D1 databases
wrangler d1 create b2b-dev
wrangler d1 create b2b-prod

# Initialize Pages project
npm run build
wrangler pages deploy dist --project-name=b2b-platform
```

**Deliverables**:
- Migration branch created
- D1 databases provisioned
- SQL schema designed (see schema section below)
- Cloudflare Pages connected to GitHub

---

### Phase 2: Database Schema & Migration (Week 1-2)
**Objective**: Design and implement D1 schema, create data migration scripts

**SQL Schema Design** (based on Firestore collections):

```sql
-- Users table (from Firestore 'users' collection)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'customer')) NOT NULL,
    company_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    btw_number TEXT NOT NULL,
    address_street TEXT NOT NULL,
    address_house_number TEXT NOT NULL,
    address_postal_code TEXT NOT NULL,
    address_city TEXT NOT NULL,
    address_country TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    is_verified BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table (from Firestore 'products' collection)
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    original_price REAL,
    image_url TEXT,
    category_id TEXT,
    in_stock BOOLEAN DEFAULT 1,
    coming_soon BOOLEAN DEFAULT 0,
    stock INTEGER DEFAULT 0,
    brand TEXT,
    part_number TEXT,
    unit TEXT,
    min_order_quantity INTEGER DEFAULT 1,
    max_order_quantity INTEGER,
    weight REAL,
    shopify_product_id TEXT,
    shopify_variant_id TEXT,
    stripe_product_id TEXT,
    stripe_price_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Product images (separate table for multiple images)
CREATE TABLE product_images (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    image_url TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Product specifications
CREATE TABLE product_specifications (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Product tags
CREATE TABLE product_tags (
    product_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (product_id, tag),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Categories table (from Firestore 'categories' collection)
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    slug TEXT UNIQUE NOT NULL,
    parent_id TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- Orders table (from Firestore 'orders' collection)
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    total_amount REAL NOT NULL,
    subtotal REAL NOT NULL,
    tax REAL NOT NULL,
    shipping REAL NOT NULL,
    status TEXT CHECK(status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')) NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estimated_delivery TIMESTAMP,
    shipping_address_street TEXT NOT NULL,
    shipping_address_city TEXT NOT NULL,
    shipping_address_state TEXT,
    shipping_address_zip_code TEXT NOT NULL,
    shipping_address_country TEXT NOT NULL,
    shipping_address_company TEXT,
    shipping_address_contact TEXT,
    shipping_address_phone TEXT,
    payment_method TEXT,
    notes TEXT,
    tracking_number TEXT,
    invoice_url TEXT,
    invoice_pdf TEXT,
    invoice_number TEXT,
    stripe_invoice_id TEXT,
    stripe_status TEXT,
    shipping_cost_cents INTEGER,
    due_date TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Order items
CREATE TABLE order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_sku TEXT,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    image_url TEXT,
    stripe_invoice_item_id TEXT,
    tax_cents INTEGER,
    shopify_variant_id TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Invoices table (from Firestore 'invoices' collection)
CREATE TABLE invoices (
    id TEXT PRIMARY KEY,
    stripe_invoice_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'EUR',
    invoice_pdf TEXT,
    hosted_invoice_url TEXT,
    sent_at TIMESTAMP,
    paid_at TIMESTAMP,
    voided_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sessions table (for JWT session management)
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Webhook events log
CREATE TABLE webhook_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    event_id TEXT UNIQUE NOT NULL,
    payload TEXT NOT NULL,
    processed BOOLEAN DEFAULT 0,
    success BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_verified ON users(is_verified);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_stock ON products(in_stock);
CREATE INDEX idx_products_shopify_variant ON products(shopify_variant_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
```

**Migration Scripts**:
Create `/workers/migration-tools/` directory with scripts:
- `export-firestore.js` - Export Firestore data to JSON
- `import-to-d1.js` - Import JSON to D1
- `validate-migration.js` - Compare data integrity

**Tasks**:
- [ ] Run schema migrations on D1 dev database
- [ ] Create data export script from Firestore
- [ ] Create data import script for D1
- [ ] Test migration with subset of data
- [ ] Validate data integrity

**Commands**:
```bash
# Apply schema to dev database
wrangler d1 execute b2b-dev --file=./migrations/001_initial_schema.sql

# Run migration scripts
cd workers/migration-tools
node export-firestore.js
node import-to-d1.js --env=dev
node validate-migration.js
```

---

### Phase 3: Auth Service Migration (Week 2-3)
**Objective**: Replace Firebase Auth with custom Cloudflare Workers auth

**New Worker**: `workers/auth-service/`

**Features**:
- JWT-based authentication
- Password hashing with bcrypt
- Session management using Cloudflare KV
- Password reset flow
- Email verification flow

**API Endpoints**:
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/verify-email/:token
GET  /api/auth/me
```

**Frontend Changes**:
- Create new auth store: `src/stores/auth-cloudflare.ts`
- Update auth initialization in `src/main.ts`
- Modify route guards in `src/router/index.ts`
- Add JWT token interceptor for API calls

**Tasks**:
- [ ] Create auth-service worker
- [ ] Implement JWT generation/verification
- [ ] Set up KV namespace for sessions
- [ ] Create auth API endpoints
- [ ] Update frontend auth store
- [ ] Test auth flow end-to-end
- [ ] Implement feature flag to toggle between Firebase/Cloudflare auth

**Commands**:
```bash
# Create KV namespace
wrangler kv:namespace create "SESSIONS"
wrangler kv:namespace create "SESSIONS" --preview

# Create auth worker
cd workers
mkdir auth-service
cd auth-service
npm init -y
npm install hono @hono/jwt bcryptjs
```

---

### Phase 4: API Services Migration (Week 3-5)
**Objective**: Migrate Firebase Functions to Cloudflare Workers

**New Workers**:
1. **api-gateway** - Main router and middleware
2. **products-service** - Product CRUD operations
3. **orders-service** - Order management
4. **payments-service** - Stripe integration and webhooks

**Architecture**:
```
Frontend → api-gateway → Service Workers → D1 Database
                       → Stripe
                       → Email Service
```

**Migration Order**:
1. Products service (read-only first)
2. Categories service
3. Orders service (read-only first)
4. Payments/Stripe webhooks
5. Write operations for all services

**API Endpoints Structure**:
```
/api/products
  GET    /          - List products (with filters)
  GET    /:id       - Get product details
  POST   /          - Create product (admin)
  PUT    /:id       - Update product (admin)
  DELETE /:id       - Delete product (admin)
  GET    /category/:id - Products by category

/api/orders
  GET    /          - List orders
  GET    /:id       - Get order details
  POST   /          - Create order
  PUT    /:id       - Update order status

/api/payments
  POST   /invoice/create  - Create Stripe invoice
  POST   /webhook         - Stripe webhooks
  GET    /invoices/:userId - Get user invoices

/api/categories
  GET    /          - List categories
  GET    /:id       - Get category
  POST   /          - Create category (admin)
  PUT    /:id       - Update category (admin)
  DELETE /:id       - Delete category (admin)
```

**Tasks**:
- [ ] Create api-gateway worker with routing
- [ ] Migrate products-service (GET endpoints first)
- [ ] Migrate orders-service (GET endpoints first)
- [ ] Migrate payments-service (Stripe webhooks)
- [ ] Add write operations (POST/PUT/DELETE)
- [ ] Update frontend services to use new APIs
- [ ] Implement feature flags for gradual rollout
- [ ] Add comprehensive error handling
- [ ] Set up monitoring and logging

**Frontend Service Layer**:
Create adapter pattern in `/src/services/api/`:
```typescript
// src/services/api/adapter.ts
export const useFirebase = import.meta.env.VITE_USE_FIREBASE === 'true'

// src/services/api/products.ts
import { useFirebase } from './adapter'
import { productsFirebase } from './firebase/products'
import { productsCloudflare } from './cloudflare/products'

export const productsApi = useFirebase ? productsFirebase : productsCloudflare
```

---

### Phase 5: Hosting Migration (Week 5)
**Objective**: Deploy frontend to Cloudflare Pages

**Tasks**:
- [ ] Connect GitHub repo to Cloudflare Pages
- [ ] Configure build settings (Vite)
- [ ] Set up environment variables
- [ ] Configure custom domain
- [ ] Set up preview deployments
- [ ] Test production build
- [ ] Configure SPA routing

**Build Configuration**:
```yaml
# Cloudflare Pages settings
Build command: npm run build
Build output directory: dist
Root directory: /
Node version: 18
Environment variables:
  - VITE_API_BASE_URL
  - VITE_STRIPE_PUBLISHABLE_KEY
  - VITE_CLOUDFLARE_WORKER_URL
```

**Commands**:
```bash
# Manual deployment
npm run build
wrangler pages deploy dist --project-name=b2b-platform

# Test preview
npm run build
wrangler pages deploy dist --branch=preview
```

---

### Phase 6: Testing & Validation (Week 6)
**Objective**: Comprehensive testing of migrated system

**Test Categories**:
1. **Unit Tests**: Individual workers and functions
2. **Integration Tests**: API endpoints with D1
3. **E2E Tests**: Full user flows
4. **Performance Tests**: Load and stress testing
5. **Security Tests**: Auth, permissions, SQL injection

**Testing Checklist**:
- [ ] Auth flows (register, login, logout, password reset)
- [ ] Product browsing and search
- [ ] Category navigation
- [ ] Cart operations
- [ ] Checkout and payment
- [ ] Order management
- [ ] Admin operations
- [ ] Stripe webhook handling
- [ ] Email notifications
- [ ] Image uploads
- [ ] Stock synchronization
- [ ] Cross-browser testing
- [ ] Mobile responsiveness
- [ ] Performance benchmarks

**Tools**:
- Vitest for unit tests
- Playwright for E2E tests
- k6 for load testing

---

### Phase 7: Gradual Rollout (Week 7-8)
**Objective**: Safe production deployment with rollback capability

**Rollout Strategy**:
1. **10% traffic** - Canary deployment to test group
2. **25% traffic** - Monitor errors and performance
3. **50% traffic** - Validate scalability
4. **100% traffic** - Full migration
5. Keep Firebase running for 2 weeks as fallback

**Feature Flags**:
```typescript
// Environment-based feature flags
export const config = {
  useCloudflareAuth: import.meta.env.VITE_USE_CF_AUTH === 'true',
  useCloudflareAPI: import.meta.env.VITE_USE_CF_API === 'true',
  useCloudflarePg: import.meta.env.VITE_USE_CF_PAGES === 'true',
  rolloutPercentage: parseInt(import.meta.env.VITE_ROLLOUT_PERCENT || '0')
}
```

**Monitoring**:
- Cloudflare Analytics
- Custom logging to KV/D1
- Error tracking (Sentry integration)
- Performance monitoring

**Rollback Plan**:
- Keep Firebase services active for 2 weeks
- Document rollback procedures
- Have quick-switch environment variables ready
- Maintain data sync during transition period

---

### Phase 8: Cleanup & Optimization (Week 9)
**Objective**: Remove Firebase dependencies and optimize Cloudflare setup

**Tasks**:
- [ ] Remove Firebase SDK dependencies
- [ ] Delete Firebase initialization code
- [ ] Remove Firebase-specific stores and services
- [ ] Clean up old environment variables
- [ ] Optimize D1 queries
- [ ] Set up proper caching strategies
- [ ] Configure CDN and edge caching
- [ ] Document new architecture
- [ ] Update deployment docs
- [ ] Archive Firebase project (don't delete yet)

**Cost Analysis**:
- Compare Firebase vs Cloudflare costs
- Document savings
- Monitor usage patterns

---

## Risk Management

### High-Risk Areas
1. **Auth Migration**: User sessions, password handling
2. **Payment Processing**: Stripe webhooks must not fail
3. **Data Integrity**: Ensure complete data migration
4. **Stock Sync**: Critical for inventory management

### Mitigation Strategies
- Comprehensive testing at each phase
- Feature flags for gradual rollout
- Keep Firebase as fallback during transition
- Daily backups of D1 database
- Real-time monitoring and alerting

### Rollback Triggers
- Auth failure rate > 5%
- Payment processing errors > 1%
- API error rate > 2%
- Performance degradation > 20%
- Data inconsistency detected

---

## Development Workflow

### Branch Strategy
```
main (production - Firebase)
  └── feature/cloudflare-migration (development)
       ├── feature/cf-auth
       ├── feature/cf-api
       ├── feature/cf-products
       ├── feature/cf-orders
       └── feature/cf-payments
```

### Environment Setup
- **Local Development**: Use Miniflare for Workers, D1 local dev
- **Preview**: Cloudflare preview deployments
- **Staging**: Separate D1 database, test domain
- **Production**: Final deployment

### Daily Workflow
```bash
# Start local development
npm run dev  # Frontend on :5173
wrangler dev  # Workers on :8787

# Test workers locally
cd workers/api-gateway
npm run dev

# Deploy to preview
wrangler pages deploy dist --branch=preview
```

---

## Success Criteria

### Technical Metrics
- [ ] 100% feature parity with Firebase version
- [ ] API response time < 200ms (p95)
- [ ] Zero data loss during migration
- [ ] Auth success rate > 99.9%
- [ ] Payment processing reliability > 99.99%

### Business Metrics
- [ ] Cost reduction > 60%
- [ ] Global latency improvement > 30%
- [ ] Zero critical bugs in production
- [ ] User satisfaction maintained

---

## Cost Comparison

### Firebase (Current)
- Hosting: ~$0-25/month
- Functions: ~$50-200/month
- Firestore: ~$30-100/month
- Auth: ~$0-50/month
- **Total**: ~$80-375/month

### Cloudflare (Target)
- Pages: Free (500 builds/month)
- Workers: Free tier (100k requests/day)
- D1: Free tier (5GB storage)
- KV: Free tier (100k reads/day)
- R2: $0.015/GB storage
- **Total**: ~$10-50/month

**Projected Savings**: 70-85% cost reduction

---

## Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Setup | Week 1 | Not Started |
| Phase 2: Database | Week 1-2 | Not Started |
| Phase 3: Auth | Week 2-3 | Not Started |
| Phase 4: API | Week 3-5 | Not Started |
| Phase 5: Hosting | Week 5 | Not Started |
| Phase 6: Testing | Week 6 | Not Started |
| Phase 7: Rollout | Week 7-8 | Not Started |
| Phase 8: Cleanup | Week 9 | Not Started |

**Total Duration**: ~9 weeks (2-2.5 months)

---

## Next Steps

1. **Review this document** with the team
2. **Create the migration branch**: `git checkout -b feature/cloudflare-migration`
3. **Set up Cloudflare account** and provision D1 databases
4. **Start Phase 1** with infrastructure setup
5. **Weekly sync meetings** to track progress

---

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Hono Framework](https://hono.dev/)
- [Migration Best Practices](https://developers.cloudflare.com/workers/tutorials/)

---

## Questions & Decisions

- **Q**: Should we keep Firebase Auth during migration?
  - **A**: Yes, use feature flags to toggle between systems
  
- **Q**: How to handle real-time updates without Firestore listeners?
  - **A**: Implement polling or WebSockets with Durable Objects
  
- **Q**: What about file uploads during migration?
  - **A**: Already using R2, no change needed

- **Q**: Session management strategy?
  - **A**: Use Cloudflare KV for session storage with JWT tokens
