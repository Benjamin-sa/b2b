/**
 * @b2b/types - Cart Types
 *
 * Single source of truth for cart and checkout types.
 * ALL fields use snake_case to match D1 database schema.
 */

import type { ISODateString } from './common';
import type { ProductWithRelations } from './product';

// ============================================================================
// CART TYPES (matches D1 `carts` table)
// ============================================================================

/**
 * Cart record from D1 database
 * Note: Timestamps can be null when returned from D1 due to defaults
 */
export interface Cart {
  id: string;
  user_id: string;
  created_at: ISODateString | null;
  updated_at: ISODateString | null;
}

/**
 * Input for creating a cart
 */
export interface CreateCartInput {
  id: string;
  user_id: string;
}

// ============================================================================
// CART ITEM TYPES (matches D1 `cart_items` table)
// ============================================================================

/**
 * Cart item record from D1 database
 * Note: added_at can be null when returned from D1 due to defaults
 */
export interface CartItemRecord {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  price: number;
  added_at: ISODateString | null;
}

/**
 * Input for creating a cart item
 */
export interface CreateCartItemInput {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  price: number;
}

/**
 * Input for updating a cart item
 */
export interface UpdateCartItemInput {
  quantity?: number;
  price?: number;
}

// ============================================================================
// FRONTEND CART TYPES
// ============================================================================

/**
 * Cart item with full product data (for frontend display)
 */
export interface CartItem {
  product_id: string;
  product: ProductWithRelations;
  quantity: number;
  price: number;
  added_at?: Date | string;
}

/**
 * Cart summary for display
 */
export interface CartSummary {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  item_count: number;
}

// ============================================================================
// CART MUTATION TYPES
// ============================================================================

/**
 * Cart mutation status
 */
export type CartMutationStatus =
  | 'added'
  | 'partial'
  | 'unavailable'
  | 'adjusted'
  | 'updated'
  | 'removed';

/**
 * Cart mutation result
 */
export interface CartMutationResult {
  status: CartMutationStatus;
  requested_quantity: number;
  applied_quantity: number;
  total_quantity: number;
  remaining_quantity: number;
  limit: number;
}

// ============================================================================
// CART VALIDATION TYPES
// ============================================================================

/**
 * Cart item validation result
 */
export interface CartItemValidation {
  product_id: string;
  is_valid: boolean;
  requested_quantity: number;
  available_quantity: number;
  adjusted_quantity?: number;
  error?: string;
}

/**
 * Full cart validation result
 */
export interface CartValidation {
  is_valid: boolean;
  items: CartItemValidation[];
  has_adjustments: boolean;
}
