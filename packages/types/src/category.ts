/**
 * @b2b/types - Category Types
 *
 * Single source of truth for category-related types.
 * ALL fields use snake_case to match D1 database schema.
 */

import type { ISODateString, SQLiteBoolean, PaginationParams } from './common';

// ============================================================================
// CATEGORY TYPES (matches D1 `categories` table)
// ============================================================================

/**
 * Category record from D1 database
 * Note: Fields with defaults can be null when returned from D1
 */
export interface Category {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  parent_id: string | null;
  image_url: string | null;
  sort_order: number | null;
  is_active: SQLiteBoolean;
  created_at: ISODateString | null;
  updated_at: ISODateString | null;
}

/**
 * Category with computed product count
 */
export interface CategoryWithCount extends Category {
  product_count: number;
}

/**
 * Category with children (tree structure)
 */
export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
}

/**
 * Input for creating a new category
 */
export interface CreateCategoryInput {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parent_id?: string | null;
  image_url?: string | null;
  sort_order?: number;
  is_active?: SQLiteBoolean;
}

/**
 * Input for updating a category
 */
export interface UpdateCategoryInput {
  name?: string;
  description?: string | null;
  slug?: string;
  parent_id?: string | null;
  image_url?: string | null;
  sort_order?: number;
  is_active?: SQLiteBoolean;
}

// ============================================================================
// CATEGORY FILTER & QUERY TYPES
// ============================================================================

/**
 * Category filter parameters
 */
export interface CategoryFilter extends PaginationParams {
  parent_id?: string | null; // null for root categories
  is_active?: boolean;
  search?: string;
}

/**
 * Category list API response
 */
export interface CategoryListResponse {
  categories: Category[];
  total: number;
}

/**
 * Category tree API response
 */
export interface CategoryTreeResponse {
  categories: CategoryWithChildren[];
}
