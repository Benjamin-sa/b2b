# D1 Database Configuration

This file tracks the Cloudflare D1 database IDs for the B2B platform migration.

## Development Database
- **Database Name**: b2b-dev
- **Database ID**: `0420eb79-c871-4fdb-bbf3-6deb62d5c0c3`
- **Region**: WEUR (West Europe)
- **Status**: ✅ Schema applied
- **Binding Name**: `DB` or `b2b_dev`

## Production Database
- **Database Name**: b2b-prod
- **Database ID**: `7cc12490-bd4c-42dc-a3eb-1dc290a864a0`
- **Region**: WEUR (West Europe)
- **Status**: ⚠️ Schema not yet applied (will be done during Phase 7 rollout)
- **Binding Name**: `DB` or `b2b_prod`

## Database Statistics (Development)
- **Total Tables**: 19
- **Total Indexes**: 50+
- **Schema Version**: 001
- **Initial Size**: 0.43 MB

## Tables Created

### Core Tables
- ✅ users
- ✅ categories
- ✅ products
- ✅ orders
- ✅ order_items
- ✅ invoices

### Supporting Tables
- ✅ product_images
- ✅ product_specifications
- ✅ product_tags
- ✅ product_dimensions
- ✅ order_item_tax_amounts

### Authentication & Security
- ✅ sessions
- ✅ password_reset_tokens
- ✅ email_verification_tokens

### Audit & Logging
- ✅ stock_history
- ✅ webhook_events

### Shopping Cart (Optional)
- ✅ carts
- ✅ cart_items

## Usage in wrangler.toml

Add this to your worker's `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "b2b-dev"
database_id = "0420eb79-c871-4fdb-bbf3-6deb62d5c0c3"

[env.production.d1_databases]
binding = "DB"
database_name = "b2b-prod"
database_id = "7cc12490-bd4c-42dc-a3eb-1dc290a864a0"
```

## Commands

### Query Development Database
```bash
# Remote
wrangler d1 execute b2b-dev --command="SELECT COUNT(*) FROM users" --remote

# Local (requires local dev setup)
wrangler d1 execute b2b-dev --command="SELECT COUNT(*) FROM users" --local
```

### Apply Schema Updates
```bash
wrangler d1 execute b2b-dev --file=./migrations/002_update.sql --remote
```

### Backup Database
```bash
# Export to SQL
wrangler d1 export b2b-dev --output=backup.sql --remote
```

## Next Steps

1. ✅ Databases created
2. ✅ Schema applied to dev database
3. ⏳ Create auth-service worker
4. ⏳ Create API gateway worker
5. ⏳ Migrate Firebase data to D1
6. ⏳ Apply schema to prod database (during rollout)

## Notes

- D1 doesn't support triggers yet, so `updated_at` fields must be updated in application code
- Database is in West Europe region for optimal performance
- Free tier includes: 5 GB storage, 5M rows read/day, 100K rows written/day
- Consider implementing soft deletes for important data
