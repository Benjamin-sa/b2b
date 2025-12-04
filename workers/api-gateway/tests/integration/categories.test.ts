/**
 * Integration Tests - Categories CRUD
 *
 * Tests the complete category lifecycle against the real dev worker.
 *
 * Run: npm test integration/categories
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createApiClient,
  createAdminClient,
  ApiClient,
  validateCategory,
  validateCategoryList,
  expectSuccess,
  expectStatus,
  expectClientError,
  expectFastResponse,
  generateCategory,
  TestResourceTracker,
} from '../helpers'

describe('Integration: Categories CRUD', () => {
  let publicClient: ApiClient
  let adminClient: ApiClient
  const tracker = new TestResourceTracker()

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
    // Cleanup: Delete created categories
    const categoryIds = tracker.getCategories()
    console.log(`[CLEANUP] Deleting ${categoryIds.length} test categories...`)

    if (adminClient) {
      for (const id of categoryIds) {
        try {
          await adminClient.delete(`/api/categories/${id}`, { auth: true })
          console.log(`[CLEANUP] Deleted category: ${id}`)
        } catch (error) {
          console.warn(`[CLEANUP] Failed to delete category ${id}:`, error)
        }
      }

      if (adminClient.isAuthenticated) {
        await adminClient.logout()
      }
    }
  })

  describe('GET /api/categories - List Categories (Public)', () => {
    it('should list all categories without authentication', async () => {
      const response = await publicClient.get('/api/categories')

      expectSuccess(response)
      expectStatus(response, 200)
      expectFastResponse(response.timing, 5000)

      validateCategoryList(response.data)

      console.log(`[TEST] Listed ${response.data.categories.length} categories`)
    })

    it('should return consistent structure', async () => {
      const response = await publicClient.get('/api/categories')

      expectSuccess(response)
      expect(response.data).toHaveProperty('categories')
      expect(Array.isArray(response.data.categories)).toBe(true)

      // Each category should have required fields
      response.data.categories.forEach((category: any) => {
        expect(category).toHaveProperty('id')
        expect(category).toHaveProperty('name')
      })
    })
  })

  describe('GET /api/categories/:id - Get Single Category (Public)', () => {
    it('should return category by ID', async () => {
      // First get a valid category ID
      const listResponse = await publicClient.get('/api/categories')
      expectSuccess(listResponse)

      if (listResponse.data.categories.length > 0) {
        const categoryId = listResponse.data.categories[0].id

        const response = await publicClient.get(`/api/categories/${categoryId}`)

        expectSuccess(response)
        validateCategory(response.data)

        expect(response.data.id).toBe(categoryId)

        console.log(`[TEST] Fetched category: ${response.data.name}`)
      } else {
        console.log('[SKIP] No categories available for testing')
      }
    })

    it('should return 404 for non-existent category', async () => {
      const response = await publicClient.get('/api/categories/cat_nonexistent_12345')

      expectStatus(response, 404)
    })
  })

  describe('POST /api/categories - Create Category (Admin Only)', () => {
    it('should reject creation without authentication', async () => {
      const categoryData = generateCategory()

      const response = await publicClient.post('/api/categories', categoryData)

      expectClientError(response, 401)
    })

    it('should create category with valid data', async () => {
      const categoryData = generateCategory()

      const response = await adminClient.post('/api/categories', categoryData, { auth: true })

      expectSuccess(response)
      validateCategory(response.data)

      tracker.trackCategory(response.data.id)

      expect(response.data.name).toBe(categoryData.name)

      console.log(`[TEST] ✅ Created category: ${response.data.id}`)
    })

    it('should reject category with missing name', async () => {
      const response = await adminClient.post(
        '/api/categories',
        {
          // Missing required 'name'
          description: 'Test description',
        },
        { auth: true }
      )

      expectClientError(response, 400)
    })
  })

  describe('PUT /api/categories/:id - Update Category (Admin Only)', () => {
    let testCategoryId: string

    beforeAll(async () => {
      const categoryData = generateCategory({ name: 'Update Test Category' })
      const response = await adminClient.post('/api/categories', categoryData, { auth: true })

      if (response.ok) {
        testCategoryId = response.data.id
        tracker.trackCategory(testCategoryId)
      }
    })

    it('should reject update without authentication', async () => {
      if (!testCategoryId) {
        console.log('[SKIP] No test category available')
        return
      }

      const response = await publicClient.put(`/api/categories/${testCategoryId}`, {
        name: 'Updated Name',
      })

      expectClientError(response, 401)
    })

    it('should update category with PUT', async () => {
      if (!testCategoryId) {
        console.log('[SKIP] No test category available')
        return
      }

      const newName = `Updated Category ${Date.now()}`

      const response = await adminClient.put(
        `/api/categories/${testCategoryId}`,
        {
          name: newName,
          description: 'Updated description',
        },
        { auth: true }
      )

      expectSuccess(response)
      validateCategory(response.data)

      expect(response.data.name).toBe(newName)

      console.log(`[TEST] ✅ Updated category name to: ${newName}`)
    })
  })

  describe('PATCH /api/categories/:id - Partial Update Category (Admin Only)', () => {
    let testCategoryId: string

    beforeAll(async () => {
      const categoryData = generateCategory({ name: 'Patch Test Category' })
      const response = await adminClient.post('/api/categories', categoryData, { auth: true })

      if (response.ok) {
        testCategoryId = response.data.id
        tracker.trackCategory(testCategoryId)
      }
    })

    it('should partially update category', async () => {
      if (!testCategoryId) {
        console.log('[SKIP] No test category available')
        return
      }

      const newDescription = 'Partially updated description'

      const response = await adminClient.patch(
        `/api/categories/${testCategoryId}`,
        {
          description: newDescription,
        },
        { auth: true }
      )

      expectSuccess(response)

      expect(response.data.description).toBe(newDescription)

      console.log('[TEST] ✅ Partially updated category')
    })
  })

  describe('DELETE /api/categories/:id - Delete Category (Admin Only)', () => {
    it('should reject deletion without authentication', async () => {
      // Create a category to delete
      const categoryData = generateCategory({ name: 'Delete Test Category' })
      const createResponse = await adminClient.post('/api/categories', categoryData, { auth: true })

      if (!createResponse.ok) {
        console.log('[SKIP] Could not create test category')
        return
      }

      const categoryId = createResponse.data.id

      // Try to delete without auth
      const response = await publicClient.delete(`/api/categories/${categoryId}`)

      expectClientError(response, 401)

      // Cleanup
      await adminClient.delete(`/api/categories/${categoryId}`, { auth: true })
    })

    it('should delete category', async () => {
      const categoryData = generateCategory({ name: 'Delete Me Category' })
      const createResponse = await adminClient.post('/api/categories', categoryData, { auth: true })

      expectSuccess(createResponse)
      const categoryId = createResponse.data.id

      const response = await adminClient.delete(`/api/categories/${categoryId}`, { auth: true })

      expectSuccess(response)

      console.log(`[TEST] ✅ Deleted category: ${categoryId}`)

      // Verify deletion
      const getResponse = await publicClient.get(`/api/categories/${categoryId}`)
      expectStatus(getResponse, 404)
    })
  })

  describe('POST /api/categories/reorder - Reorder Categories (Admin Only)', () => {
    it('should reject reorder without authentication', async () => {
      const response = await publicClient.post('/api/categories/reorder', {
        order: ['cat1', 'cat2'],
      })

      expectClientError(response, 401)
    })

    it('should reorder categories with valid data', async () => {
      // Get current categories
      const listResponse = await publicClient.get('/api/categories')

      if (listResponse.data.categories.length < 2) {
        console.log('[SKIP] Need at least 2 categories for reorder test')
        return
      }

      const categoryIds = listResponse.data.categories.slice(0, 2).map((c: any) => c.id)

      // Reverse the order
      const newOrder = [...categoryIds].reverse()

      console.log(`[DEBUG] Reorder request payload: ${JSON.stringify({ categoryIds: newOrder })}`)

      // API expects { categoryIds: [...] } not { order: [...] }
      const response = await adminClient.post(
        '/api/categories/reorder',
        { categoryIds: newOrder },
        { auth: true }
      )

      console.log(`[DEBUG] Reorder response status: ${response.status}`)
      console.log(`[DEBUG] Reorder response data:`, JSON.stringify(response.data, null, 2))

      // Reorder should succeed
      expectSuccess(response)

      console.log('[TEST] ✅ Reordered categories')
    })
  })
})
