/**
 * Test Data Generators
 *
 * Generate realistic test data for integration tests.
 * All generated data uses unique identifiers to prevent conflicts.
 */

import { expect } from 'vitest';

// ============================================================================
// ID GENERATORS
// ============================================================================

/**
 * Generate a unique test ID with prefix
 */
export function generateTestId(prefix: string = 'test'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Generate a unique email for testing
 */
export function generateTestEmail(prefix: string = 'test'): string {
  const id = generateTestId(prefix);
  return `${id}@test.local`;
}

// ============================================================================
// PRODUCT TEST DATA
// ============================================================================

export interface TestProductData {
  name: string;
  price: number;
  description?: string;
  brand?: string;
  part_number?: string;
  b2b_sku?: string;
  category_id?: string;
  image_url?: string;
  images?: string[];
  stock?: number;
  min_order_quantity?: number;
  max_order_quantity?: number;
  specifications?: Array<{ key: string; value: string }>;
  tags?: string[];
}

/**
 * Generate a valid product for creation tests
 */
export function generateProduct(overrides: Partial<TestProductData> = {}): TestProductData {
  const timestamp = Date.now();
  const id = Math.random().toString(36).substring(2, 8).toUpperCase();

  return {
    name: `Integration Test Product ${timestamp}`,
    price: 29.99,
    description: 'This is a test product created by the integration test suite.',
    brand: 'Test Brand',
    part_number: `TEST-${id}`,
    category_id: '',
    image_url: 'https://via.placeholder.com/400x400.png?text=Test+Product',
    images: [
      'https://via.placeholder.com/400x400.png?text=Test+1',
      'https://via.placeholder.com/400x400.png?text=Test+2',
    ],
    stock: 100,
    min_order_quantity: 1,
    max_order_quantity: 50,
    specifications: [
      { key: 'Color', value: 'Black' },
      { key: 'Material', value: 'Metal' },
    ],
    tags: ['test', 'integration'],
    ...overrides,
  };
}

/**
 * Generate a minimal valid product (only required fields)
 */
export function generateMinimalProduct(overrides: Partial<TestProductData> = {}): TestProductData {
  return {
    name: `Minimal Test Product ${Date.now()}`,
    price: 19.99,
    stock: 10,
    ...overrides,
  };
}

/**
 * Generate an invalid product (for error testing)
 */
export function generateInvalidProduct(): Partial<TestProductData> {
  return {
    // Missing required 'name'
    price: -10, // Invalid negative price
  };
}

// ============================================================================
// CATEGORY TEST DATA
// ============================================================================

export interface TestCategoryData {
  name: string;
  slug?: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  sort_order?: number;
}

/**
 * Generate a valid category for creation tests
 */
export function generateCategory(overrides: Partial<TestCategoryData> = {}): TestCategoryData {
  const timestamp = Date.now();
  const slug = `test-category-${timestamp}`;

  return {
    name: `Test Category ${timestamp}`,
    slug,
    description: 'Test category created by integration tests',
    image_url: 'https://via.placeholder.com/200x200.png?text=Category',
    sort_order: 0,
    ...overrides,
  };
}

// ============================================================================
// USER TEST DATA
// ============================================================================

export interface TestUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone?: string;
  btwNumber?: string;
}

/**
 * Generate a valid user for registration tests
 */
export function generateUser(overrides: Partial<TestUserData> = {}): TestUserData {
  const id = generateTestId('user');

  return {
    email: `${id}@test.local`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    companyName: `Test Company ${Date.now()}`,
    phone: '+31612345678',
    ...overrides,
  };
}

// ============================================================================
// INVOICE TEST DATA
// ============================================================================

export interface TestInvoiceItem {
  stripe_price_id: string;
  quantity: number;
  metadata: {
    product_id: string;
    product_name: string;
    shopify_variant_id?: string;
  };
}

export interface TestInvoiceData {
  items: TestInvoiceItem[];
  shipping_cost?: number;
  metadata?: {
    notes?: string;
    shipping_address?: any;
    billing_address?: any;
  };
}

/**
 * Generate a valid invoice request
 * Note: Requires real Stripe price IDs from the test environment
 */
export function generateInvoice(
  items: TestInvoiceItem[],
  overrides: Partial<TestInvoiceData> = {}
): TestInvoiceData {
  return {
    items,
    shipping_cost: 0,
    metadata: {
      notes: 'Integration test invoice',
      shipping_address: {
        line1: '123 Test Street',
        city: 'Amsterdam',
        postal_code: '1234 AB',
        country: 'NL',
      },
    },
    ...overrides,
  };
}

// ============================================================================
// CLEANUP UTILITIES
// ============================================================================

/**
 * Track created resources for cleanup
 */
export class TestResourceTracker {
  private products: string[] = [];
  private categories: string[] = [];
  private users: string[] = [];

  trackProduct(id: string): void {
    this.products.push(id);
  }

  trackCategory(id: string): void {
    this.categories.push(id);
  }

  trackUser(id: string): void {
    this.users.push(id);
  }

  getProducts(): string[] {
    return [...this.products];
  }

  getCategories(): string[] {
    return [...this.categories];
  }

  getUsers(): string[] {
    return [...this.users];
  }

  clear(): void {
    this.products = [];
    this.categories = [];
    this.users = [];
  }
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Check if a response time is acceptable
 */
export function isAcceptableResponseTime(ms: number, threshold: number = 5000): boolean {
  return ms < threshold;
}

/**
 * Generate expected error response shape
 */
export function expectedError(code: string, messagePattern?: string): object {
  return {
    error: expect.any(String),
    code,
    ...(messagePattern && { message: expect.stringMatching(messagePattern) }),
  };
}

/**
 * Wait for a specified amount of time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function until it succeeds or max attempts reached
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError || new Error('Retry failed');
}
