/**
 * Authentication Helpers for Integration Tests
 *
 * Programmatically login and get JWT tokens for testing
 */

export interface TestUser {
  email: string;
  password: string;
  role: 'admin' | 'user';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Login as a test user and get JWT tokens
 *
 * @param workerUrl - API Gateway URL
 * @param email - User email
 * @param password - User password
 * @returns JWT tokens
 */
export async function loginAsUser(
  workerUrl: string,
  email: string,
  password: string
): Promise<AuthTokens> {
  const response = await fetch(`${workerUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Login failed: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
  };
}

/**
 * Login as admin test user
 *
 * Uses TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD from environment
 */
export async function loginAsAdmin(workerUrl: string): Promise<AuthTokens> {
  const email = process.env.TEST_ADMIN_EMAIL;
  const password = process.env.TEST_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD environment variables required.\n' +
        'Set them with: export TEST_ADMIN_EMAIL="admin@test.com" TEST_ADMIN_PASSWORD="password"'
    );
  }

  return loginAsUser(workerUrl, email, password);
}

/**
 * Verify token is valid
 */
export async function verifyToken(workerUrl: string, accessToken: string): Promise<boolean> {
  const response = await fetch(`${workerUrl}/auth/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accessToken }),
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return data.valid === true;
}

/**
 * Get fresh tokens (use this in beforeAll/beforeEach)
 */
export async function getFreshAdminToken(workerUrl: string): Promise<string> {
  console.log('[AUTH] Logging in as admin...');
  const tokens = await loginAsAdmin(workerUrl);
  console.log('[AUTH] ✅ Admin login successful');
  return tokens.accessToken;
}
