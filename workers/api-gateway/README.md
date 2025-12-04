# API Gateway - Simple Router

**Version**: 2.0.0  
**Architecture**: Microservices with Independent JWT Verification

---

## 🎯 Purpose

This API Gateway is a **simple routing layer** that forwards requests to microservices. It does **NOT** verify JWT tokens - each service handles its own authentication.

### Responsibilities ✅
- Route requests to correct microservice
- Handle CORS for browser requests
- Log requests for monitoring
- Rate limiting (optional)

### NOT Responsible For ❌
- JWT verification (services do this)
- Business logic
- Database access
- User authentication/authorization

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 API GATEWAY (Dumb Pipe)                 │
│                                                          │
│  • Routes /auth/* → Auth Service                        │
│  • Routes /api/products/* → Products Service            │
│  • Routes /api/orders/* → Orders Service                │
│  • Passes Authorization header to services              │
│  • NO JWT verification                                  │
└────────────────┬────────────────────────────────────────┘
                 │ Forwards: Authorization: Bearer <token>
                 │
    ┌────────────┼────────────┬────────────┐
    │            │            │            │
    ▼            ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│  Auth   │  │Products │  │ Orders  │  │ Stripe  │
│ Service │  │ Service │  │ Service │  │ Service │
│         │  │         │  │         │  │         │
│ ✅ Verify│  │ ✅ Verify│  │ ✅ Verify│  │ ✅ Verify│
│ JWT     │  │ JWT     │  │ JWT     │  │ JWT     │
└─────────┘  └─────────┘  └─────────┘  └─────────┘

Each service is INDEPENDENT and SECURE
```

---

## 🔑 Why Services Verify JWT Themselves

### Benefits:

1. **True Microservices**: Services are independent and can be called directly
2. **Better Security**: Services don't trust headers, they verify everything
3. **No Single Point of Failure**: If gateway is down, services still work
4. **Service-to-Service**: Services can call each other directly with tokens
5. **Simpler Gateway**: Less code, easier to maintain

### How it Works:

1. Client makes request with `Authorization: Bearer <token>` header
2. API Gateway forwards request **AS-IS** to service (including Authorization header)
3. Service extracts token and verifies it with `JWT_SECRET`
4. Service checks permissions and processes request
5. Service returns response
6. API Gateway forwards response back to client

**Key Point**: All services share the same `JWT_SECRET` for token verification.

---

## 📋 Routes

| Path | Target Service | Description |
|------|---------------|-------------|
| `/auth/*` | Auth Service | Login, register, token refresh |
| `/api/products/*` | Products Service | Product CRUD, search |
| `/api/categories/*` | Products Service | Category management |
| `/api/orders/*` | Orders Service | Order creation, tracking |
| `/api/profile/*` | Auth Service | User profile management |
| `/api/admin/products/*` | Products Service | Admin product management |
| `/api/admin/orders/*` | Orders Service | Admin order management |
| `/api/admin/users/*` | Auth Service | Admin user management |

---

## 🚀 Setup

### 1. Install Dependencies

```bash
cd workers/api-gateway
npm install
```

### 2. Configure Service URLs

Update `wrangler.toml` with your service URLs:

```toml
# Development (local)
AUTH_SERVICE_URL = "http://localhost:8787"
PRODUCTS_SERVICE_URL = "http://localhost:8788"
ORDERS_SERVICE_URL = "http://localhost:8789"

# Production (deployed workers)
AUTH_SERVICE_URL = "https://auth.yourdomain.workers.dev"
PRODUCTS_SERVICE_URL = "https://products.yourdomain.workers.dev"
ORDERS_SERVICE_URL = "https://orders.yourdomain.workers.dev"
```

### 3. Run Locally

```bash
npm run dev
```

Gateway will run on: `http://localhost:8786`

### 4. Test

```bash
# Health check
curl http://localhost:8786/

# Test auth route (proxies to auth service)
curl http://localhost:8786/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'

# Test products route (proxies to products service)
curl http://localhost:8786/api/products
```

---

## 🔐 Security Model

### Client → API Gateway → Service

```typescript
// 1. Client sends request
fetch('https://gateway.yourdomain.com/api/products', {
  headers: {
    'Authorization': 'Bearer eyJhbGc...'  // JWT access token
  }
});

// 2. API Gateway forwards request AS-IS
// No JWT verification here!
const response = await fetch('https://products.yourdomain.workers.dev/products', {
  headers: {
    'Authorization': 'Bearer eyJhbGc...'  // Same token
  }
});

// 3. Products Service verifies JWT
import { verifyAccessToken } from './utils/jwt';

const token = extractBearerToken(c.req.header('Authorization'));
const user = await verifyAccessToken(token, c.env.JWT_SECRET);

// Now service knows user is authenticated
```

### Service-to-Service Communication

Services can call each other directly:

```typescript
// In Orders Service, calling Products Service
const response = await fetch('https://products.yourdomain.workers.dev/products/check-stock', {
  method: 'POST',
  headers: {
    // Pass user's token
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ productIds: ['123', '456'] })
});

// Products Service verifies the token
// No need for API Gateway in the middle!
```

---

## 🛠️ Development Workflow

### Running All Services Locally

```bash
# Terminal 1: Auth Service
cd workers/auth-service
npm run dev  # Port 8787

# Terminal 2: Products Service (when created)
cd workers/products-service
npm run dev  # Port 8788

# Terminal 3: API Gateway
cd workers/api-gateway
npm run dev  # Port 8786
```

### Testing Requests

```bash
# Through API Gateway
curl http://localhost:8786/api/products

# Direct to service (also works!)
curl http://localhost:8788/products
```

Both should work because services verify JWT themselves!

---

## 📊 Request Flow Example

### GET /api/products

```
1. Client → API Gateway
   GET http://localhost:8786/api/products
   Authorization: Bearer eyJhbGc...

2. API Gateway → Products Service
   GET http://localhost:8788/products
   Authorization: Bearer eyJhbGc... (forwarded)

3. Products Service
   - Extracts token from Authorization header
   - Verifies JWT with JWT_SECRET
   - Decodes user info (uid, role, etc.)
   - Checks if user can access products
   - Queries D1 database
   - Returns products

4. API Gateway → Client
   Returns response from Products Service
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ENVIRONMENT` | development or production | `development` |
| `AUTH_SERVICE_URL` | Auth service URL | `http://localhost:8787` |
| `PRODUCTS_SERVICE_URL` | Products service URL | `http://localhost:8788` |
| `ORDERS_SERVICE_URL` | Orders service URL | `http://localhost:8789` |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | `http://localhost:5173` |

### No Secrets Required!

Unlike traditional API gateways, this one doesn't need secrets because:
- ✅ No JWT verification (services do it)
- ✅ No database access
- ✅ No external API calls

---

## 🚀 Deployment

### Deploy to Development

```bash
npm run deploy:dev
```

### Deploy to Production

```bash
npm run deploy:prod
```

### Update Service URLs

After deploying services, update `wrangler.toml` prod URLs:

```toml
[env.prod.vars]
AUTH_SERVICE_URL = "https://b2b-auth-service.youraccount.workers.dev"
PRODUCTS_SERVICE_URL = "https://b2b-products-service.youraccount.workers.dev"
# etc...
```

Then redeploy gateway:

```bash
npm run deploy:prod
```

---

## 📈 Monitoring

### Logs

```bash
# Development
npm run dev

# Production (tail logs)
wrangler tail --env prod
```

### Request Logging

Every request is logged:

```
[Proxy] GET /api/products → http://localhost:8788/products
[Proxy] POST /auth/login → http://localhost:8787/login
```

---

## 🎯 Best Practices

### 1. Keep Gateway Simple
✅ DO: Route requests  
✅ DO: Handle CORS  
✅ DO: Log requests  
❌ DON'T: Verify JWT  
❌ DON'T: Add business logic  
❌ DON'T: Access database  

### 2. Let Services Be Independent
✅ Each service verifies JWT  
✅ Each service checks permissions  
✅ Each service handles errors  

### 3. Share JWT_SECRET Across Services
```bash
# Same secret in all services
JWT_SECRET = "s87R+vvfw+qLIp5S7lyb+cGrIKjPz8AIWpjRt1rXL2o="
```

### 4. Use Direct Service Calls When Possible
```typescript
// Instead of: Client → Gateway → Service1 → Gateway → Service2
// Do: Client → Gateway → Service1 → Service2 (direct)
```

---

## 🔄 Comparison with Old Approach

| Aspect | Old (JWT in Gateway) | New (JWT in Services) |
|--------|---------------------|----------------------|
| Gateway Complexity | High | Low |
| Service Independence | Low | High |
| Single Point of Failure | Yes | No |
| Service-to-Service | Via Gateway | Direct |
| Security | Trust headers | Verify everything |
| Microservices Best Practice | No | Yes |

---

## 📚 Related Documentation

- [Auth Service README](../auth-service/README.md) - JWT verification implementation
- [MIGRATION.md](../../MIGRATION.md) - Overall migration strategy
- [Hono Framework](https://hono.dev/) - Web framework used

---

## 🆘 Troubleshooting

### Service Not Reachable

**Problem**: `Service Unavailable` error

**Solution**:
1. Check service is running: `curl http://localhost:8787/health`
2. Check service URL in `wrangler.toml`
3. Check logs: `wrangler tail`

### CORS Errors

**Problem**: Browser blocks request

**Solution**:
1. Add your domain to `ALLOWED_ORIGINS` in `wrangler.toml`
2. Restart gateway

### Request Timeout

**Problem**: Gateway times out after 30 seconds

**Solution**:
1. Service might be slow - check service logs
2. Increase timeout in `src/utils/proxy.ts`:
   ```typescript
   timeout = 30000 // 30 seconds (default)
   ```

---

**Status**: ✅ Production Ready  
**Architecture**: Microservices with Independent Auth  
**Complexity**: Low (simple router)  
**Maintenance**: Easy
