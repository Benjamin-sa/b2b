/**
 * Inventory Service Types
 * 
 * Product management and inventory tracking
 */

// Service binding type for auth-service
export interface AuthService extends Fetcher {
  fetch: (request: Request) => Promise<Response>;
}

// Service binding type for stripe-service
export interface StripeService extends Fetcher {
  fetch: (request: Request) => Promise<Response>;
}

export interface Env {
  DB: D1Database;
  ENVIRONMENT: 'development' | 'production';
  
  // Service binding for auth validation (no HTTP overhead!)
  AUTH_SERVICE: AuthService;
  
  // Service binding for Stripe operations
  STRIPE_SERVICE: StripeService;
  
  // Service binding for Shopify sync operations
  SHOPIFY_SYNC_SERVICE: Fetcher;
  
  // Service-to-service authentication secret
  SERVICE_SECRET: string;
  
  ALLOWED_ORIGINS: string;
  DEFAULT_PAGE_SIZE: string;
  MAX_PAGE_SIZE: string;
}

// ============================================================================
// STOCK MODE TYPE
// ============================================================================

// Stock mode: 'split' = separate B2B/B2C allocations, 'unified' = shared stock pool
export type StockMode = 'split' | 'unified';

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface ProductInventory {
  product_id: string;
  total_stock: number;
  b2b_stock: number;
  b2c_stock: number;
  reserved_stock: number;
  shopify_product_id: string | null;
  shopify_variant_id: string | null;
  shopify_inventory_item_id: string | null;
  shopify_location_id: string | null;
  sync_enabled: number; // SQLite boolean (0 or 1)
  last_synced_at: string | null;
  sync_error: string | null;
  // Stock mode: 'split' (default) = separate B2B/B2C allocations, 'unified' = shared stock pool
  stock_mode: StockMode;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  category_id: string | null;
  in_stock: number; // DEPRECATED - use inventory.b2b_stock > 0 instead
  coming_soon: number; // SQLite boolean (0 or 1)
  stock: number; // DEPRECATED - use inventory.total_stock instead
  brand: string | null;
  part_number: string | null;
  b2b_sku: string | null; // Auto-generated B2B SKU (format: TP-00001)
  barcode: string | null; // Auto-generated EAN-13 barcode (13 digits)
  b2b_sku: string | null; // Custom B2B SKU (format: TP-00001)
  unit: string | null;
  min_order_quantity: number;
  max_order_quantity: number | null;
  weight: number | null;
  shopify_product_id: string | null; // DEPRECATED - use inventory.shopify_product_id instead
  shopify_variant_id: string | null; // DEPRECATED - use inventory.shopify_variant_id instead
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductWithRelations extends Product {
  images?: ProductImage[];
  specifications?: ProductSpecification[];
  tags?: string[];
  dimensions?: ProductDimension | null;
  // ✅ CRITICAL: Single source of truth for stock/inventory
  inventory?: ProductInventory;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface ProductSpecification {
  id: string;
  product_id: string;
  spec_key: string;
  spec_value: string;
  sort_order: number;
}

export interface ProductTag {
  product_id: string;
  tag: string;
}

export interface ProductDimension {
  product_id: string;
  length: number;
  width: number;
  height: number;
  unit: string;
}

// ============================================================================
// CATEGORY TYPES
// ============================================================================

export interface Category {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  parent_id: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: number; // SQLite boolean (0 or 1)
  created_at: string;
  updated_at: string;
}

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  slug: string;
  parentId?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {}

export interface CategoryFilters {
  parentId?: string | null;
  isActive?: boolean;
  searchTerm?: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateProductRequest {
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  image_url?: string;
  category_id?: string;
  in_stock?: boolean;
  coming_soon?: boolean;
  stock?: number;
  brand?: string;
  part_number?: string;
  b2b_sku?: string; // Custom B2B SKU (format: TP-00001)
  unit?: string;
  min_order_quantity?: number;
  max_order_quantity?: number;
  weight?: number;
  shopify_product_id?: string;
  shopify_variant_id?: string;
  shopify_inventory_item_id?: string; // ✅ REQUIRED for Shopify inventory sync
  stripe_product_id?: string;
  stripe_price_id?: string;
  // ✅ Stock allocation fields (sent from ProductForm)
  total_stock?: number;  // Total inventory available
  b2b_stock?: number;    // Stock allocated to B2B platform
  b2c_stock?: number;    // Stock allocated to B2C (Shopify)
  // ✅ Stock mode: 'split' (default) or 'unified' (shared stock pool)
  stock_mode?: StockMode;
  images?: string[];
  specifications?: { key: string; value: string }[];
  tags?: string[];
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit?: string;
  };
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductFilters {
  categoryId?: string;
  brand?: string;
  inStock?: boolean;
  comingSoon?: boolean;
  minPrice?: number;
  maxPrice?: number;
  searchTerm?: string;
  tags?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// ============================================================================
// AUTH TYPES (for validation with auth-service)
// ============================================================================

export interface AuthValidationResponse {
  valid: boolean;
  user: {
    uid: string;
    email: string;
    role: 'admin' | 'customer';
    companyName?: string;
    firstName?: string;
    lastName?: string;
    isVerified: boolean;
    isActive: boolean;
  };
  permissions: string[];
  sessionId: string;
  validatedAt: string;
}

export interface UserContext {
  uid: string;
  email: string;
  role: 'admin' | 'customer';
  permissions: string[];
  isVerified: boolean;
  isActive: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ApiError {
  error: string;
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

export class InventoryError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'InventoryError';
  }

  toJSON(): ApiError {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}
