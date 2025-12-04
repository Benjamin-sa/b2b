/**
 * API Client for Integration Tests
 *
 * Mimics frontend Vue store behavior for realistic testing.
 * Provides:
 * - Authenticated requests with auto token refresh
 * - Response logging and debugging
 * - Request/Response timing
 * - Clean error handling
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TestConfig {
  baseUrl: string
  adminEmail?: string
  adminPassword?: string
  userEmail?: string
  userPassword?: string
  verbose?: boolean
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn?: number
}

export interface UserProfile {
  uid: string
  email: string
  role: 'admin' | 'customer'
  companyName?: string
  firstName?: string
  lastName?: string
  isVerified: boolean
  isActive: boolean
  stripeCustomerId?: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: UserProfile
}

export interface ApiResponse<T = any> {
  status: number
  ok: boolean
  data: T | null
  error: ApiError | null
  headers: Headers
  timing: number
  raw: Response
}

export interface ApiError {
  error: string
  code?: string
  message?: string
  details?: any
}

// ============================================================================
// API CLIENT CLASS
// ============================================================================

export class ApiClient {
  private baseUrl: string
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private userProfile: UserProfile | null = null
  private verbose: boolean

  constructor(config: TestConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.verbose = config.verbose ?? false
  }

  // ============================================================================
  // AUTH METHODS (mimics auth.ts store)
  // ============================================================================

  /**
   * Login with email and password
   * Mimics: auth.ts login()
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.post<LoginResponse>('/auth/login', {
      email,
      password,
    })

    if (!response.ok || !response.data) {
      throw new Error(
        `Login failed: ${response.error?.message || response.error?.error || 'Unknown error'}`
      )
    }

    // Store tokens (mimics saveAuthData)
    this.accessToken = response.data.accessToken
    this.refreshToken = response.data.refreshToken
    this.userProfile = response.data.user

    this.log('✅ Logged in as:', response.data.user.email)
    return response.data
  }

  /**
   * Register a new user
   * Mimics: auth.ts register()
   */
  async register(data: {
    email: string
    password: string
    firstName: string
    lastName: string
    companyName: string
    phone?: string
    btwNumber?: string
  }): Promise<LoginResponse> {
    const response = await this.post<LoginResponse>('/auth/register', data)

    if (!response.ok || !response.data) {
      throw new Error(
        `Registration failed: ${response.error?.message || response.error?.error || 'Unknown error'}`
      )
    }

    // Store tokens
    this.accessToken = response.data.accessToken
    this.refreshToken = response.data.refreshToken
    this.userProfile = response.data.user

    this.log('✅ Registered as:', response.data.user.email)
    return response.data
  }

  /**
   * Refresh access token
   * Mimics: auth.ts refreshAccessToken()
   */
  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      this.log('⚠️ No refresh token available')
      return false
    }

    const response = await this.post<{ accessToken: string }>('/auth/refresh', {
      refreshToken: this.refreshToken,
    })

    if (!response.ok || !response.data?.accessToken) {
      this.log('❌ Token refresh failed')
      this.clearAuth()
      return false
    }

    this.accessToken = response.data.accessToken
    this.log('✅ Access token refreshed')
    return true
  }

  /**
   * Logout and clear tokens
   * Mimics: auth.ts logout()
   */
  async logout(): Promise<void> {
    if (this.refreshToken) {
      try {
        await this.post('/auth/logout', { refreshToken: this.refreshToken })
      } catch (e) {
        // Ignore errors during logout
      }
    }
    this.clearAuth()
    this.log('✅ Logged out')
  }

  /**
   * Validate current token
   * Mimics: auth.ts validateToken()
   */
  async validateToken(): Promise<{ valid: boolean; user?: UserProfile }> {
    if (!this.accessToken) {
      return { valid: false }
    }

    const response = await this.post<{ valid: boolean; user?: UserProfile }>(
      '/auth/validate',
      { accessToken: this.accessToken }
    )

    if (!response.ok || !response.data?.valid) {
      return { valid: false }
    }

    if (response.data.user) {
      this.userProfile = response.data.user
    }

    return response.data
  }

  /**
   * Clear all auth data
   */
  clearAuth(): void {
    this.accessToken = null
    this.refreshToken = null
    this.userProfile = null
  }

  /**
   * Check if client is authenticated
   */
  get isAuthenticated(): boolean {
    return !!this.accessToken
  }

  /**
   * Check if current user is admin
   */
  get isAdmin(): boolean {
    return this.userProfile?.role === 'admin'
  }

  /**
   * Get current user profile
   */
  get user(): UserProfile | null {
    return this.userProfile
  }

  /**
   * Get current access token (for manual requests)
   */
  get token(): string | null {
    return this.accessToken
  }

  // ============================================================================
  // HTTP METHODS
  // ============================================================================

  /**
   * Make GET request
   */
  async get<T = any>(
    path: string,
    options: { auth?: boolean; params?: Record<string, string> } = {}
  ): Promise<ApiResponse<T>> {
    const { auth = false, params } = options
    let url = path

    if (params) {
      const searchParams = new URLSearchParams(params)
      url = `${path}?${searchParams.toString()}`
    }

    return this.request<T>('GET', url, undefined, auth)
  }

  /**
   * Make POST request
   */
  async post<T = any>(
    path: string,
    body?: any,
    options: { auth?: boolean } = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body, options.auth ?? false)
  }

  /**
   * Make PATCH request
   */
  async patch<T = any>(
    path: string,
    body?: any,
    options: { auth?: boolean } = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, body, options.auth ?? false)
  }

  /**
   * Make PUT request
   */
  async put<T = any>(
    path: string,
    body?: any,
    options: { auth?: boolean } = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body, options.auth ?? false)
  }

  /**
   * Make DELETE request
   */
  async delete<T = any>(
    path: string,
    options: { auth?: boolean } = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, undefined, options.auth ?? false)
  }

  // ============================================================================
  // CORE REQUEST METHOD
  // ============================================================================

  /**
   * Core request method with timing, auth, and error handling
   * Mimics: auth.ts authenticatedFetch() behavior
   */
  private async request<T>(
    method: string,
    path: string,
    body?: any,
    auth: boolean = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`
    const startTime = Date.now()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (auth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    this.log(`📤 ${method} ${path}`, body ? JSON.stringify(body).substring(0, 200) : '')

    let response: Response

    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })
    } catch (fetchError: any) {
      const timing = Date.now() - startTime
      this.log(`❌ Network error (${timing}ms):`, fetchError.message)
      return {
        status: 0,
        ok: false,
        data: null,
        error: { error: 'NetworkError', message: fetchError.message },
        headers: new Headers(),
        timing,
        raw: new Response(null, { status: 0 }),
      }
    }

    const timing = Date.now() - startTime

    // Handle 401 with auto-refresh (mimics authenticatedFetch)
    if (response.status === 401 && auth && this.refreshToken) {
      this.log('⚠️ Got 401, attempting token refresh...')
      const refreshed = await this.refreshAccessToken()

      if (refreshed) {
        // Retry with new token
        headers['Authorization'] = `Bearer ${this.accessToken}`
        response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        })
      }
    }

    // Parse response
    let data: T | null = null
    let error: ApiError | null = null

    const responseText = await response.text()

    try {
      const json = JSON.parse(responseText)

      if (response.ok) {
        data = json as T
      } else {
        error = json as ApiError
      }
    } catch {
      // Non-JSON response
      if (!response.ok) {
        error = { error: 'ParseError', message: responseText || response.statusText }
      }
    }

    this.log(
      `📥 ${response.status} ${response.statusText} (${timing}ms)`,
      response.ok ? '' : JSON.stringify(error)
    )

    return {
      status: response.status,
      ok: response.ok,
      data,
      error,
      headers: response.headers,
      timing,
      raw: response,
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private log(...args: any[]): void {
    if (this.verbose) {
      console.log('[ApiClient]', ...args)
    }
  }

  /**
   * Set tokens manually (for tests that need to skip login)
   */
  setTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.accessToken
    this.refreshToken = tokens.refreshToken
  }

  /**
   * Set user profile manually
   */
  setUser(user: UserProfile): void {
    this.userProfile = user
  }

  /**
   * Get base URL
   */
  get url(): string {
    return this.baseUrl
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new API client with default test config
 */
export function createApiClient(config?: Partial<TestConfig>): ApiClient {
  const baseUrl =
    config?.baseUrl ||
    process.env.API_GATEWAY_DEV_URL ||
    'https://b2b-api-gateway-dev.benkee-sauter.workers.dev'

  return new ApiClient({
    baseUrl,
    verbose: config?.verbose ?? process.env.TEST_VERBOSE === 'true',
    ...config,
  })
}

/**
 * Create an API client and login as admin
 */
export async function createAdminClient(config?: Partial<TestConfig>): Promise<ApiClient> {
  const client = createApiClient(config)

  const email = process.env.TEST_ADMIN_EMAIL
  const password = process.env.TEST_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error(
      'TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD environment variables are required.\n' +
        'Set them in workers/api-gateway/tests/.env or export them directly.'
    )
  }

  await client.login(email, password)
  return client
}

/**
 * Create an API client and login as regular user
 */
export async function createUserClient(config?: Partial<TestConfig>): Promise<ApiClient> {
  const client = createApiClient(config)

  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD

  if (!email || !password) {
    throw new Error(
      'TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required.\n' +
        'Set them in workers/api-gateway/tests/.env or export them directly.'
    )
  }

  await client.login(email, password)
  return client
}

/**
 * Check if admin credentials are configured
 */
export function hasAdminCredentials(): boolean {
  return !!(process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD)
}

/**
 * Check if user credentials are configured
 */
export function hasUserCredentials(): boolean {
  return !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD)
}
