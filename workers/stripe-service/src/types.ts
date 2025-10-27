/**
 * Type definitions for Stripe Service Worker
 */

import Stripe from 'stripe';

// ============================================================================
// CLOUDFLARE ENVIRONMENT
// ============================================================================

export interface Env {
  ENVIRONMENT: 'development' | 'production';
  STRIPE_SECRET_KEY: string;
  STRIPE_API_VERSION: string;
  STRIPE_WEBHOOK_SECRET: string; // Webhook signature verification
  DB: D1Database; // D1 database binding for invoice persistence
}

// ============================================================================
// CUSTOMER TYPES
// ============================================================================

export interface CustomerInput {
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone?: string;
  btw_number?: string;
  address_street?: string;
  address_house_number?: string;
  address_city?: string;
  address_postal_code?: string;
  address_country?: string;
  role?: string;
  is_verified?: boolean;
  user_id?: string;
  ip_address?: string;
}

export interface CustomerUpdateInput extends Partial<CustomerInput> {
  stripe_customer_id: string;
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface ProductInput {
  name: string;
  description?: string;
  price: number; // Price in euros (will be converted to cents)
  images?: string[];
  category?: string;
  brand?: string;
  part_number?: string;
  shopify_product_id?: string;
  shopify_variant_id?: string;
  product_id: string; // D1 product ID
}

export interface ProductUpdateInput extends Partial<ProductInput> {
  stripe_product_id: string;
  stripe_price_id?: string;
}

export interface PriceUpdateInput {
  stripe_product_id: string;
  stripe_price_id: string;
  new_price: number; // Price in euros
  product_id: string;
}

// ============================================================================
// INVOICE TYPES
// ============================================================================

export interface InvoiceItemInput {
  stripe_price_id: string;
  quantity: number;
  metadata: {
    shopify_variant_id?: string;
    product_name?: string;
    product_id: string;
  };
}

export interface InvoiceInput {
  customer_id: string; // Stripe customer ID
  user_id: string; // Our user ID
  items: InvoiceItemInput[];
  shipping_cost_cents?: number;
  notes?: string;
  shipping_address?: {
    company?: string;
    contactPerson?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    phone?: string;
  };
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface StripeServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface CreateProductResponse {
  stripe_product_id: string;
  stripe_price_id: string;
}

/**
 * Invoice line item with full historical data
 * Preserves product details and pricing at purchase time
 */
export interface InvoiceLineItem {
  id: string; // Stripe line item ID
  product_name: string;
  sku: string;
  brand: string;
  quantity: number;
  unit_price_cents: number; // Price per unit at purchase time
  total_price_cents: number; // Total for line (unit_price * quantity)
  tax_cents: number; // Tax amount for this line
  image_url: string;
  currency: string;
  metadata: {
    shopify_variant_id: string;
    product_id: string;
    stripe_price_id: string;
    stripe_product_id: string;
  };
}

export interface CreateInvoiceResponse {
  invoice_id: string;
  invoice_number: string;
  invoice_pdf: string;
  hosted_invoice_url: string;
  status: string;
  amount_due: number;
  currency: string;
  product_line_items: InvoiceLineItem[];
  shipping_line_item?: {
    id: string;
    amount: number;
    metadata: Record<string, string>;
  } | null;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class StripeServiceError extends Error {
  public code: string;
  public statusCode: number;
  public details?: any;

  constructor(code: string, message: string, statusCode = 500, details?: any) {
    super(message);
    this.name = 'StripeServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}
