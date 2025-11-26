import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Load .env file from tests directory
  const env = loadEnv(mode, './tests', '')
  
  return {
    test: {
      globals: true,
      environment: 'node',
      // Load environment variables from tests/.env
      env: {
        ...env,
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'tests/', '.wrangler/']
      },
      testTimeout: 30000, // 30 seconds for E2E tests with real services
      hookTimeout: 60000, // 60 seconds for setup/teardown (login, cleanup)
      // Test file patterns
      include: [
        'tests/**/*.test.ts',
      ],
      // Exclude patterns
      exclude: [
        'node_modules/**',
        '.wrangler/**',
      ],
      // Reporter configuration
      reporters: ['verbose'],
      // Fail fast on first error in CI
      bail: process.env.CI ? 1 : 0,
      // Sequence configuration - run tests in order for integration tests
      sequence: {
        shuffle: false, // Don't shuffle integration tests
      },
    },
  }
})
