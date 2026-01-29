/**
 * @b2b/types - Order Types
 *
 * Single source of truth for order, invoice, and checkout types.
 * ALL fields use snake_case to match D1 database schema.
 */

import type { ISODateString } from './common';

// ============================================================================
// ORDER STATUS
// ============================================================================

/**
 * Order status values (for type checking in application code)
 * Note: Database returns generic string, use isValidOrderStatus() to validate
 */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

/**
 * All valid order status values
 */
export const ORDER_STATUS_VALUES: readonly OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;

/**
 * Type guard to check if a string is a valid OrderStatus
 */
export function isValidOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUS_VALUES.includes(value as OrderStatus);
}

/**
 * Stripe invoice status values
 */
export type StripeInvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

// ============================================================================
// ORDER TYPES (matches D1 `orders` table)
// ============================================================================

/**
 * Order record from D1 database
 * Note: status is typed as string since Drizzle returns string from TEXT columns
 */
export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  subtotal: number;
  tax: number;
  shipping: number;
  /** Use isValidOrderStatus() to validate if needed */
  status: string;
  order_date: ISODateString | null;
  estimated_delivery: ISODateString | null;

  // Shipping address (flat fields)
  shipping_address_street: string;
  shipping_address_city: string;
  shipping_address_state: string | null;
  shipping_address_zip_code: string;
  shipping_address_country: string;
  shipping_address_company: string | null;
  shipping_address_contact: string | null;
  shipping_address_phone: string | null;

  // Billing address (flat fields, optional)
  billing_address_street: string | null;
  billing_address_city: string | null;
  billing_address_state: string | null;
  billing_address_zip_code: string | null;
  billing_address_country: string | null;
  billing_address_company: string | null;
  billing_address_contact: string | null;
  billing_address_phone: string | null;

  // Order details
  payment_method: string | null;
  notes: string | null;
  tracking_number: string | null;

  // Invoice details
  invoice_url: string | null;
  invoice_pdf: string | null;
  invoice_number: string | null;

  // Stripe integration
  stripe_invoice_id: string | null;
  stripe_status: string | null;
  shipping_cost_cents: number | null;
  stripe_shipping_invoice_item_id: string | null;

  // Payment tracking
  due_date: ISODateString | null;
  paid_at: ISODateString | null;

  // Timestamps (can be null due to D1 defaults)
  created_at: ISODateString | null;
  updated_at: ISODateString | null;
}

/**
 * Order with items included
 */
export interface OrderWithItems extends Order {
  items: OrderItem[];
}

/**
 * Order with formatted address objects (for API responses)
 */
export interface OrderWithFormattedAddresses extends Omit<
  Order,
  `shipping_address_${string}` | `billing_address_${string}`
> {
  items: OrderItem[];
  shipping_address: ShippingAddress;
  billing_address: ShippingAddress | null;
}

// ============================================================================
// ORDER ITEM TYPES (matches D1 `order_items` table)
// ============================================================================

/**
 * Order item record from D1 database
 *
 * Contains historical product data at time of purchase
 */
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null; // Can be null if product deleted
  product_name: string;
  product_sku: string | null;
  b2b_sku: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url: string | null;
  stripe_invoice_item_id: string | null;
  tax_cents: number | null;
  shopify_variant_id: string | null;
  brand: string | null;
  unit: string | null;
  weight: number | null;
  stripe_price_id: string | null;
  created_at: ISODateString | null;
}

/**
 * Input for creating an order item
 */
export interface CreateOrderItemInput {
  id: string;
  order_id: string;
  product_id?: string | null;
  product_name: string;
  product_sku?: string | null;
  b2b_sku?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url?: string | null;
  stripe_invoice_item_id?: string | null;
  tax_cents?: number | null;
  shopify_variant_id?: string | null;
  brand?: string | null;
  unit?: string | null;
  weight?: number | null;
  stripe_price_id?: string | null;
  created_at?: ISODateString | null;
}

// ============================================================================
// ORDER ITEM TAX AMOUNTS (matches D1 `order_item_tax_amounts` table)
// ============================================================================

/**
 * Order item tax amount record
 */
export interface OrderItemTaxAmount {
  id: string;
  order_item_id: string;
  tax_rate_id: string | null;
  amount_cents: number;
}

/**
 * Input for creating order item tax amount
 */
export interface CreateOrderItemTaxAmountInput {
  id: string;
  order_item_id: string;
  tax_rate_id?: string | null;
  amount_cents: number;
}

// ============================================================================
// ADDRESS TYPES
// ============================================================================

/**
 * Shipping/Billing address (object format for API)
 */
export interface ShippingAddress {
  street: string;
  city: string;
  state?: string;
  zip_code: string;
  country: string;
  company?: string;
  contact_person?: string;
  phone?: string;
}

// ============================================================================
// ORDER INPUT TYPES
// ============================================================================

/**
 * Input for creating a new order
 */
export interface CreateOrderInput {
  id: string;
  user_id: string;
  total_amount: number;
  subtotal: number;
  tax: number;
  shipping: number;
  status: OrderStatus;
  shipping_address_street: string;
  shipping_address_city: string;
  shipping_address_state?: string | null;
  shipping_address_zip_code: string;
  shipping_address_country: string;
  shipping_address_company?: string | null;
  shipping_address_contact?: string | null;
  shipping_address_phone?: string | null;
  billing_address_street?: string | null;
  billing_address_city?: string | null;
  billing_address_state?: string | null;
  billing_address_zip_code?: string | null;
  billing_address_country?: string | null;
  billing_address_company?: string | null;
  billing_address_contact?: string | null;
  billing_address_phone?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  order_date?: string | null;
  invoice_url?: string | null;
  invoice_pdf?: string | null;
  invoice_number?: string | null;
  stripe_invoice_id?: string | null;
  stripe_status?: StripeInvoiceStatus | null;
  shipping_cost_cents?: number | null;
  due_date?: string | null;
}

/**
 * Input for updating an order
 */
export interface UpdateOrderInput {
  status?: OrderStatus;
  tracking_number?: string;
  estimated_delivery?: string;
  invoice_url?: string;
  invoice_pdf?: string;
  invoice_number?: string;
  stripe_status?: StripeInvoiceStatus;
  paid_at?: string;
  notes?: string;
}

// ============================================================================
// ORDER FILTER & QUERY TYPES
// ============================================================================

/**
 * Order filter parameters
 */
export interface OrderFilter {
  user_id?: string;
  status?: OrderStatus | OrderStatus[];
  search?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

/**
 * Order list API response
 */
export interface OrderListResponse {
  orders: OrderWithItems[];
  total: number;
}

// ============================================================================
// INVOICE CREATION TYPES (API request/response)
// ============================================================================

/**
 * Invoice item for creation request
 */
export interface InvoiceItem {
  stripe_price_id: string;
  quantity: number;
  metadata: {
    product_id: string;
    product_name?: string;
    shopify_variant_id?: string;
  };
}

/**
 * Create invoice request body
 */
export interface CreateInvoiceRequest {
  items: InvoiceItem[];
  shipping_cost?: number;
  tax_amount?: number;
  locale?: string;
  metadata?: {
    notes?: string;
    shipping_address?: ShippingAddress;
    billing_address?: ShippingAddress;
    user_info?: Record<string, unknown>;
  };
}

/**
 * Create invoice response
 */
export interface CreateInvoiceResponse {
  success: boolean;
  invoice_id: string;
  invoice_url: string;
  order_id: string;
  total_amount: number;
  currency: string;
}
