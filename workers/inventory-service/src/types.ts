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
  
  ALLOWED_ORIGINS: string;
  DEFAULT_PAGE_SIZE: string;
  MAX_PAGE_SIZE: string;
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  category_id: string | null;
  in_stock: number; // SQLite boolean (0 or 1)
  coming_soon: number; // SQLite boolean (0 or 1)
  stock: number;
  brand: string | null;
  part_number: string | null;
  unit: string | null;
  min_order_quantity: number;
  max_order_quantity: number | null;
  weight: number | null;
  shopify_product_id: string | null;
  shopify_variant_id: string | null;
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
  originalPrice?: number;
  imageUrl?: string;
  categoryId?: string;
  inStock?: boolean;
  comingSoon?: boolean;
  stock?: number;
  brand?: string;
  partNumber?: string;
  unit?: string;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  weight?: number;
  shopifyProductId?: string;
  shopifyVariantId?: string;
  shopifyInventoryItemId?: string; // ✅ REQUIRED for Shopify inventory sync
  stripeProductId?: string;
  stripePriceId?: string;
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
