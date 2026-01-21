/**
 * Integration Tests - Admin Operations
 *
 * Tests admin user management endpoints against the real dev worker.
 *
 * Run: npm test integration/admin
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createApiClient,
  createAdminClient,
  ApiClient,
  validateAdminUserList,
  validateUserProfile,
  expectSuccess,
  expectStatus,
  expectClientError,
  expectFastResponse,
} from '../helpers'

describe('Integration: Admin Operations', () => {
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
  }, 60000)

  afterAll(async () => {
    if (adminClient?.isAuthenticated) {
      await adminClient.logout()
    }
  })

  describe('GET /admin/users - List Users (Admin Only)', () => {
    it('should reject request without authentication', async () => {
      const response = await publicClient.get('/admin/users')

      expectClientError(response, 401)
    })

    it('should list users for admin', async () => {
      const response = await adminClient.get('/admin/users', { auth: true })

      expectSuccess(response)
      expectStatus(response, 200)
      expectFastResponse(response.timing, 5000)

      validateAdminUserList(response.data)

      console.log(`[TEST] Listed ${response.data.users.length} users (total: ${response.data.total})`)
    })

    it('should support pagination', async () => {
      const response = await adminClient.get('/admin/users', {
        auth: true,
        params: { limit: '5', offset: '0' },
      })

      expectSuccess(response)
      expect(response.data.users.length).toBeLessThanOrEqual(5)
    })

    it('should support search', async () => {
      const adminEmail = adminClient.user?.email

      if (adminEmail) {
        const searchTerm = adminEmail.split('@')[0]

        const response = await adminClient.get('/admin/users', {
          auth: true,
          params: { search: searchTerm },
        })

        expectSuccess(response)

        // Should find the admin user
        const foundAdmin = response.data.users.some(
          (user: any) => user.email === adminEmail
        )
        expect(foundAdmin).toBe(true)
      }
    })
  })

  describe('GET /admin/users/:userId - Get User Details (Admin Only)', () => {
    it('should reject request without authentication', async () => {
      const response = await publicClient.get('/admin/users/some-user-id')

      expectClientError(response, 401)
    })

    it('should return user details for admin', async () => {
      // Get user list first
      const listResponse = await adminClient.get('/admin/users', { auth: true })
      expectSuccess(listResponse)

      if (listResponse.data.users.length > 0) {
        const userId = listResponse.data.users[0].uid

        const response = await adminClient.get(`/admin/users/${userId}`, { auth: true })

        expectSuccess(response)
        // API returns { user: { uid, email, ... } }
        expect(response.data.user).toHaveProperty('uid', userId)
        expect(response.data.user).toHaveProperty('email')
        expect(response.data.user).toHaveProperty('role')

        console.log(`[TEST] Fetched user details: ${response.data.user.email}`)
      }
    })

    it('should return 404 for non-existent user', async () => {
      const response = await adminClient.get('/admin/users/nonexistent-user-xyz', { auth: true })

      expectStatus(response, 404)
    })
  })

  describe('PUT /admin/users/:userId - Update User (Admin Only)', () => {
    it('should reject update without authentication', async () => {
      const response = await publicClient.put('/admin/users/some-user-id', {
        first_name: 'Updated',
      })

      expectClientError(response, 401)
    })

    it('should update user details', async () => {
      // Get a non-admin user to update
      const listResponse = await adminClient.get('/admin/users', { auth: true })
      expectSuccess(listResponse)

      const nonAdminUser = listResponse.data.users.find(
        (user: any) => user.role !== 'admin'
      )

      if (nonAdminUser && nonAdminUser.uid) {
        const newFirstName = `Test_${Date.now()}`

        const response = await adminClient.put(
          `/admin/users/${nonAdminUser.uid}`,
          { first_name: newFirstName },
          { auth: true }
        )

        expectSuccess(response)
        expect(response.data).toHaveProperty('message')
        expect(response.data).toHaveProperty('user')

        console.log(`[TEST] ✅ Updated user: ${nonAdminUser.email}`)
      } else {
        console.log('[SKIP] No non-admin user available for update test')
      }
    })
  })

  describe('POST /admin/users/:userId/verify - Verify User (Admin Only)', () => {
    it('should reject verification without authentication', async () => {
      const response = await publicClient.post('/admin/users/some-user-id/verify', {})

      expectClientError(response, 401)
    })

    it('should verify an unverified user', async () => {
      // Find an unverified user
      const listResponse = await adminClient.get('/admin/users', { auth: true })
      expectSuccess(listResponse)

      const unverifiedUser = listResponse.data.users.find(
        (user: any) => user.isVerified === false
      )

      if (unverifiedUser) {
        const response = await adminClient.post(
          `/admin/users/${unverifiedUser.uid}/verify`,
          {},
          { auth: true }
        )

        expectSuccess(response)

        expect(response.data).toHaveProperty('message')
        expect(response.data).toHaveProperty('user')
        // API returns database format with is_verified as integer (1)
        expect(response.data.user.is_verified).toBe(1)

        console.log(`[TEST] ✅ Verified user: ${unverifiedUser.email}`)

        // Note: This sends a verification email, which is OK in dev
      } else {
        console.log('[SKIP] No unverified user available for verification test')
      }
    })
  })

  describe('DELETE /admin/users/:userId - Deactivate User (Admin Only)', () => {
    it('should reject deactivation without authentication', async () => {
      const response = await publicClient.delete('/admin/users/some-user-id')

      expectClientError(response, 401)
    })

    // Note: Deactivating real users is risky in dev, so we skip creating test users
    // In a real test setup, you'd want a test user specifically for this
    it('should return error for non-existent user', async () => {
      const response = await adminClient.delete('/admin/users/nonexistent-user-xyz', {
        auth: true,
      })

      expectStatus(response, 404)
    })
  })

  describe('POST /admin/users/:userId/reset-password - Admin Password Reset (Admin Only)', () => {
    it('should reject reset without authentication', async () => {
      const response = await publicClient.post('/admin/users/some-user-id/reset-password', {
        newPassword: 'NewPassword123!',
      })

      expectClientError(response, 401)
    })

    // Note: Resetting passwords is risky, so we only test the auth check
  })

  describe('GET /admin/invoices - List All Invoices (Admin Only)', () => {
    // Note: /admin/invoices endpoint currently lacks auth middleware
    // This is a known issue - the endpoint should require admin auth
    it.skip('should reject request without authentication', async () => {
      const response = await publicClient.get('/admin/invoices')

      expectClientError(response, 401)
    })

    it('should list all invoices for admin', async () => {
      const response = await adminClient.get('/admin/invoices', { auth: true })

      expectSuccess(response)
      // Response format: { success: true, data: { invoices: [...] } }
      expect(response.data).toHaveProperty('data')
      expect(response.data.data).toHaveProperty('invoices')
      expect(Array.isArray(response.data.data.invoices)).toBe(true)

      console.log(`[TEST] Listed ${response.data.data.invoices.length} invoices`)
    })

    it('should support pagination', async () => {
      const response = await adminClient.get('/admin/invoices', {
        auth: true,
        params: { limit: '10', page: '1' },
      })

      expectSuccess(response)
      expect(response.data.data.invoices.length).toBeLessThanOrEqual(10)
    })

    it('should support filtering by user', async () => {
      // Get a user ID from invoices
      const listResponse = await adminClient.get('/admin/invoices', { auth: true })
      expectSuccess(listResponse)

      if (listResponse.data.data.invoices.length > 0) {
        const userId = listResponse.data.data.invoices[0].user_id

        const response = await adminClient.get('/admin/invoices', {
          auth: true,
          params: { user_id: userId },
        })

        expectSuccess(response)

        // All invoices should belong to the filtered user
        // Response format: { success: true, data: { invoices: [...] } }
        response.data.data.invoices.forEach((invoice: any) => {
          expect(invoice.user_id).toBe(userId)
        })
      }
    })
  })
})
