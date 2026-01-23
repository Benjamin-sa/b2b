import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type {
  cart_items,
  carts,
  categories,
  email_verification_tokens,
  inventory_sync_log,
  order_item_tax_amounts,
  order_items,
  orders,
  password_reset_tokens,
  product_dimensions,
  product_images,
  product_inventory,
  product_specifications,
  product_tags,
  products,
  sessions,
  stock_history,
  users,
  webhook_events,
} from './schema';

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;

export type Product = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;

export type ProductImage = InferSelectModel<typeof product_images>;
export type NewProductImage = InferInsertModel<typeof product_images>;

export type ProductSpecification = InferSelectModel<typeof product_specifications>;
export type NewProductSpecification = InferInsertModel<typeof product_specifications>;

export type ProductTag = InferSelectModel<typeof product_tags>;
export type NewProductTag = InferInsertModel<typeof product_tags>;

export type ProductDimension = InferSelectModel<typeof product_dimensions>;
export type NewProductDimension = InferInsertModel<typeof product_dimensions>;

export type Order = InferSelectModel<typeof orders>;
export type NewOrder = InferInsertModel<typeof orders>;

export type OrderItem = InferSelectModel<typeof order_items>;
export type NewOrderItem = InferInsertModel<typeof order_items>;

export type OrderItemTaxAmount = InferSelectModel<typeof order_item_tax_amounts>;
export type NewOrderItemTaxAmount = InferInsertModel<typeof order_item_tax_amounts>;

export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;

export type WebhookEvent = InferSelectModel<typeof webhook_events>;
export type NewWebhookEvent = InferInsertModel<typeof webhook_events>;

export type StockHistory = InferSelectModel<typeof stock_history>;
export type NewStockHistory = InferInsertModel<typeof stock_history>;

export type PasswordResetToken = InferSelectModel<typeof password_reset_tokens>;
export type NewPasswordResetToken = InferInsertModel<typeof password_reset_tokens>;

export type EmailVerificationToken = InferSelectModel<typeof email_verification_tokens>;
export type NewEmailVerificationToken = InferInsertModel<typeof email_verification_tokens>;

export type Cart = InferSelectModel<typeof carts>;
export type NewCart = InferInsertModel<typeof carts>;

export type CartItem = InferSelectModel<typeof cart_items>;
export type NewCartItem = InferInsertModel<typeof cart_items>;

export type ProductInventory = InferSelectModel<typeof product_inventory>;
export type NewProductInventory = InferInsertModel<typeof product_inventory>;

export type InventorySyncLog = InferSelectModel<typeof inventory_sync_log>;
export type NewInventorySyncLog = InferInsertModel<typeof inventory_sync_log>;
