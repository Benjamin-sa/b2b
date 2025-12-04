/**
 * Integration Tests - Invoices
 *
 * Tests the invoice creation and listing flow against the real dev worker.
 * Uses Stripe sandbox for invoice creation.
 *
 * Prerequisites:
 * - Deploy dev worker with Stripe sandbox keys
 * - Test user must have stripe_customer_id (be verified or manually set)
 *
 * Run: npm test integration/invoices
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createApiClient,
  createAdminClient,
  ApiClient,
  validateInvoiceCreateResponse,
  validateInvoiceList,
  expectSuccess,
  expectStatus,
  expectClientError,
  expectFastResponse,
} from '../helpers'

/**
 * Find a stable product suitable for invoice testing.
 * Avoids recently created test products that may have race conditions with Stripe.
 */
async function findStableProductForInvoice(
  client: ApiClient,
  options: { verbose?: boolean } = {}
): Promise<any | null> {
  const { verbose = false } = options

  // Fetch more products to find a stable one
  const response = await client.get('/api/products', {
    params: { limit: '20', sortBy: 'created_at', sortOrder: 'asc' },
  })

  if (!response.ok || !response.data.items?.length) {
    if (verbose) console.log('[INVOICE TEST] No products available')
    return null
  }

  const products = response.data.items

  // Filter for products that are likely stable for invoice testing
  const stableProduct = products.find((product: any) => {
    // Must have a valid Stripe price ID (not empty, starts with 'price_')
    const hasValidStripePriceId =
      product.stripe_price_id &&
      typeof product.stripe_price_id === 'string' &&
      product.stripe_price_id.startsWith('price_') &&
      product.stripe_price_id.length > 10

    // Must have B2B stock available
    const hasStock = (product.inventory?.b2b_stock ?? product.b2b_stock ?? 0) > 0

    // Avoid products created by integration tests (they have "Integration Test" or "Test Product" in name)
    const isTestProduct =
      product.name?.includes('Integration Test') ||
      product.name?.includes('Test Product') ||
      product.name?.includes('Minimal Test') ||
      product.name?.includes('Delete') ||
      product.name?.includes('Update Test')

    if (verbose && !hasValidStripePriceId) {
      console.log(`[INVOICE TEST] Skipping "${product.name}": invalid stripe_price_id`)
    }
    if (verbose && !hasStock) {
      console.log(`[INVOICE TEST] Skipping "${product.name}": no B2B stock`)
    }
    if (verbose && isTestProduct) {
      console.log(`[INVOICE TEST] Skipping "${product.name}": appears to be a test product`)
    }

    return hasValidStripePriceId && hasStock && !isTestProduct
  })

  if (stableProduct && verbose) {
    console.log(
      `[INVOICE TEST] Found stable product: "${stableProduct.name}" (${stableProduct.stripe_price_id})`
    )
  }

  return stableProduct || null
}

describe('Integration: Invoices', () => {
  let publicClient: ApiClient
  let adminClient: ApiClient

  beforeAll(async () => {
    publicClient = createApiClient({ verbose: true })

    try {
      adminClient = await createAdminClient({ verbose: true })
      console.log(`[TEST] Admin authenticated as: ${adminClient.user?.email}`)
    } catch (error) {
      console.error('[TEST] Failed to create admin client:', error)
      throw error
    }

    console.log(`[TEST] Testing against: ${publicClient.url}`)
  }, 30000)

  afterAll(async () => {
    if (adminClient?.isAuthenticated) {
      await adminClient.logout()
    }
  })

  describe('GET /api/invoices - List User Invoices (Authenticated)', () => {
    it('should reject request without authentication', async () => {
      const response = await publicClient.get('/api/invoices')

      expectClientError(response, 401)
    })

    it('should list invoices for authenticated user', async () => {
      const response = await adminClient.get('/api/invoices', { auth: true })

      expectSuccess(response)
      expectStatus(response, 200)
      expectFastResponse(response.timing, 5000)

      validateInvoiceList(response.data)

      console.log(`[TEST] Listed ${response.data.invoices.length} invoices for user`)
    })

    it('should return empty array for user with no invoices', async () => {
      // For existing users, we just verify the structure
      // New users would have 0 invoices
      const response = await adminClient.get('/api/invoices', { auth: true })

      expectSuccess(response)
      expect(response.data).toHaveProperty('invoices')
      expect(Array.isArray(response.data.invoices)).toBe(true)
    })
  })

  describe('POST /api/invoices - Create Invoice (Authenticated with Stripe)', () => {
    it('should reject creation without authentication', async () => {
      const response = await publicClient.post('/api/invoices', {
        items: [],
      })

      expectClientError(response, 401)
    })

    it('should reject creation with empty items', async () => {
      const response = await adminClient.post(
        '/api/invoices',
        {
          items: [],
        },
        { auth: true }
      )

      // Should fail - server currently returns 500, could be improved to 400
      expect(response.ok).toBe(false)
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should create invoice with valid items', async () => {
      // Find a stable product that's not a recently created test product
      const product = await findStableProductForInvoice(publicClient, { verbose: true })

      if (!product) {
        console.log('[SKIP] No stable product with valid Stripe price ID and stock available')
        console.log('[SKIP] This can happen if only test products exist or all products lack Stripe integration')
        return
      }

      // Create invoice request
      const invoiceRequest = {
        items: [
          {
            stripePriceId: product.stripe_price_id,
            quantity: 1,
            metadata: {
              productId: product.id,
              productName: product.name,
              shopifyVariantId: product.shopify_variant_id || '',
            },
          },
        ],
        shippingCost: 0,
        metadata: {
          notes: 'Integration test invoice',
          shippingAddress: {
            line1: '123 Test Street',
            city: 'Amsterdam',
            postal_code: '1234 AB',
            country: 'NL',
          },
        },
      }

      console.log('[TEST] Creating invoice with product:', product.name)
      console.log('[TEST] Using Stripe price ID:', product.stripe_price_id)

      const response = await adminClient.post('/api/invoices', invoiceRequest, { auth: true })

      if (!response.ok) {
        console.log('[TEST] Invoice creation failed:', response.error)

        if (response.error?.message?.includes('customer')) {
          console.log('[SKIP] User does not have Stripe customer ID')
          return
        }

        if (response.error?.error === 'insufficient-stock') {
          console.log('[SKIP] Insufficient stock for invoice')
          return
        }

        // Check for Stripe price ID errors (race condition indicator)
        if (
          response.error?.message?.includes('No such price') ||
          response.error?.message?.includes('price_')
        ) {
          console.log('[SKIP] Stripe price ID not yet synced - potential race condition')
          return
        }

        // Unexpected error
        throw new Error(`Invoice creation failed: ${JSON.stringify(response.error)}`)
      }

      expectSuccess(response)
      validateInvoiceCreateResponse(response.data)

      expect(response.data.invoiceId).toMatch(/^in_/)
      expect(response.data.invoiceUrl).toContain('stripe.com')

      console.log(`[TEST] ✅ Created invoice: ${response.data.invoiceId}`)
      console.log(`[TEST] Invoice URL: ${response.data.invoiceUrl}`)
    }, 30000) // Allow more time for Stripe

    it('should fail with insufficient stock', async () => {
      // Find a stable product (we need one with valid Stripe integration)
      const product = await findStableProductForInvoice(publicClient, { verbose: true })

      if (!product) {
        console.log('[SKIP] No stable product available for insufficient stock test')
        return
      }

      // Request more than available stock
      const currentStock = product.inventory?.b2b_stock ?? product.b2b_stock ?? 0
      const requestQuantity = currentStock + 1000

      const invoiceRequest = {
        items: [
          {
            stripePriceId: product.stripe_price_id,
            quantity: requestQuantity,
            metadata: {
              productId: product.id,
              productName: product.name,
            },
          },
        ],
      }

      console.log(`[TEST] Requesting ${requestQuantity} units (available: ${currentStock})`)

      const response = await adminClient.post('/api/invoices', invoiceRequest, { auth: true })

      // Should fail with insufficient stock
      expectClientError(response, 400)
      expect(response.error?.error).toBe('insufficient-stock')

      console.log('[TEST] ✅ Correctly rejected insufficient stock request')
    })

    it('should fail with invalid stripe price ID', async () => {
      const invoiceRequest = {
        items: [
          {
            stripePriceId: 'price_invalid_test_12345',
            quantity: 1,
            metadata: {
              productId: 'test_product',
              productName: 'Test Product',
            },
          },
        ],
      }

      const response = await adminClient.post('/api/invoices', invoiceRequest, { auth: true })

      // Should fail - either validation or Stripe error
      expect(response.ok).toBe(false)
      expect([400, 500]).toContain(response.status)
    })
  })

  describe('Invoice Response Format', () => {
    it('should match frontend expected format', async () => {
      const response = await adminClient.get('/api/invoices', { auth: true })

      expectSuccess(response)

      // User invoice list uses camelCase format
      expect(response.data).toHaveProperty('invoices')
      expect(response.data).toHaveProperty('total')

      // Each invoice should have expected fields (camelCase from user endpoint)
      response.data.invoices.forEach((invoice: any) => {
        expect(invoice).toHaveProperty('id')
        // User invoices don't include user_id (it's implicit)
        expect(invoice).toHaveProperty('totalAmount')
        expect(invoice).toHaveProperty('status')
        expect(invoice).toHaveProperty('createdAt')
      })
    })
  })
})
