import { sql } from 'drizzle-orm';
import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  password_hash: text('password_hash').notNull(),
  role: text('role').notNull(),
  // Required business fields (enforced at registration)
  company_name: text('company_name').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  btw_number: text('btw_number').notNull(),
  // Optional contact
  phone: text('phone'),
  // VIES verification (populated after validation)
  btw_number_validated: integer('btw_number_validated').default(0),
  btw_verified_name: text('btw_verified_name'),
  btw_verified_address: text('btw_verified_address'),
  btw_verified_at: text('btw_verified_at'),
  // Required address fields (enforced at registration)
  address_street: text('address_street').notNull(),
  address_house_number: text('address_house_number').notNull(),
  address_postal_code: text('address_postal_code').notNull(),
  address_city: text('address_city').notNull(),
  address_country: text('address_country').notNull(),
  // Stripe integration (set after customer creation)
  stripe_customer_id: text('stripe_customer_id'),
  // Account status
  is_active: integer('is_active').default(1),
  is_verified: integer('is_verified').default(0),
  // Timestamps
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').notNull(),
  parent_id: text('parent_id'),
  image_url: text('image_url'),
  sort_order: integer('sort_order').default(0),
  is_active: integer('is_active').default(1),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price: real('price').notNull(),
  original_price: real('original_price'),
  image_url: text('image_url'),
  category_id: text('category_id'),
  // ❌ DEPRECATED: Use product_inventory.stock instead (D1 doesn't support DROP COLUMN)
  in_stock: integer('in_stock').default(1),
  coming_soon: integer('coming_soon').default(0),
  // ❌ DEPRECATED: Use product_inventory.stock instead (D1 doesn't support DROP COLUMN)
  stock: integer('stock').default(0),
  brand: text('brand'),
  part_number: text('part_number'),
  b2b_sku: text('b2b_sku'),
  barcode: text('barcode'),
  unit: text('unit'),
  min_order_quantity: integer('min_order_quantity').default(1),
  max_order_quantity: integer('max_order_quantity'),
  weight: real('weight'),
  // ❌ DEPRECATED: Use product_inventory.shopify_product_id instead (D1 doesn't support DROP COLUMN)
  shopify_product_id: text('shopify_product_id'),
  // ❌ DEPRECATED: Use product_inventory.shopify_variant_id instead (D1 doesn't support DROP COLUMN)
  shopify_variant_id: text('shopify_variant_id'),
  stripe_product_id: text('stripe_product_id'),
  stripe_price_id: text('stripe_price_id'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

export const product_images = sqliteTable('product_images', {
  id: text('id').primaryKey(),
  product_id: text('product_id').notNull(),
  image_url: text('image_url').notNull(),
  sort_order: integer('sort_order').default(0),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

export const product_specifications = sqliteTable('product_specifications', {
  id: text('id').primaryKey(),
  product_id: text('product_id').notNull(),
  spec_key: text('spec_key').notNull(),
  spec_value: text('spec_value').notNull(),
  sort_order: integer('sort_order').default(0),
});

export const product_tags = sqliteTable(
  'product_tags',
  {
    product_id: text('product_id').notNull(),
    tag: text('tag').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.product_id, table.tag] }),
  })
);

export const product_dimensions = sqliteTable('product_dimensions', {
  product_id: text('product_id').primaryKey(),
  length: real('length').notNull(),
  width: real('width').notNull(),
  height: real('height').notNull(),
  unit: text('unit').default('cm'),
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  total_amount: real('total_amount').notNull(),
  subtotal: real('subtotal').notNull(),
  tax: real('tax').notNull(),
  shipping: real('shipping').notNull(),
  status: text('status').notNull(),
  order_date: text('order_date').default(sql`(datetime('now'))`),
  estimated_delivery: text('estimated_delivery'),
  shipping_address_street: text('shipping_address_street').notNull(),
  shipping_address_city: text('shipping_address_city').notNull(),
  shipping_address_state: text('shipping_address_state'),
  shipping_address_zip_code: text('shipping_address_zip_code').notNull(),
  shipping_address_country: text('shipping_address_country').notNull(),
  shipping_address_company: text('shipping_address_company'),
  shipping_address_contact: text('shipping_address_contact'),
  shipping_address_phone: text('shipping_address_phone'),
  billing_address_street: text('billing_address_street'),
  billing_address_city: text('billing_address_city'),
  billing_address_state: text('billing_address_state'),
  billing_address_zip_code: text('billing_address_zip_code'),
  billing_address_country: text('billing_address_country'),
  billing_address_company: text('billing_address_company'),
  billing_address_contact: text('billing_address_contact'),
  billing_address_phone: text('billing_address_phone'),
  payment_method: text('payment_method'),
  notes: text('notes'),
  tracking_number: text('tracking_number'),
  invoice_url: text('invoice_url'),
  invoice_pdf: text('invoice_pdf'),
  invoice_number: text('invoice_number'),
  stripe_invoice_id: text('stripe_invoice_id'),
  stripe_status: text('stripe_status'),
  shipping_cost_cents: integer('shipping_cost_cents'),
  due_date: text('due_date'),
  paid_at: text('paid_at'),
  stripe_shipping_invoice_item_id: text('stripe_shipping_invoice_item_id'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

export const order_items = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  order_id: text('order_id').notNull(),
  product_id: text('product_id'),
  product_name: text('product_name').notNull(),
  product_sku: text('product_sku'),
  b2b_sku: text('b2b_sku'),
  quantity: integer('quantity').notNull(),
  unit_price: real('unit_price').notNull(),
  total_price: real('total_price').notNull(),
  image_url: text('image_url'),
  stripe_invoice_item_id: text('stripe_invoice_item_id'),
  tax_cents: integer('tax_cents'),
  shopify_variant_id: text('shopify_variant_id'),
  brand: text('brand'),
  unit: text('unit'),
  weight: real('weight'),
  stripe_price_id: text('stripe_price_id'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

export const order_item_tax_amounts = sqliteTable('order_item_tax_amounts', {
  id: text('id').primaryKey(),
  order_item_id: text('order_item_id').notNull(),
  tax_rate_id: text('tax_rate_id'),
  amount_cents: integer('amount_cents').notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  token: text('token').notNull(),
  expires_at: text('expires_at').notNull(),
  user_agent: text('user_agent'),
  ip_address: text('ip_address'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  last_activity: text('last_activity').default(sql`(datetime('now'))`),
});

export const webhook_events = sqliteTable('webhook_events', {
  id: text('id').primaryKey(),
  event_type: text('event_type').notNull(),
  event_id: text('event_id').notNull(),
  payload: text('payload').notNull(),
  processed: integer('processed').default(0),
  success: integer('success'),
  error_message: text('error_message'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  processed_at: text('processed_at'),
});

export const password_reset_tokens = sqliteTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  token: text('token').notNull(),
  expires_at: text('expires_at').notNull(),
  used: integer('used').default(0),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  used_at: text('used_at'),
});

export const email_verification_tokens = sqliteTable('email_verification_tokens', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  token: text('token').notNull(),
  expires_at: text('expires_at').notNull(),
  used: integer('used').default(0),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  used_at: text('used_at'),
});

export const product_inventory = sqliteTable('product_inventory', {
  product_id: text('product_id').primaryKey(),
  // Single source of truth: stock available across ALL channels (Shopify is master)
  stock: integer('stock').notNull().default(0),
  // Shopify sync fields
  shopify_product_id: text('shopify_product_id'),
  shopify_variant_id: text('shopify_variant_id'),
  shopify_inventory_item_id: text('shopify_inventory_item_id'),
  shopify_location_id: text('shopify_location_id'),
  sync_enabled: integer('sync_enabled').default(0),
  last_synced_at: text('last_synced_at'),
  sync_error: text('sync_error'),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});
