/**
 * Integration Tests - Products CRUD
 *
 * Tests the complete product lifecycle against the real dev worker.
 * Mimics frontend products.ts store behavior.
 *
 * Prerequisites:
 * - Deploy dev worker: cd workers/api-gateway && npm run deploy:dev
 * - Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD environment variables
 *
 * Run: npm test integration/products
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createApiClient,
  createAdminClient,
  ApiClient,
  validateProduct,
  validateProductList,
  validateProductInventory,
  expectSuccess,
  expectStatus,
  expectClientError,
  expectFastResponse,
  generateProduct,
  generateMinimalProduct,
  generateTestId,
  TestResourceTracker,
} from '../helpers'

describe('Integration: Products CRUD', () => {
  let publicClient: ApiClient
  let adminClient: ApiClient
  const tracker = new TestResourceTracker()

  beforeAll(async () => {
    // Public client (no auth)
    publicClient = createApiClient({ verbose: true })

    // Admin client (authenticated)
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
    // Cleanup: Delete created products
    const productIds = tracker.getProducts()
    console.log(`[CLEANUP] Deleting ${productIds.length} test products...`)

    if (adminClient) {
      for (const id of productIds) {
        try {
          await adminClient.delete(`/api/products/${id}`, { auth: true })
          console.log(`[CLEANUP] Deleted product: ${id}`)
        } catch (error) {
          console.warn(`[CLEANUP] Failed to delete product ${id}:`, error)
        }
      }

      // Logout admin
      if (adminClient.isAuthenticated) {
        await adminClient.logout()
      }
    }
  })

  describe('GET /api/products - List Products (Public)', () => {
    it('should list products without authentication', async () => {
      const response = await publicClient.get('/api/products')

      expectSuccess(response)
      expectStatus(response, 200)
      expectFastResponse(response.timing, 5000)

      // Validate response structure
      validateProductList(response.data)

      console.log(
        `[TEST] Listed ${response.data.items.length} products ` +
          `(total: ${response.data.pagination.totalItems})`
      )
    })

    it('should support pagination', async () => {
      const response = await publicClient.get('/api/products', {
        params: { page: '1', limit: '5' },
      })

      expectSuccess(response)
      validateProductList(response.data)

      expect(response.data.items.length).toBeLessThanOrEqual(5)
      expect(response.data.pagination.currentPage).toBe(1)
      expect(response.data.pagination.limit).toBe(5)
    })

    it('should return empty array for invalid page', async () => {
      const response = await publicClient.get('/api/products', {
        params: { page: '9999' },
      })

      expectSuccess(response)
      validateProductList(response.data)

      // High page number should return empty array
      expect(response.data.items.length).toBe(0)
    })

    it('should support search parameter', async () => {
      const response = await publicClient.get('/api/products', {
        params: { search: 'test' },
      })

      expectSuccess(response)
      validateProductList(response.data)

      // Each result should contain search term (if any results)
      // Note: Search might match name, description, brand, etc.
    })

    it('should support category filter', async () => {
      // First get a valid category ID from existing products
      const listResponse = await publicClient.get('/api/products', {
        params: { limit: '1' },
      })

      expectSuccess(listResponse)

      if (listResponse.data.items.length > 0 && listResponse.data.items[0].category_id) {
        const categoryId = listResponse.data.items[0].category_id

        const response = await publicClient.get('/api/products', {
          params: { categoryId },
        })

        expectSuccess(response)
        validateProductList(response.data)

        // All products should have the same category
        response.data.items.forEach((product: any) => {
          expect(product.category_id).toBe(categoryId)
        })
      } else {
        console.log('[SKIP] No products with category found for testing')
      }
    })

    it('should support sorting', async () => {
      const responseAsc = await publicClient.get('/api/products', {
        params: { sortBy: 'price', sortOrder: 'asc', limit: '10' },
      })

      expectSuccess(responseAsc)
      validateProductList(responseAsc.data)

      // Verify ascending order
      const pricesAsc = responseAsc.data.items.map((p: any) => p.price)
      for (let i = 1; i < pricesAsc.length; i++) {
        expect(pricesAsc[i]).toBeGreaterThanOrEqual(pricesAsc[i - 1])
      }
    })
  })

  describe('GET /api/products/:id - Get Single Product (Public)', () => {
    it('should return 404 for non-existent product', async () => {
      const response = await publicClient.get('/api/products/prod_nonexistent_12345')

      expectStatus(response, 404)
      expect(response.ok).toBe(false)
    })

    it('should return product by ID', async () => {
      // First get a valid product ID
      const listResponse = await publicClient.get('/api/products', {
        params: { limit: '1' },
      })

      expectSuccess(listResponse)

      if (listResponse.data.items.length > 0) {
        const productId = listResponse.data.items[0].id

        const response = await publicClient.get(`/api/products/${productId}`)

        expectSuccess(response)
        validateProduct(response.data, true)

        expect(response.data.id).toBe(productId)

        console.log(`[TEST] Fetched product: ${response.data.name}`)
      } else {
        console.log('[SKIP] No products available for testing')
      }
    })
  })

  describe('POST /api/products - Create Product (Admin Only)', () => {
    it('should reject creation without authentication', async () => {
      const productData = generateProduct()

      const response = await publicClient.post('/api/products', productData)

      expectClientError(response, 401)
    })

    it('should create product with complete valid data', async () => {
      const productData = generateProduct()

      console.log('[TEST] Creating product:', productData.name)

      const response = await adminClient.post('/api/products', productData, { auth: true })

      expectSuccess(response)
      expectStatus(response, 200) // or 201
      expectFastResponse(response.timing, 10000) // Allow more time for Stripe

      validateProduct(response.data, true)

      // Track for cleanup
      tracker.trackProduct(response.data.id)

      // Verify created data matches input
      expect(response.data.name).toBe(productData.name)
      expect(response.data.price).toBe(Math.round(productData.price * 100)) // Price in cents

      // Verify inventory data
      expect(response.data.inventory).toBeDefined()
      if (response.data.inventory) {
        expect(response.data.inventory.total_stock).toBe(productData.total_stock)
        expect(response.data.inventory.b2b_stock).toBe(productData.b2b_stock)
      }

      console.log(`[TEST] ✅ Created product: ${response.data.id}`)
    })

    it('should create product with minimal data', async () => {
      const productData = generateMinimalProduct()

      const response = await adminClient.post('/api/products', productData, { auth: true })

      expectSuccess(response)
      validateProduct(response.data)

      tracker.trackProduct(response.data.id)

      console.log(`[TEST] ✅ Created minimal product: ${response.data.id}`)
    })

    it('should generate Stripe product and price IDs', async () => {
      const productData = generateProduct()

      const response = await adminClient.post('/api/products', productData, { auth: true })

      expectSuccess(response)

      tracker.trackProduct(response.data.id)

      // Stripe IDs should be created
      expect(response.data.stripe_product_id).toBeDefined()
      expect(response.data.stripe_price_id).toBeDefined()
      expect(response.data.stripe_product_id).toMatch(/^prod_/)
      expect(response.data.stripe_price_id).toMatch(/^price_/)

      console.log(`[TEST] Stripe IDs created: ${response.data.stripe_product_id}`)
    })

    it('should reject product with invalid data', async () => {
      const invalidProduct = {
        // Missing required 'name'
        price: -10, // Invalid negative price
      }

      const response = await adminClient.post('/api/products', invalidProduct, { auth: true })

      expectClientError(response, 400)
    })
  })

  describe('PATCH /api/products/:id - Update Product (Admin Only)', () => {
    let testProductId: string

    beforeAll(async () => {
      // Create a product to update
      const productData = generateProduct({ name: 'Update Test Product' })
      const response = await adminClient.post('/api/products', productData, { auth: true })

      if (response.ok) {
        testProductId = response.data.id
        tracker.trackProduct(testProductId)
        console.log(`[TEST] Created product for update tests: ${testProductId}`)
      }
    })

    it('should reject update without authentication', async () => {
      if (!testProductId) {
        console.log('[SKIP] No test product available')
        return
      }

      const response = await publicClient.patch(`/api/products/${testProductId}`, {
        name: 'Updated Name',
      })

      expectClientError(response, 401)
    })

    it('should update product name', async () => {
      if (!testProductId) {
        console.log('[SKIP] No test product available')
        return
      }

      const newName = `Updated Product ${Date.now()}`

      const response = await adminClient.patch(
        `/api/products/${testProductId}`,
        { name: newName },
        { auth: true }
      )

      expectSuccess(response)
      validateProduct(response.data)

      expect(response.data.name).toBe(newName)

      console.log(`[TEST] ✅ Updated product name to: ${newName}`)
    })

    it('should update product price (Stripe price replacement)', async () => {
      if (!testProductId) {
        console.log('[SKIP] No test product available')
        return
      }

      // Get current price
      const getResponse = await publicClient.get(`/api/products/${testProductId}`)
      const currentPrice = getResponse.data.price

      // Update to new price
      const newPrice = currentPrice + 1000 // Add €10

      const response = await adminClient.patch(
        `/api/products/${testProductId}`,
        { price: newPrice / 100 }, // Send in euros
        { auth: true }
      )

      expectSuccess(response)

      // Price should be updated
      expect(response.data.price).toBe(newPrice)

      console.log(`[TEST] ✅ Updated product price to: €${newPrice / 100}`)
    })

    it('should update inventory stock levels', async () => {
      if (!testProductId) {
        console.log('[SKIP] No test product available')
        return
      }

      const response = await adminClient.patch(
        `/api/products/${testProductId}`,
        {
          total_stock: 200,
          b2b_stock: 150,
          b2c_stock: 0,
        },
        { auth: true }
      )

      expectSuccess(response)

      expect(response.data.inventory.total_stock).toBe(200)
      expect(response.data.inventory.b2b_stock).toBe(150)

      console.log('[TEST] ✅ Updated inventory stock levels')
    })
  })

  describe('DELETE /api/products/:id - Delete Product (Admin Only)', () => {
    it('should reject deletion without authentication', async () => {
      // Create a product to delete
      const productData = generateProduct({ name: 'Delete Test Product' })
      const createResponse = await adminClient.post('/api/products', productData, { auth: true })

      if (!createResponse.ok) {
        console.log('[SKIP] Could not create test product')
        return
      }

      const productId = createResponse.data.id

      // Try to delete without auth
      const response = await publicClient.delete(`/api/products/${productId}`)

      expectClientError(response, 401)

      // Cleanup: delete with admin
      await adminClient.delete(`/api/products/${productId}`, { auth: true })
    })

    it('should delete product (soft delete/archive)', async () => {
      // Create a product to delete
      const productData = generateProduct({ name: 'Delete Me Product' })
      const createResponse = await adminClient.post('/api/products', productData, { auth: true })

      expectSuccess(createResponse)
      const productId = createResponse.data.id

      // Delete the product
      const response = await adminClient.delete(`/api/products/${productId}`, { auth: true })

      expectSuccess(response)

      console.log(`[TEST] ✅ Deleted product: ${productId}`)

      // Verify product is no longer accessible
      const getResponse = await publicClient.get(`/api/products/${productId}`)
      expectStatus(getResponse, 404)
    })

    it('should return 404 for non-existent product', async () => {
      const response = await adminClient.delete('/api/products/prod_nonexistent_xyz', {
        auth: true,
      })

      expectStatus(response, 404)
    })
  })

  describe('GET /api/products/category/:categoryId - Products by Category (Public)', () => {
    it('should return products for a valid category', async () => {
      // First get a valid category ID
      const listResponse = await publicClient.get('/api/products', {
        params: { limit: '1' },
      })

      if (listResponse.data.items.length > 0 && listResponse.data.items[0].category_id) {
        const categoryId = listResponse.data.items[0].category_id

        const response = await publicClient.get(`/api/products/category/${categoryId}`)

        expectSuccess(response)
        validateProductList(response.data)

        // All products should have the same category
        response.data.items.forEach((product: any) => {
          expect(product.category_id).toBe(categoryId)
        })
      } else {
        console.log('[SKIP] No products with category found')
      }
    })

    it('should return empty array for invalid category', async () => {
      const response = await publicClient.get('/api/products/category/cat_nonexistent_xyz')

      // Should return 200 with empty array, or 404
      expect([200, 404]).toContain(response.status)

      if (response.ok) {
        expect(response.data.items.length).toBe(0)
      }
    })
  })
})
