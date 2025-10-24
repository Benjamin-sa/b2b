# B2B Inventory Service

Product management and inventory tracking service for the B2B platform. Built with Cloudflare Workers, Hono, and D1 database.

## Features

- ✅ **Product CRUD Operations** - Full create, read, update, delete functionality
- ✅ **JWT Authentication** - Validates tokens via auth-service
- ✅ **Role-Based Access Control** - Admin-only write operations
- ✅ **Pagination** - Efficient data retrieval with configurable page sizes
- ✅ **Filtering** - Search by category, brand, price range, stock status
- ✅ **Relations Support** - Products with images, specifications, tags, dimensions
- ✅ **Stock Management** - Track inventory levels

## Architecture

```
Client → API Gateway → Inventory Service → D1 Database
                    ↓
               Auth Service (JWT validation)
```

### Authentication Flow

1. Client sends request with `Authorization: Bearer <token>` header
2. Inventory service extracts token
3. Calls auth-service `/auth/validate` endpoint
4. Auth-service returns user context and permissions
5. Service checks if user has required permissions
6. Executes operation if authorized

## API Endpoints

### Public Endpoints (No Auth Required)

```
GET /products
GET /products/:id
GET /products/category/:categoryId
```

### Admin Endpoints (Require Admin Role)

```
POST   /products              - Create new product
PUT    /products/:id          - Full update
PATCH  /products/:id          - Partial update
DELETE /products/:id          - Delete product
POST   /products/:id/stock    - Update stock level
```

## Request Examples

### Get All Products with Pagination

```bash
GET /products?page=1&limit=20&sortBy=price&sortOrder=asc
```

Query Parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sortBy` - Sort field: name, price, created_at, updated_at, stock
- `sortOrder` - Sort direction: asc, desc
- `categoryId` - Filter by category
- `brand` - Filter by brand
- `inStock` - Filter by stock status (true/false)
- `comingSoon` - Filter coming soon products (true/false)
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `search` - Search term (searches name, description, brand)

### Get Single Product

```bash
GET /products/abc123
```

Response includes full product details with images, specifications, tags, and dimensions.

### Get Products by Category

```bash
GET /products/category/electronics?page=1&limit=20
```

### Create Product (Admin Only)

```bash
POST /products
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Product Name",
  "description": "Product description",
  "price": 99.99,
  "originalPrice": 129.99,
  "categoryId": "cat123",
  "inStock": true,
  "stock": 100,
  "brand": "Brand Name",
  "partNumber": "PN-12345",
  "unit": "pcs",
  "minOrderQuantity": 1,
  "maxOrderQuantity": 999,
  "weight": 1.5,
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "specifications": [
    { "key": "Color", "value": "Black" },
    { "key": "Material", "value": "Steel" }
  ],
  "tags": ["new", "featured"],
  "dimensions": {
    "length": 10,
    "width": 20,
    "height": 5,
    "unit": "cm"
  }
}
```

### Update Product (Admin Only)

```bash
PUT /products/abc123
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "price": 89.99,
  "stock": 50
}
```

### Update Stock Only (Admin Only)

```bash
POST /products/abc123/stock
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "stock": 75
}
```

### Delete Product (Admin Only)

```bash
DELETE /products/abc123
Authorization: Bearer <admin-token>
```

## Response Format

### Success Response

```json
{
  "id": "abc123",
  "name": "Product Name",
  "price": 99.99,
  "stock": 100,
  "images": [...],
  "specifications": [...],
  "tags": [...],
  "dimensions": {...}
}
```

### Paginated Response

```json
{
  "items": [...],
  "pagination": {
    "currentPage": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Error Response

```json
{
  "error": "InventoryError",
  "code": "inventory/not-found",
  "message": "Product with id 'abc123' not found",
  "statusCode": 404
}
```

## Database Schema

Products are stored in D1 with the following related tables:

- `products` - Main product data
- `product_images` - Multiple images per product
- `product_specifications` - Key-value specifications
- `product_tags` - Tagging system
- `product_dimensions` - Physical dimensions

See `/migrations/001_initial_schema.sql` for full schema.

## Development

### Prerequisites

- Node.js 18+
- Wrangler CLI
- D1 database configured

### Setup

```bash
cd workers/inventory-service
npm install
```

### Run Locally

```bash
npm run dev
```

Service runs on `http://localhost:8791`

### Deploy

```bash
# Development
npm run deploy:dev

# Production
npm run deploy
```

## Environment Variables

Configured in `wrangler.toml`:

- `ENVIRONMENT` - development | production
- `AUTH_SERVICE_URL` - URL of auth service for JWT validation
- `ALLOWED_ORIGINS` - CORS allowed origins
- `DEFAULT_PAGE_SIZE` - Default pagination size (20)
- `MAX_PAGE_SIZE` - Maximum pagination size (100)

## Error Codes

- `inventory/not-found` - Resource not found (404)
- `inventory/validation-error` - Invalid input (400)
- `inventory/unauthorized` - No/invalid auth token (401)
- `inventory/forbidden` - Insufficient permissions (403)
- `inventory/already-exists` - Duplicate resource (409)
- `inventory/database-error` - Database operation failed (500)
- `inventory/internal-error` - Unexpected error (500)

## Integration with Other Services

### Auth Service

Validates JWT tokens and provides user context:
```typescript
POST /auth/validate
{ "accessToken": "..." }
→ { "valid": true, "user": {...}, "permissions": [...] }
```

### API Gateway

Routes requests to this service:
```
/api/inventory/* → Inventory Service
```

## Testing

```bash
# Run tests
npm test

# Type check
npm run type-check
```

## Security

- ✅ All write operations require admin role
- ✅ JWT validation on every authenticated request
- ✅ CORS configured for allowed origins only
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention via parameterized queries

## Performance

- Pagination prevents large data transfers
- Indexes on frequently queried fields
- Batch operations for related data
- Connection pooling via D1

## Monitoring

All requests are logged with:
- Request method and path
- Response status code
- Processing duration
- User context (if authenticated)

Check Cloudflare Workers logs for monitoring.
