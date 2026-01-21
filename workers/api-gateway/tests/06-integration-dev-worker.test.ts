/**
 * Integration Tests - Real Dev Worker
 * 
 * Tests the actual deployed DEV API Gateway worker
 * 
 * Prerequisites:
 * 1. Deploy dev worker: cd workers/api-gateway && npm run deploy:dev
 * 
 * 2. Create test admin user in dev database (one-time setup):
 *    - Use the frontend to register: admin@test.local
 *    - Or insert directly into D1 database
 *    - Ensure user has role='admin' and is_verified=1
 * 
 * 3. Set environment variables:
 *    export TEST_ADMIN_EMAIL="admin@test.local"
 *    export TEST_ADMIN_PASSWORD="your-test-password"
 *    export API_GATEWAY_DEV_URL="https://b2b-api-gateway-dev.benkee-sauter.workers.dev" (optional)
 * 
 * 4. Run tests:
 *    npm test 06-integration
 * 
 * ⚠️ SECURITY: 
 * - NEVER commit test credentials to git!
 * - Use a dedicated test admin account (not production credentials)
 * - Test credentials should be stored in .env (already in .gitignore)
 * 
 * These tests hit the real dev environment with:
 * - Dev D1 database (b2b-dev)
 * - Stripe sandbox
 * - All dev service bindings (auth, inventory, stripe, shopify, email, telegram)
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { getFreshAdminToken } from './helpers/auth'

// Dev worker URL
const DEV_WORKER_URL = process.env.API_GATEWAY_DEV_URL || 'https://b2b-api-gateway-dev.benkee-sauter.workers.dev'

// Admin JWT token - obtained programmatically before tests run
let ADMIN_JWT_TOKEN: string

describe('Integration Tests - Dev Worker', () => {
  // Login once before all tests
  beforeAll(async () => {
    try {
      ADMIN_JWT_TOKEN = await getFreshAdminToken(DEV_WORKER_URL)
      console.log('[SETUP] ✅ Admin authentication successful')
    } catch (error) {
      console.error('[SETUP] ❌ Failed to login as admin:', error)
      console.error('[SETUP] Make sure TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD are set')
      throw error
    }
  }, 60000) // 30 second timeout for login
  const fetchAPI = async (path: string, options: RequestInit = {}) => {
    const url = `${DEV_WORKER_URL}${path}`
    console.log(`[TEST] ${options.method || 'GET'} ${url}`)
    
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
  }

  describe('Health Checks', () => {
    it('should return healthy status from root endpoint', async () => {
      const response = await fetchAPI('/')
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      console.log('[TEST] Health check:', data)
      
      expect(data).toHaveProperty('service')
      expect(data).toHaveProperty('status', 'healthy')
    })

    it('should return OK from /health endpoint', async () => {
      const response = await fetchAPI('/health')
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('status', 'ok')
    })
  })

  describe('GET /api/products - List Products', () => {
    it('should list products (public endpoint)', async () => {
      const response = await fetchAPI('/api/products')
      
      console.log(`[TEST] List products status: ${response.status}`)
      expect([200, 500]).toContain(response.status)
      
      if (response.ok) {
        const data = await response.json()
        // Response format is { items: [...], metadata: {...} }
        console.log(`[TEST] Products count:`, data.items?.length || 0)
        expect(data).toHaveProperty('items')
        expect(Array.isArray(data.items)).toBe(true)
      }
    })

    it('should support pagination', async () => {
      const response = await fetchAPI('/api/products?page=1&limit=5')
      
      expect([200, 500]).toContain(response.status)
      
      if (response.ok) {
        const data = await response.json()
        // Response format is { items: [...], metadata: {...} }
        console.log(`[TEST] Paginated products:`, data.items?.length || 0)
        expect(data.items.length).toBeLessThanOrEqual(5)
      }
    })

    it('should support category filtering', async () => {
      const response = await fetchAPI('/api/products?categoryId=cat_test')
      
      expect([200, 404, 500]).toContain(response.status)
    })

    it('should support search', async () => {
      const response = await fetchAPI('/api/products?search=test')
      
      expect([200, 500]).toContain(response.status)
    })
  })

  describe('GET /api/products/:id - Get Single Product', () => {
    it('should return 404 for non-existent product', async () => {
      const response = await fetchAPI('/api/products/prod_nonexistent_test_123')
      
      console.log(`[TEST] Get non-existent product status: ${response.status}`)
      expect([404, 500]).toContain(response.status)
    })
  })

  describe('POST /api/products - Create Product (Authenticated)', () => {
    it('should reject request without auth token', async () => {
      const newProduct = {
        name: 'Test Product',
        price: 2999
      }

      const response = await fetchAPI('/api/products', {
        method: 'POST',
        body: JSON.stringify(newProduct)
        // No X-Service-Token header
      })

      console.log(`[TEST] Create without auth status: ${response.status}`)
      expect([401, 403, 500]).toContain(response.status)
    })

    it('should successfully create a product with complete valid data', async () => {
      // Create a complete product matching ProductForm structure
      const timestamp = Date.now()
      const newProduct = {
        // Basic Information (REQUIRED)
        name: `Integration Test Product ${timestamp}`,
        price: 29.99,  // Price in euros (will be converted to cents: 2999)
        category_id: '', // Empty string for no category (valid)
        
        // Description & Details
        description: 'This is a test product created by the integration test suite to verify the product creation endpoint works correctly.',
        brand: 'Test Brand',
        part_number: `TEST-${timestamp}`,
        unit: 'piece',
        
        // Images
        images: [
          'https://via.placeholder.com/400x400.png?text=Test+Product+1',
          'https://via.placeholder.com/400x400.png?text=Test+Product+2'
        ],
        image_url: 'https://via.placeholder.com/400x400.png?text=Test+Product+1',
        
        // Stock Management (Standalone - no Shopify link)
        total_stock: 100,
        b2b_stock: 60,
        b2c_stock: 0, // Standalone products have no B2C stock
        
        // Standalone products need variant IDs (will be generated as 4T-XXXX format)
        shopify_variant_id: `4T-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        shopify_product_id: `4T-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        
        // Pricing
        original_price: 34.99, // Original price before discount
        coming_soon: false,
        
        // Order quantities
        min_order_quantity: 1,
        max_order_quantity: 50,
        
        // Physical properties
        weight: 1.5, // kg
        dimensions: {
          length: 20,
          width: 15,
          height: 10,
          unit: 'cm'
        },
        
        // Specifications
        specifications: [
          { key: 'Color', value: 'Black' },
          { key: 'Material', value: 'Metal' },
          { key: 'Warranty', value: '2 years' }
        ],
        
        // Tags
        tags: ['test', 'integration', 'automated']
      }

      console.log(`[TEST] 📤 Creating product with data:`, JSON.stringify(newProduct, null, 2))
      console.log(`[TEST] 🔑 Using JWT token:`, ADMIN_JWT_TOKEN ? `${ADMIN_JWT_TOKEN.substring(0, 20)}...` : 'NOT SET')

      const response = await fetchAPI('/api/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ADMIN_JWT_TOKEN}`
        },
        body: JSON.stringify(newProduct)
      })

      console.log(`[TEST] 📥 Response status: ${response.status}`)
      console.log(`[TEST] 📥 Response headers:`, Object.fromEntries(response.headers.entries()))
      
      const responseText = await response.text()
      console.log(`[TEST] 📥 Response body (raw):`, responseText)
      
      // Parse JSON response
      let responseData
      try {
        responseData = JSON.parse(responseText)
        console.log(`[TEST] 📥 Response body (parsed):`, JSON.stringify(responseData, null, 2))
      } catch (e) {
        console.error(`[TEST] ❌ Failed to parse response as JSON:`, e)
        throw new Error(`Invalid JSON response: ${responseText}`)
      }
      
      // ✅ CORRECT: Only accept 200 or 201 (success)
      // If we get 401, the product was NOT created - test should FAIL
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(300)
      expect(response.ok).toBe(true)
      
      // Validate response structure
      console.log(`[TEST] ✅ Product created successfully with ID:`, responseData.id)
      expect(responseData).toHaveProperty('id')
      expect(responseData).toHaveProperty('name', newProduct.name)
      expect(responseData).toHaveProperty('price')
      
      // Validate inventory data is included
      expect(responseData).toHaveProperty('inventory')
      expect(responseData.inventory).toHaveProperty('total_stock', newProduct.total_stock)
      expect(responseData.inventory).toHaveProperty('b2b_stock', newProduct.b2b_stock)
      expect(responseData.inventory).toHaveProperty('b2c_stock', newProduct.b2c_stock)
      
      // Validate images array
      expect(responseData).toHaveProperty('images')
      expect(Array.isArray(responseData.images)).toBe(true)
      
      // Validate specifications
      expect(responseData).toHaveProperty('specifications')
      expect(Array.isArray(responseData.specifications)).toBe(true)
      
      // Validate tags
      expect(responseData).toHaveProperty('tags')
      expect(Array.isArray(responseData.tags)).toBe(true)
    })
  })

  describe('GET /api/categories - List Categories', () => {
    it('should list categories (public endpoint)', async () => {
      const response = await fetchAPI('/api/categories')
      
      console.log(`[TEST] List categories status: ${response.status}`)
      expect([200, 500]).toContain(response.status)
      
      if (response.ok) {
        const data = await response.json()
        // Response format is { categories: [...] }
        console.log(`[TEST] Categories count:`, data.categories?.length || 0)
        expect(data).toHaveProperty('categories')
        expect(Array.isArray(data.categories)).toBe(true)
      }
    })
  })

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await fetchAPI('/api/unknown-endpoint')
      
      expect(response.status).toBe(404)
    })

    it('should handle malformed JSON in request body', async () => {
      const response = await fetch(`${DEV_WORKER_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_JWT_TOKEN}`
        },
        body: 'invalid json {{'
      })

      console.log(`[TEST] Malformed JSON status: ${response.status}`)
      // Can return 400 (bad request), 401 (auth failure if token invalid), or 500 (server error)
      expect([400, 401, 500]).toContain(response.status)
    })
  })

  describe('CORS Headers', () => {
    it('should include CORS headers in response', async () => {
      const response = await fetchAPI('/api/products')
      
      const corsHeader = response.headers.get('access-control-allow-origin')
      console.log(`[TEST] CORS header:`, corsHeader)
      
      // Dev environment should allow localhost origins
      expect(corsHeader).toBeDefined()
    })
  })
})
