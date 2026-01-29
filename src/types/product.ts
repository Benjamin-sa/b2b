/**
 * Product Types - Re-exports from @b2b/types
 *
 * DEPRECATED: Import directly from '@b2b/types' or '@b2b/types/product' instead.
 */

// Re-export all product types from @b2b/types
export type {
  Product,
  ProductWithRelations,
  ProductImage,
  ProductSpecification,
  ProductSpecificationDisplay,
  ProductDimension,
  ProductTag,
  ProductFilter,
  ProductListResponse,
  CreateProductInput,
  UpdateProductInput,
} from '@b2b/types';

// Re-export inventory types used with products
export type { ProductInventory, UpdateStockRequest as StockUpdate } from '@b2b/types';

// Legacy type alias - use ProductInventory.stock directly
export type StockMode = 'unified';

// Legacy type alias - use ProductWithRelations instead
export type { ProductWithRelations as ProductWithInventory } from '@b2b/types';

// Re-export pagination result (legacy name)
export type { PaginatedResponse as PaginationResult } from '@b2b/types';
