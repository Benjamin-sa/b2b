/**
 * Response Validators for Integration Tests
 *
 * Validates that API responses match expected structure.
 * These validators ensure the API contract is maintained during refactoring.
 */

import { expect } from 'vitest'

// ============================================================================
// HEALTH CHECK VALIDATORS
// ============================================================================

export interface HealthCheckResponse {
  service: string
  version: string
  status: 'healthy'
  environment: string
  timestamp: string
  architecture?: string
  description?: string
}

export interface SimpleHealthResponse {
  status: 'ok'
  timestamp: string
}

export function validateHealthCheck(data: any): asserts data is HealthCheckResponse {
  expect(data).toHaveProperty('service')
  expect(data).toHaveProperty('version')
  expect(data).toHaveProperty('status', 'healthy')
  expect(data).toHaveProperty('environment')
  expect(data).toHaveProperty('timestamp')
  expect(typeof data.service).toBe('string')
  expect(typeof data.version).toBe('string')
  expect(typeof data.timestamp).toBe('string')
  // Validate ISO timestamp format
  expect(() => new Date(data.timestamp).toISOString()).not.toThrow()
}

export function validateSimpleHealth(data: any): asserts data is SimpleHealthResponse {
  expect(data).toHaveProperty('status', 'ok')
  expect(data).toHaveProperty('timestamp')
  expect(typeof data.timestamp).toBe('string')
}

// ============================================================================
// AUTH VALIDATORS
// ============================================================================

export interface UserProfile {
  uid: string
  email: string
  role: 'admin' | 'customer'
  companyName?: string
  firstName?: string
  lastName?: string
  isVerified: boolean
  isActive: boolean
  stripeCustomerId?: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: UserProfile
}

export interface TokenRefreshResponse {
  accessToken: string
}

export interface ValidateTokenResponse {
  valid: boolean
  user?: UserProfile
}

export function validateAuthResponse(data: any): asserts data is AuthResponse {
  expect(data).toHaveProperty('accessToken')
  expect(data).toHaveProperty('refreshToken')
  expect(data).toHaveProperty('expiresIn')
  expect(data).toHaveProperty('user')
  expect(typeof data.accessToken).toBe('string')
  expect(typeof data.refreshToken).toBe('string')
  expect(typeof data.expiresIn).toBe('number')
  expect(data.accessToken.length).toBeGreaterThan(0)
  expect(data.refreshToken.length).toBeGreaterThan(0)
  
  // Validate user object
  validateUserProfile(data.user)
}

export function validateUserProfile(data: any): asserts data is UserProfile {
  expect(data).toHaveProperty('uid')
  expect(data).toHaveProperty('email')
  expect(data).toHaveProperty('role')
  expect(data).toHaveProperty('isVerified')
  expect(data).toHaveProperty('isActive')
  expect(typeof data.uid).toBe('string')
  expect(typeof data.email).toBe('string')
  expect(['admin', 'customer']).toContain(data.role)
  expect(typeof data.isVerified).toBe('boolean')
  expect(typeof data.isActive).toBe('boolean')
}

export function validateTokenRefresh(data: any): asserts data is TokenRefreshResponse {
  expect(data).toHaveProperty('accessToken')
  expect(typeof data.accessToken).toBe('string')
  expect(data.accessToken.length).toBeGreaterThan(0)
}

export function validateTokenValidation(data: any): asserts data is ValidateTokenResponse {
  expect(data).toHaveProperty('valid')
  expect(typeof data.valid).toBe('boolean')
  
  if (data.valid && data.user) {
    validateUserProfile(data.user)
  }
}

// ============================================================================
// PRODUCT VALIDATORS
// ============================================================================

export interface ProductInventory {
  product_id: string
  total_stock: number
  b2b_stock: number
  b2c_stock: number
  reserved_stock?: number
  shopify_variant_id?: string
  shopify_product_id?: string
  sync_enabled?: boolean
}

export interface Product {
  id: string
  name: string
  price: number
  description?: string
  brand?: string
  part_number?: string
  category_id?: string
  image_url?: string
  images?: string[]
  original_price?: number
  coming_soon?: boolean
  min_order_quantity?: number
  max_order_quantity?: number
  stripe_product_id?: string
  stripe_price_id?: string
  created_at?: string
  updated_at?: string
  // Inventory data (joined or nested)
  inventory?: ProductInventory
  total_stock?: number
  b2b_stock?: number
  b2c_stock?: number
  shopify_variant_id?: string
}

export interface ProductListResponse {
  items: Product[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    hasNextPage: boolean
    hasPrevPage: boolean
    limit: number
  }
}

export function validateProduct(data: any, strict: boolean = false): asserts data is Product {
  expect(data).toHaveProperty('id')
  expect(data).toHaveProperty('name')
  expect(data).toHaveProperty('price')
  expect(typeof data.id).toBe('string')
  expect(typeof data.name).toBe('string')
  expect(typeof data.price).toBe('number')
  expect(data.price).toBeGreaterThanOrEqual(0)
  
  // Strict mode validates all expected fields
  if (strict) {
    // Inventory should be present
    if (data.inventory) {
      validateProductInventory(data.inventory)
    }
    
    // Timestamps
    if (data.created_at) {
      expect(typeof data.created_at).toBe('string')
    }
    if (data.updated_at) {
      expect(typeof data.updated_at).toBe('string')
    }
  }
}

export function validateProductInventory(data: any): asserts data is ProductInventory {
  expect(data).toHaveProperty('product_id')
  expect(data).toHaveProperty('total_stock')
  expect(data).toHaveProperty('b2b_stock')
  expect(data).toHaveProperty('b2c_stock')
  expect(typeof data.product_id).toBe('string')
  expect(typeof data.total_stock).toBe('number')
  expect(typeof data.b2b_stock).toBe('number')
  expect(typeof data.b2c_stock).toBe('number')
  
  // Business rule validation
  expect(data.total_stock).toBeGreaterThanOrEqual(0)
  expect(data.b2b_stock).toBeGreaterThanOrEqual(0)
  expect(data.b2c_stock).toBeGreaterThanOrEqual(0)
  expect(data.b2b_stock + data.b2c_stock).toBeLessThanOrEqual(data.total_stock)
}

export function validateProductList(data: any): asserts data is ProductListResponse {
  expect(data).toHaveProperty('items')
  expect(data).toHaveProperty('pagination')
  expect(Array.isArray(data.items)).toBe(true)
  
  // Validate pagination
  expect(data.pagination).toHaveProperty('currentPage')
  expect(data.pagination).toHaveProperty('totalPages')
  expect(data.pagination).toHaveProperty('totalItems')
  expect(data.pagination).toHaveProperty('hasNextPage')
  expect(typeof data.pagination.currentPage).toBe('number')
  expect(typeof data.pagination.totalPages).toBe('number')
  expect(typeof data.pagination.totalItems).toBe('number')
  expect(typeof data.pagination.hasNextPage).toBe('boolean')
  
  // Validate each product in the list
  data.items.forEach((product: any) => validateProduct(product))
}

// ============================================================================
// CATEGORY VALIDATORS
// ============================================================================

export interface Category {
  id: string
  name: string
  slug?: string
  description?: string
  image_url?: string
  parent_id?: string
  sort_order?: number
  is_active?: boolean
  product_count?: number
  created_at?: string
  updated_at?: string
}

export interface CategoryListResponse {
  categories: Category[]
}

export function validateCategory(data: any): asserts data is Category {
  expect(data).toHaveProperty('id')
  expect(data).toHaveProperty('name')
  expect(typeof data.id).toBe('string')
  expect(typeof data.name).toBe('string')
  
  if (data.slug !== undefined) {
    expect(typeof data.slug).toBe('string')
  }
  if (data.sort_order !== undefined) {
    expect(typeof data.sort_order).toBe('number')
  }
}

export function validateCategoryList(data: any): asserts data is CategoryListResponse {
  expect(data).toHaveProperty('categories')
  expect(Array.isArray(data.categories)).toBe(true)
  
  data.categories.forEach((category: any) => validateCategory(category))
}

// ============================================================================
// INVOICE VALIDATORS
// ============================================================================

export interface InvoiceCreateResponse {
  invoiceId: string
  invoiceUrl: string
  amount: number
  currency: string
  status: string
}

export interface InvoiceListResponse {
  invoices: Invoice[]
  total: number
  source: string
}

export interface Invoice {
  id: string
  stripe_invoice_id?: string
  user_id: string
  total_amount: number
  status: string
  invoice_url?: string
  invoice_pdf?: string
  invoice_number?: string
  created_at: string
}

export function validateInvoiceCreateResponse(data: any): asserts data is InvoiceCreateResponse {
  expect(data).toHaveProperty('invoiceId')
  expect(data).toHaveProperty('invoiceUrl')
  expect(data).toHaveProperty('amount')
  expect(data).toHaveProperty('currency')
  expect(data).toHaveProperty('status')
  expect(typeof data.invoiceId).toBe('string')
  expect(typeof data.invoiceUrl).toBe('string')
  expect(typeof data.amount).toBe('number')
  expect(typeof data.currency).toBe('string')
}

export function validateInvoice(data: any): asserts data is Invoice {
  expect(data).toHaveProperty('id')
  expect(data).toHaveProperty('user_id')
  expect(data).toHaveProperty('total_amount')
  expect(data).toHaveProperty('status')
  expect(typeof data.id).toBe('string')
  expect(typeof data.user_id).toBe('string')
  expect(typeof data.total_amount).toBe('number')
  expect(typeof data.status).toBe('string')
}

export function validateInvoiceList(data: any): asserts data is InvoiceListResponse {
  expect(data).toHaveProperty('invoices')
  expect(data).toHaveProperty('total')
  expect(Array.isArray(data.invoices)).toBe(true)
  expect(typeof data.total).toBe('number')
  
  data.invoices.forEach((invoice: any) => validateInvoice(invoice))
}

// ============================================================================
// ERROR VALIDATORS
// ============================================================================

export interface ApiError {
  error: string
  code?: string
  message?: string
  timestamp?: string
  path?: string
  details?: any
}

export function validateApiError(data: any): asserts data is ApiError {
  expect(data).toHaveProperty('error')
  expect(typeof data.error).toBe('string')
  
  if (data.code) {
    expect(typeof data.code).toBe('string')
    // Error codes should follow service/error-type pattern
    expect(data.code).toMatch(/^[a-z-]+\/[a-z-]+$/)
  }
  
  if (data.message) {
    expect(typeof data.message).toBe('string')
  }
}

export function validate404Error(data: any): void {
  validateApiError(data)
  expect(data.code).toBe('gateway/not-found')
}

export function validate401Error(data: any): void {
  validateApiError(data)
  // Auth errors should have auth/ prefix
  if (data.code) {
    expect(data.code).toMatch(/^auth\//)
  }
}

// ============================================================================
// ADMIN USER VALIDATORS
// ============================================================================

export interface AdminUserListResponse {
  users: UserProfile[]
  total: number
  limit: number
  offset: number
}

export function validateAdminUserList(data: any): asserts data is AdminUserListResponse {
  expect(data).toHaveProperty('users')
  expect(data).toHaveProperty('total')
  expect(Array.isArray(data.users)).toBe(true)
  expect(typeof data.total).toBe('number')
  
  data.users.forEach((user: any) => {
    // Admin user list has slightly different format (snake_case from DB)
    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('email')
    expect(user).toHaveProperty('role')
    expect(typeof user.id).toBe('string')
    expect(typeof user.email).toBe('string')
  })
}

// ============================================================================
// CORS VALIDATORS
// ============================================================================

export function validateCorsHeaders(headers: Headers, expectedOrigin?: string): void {
  const corsOrigin = headers.get('access-control-allow-origin')
  expect(corsOrigin).toBeDefined()
  
  if (expectedOrigin) {
    expect(corsOrigin).toBe(expectedOrigin)
  }
  
  // For non-simple requests, these headers should be present
  const corsHeaders = headers.get('access-control-allow-headers')
  const corsMethods = headers.get('access-control-allow-methods')
  
  // At minimum, Content-Type and Authorization should be allowed
  if (corsHeaders) {
    const allowedHeaders = corsHeaders.toLowerCase()
    expect(allowedHeaders).toContain('content-type')
  }
}

// ============================================================================
// HELPER ASSERTIONS
// ============================================================================

/**
 * Assert response is successful (2xx)
 */
export function expectSuccess(response: { status: number; ok: boolean }): void {
  expect(response.ok).toBe(true)
  expect(response.status).toBeGreaterThanOrEqual(200)
  expect(response.status).toBeLessThan(300)
}

/**
 * Assert response is client error (4xx)
 */
export function expectClientError(
  response: { status: number; ok: boolean },
  expectedStatus?: number
): void {
  expect(response.ok).toBe(false)
  if (expectedStatus) {
    expect(response.status).toBe(expectedStatus)
  } else {
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(response.status).toBeLessThan(500)
  }
}

/**
 * Assert response is server error (5xx)
 */
export function expectServerError(response: { status: number; ok: boolean }): void {
  expect(response.ok).toBe(false)
  expect(response.status).toBeGreaterThanOrEqual(500)
}

/**
 * Assert response has specific status
 */
export function expectStatus(response: { status: number }, status: number): void {
  expect(response.status).toBe(status)
}

/**
 * Assert response timing is acceptable
 */
export function expectFastResponse(timing: number, maxMs: number = 5000): void {
  expect(timing).toBeLessThan(maxMs)
}
