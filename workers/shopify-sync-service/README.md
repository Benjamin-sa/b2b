# Shopify Sync Service

Bidirectional inventory synchronization between B2B platform and Shopify B2C store.

## 🎯 Purpose

This worker synchronizes stock levels between:

- **B2B Platform**: `product_inventory.b2b_stock` (sold on B2B platform)
- **Shopify**: `product_inventory.b2c_stock` (sold on Shopify B2C store)

## 🔄 Sync Flows

### Outbound (B2B → Shopify)

When a B2B order is placed, this service updates Shopify with the remaining B2C stock.

```
B2B Order (5 units)
  → Inventory Service decreases B2B stock
  → Calls Shopify Sync Service
  → Updates Shopify with current B2C stock
```

### Inbound (Shopify → B2B)

When a B2C order is placed on Shopify, webhooks update our B2C stock.

```
Shopify Order (3 units)
  → Shopify sends inventory webhook
  → Shopify Sync Service receives webhook
  → Updates product_inventory.b2c_stock
  → Logs change in inventory_sync_log
```

### Scheduled Reconciliation

Every 5 minutes, a cron job syncs all products to catch any discrepancies.

## 📡 API Endpoints

### Outbound Sync

**POST `/sync/:productId`**
Manually sync a single product to Shopify.

```bash
curl -X POST https://shopify-sync.your-workers.dev/sync/prod_123
```

**POST `/sync/all`**
Trigger full reconciliation (also runs via cron).

```bash
curl -X POST https://shopify-sync.your-workers.dev/sync/all
```

### Inbound Webhooks

**POST `/webhooks/inventory-update`**
Shopify webhook for inventory level changes.

**POST `/webhooks/orders-create`**
Shopify webhook for new orders.

### Health

**GET `/health`**
Health check endpoint.

## 🔧 Setup

### 1. Install Dependencies

```bash
cd workers/shopify-sync-service
npm install
```

### 2. Configure Shopify

#### Get Admin API Access Token

1. Go to Shopify Admin → Apps → Develop apps
2. Create custom app with these scopes:
   - `read_inventory`
   - `write_inventory`
   - `read_products`
   - `read_orders`
3. Install app and copy **Admin API access token**

#### Get Location ID

```bash
curl -X GET \
  'https://your-store.myshopify.com/admin/api/2024-10/locations.json' \
  -H 'X-Shopify-Access-Token: YOUR_TOKEN'
```

#### Create Webhooks

```bash
# Inventory updates
curl -X POST \
  'https://your-store.myshopify.com/admin/api/2024-10/webhooks.json' \
  -H 'X-Shopify-Access-Token: YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "webhook": {
      "topic": "inventory_levels/update",
      "address": "https://your-worker.workers.dev/webhooks/inventory-update",
      "format": "json"
    }
  }'

# Order created
curl -X POST \
  'https://your-store.myshopify.com/admin/api/2024-10/webhooks.json' \
  -H 'X-Shopify-Access-Token: YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "webhook": {
      "topic": "orders/create",
      "address": "https://your-worker.workers.dev/webhooks/orders-create",
      "format": "json"
    }
  }'
```

### 3. Set Secrets

```bash
# Production
wrangler secret put SHOPIFY_ACCESS_TOKEN
wrangler secret put SHOPIFY_WEBHOOK_SECRET
wrangler secret put SHOPIFY_LOCATION_ID

# Development
wrangler secret put SHOPIFY_ACCESS_TOKEN --env dev
wrangler secret put SHOPIFY_WEBHOOK_SECRET --env dev
wrangler secret put SHOPIFY_LOCATION_ID --env dev
```

### 4. Update wrangler.toml

```toml
[vars]
SHOPIFY_STORE_DOMAIN = "your-store.myshopify.com"
SHOPIFY_API_VERSION = "2024-10"
```

### 5. Deploy

```bash
# Development
npm run deploy:dev

# Production
npm run deploy
```

## 🔗 Integration with Inventory Service

The Inventory Service should call this worker after B2B orders:

```typescript
// In inventory-service/src/services/order.service.ts
import type { Env } from '../types';

async function createOrder(env: Env, orderData: any) {
  // ... create order ...

  // Decrease B2B stock
  await decreaseB2BStock(env.DB, productId, quantity);

  // Sync to Shopify (if product is linked)
  const inventory = await getInventoryByProductId(env.DB, productId);
  if (inventory.sync_enabled && inventory.shopify_variant_id) {
    // Call Shopify Sync Service via service binding
    const request = new Request('https://dummy/sync/' + productId, {
      method: 'POST',
    });
    await env.SHOPIFY_SYNC_SERVICE.fetch(request);
  }
}
```

## 📊 Monitoring

### Check Sync Status

```bash
# View recent sync logs
wrangler d1 execute b2b-prod --remote --command \
  "SELECT * FROM inventory_sync_log ORDER BY created_at DESC LIMIT 10"

# Check products with sync errors
wrangler d1 execute b2b-prod --remote --command \
  "SELECT product_id, sync_error, last_synced_at FROM product_inventory WHERE sync_error IS NOT NULL"
```

### View Worker Logs

```bash
# Production
wrangler tail

# Development
wrangler tail --env dev
```

## 🛡️ Error Handling

- **Webhook deduplication**: Uses `webhook_events` table to prevent duplicate processing
- **HMAC verification**: All webhooks are signature-verified
- **Retry logic**: Failed syncs are logged with errors in `product_inventory.sync_error`
- **Audit trail**: Every stock change is logged in `inventory_sync_log`

## 📝 Database Tables Used

- `product_inventory` - Stock levels and Shopify linking
- `inventory_sync_log` - Audit trail for all changes
- `webhook_events` - Webhook deduplication

## 🚀 Next Steps

1. **Link products**: Use admin UI to link B2B products to Shopify variants
2. **Set B2C allocation**: Allocate stock between B2B and B2C
3. **Enable sync**: Set `sync_enabled = 1` for products
4. **Test**: Place test orders on both platforms
5. **Monitor**: Check `inventory_sync_log` for sync activity

---

**Last Updated**: October 26, 2025
