/**
 * Order Types - Re-exports from @b2b/types
 *
 * DEPRECATED: Import directly from '@b2b/types' or '@b2b/types/order' instead.
 */

// Re-export all order types from @b2b/types
export type {
  Order,
  OrderWithItems,
  OrderItem,
  OrderStatus,
  OrderFilter,
  ShippingAddress,
  CreateOrderInput,
  UpdateOrderInput,
  CreateOrderItemInput,
  InvoiceItem,
  CreateInvoiceRequest,
  CreateInvoiceResponse,
} from '@b2b/types';

// Re-export cart types (often used alongside orders)
export type { CartItem, CartSummary, CartMutationResult } from '@b2b/types';
