/**
 * Integration Tests - Health Checks
 *
 * Tests basic API Gateway health endpoints.
 * These are the fastest tests and serve as a smoke test.
 *
 * Run: npm test integration/health
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {
  createApiClient,
  ApiClient,
  validateHealthCheck,
  validateSimpleHealth,
  validate404Error,
  expectSuccess,
  expectStatus,
  expectFastResponse,
  validateCorsHeaders,
} from '../helpers'

describe('Integration: Health Checks', () => {
  let client: ApiClient

  beforeAll(() => {
    client = createApiClient({ verbose: true })
    console.log(`[TEST] Testing against: ${client.url}`)
  })

  describe('GET / - Root Health Check', () => {
    it('should return healthy status with service info', async () => {
      const response = await client.get('/')

      expectSuccess(response)
      expectStatus(response, 200)
      expectFastResponse(response.timing, 3000)

      // Validate response structure
      validateHealthCheck(response.data)

      // Log service info
      console.log('[TEST] Service info:', {
        service: response.data.service,
        version: response.data.version,
        environment: response.data.environment,
      })
    })

    it('should include CORS headers', async () => {
      const response = await client.get('/')

      expectSuccess(response)
      validateCorsHeaders(response.headers)
    })

    it('should have valid timestamp in ISO format', async () => {
      const response = await client.get('/')

      expectSuccess(response)
      expect(response.data).toHaveProperty('timestamp')

      const timestamp = new Date(response.data.timestamp)
      expect(timestamp.toISOString()).toBe(response.data.timestamp)

      // Timestamp should be recent (within last minute)
      const now = Date.now()
      const responseTime = timestamp.getTime()
      expect(now - responseTime).toBeLessThan(60000)
    })
  })

  describe('GET /health - Simple Health Check', () => {
    it('should return ok status', async () => {
      const response = await client.get('/health')

      expectSuccess(response)
      expectStatus(response, 200)
      expectFastResponse(response.timing, 2000)

      validateSimpleHealth(response.data)
    })
  })

  describe('404 Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await client.get('/api/unknown-endpoint-xyz')

      expectStatus(response, 404)
      expect(response.ok).toBe(false)

      // Validate error response structure
      validate404Error(response.error || response.data)
    })

    it('should include path in 404 error response', async () => {
      const testPath = '/api/this-does-not-exist'
      const response = await client.get(testPath)

      expectStatus(response, 404)
      expect(response.error || response.data).toHaveProperty('path')
    })
  })

  describe('CORS Preflight', () => {
    it('should handle OPTIONS preflight requests', async () => {
      // Make raw fetch for OPTIONS since ApiClient doesn't support it directly
      const response = await fetch(`${client.url}/api/products`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        },
      })

      // OPTIONS should return 200 or 204
      expect([200, 204]).toContain(response.status)

      // Check CORS headers
      const corsOrigin = response.headers.get('access-control-allow-origin')
      const corsMethods = response.headers.get('access-control-allow-methods')

      expect(corsOrigin).toBeDefined()
      if (corsMethods) {
        expect(corsMethods.toLowerCase()).toContain('post')
      }
    })
  })

  describe('Response Timing', () => {
    it('should respond quickly to health checks', async () => {
      const timings: number[] = []

      // Make 5 requests and check average timing
      for (let i = 0; i < 5; i++) {
        const response = await client.get('/health')
        expectSuccess(response)
        timings.push(response.timing)
      }

      const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length
      console.log(
        `[TEST] Health check timings: avg=${avgTiming.toFixed(0)}ms, ` +
          `min=${Math.min(...timings)}ms, max=${Math.max(...timings)}ms`
      )

      // Average should be under 2 seconds
      expect(avgTiming).toBeLessThan(2000)
    })
  })
})
