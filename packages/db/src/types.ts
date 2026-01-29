/**
 * @b2b/db Types
 *
 * Re-exports types from @b2b/types for backward compatibility.
 * Also provides Drizzle-inferred types for internal database operations.
 *
 * For new code, import directly from '@b2b/types' instead.
 */

// Re-export all types from the unified types package
export type {
  // User types
  User,
  UserProfile,
  UserWithPassword,
  UserRole,
  CreateUserInput as NewUser,
  UpdateUserInput,
  Session,
  CreateSessionInput as NewSession,
  PasswordResetToken,
  CreatePasswordResetTokenInput as NewPasswordResetToken,
  EmailVerificationToken,
  CreateEmailVerificationTokenInput as NewEmailVerificationToken,

  // Product types
  Product,
  ProductWithRelations,
  CreateProductInput as NewProduct,
  UpdateProductInput,
  ProductImage,
  CreateProductImageInput as NewProductImage,
  ProductSpecification,
  CreateProductSpecificationInput as NewProductSpecification,
  ProductTag,
  ProductDimension,
  SetProductDimensionsInput as NewProductDimension,

  // Category types
  Category,
  CategoryWithChildren,
  CreateCategoryInput as NewCategory,
  UpdateCategoryInput,

  // Order types
  Order,
  OrderWithItems,
  OrderItem,
  CreateOrderInput as NewOrder,
  CreateOrderItemInput as NewOrderItem,
  OrderItemTaxAmount,
  CreateOrderItemTaxAmountInput as NewOrderItemTaxAmount,
  ShippingAddress,
  OrderStatus,

  // Cart types
  Cart,
  CreateCartInput as NewCart,
  CartItemRecord as CartItem,
  CreateCartItemInput as NewCartItem,

  // Inventory types
  ProductInventory,
  UpsertInventoryInput as NewProductInventory,
  InventorySyncLog,
  StockHistory,
  CreateStockHistoryInput as NewStockHistory,

  // API types
  WebhookEvent,
  CreateWebhookEventInput as NewWebhookEvent,
} from '@b2b/types';
