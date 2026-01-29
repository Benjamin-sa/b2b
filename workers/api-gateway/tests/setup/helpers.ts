/**
 * Test Helpers
 *
 * Utilities for creating test data, making requests, and cleaning up
 */

export const TEST_ENV = {
  API_GATEWAY_URL: 'http://localhost:8787', // Local dev server
  SERVICE_SECRET: 'test-secret-12345',
};

/**
 * Helper to create test user registration data
 */
export function createTestUserData(uniqueId = Date.now()) {
  return {
    email: `test_${uniqueId}@example.com`,
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User',
    companyName: `Test Company ${uniqueId}`,
    phone: '+31612345678',
    address: {
      street: 'Test Street',
      houseNumber: '1',
      postalCode: '1234AB',
      city: 'Amsterdam',
      country: 'NL',
    },
  };
}

/**
 * Helper to create test invoice/order data
 */
export function createTestInvoiceData() {
  return {
    items: [
      {
        stripe_price_id: 'price_test_123', // Test Stripe price ID
        quantity: 2,
        metadata: {
          product_id: 'test_product_1',
          product_name: 'Test Product',
          shopify_variant_id: 'gid://shopify/ProductVariant/123',
        },
      },
    ],
    shipping_cost: 500, // €5.00 in cents
    tax_amount: 420, // €4.20 in cents
    metadata: {
      notes: 'Test order from automated tests',
      shipping_address: {
        company: 'Test Company',
        contact_person: 'Test User',
        street: 'Test Street 1',
        city: 'Amsterdam',
        zip_code: '1234AB',
        country: 'NL',
        phone: '+31612345678',
      },
    },
  };
}

/**
 * Helper to make authenticated requests
 */
export async function makeAuthenticatedRequest(
  path: string,
  token: string,
  options: RequestInit = {}
) {
  return fetch(`${TEST_ENV.API_GATEWAY_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

/**
 * Parse JSON response with error handling
 */
export async function parseJsonResponse(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse JSON:', text);
    throw new Error(`Invalid JSON response: ${text}`);
  }
}

/**
 * Sleep utility for rate limit tests
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a unique test identifier
 */
export function generateTestId() {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
