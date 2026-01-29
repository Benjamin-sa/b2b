# Shopify Webhook Setup Guide

## Overview

The B2B platform is already configured to receive Shopify inventory webhooks. When stock changes in Shopify, it automatically updates the D1 database.

## Architecture Flow

```
Shopify Stock Change
    ↓ (webhook)
shopify-sync-service/webhooks/inventory-update
    ↓ (verify signature)
    ↓ (check idempotency)
    ↓ (find linked product)
    ↓ (update D1 stock)
D1 Database Updated ✅
```

## Setup Steps

### 1. Get Your Webhook URL

**Dev Environment:**

```
https://b2b-shopify-sync-service-dev.benkee-sauter.workers.dev/webhooks/inventory-update
```

**Production Environment:**

```
https://b2b-shopify-sync-service.benkee-sauter.workers.dev/webhooks/inventory-update
```

### 2. Configure in Shopify Admin

1. Go to **Settings → Notifications → Webhooks**
2. Click **Create webhook**
3. Configure:
   - **Event**: `Inventory levels update`
   - **Format**: `JSON`
   - **URL**: (use the webhook URL from step 1)
   - **API version**: `2025-10` (or latest stable)

4. Click **Save**

### 3. Verify Webhook Secret (CRITICAL)

The webhook handler verifies signatures using `SHOPIFY_WEBHOOK_SECRET`.

**Check your wrangler.toml:**

```toml
[env.dev.vars]
SHOPIFY_WEBHOOK_SECRET = "your-secret-here"
```

**To get/set the secret in Shopify:**

1. After creating the webhook, Shopify generates a signing secret
2. Copy the secret from Shopify admin
3. Update your wrangler.toml or use:
   ```bash
   wrangler secret put SHOPIFY_WEBHOOK_SECRET --env dev
   wrangler secret put SHOPIFY_WEBHOOK_SECRET --env prod
   ```

### 4. Test the Webhook

**Option A: Use Shopify's "Send test notification"**

1. In Shopify webhooks list, find your webhook
2. Click the three dots → "Send test notification"
3. Check Cloudflare logs: `wrangler tail --env dev`

**Option B: Actually change inventory in Shopify**

1. Go to a product in Shopify admin
2. Change the inventory quantity
3. Check Cloudflare logs to see webhook received

### 5. Verify It's Working

Check the logs after a stock change:

```bash
wrangler tail --env dev
```

Expected log output:

```
📥 Inventory update webhook received: {
  inventory_item_id: '54075829813629',
  location_id: '61447897206',
  available: 150
}
📊 Stock update for 4c080e4c3c8a4df3b4307: 99 → 150
✅ Updated stock for product 4c080e4c3c8a4df3b4307
```

## How It Works

### 1. **Webhook Verification**

- Shopify sends HMAC-SHA256 signature in header
- Service verifies using `SHOPIFY_WEBHOOK_SECRET`
- Rejects requests with invalid signatures

### 2. **Idempotency Check**

- Each webhook has unique `x-shopify-webhook-id`
- Service tracks processed webhooks in `webhook_events` table
- Duplicate webhooks are automatically ignored

### 3. **Product Lookup**

- Webhook provides `inventory_item_id`
- Service queries `product_inventory` table for matching product
- Only updates if product has `sync_enabled = 1`

### 4. **Stock Update**

- Updates `product_inventory.stock` to new value from Shopify
- Sets `last_synced_at` timestamp
- Clears any previous `sync_error`

## Webhook Payload Structure

Shopify sends:

```json
{
  "inventory_item_id": 54075829813629,
  "location_id": 61447897206,
  "available": 150,
  "updated_at": "2026-01-29T18:45:00Z"
}
```

## Troubleshooting

### Webhook returns 401 (Unauthorized)

- **Cause**: Invalid webhook signature
- **Fix**: Verify `SHOPIFY_WEBHOOK_SECRET` matches Shopify's signing secret

### Webhook returns 400 (Bad Request)

- **Cause**: Missing required headers or payload fields
- **Fix**: Ensure webhook is configured with `JSON` format and `inventory_levels/update` event

### Stock not updating

- **Cause**: Product not linked to Shopify or sync disabled
- **Check**:
  ```sql
  SELECT * FROM product_inventory WHERE shopify_inventory_item_id = 'YOUR_INVENTORY_ITEM_ID';
  ```
- **Verify**: `sync_enabled = 1` and Shopify IDs are set

### "Already processed" message

- **Cause**: Shopify sent duplicate webhook (normal retry behavior)
- **Result**: No action needed - duplicate prevention working correctly

## Database Schema

### product_inventory table

```sql
CREATE TABLE product_inventory (
  product_id TEXT PRIMARY KEY,
  stock INTEGER NOT NULL DEFAULT 0,           -- Updated by webhook
  shopify_product_id TEXT,                    -- Link to Shopify product
  shopify_variant_id TEXT,                    -- Link to Shopify variant
  shopify_inventory_item_id TEXT,             -- CRITICAL: Used to match webhook
  shopify_location_id TEXT,                   -- The location being tracked
  sync_enabled INTEGER DEFAULT 0,             -- Must be 1 for webhook to update
  last_synced_at TEXT,                        -- Timestamp of last webhook
  sync_error TEXT                             -- Error message if sync fails
);
```

### webhook_events table (idempotency)

```sql
CREATE TABLE webhook_events (
  webhook_id TEXT PRIMARY KEY,               -- x-shopify-webhook-id header
  topic TEXT NOT NULL,                       -- inventory_levels/update
  payload TEXT,                              -- Full webhook JSON
  processed INTEGER DEFAULT 0,               -- 1 = processed, 0 = failed
  error_message TEXT,                        -- Error if processing failed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## Security Notes

1. **Always verify webhook signatures** - Already implemented in `verifyShopifyWebhook()`
2. **Use HTTPS only** - Cloudflare Workers enforce this
3. **Keep webhook secret private** - Use `wrangler secret put` (not wrangler.toml)
4. **Rate limiting** - Shopify automatically retries failed webhooks with backoff

## Next Steps

- [ ] Set up webhook in Shopify admin (dev environment)
- [ ] Test with actual inventory change
- [ ] Set up webhook in Shopify admin (production environment)
- [ ] Monitor webhook logs for first few days
- [ ] Document any Shopify-specific quirks discovered

## Support

- **Webhook Handler**: `/workers/shopify-sync-service/src/index.ts` (line 293)
- **Sync Service**: `/workers/shopify-sync-service/src/services/sync.service.ts`
- **Database Utils**: `/workers/shopify-sync-service/src/utils/database.ts`
- **Webhook Verification**: `/workers/shopify-sync-service/src/utils/webhooks.ts`
