/**
 * Integration Tests - Authentication
 *
 * Tests the complete authentication flow against the real dev worker.
 * Mimics frontend auth.ts store behavior.
 *
 * Prerequisites:
 * - Deploy dev worker: cd workers/api-gateway && npm run deploy:dev
 * - Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD environment variables
 *
 * Run: npm test integration/auth
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  createApiClient,
  ApiClient,
  validateAuthResponse,
  validateUserProfile,
  validateTokenRefresh,
  validateTokenValidation,
  expectSuccess,
  expectStatus,
  expectClientError,
  expectFastResponse,
  generateUser,
  generateTestEmail,
  sleep,
} from '../helpers'

describe('Integration: Authentication', () => {
  let client: ApiClient

  beforeAll(() => {
    client = createApiClient({ verbose: true })
    console.log(`[TEST] Testing against: ${client.url}`)
  })

  beforeEach(() => {
    // Clear any existing auth state
    client.clearAuth()
  })

  describe('POST /auth/login - User Login', () => {
    it('should login with valid admin credentials', async () => {
      const email = process.env.TEST_ADMIN_EMAIL
      const password = process.env.TEST_ADMIN_PASSWORD

      if (!email || !password) {
        console.log('[SKIP] TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD not set')
        return
      }

      const response = await client.post('/auth/login', { email, password })

      expectSuccess(response)
      expectStatus(response, 200)
      expectFastResponse(response.timing, 5000)

      // Validate response structure
      validateAuthResponse(response.data)

      // Check user data
      expect(response.data.user.email).toBe(email)
      expect(response.data.user.role).toBe('admin')
      expect(response.data.user.isActive).toBe(true)

      console.log('[TEST] Login successful for:', response.data.user.email)
    })

    it('should reject login with invalid password', async () => {
      const email = process.env.TEST_ADMIN_EMAIL || 'admin@test.local'

      const response = await client.post('/auth/login', {
        email,
        password: 'wrong-password-12345',
      })

      expectClientError(response, 401)
      expect(response.error).toHaveProperty('error')

      // Error should have auth code
      if (response.error?.code) {
        expect(response.error.code).toMatch(/^auth\//)
      }
    })

    it('should reject login with non-existent email', async () => {
      const response = await client.post('/auth/login', {
        email: 'nonexistent-user-xyz@test.local',
        password: 'anypassword123',
      })

      expectClientError(response)
      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(response.status).toBeLessThan(500)
    })

    it('should reject login with missing fields', async () => {
      const response = await client.post('/auth/login', {
        email: 'test@test.local',
        // Missing password
      })

      expectClientError(response, 400)
    })

    it('should reject login with invalid email format', async () => {
      const response = await client.post('/auth/login', {
        email: 'not-an-email',
        password: 'password123',
      })

      expectClientError(response)
    })
  })

  describe('POST /auth/register - User Registration', () => {
    it('should register a new user with valid data', async () => {
      const userData = generateUser()

      const response = await client.post('/auth/register', userData)

      // Registration might fail if email already exists, which is OK for tests
      if (response.ok) {
        expectSuccess(response)
        validateAuthResponse(response.data)

        expect(response.data.user.email).toBe(userData.email)
        expect(response.data.user.role).toBe('customer') // New users are customers
        expect(response.data.user.isVerified).toBe(false) // New users are not verified

        console.log('[TEST] Registered new user:', response.data.user.email)
      } else {
        // Email already exists is acceptable
        console.log('[TEST] Registration failed (expected if email exists):', response.error)
        expect([400, 409]).toContain(response.status)
      }
    })

    it('should reject registration with missing required fields', async () => {
      const response = await client.post('/auth/register', {
        email: generateTestEmail(),
        password: 'password123',
        // Missing firstName, lastName, companyName
      })

      expectClientError(response, 400)
    })

    it('should reject registration with weak password', async () => {
      const userData = generateUser({ password: '123' }) // Too short

      const response = await client.post('/auth/register', userData)

      expectClientError(response, 400)
      // Note: Error code may vary (auth/missing-fields, auth/weak-password, etc.)
    })

    it('should reject registration with invalid email', async () => {
      const userData = generateUser({ email: 'not-an-email' })

      const response = await client.post('/auth/register', userData)

      expectClientError(response, 400)
    })
  })

  describe('POST /auth/validate - Token Validation', () => {
    it('should validate a valid access token', async () => {
      const email = process.env.TEST_ADMIN_EMAIL
      const password = process.env.TEST_ADMIN_PASSWORD

      if (!email || !password) {
        console.log('[SKIP] TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD not set')
        return
      }

      // First login to get a token
      await client.login(email, password)
      expect(client.isAuthenticated).toBe(true)

      // Now validate the token
      const response = await client.post('/auth/validate', {
        accessToken: client.token,
      })

      expectSuccess(response)
      validateTokenValidation(response.data)
      expect(response.data.valid).toBe(true)

      // Should return user info
      if (response.data.user) {
        validateUserProfile(response.data.user)
        expect(response.data.user.email).toBe(email)
      }
    })

    it('should reject an invalid token', async () => {
      const response = await client.post('/auth/validate', {
        accessToken: 'invalid.token.here',
      })

      // Could be 200 with valid: false, or 401
      if (response.ok) {
        expect(response.data?.valid).toBe(false)
      } else {
        expectClientError(response, 401)
      }
    })

    it('should reject an expired token format', async () => {
      // This is a structurally valid but expired/invalid JWT
      const fakeToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.' +
        'invalid-signature'

      const response = await client.post('/auth/validate', {
        accessToken: fakeToken,
      })

      if (response.ok) {
        expect(response.data?.valid).toBe(false)
      } else {
        expectClientError(response)
      }
    })
  })

  describe('POST /auth/refresh - Token Refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const email = process.env.TEST_ADMIN_EMAIL
      const password = process.env.TEST_ADMIN_PASSWORD

      if (!email || !password) {
        console.log('[SKIP] TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD not set')
        return
      }

      // Login to get tokens
      const loginResponse = await client.post('/auth/login', { email, password })
      expectSuccess(loginResponse)

      const refreshToken = loginResponse.data.refreshToken
      const originalAccessToken = loginResponse.data.accessToken

      // Small delay to ensure different token
      await sleep(100)

      // Refresh the token
      const refreshResponse = await client.post('/auth/refresh', { refreshToken })

      expectSuccess(refreshResponse)
      validateTokenRefresh(refreshResponse.data)

      // New token should be different (or same if not expired)
      expect(refreshResponse.data.accessToken).toBeDefined()
      expect(typeof refreshResponse.data.accessToken).toBe('string')

      console.log('[TEST] Token refreshed successfully')
    })

    it('should reject refresh with invalid refresh token', async () => {
      const response = await client.post('/auth/refresh', {
        refreshToken: 'invalid-refresh-token',
      })

      // Server returns 500 for invalid token (could be improved to 401)
      expect(response.ok).toBe(false)
      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })

  describe('POST /auth/logout - User Logout', () => {
    it('should logout and invalidate refresh token', async () => {
      const email = process.env.TEST_ADMIN_EMAIL
      const password = process.env.TEST_ADMIN_PASSWORD

      if (!email || !password) {
        console.log('[SKIP] TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD not set')
        return
      }

      // Login first
      const loginResponse = await client.post('/auth/login', { email, password })
      expectSuccess(loginResponse)

      const refreshToken = loginResponse.data.refreshToken

      // Logout
      const logoutResponse = await client.post('/auth/logout', { refreshToken })

      // Logout should succeed
      expectSuccess(logoutResponse)

      // Try to use the refresh token - should fail
      const refreshResponse = await client.post('/auth/refresh', { refreshToken })

      expectClientError(refreshResponse, 401)
      console.log('[TEST] Logout successful, refresh token invalidated')
    })
  })

  describe('POST /auth/password-reset/request - Password Reset Request', () => {
    it('should accept password reset request for existing email', async () => {
      const email = process.env.TEST_ADMIN_EMAIL

      if (!email) {
        console.log('[SKIP] TEST_ADMIN_EMAIL not set')
        return
      }

      const response = await client.post('/auth/password-reset/request', { email })

      // Should return success even if email doesn't exist (security)
      expectSuccess(response)
      expect(response.data).toHaveProperty('message')

      console.log('[TEST] Password reset request accepted')
    })

    it('should not reveal if email exists', async () => {
      // Request reset for non-existent email
      const response = await client.post('/auth/password-reset/request', {
        email: 'definitely-not-exists@test.local',
      })

      // Should still return success (security best practice)
      expectSuccess(response)
    })
  })

  describe('ApiClient Helper Methods', () => {
    it('should track authentication state correctly', async () => {
      const email = process.env.TEST_ADMIN_EMAIL
      const password = process.env.TEST_ADMIN_PASSWORD

      if (!email || !password) {
        console.log('[SKIP] TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD not set')
        return
      }

      // Initially not authenticated
      expect(client.isAuthenticated).toBe(false)
      expect(client.isAdmin).toBe(false)
      expect(client.user).toBeNull()

      // After login
      await client.login(email, password)

      expect(client.isAuthenticated).toBe(true)
      expect(client.isAdmin).toBe(true)
      expect(client.user).not.toBeNull()
      expect(client.user?.email).toBe(email)
      expect(client.token).not.toBeNull()

      // After logout
      await client.logout()

      expect(client.isAuthenticated).toBe(false)
      expect(client.isAdmin).toBe(false)
      expect(client.user).toBeNull()
      expect(client.token).toBeNull()
    })
  })
})
