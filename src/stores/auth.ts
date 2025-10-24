import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useNotificationStore } from './notifications'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type {
  LoginCredentials,
  RegisterData,
  UserProfile,
  AuthTokens,
  ValidationResponse
} from '../types/auth'

// ============================================================================
// CONFIGURATION
// ============================================================================

const VITE_API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8787'
const ACCESS_TOKEN_KEY = 'b2b_access_token'
const REFRESH_TOKEN_KEY = 'b2b_refresh_token'
const USER_PROFILE_KEY = 'b2b_user_profile'

// ============================================================================
// STORE DEFINITION
// ============================================================================

export const useAuthStore = defineStore('auth', () => {
  // Get access to dependencies
  const notificationStore = useNotificationStore()
  const { t } = useI18n()
  const router = useRouter()

  // State
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const userProfile = ref<UserProfile | null>(null)
  const loading = ref(false)
  const error = ref('')
  const initializing = ref(true)

  // Computed properties
  const isAuthenticated = computed(() => !!accessToken.value && !!userProfile.value)
  const isAdmin = computed(() => userProfile.value?.role === 'admin')
  const isCustomer = computed(() => userProfile.value?.role === 'customer')
  const isVerified = computed(() => userProfile.value?.isVerified === true)
  const isActiveUser = computed(() => userProfile.value?.isActive === true)
  
  // Security check: Only verified and active users can access the app
  const canAccess = computed(() => 
    isAuthenticated.value && isActiveUser.value && (isAdmin.value || isVerified.value)
  )

  // ============================================================================
  // LOCALSTORAGE MANAGEMENT
  // ============================================================================

  /**
   * Save tokens and user profile to localStorage
   */
  const saveAuthData = (tokens: AuthTokens, profile: UserProfile) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile))
    
    accessToken.value = tokens.accessToken
    refreshToken.value = tokens.refreshToken
    userProfile.value = profile
  }

  /**
   * Clear tokens and user profile from localStorage
   */
  const clearAuthData = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_PROFILE_KEY)
    
    accessToken.value = null
    refreshToken.value = null
    userProfile.value = null
  }

  /**
   * Load tokens and user profile from localStorage
   */
  const loadAuthData = (): boolean => {
    try {
      const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      const storedProfile = localStorage.getItem(USER_PROFILE_KEY)
      
      if (storedAccessToken && storedRefreshToken && storedProfile) {
        accessToken.value = storedAccessToken
        refreshToken.value = storedRefreshToken
        userProfile.value = JSON.parse(storedProfile)
        return true
      }
    } catch (err) {
      console.error('Error loading auth data from localStorage:', err)
      clearAuthData()
    }
    return false
  }

  // ============================================================================
  // TOKEN MANAGEMENT
  // ============================================================================

  /**
   * Refresh the access token using the refresh token
   */
  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const currentRefreshToken = refreshToken.value || localStorage.getItem(REFRESH_TOKEN_KEY)
      
      if (!currentRefreshToken) {
        console.log('No refresh token available')
        return false
      }

      console.log('Refreshing access token...')
      const response = await fetch(`${VITE_API_GATEWAY_URL}auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: currentRefreshToken })
      })

      if (!response.ok) {
        console.log('Refresh token failed:', response.status)
        clearAuthData()
        return false
      }

      const data = await response.json()
      // Refresh endpoint only returns new accessToken, keep existing refreshToken and user
      if (data.accessToken && userProfile.value && currentRefreshToken) {
        accessToken.value = data.accessToken
        localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken)
      }
      console.log('Access token refreshed successfully')
      return true
    } catch (err) {
      console.error('Error refreshing access token:', err)
      clearAuthData()
      return false
    }
  }

  /**
   * Validate current access token and refresh user profile
   */
  const validateToken = async (): Promise<boolean> => {
    try {
      if (!accessToken.value) {
        return false
      }

      const response = await fetch(`${VITE_API_GATEWAY_URL}auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken: accessToken.value })
      })

      if (!response.ok) {
        // Try to refresh token
        return await refreshAccessToken()
      }

      const data: ValidationResponse = await response.json()
      
      if (data.valid && data.user) {
        // Update user profile with fresh data
        userProfile.value = data.user
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(data.user))
        return true
      }

      return false
    } catch (err) {
      console.error('Error validating token:', err)
      return false
    }
  }

  /**
   * Make an authenticated API request with automatic token refresh
   */
  const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    // Add Authorization header
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${accessToken.value}`
    }

    let response = await fetch(url, { ...options, headers })

    // If 401, try to refresh token and retry once
    if (response.status === 401) {
      console.log('Access token expired, attempting refresh...')
      const refreshed = await refreshAccessToken()
      
      if (refreshed) {
        // Retry request with new token
        headers.Authorization = `Bearer ${accessToken.value}`
        response = await fetch(url, { ...options, headers })
      } else {
        // Refresh failed, redirect to login
        clearAuthData()
        router.push('/auth')
        throw new Error('Session expired. Please login again.')
      }
    }

    return response
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  /**
   * Login with email and password
   */
  const login = async (credentials: LoginCredentials) => {
    loading.value = true
    error.value = ''

    try {
      console.log('Logging in:', credentials.email)
      
      const response = await fetch(`${VITE_API_GATEWAY_URL}auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Login failed')
      }

      const data = await response.json()
      
      // Save tokens and profile
      // Worker returns { accessToken, refreshToken, expiresIn, user }
      saveAuthData({ 
        accessToken: data.accessToken, 
        refreshToken: data.refreshToken 
      }, data.user)

      // Show success notification
      await notificationStore.success(
        t('auth.welcomeBack'),
        t('auth.loggedInMessage', 'You have been successfully logged in.')
      )

      console.log('Login successful:', data.user.email)
      return data.user
    } catch (err: any) {
      console.error('Login error:', err)
      error.value = err.message
      await handleAuthError(err, 'login')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Register a new user
   */
  const register = async (data: RegisterData) => {
    loading.value = true
    error.value = ''

    try {
      console.log('Registering user:', data.email)

      const response = await fetch(`${VITE_API_GATEWAY_URL}auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Registration failed')
      }

      const responseData = await response.json()
      
      // Save tokens and profile
      // Worker returns { accessToken, refreshToken, expiresIn, user }
      saveAuthData({ 
        accessToken: responseData.accessToken, 
        refreshToken: responseData.refreshToken 
      }, responseData.user)

      // Show success notification
      await notificationStore.success(
        t('auth.accountCreated'),
        t('auth.welcomeToPlatform', 'Welcome to our B2B platform! Your account has been created successfully.')
      )

      console.log('Registration successful:', responseData.user.email)
      return responseData.user
    } catch (err: any) {
      console.error('Registration error:', err)
      error.value = err.message
      await handleAuthError(err, 'register')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Logout user and clear all auth data
   */
  const logout = async () => {
    loading.value = true

    try {
      // Call logout endpoint to invalidate session on server
      if (refreshToken.value) {
        await fetch(`${VITE_API_GATEWAY_URL}auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: refreshToken.value })
        }).catch(err => {
          console.warn('Logout API call failed:', err)
          // Continue with local logout even if API call fails
        })
      }

      // Clear local auth data
      clearAuthData()

      // Show notification
      await notificationStore.info(
        t('auth.loggedOut'),
        t('auth.loggedOutMessage', 'You have been logged out successfully.')
      )

      // Redirect to login
      router.push('/auth')
    } catch (err: any) {
      console.error('Logout error:', err)
      // Still clear local data even on error
      clearAuthData()
      router.push('/auth')
    } finally {
      loading.value = false
    }
  }

  /**
   * Request password reset
   */
  const requestPasswordReset = async (email: string): Promise<boolean> => {
    loading.value = true
    error.value = ''

    try {
      console.log('Requesting password reset for:', email)

      const response = await fetch(`${VITE_API_GATEWAY_URL}auth/password-reset/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Password reset request failed')
      }

      await notificationStore.success(
        t('auth.resetEmailSent'),
        t('auth.resetEmailSentMessage', 'Password reset instructions have been sent to your email.')
      )

      return true
    } catch (err: any) {
      console.error('Password reset error:', err)
      error.value = err.message
      await handleAuthError(err, 'general')
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Confirm password reset with token
   */
  const confirmPasswordReset = async (token: string, newPassword: string): Promise<boolean> => {
    loading.value = true
    error.value = ''

    try {
      console.log('Confirming password reset...')

      const response = await fetch(`${VITE_API_GATEWAY_URL}auth/password-reset/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Password reset confirmation failed')
      }

      await notificationStore.success(
        t('auth.passwordResetSuccess'),
        t('auth.passwordResetSuccessMessage', 'Your password has been reset successfully. You can now login with your new password.')
      )

      return true
    } catch (err: any) {
      console.error('Password reset confirmation error:', err)
      error.value = err.message
      await handleAuthError(err, 'general')
      return false
    } finally {
      loading.value = false
    }
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  /**
   * Get error message for display
   */
  const getErrorMessage = (error: any): { title: string; message: string } => {
    const errorMessage = error.message?.toLowerCase() || ''
    
    if (errorMessage.includes('invalid credentials') || errorMessage.includes('incorrect password')) {
      return {
        title: t('auth.loginFailed'),
        message: t('auth.errors.invalidCredentials', 'The email or password you entered is incorrect.')
      }
    }
    
    if (errorMessage.includes('account disabled') || errorMessage.includes('user inactive')) {
      return {
        title: t('auth.loginFailed'),
        message: t('auth.errors.accountDisabled', 'Your account has been disabled. Please contact support.')
      }
    }
    
    if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
      return {
        title: t('auth.loginFailed'),
        message: t('auth.errors.tooManyAttempts', 'Too many failed attempts. Please try again later.')
      }
    }
    
    if (errorMessage.includes('email already exists') || errorMessage.includes('already in use')) {
      return {
        title: t('auth.registrationFailed'),
        message: t('auth.errors.emailInUse', 'An account with this email already exists.')
      }
    }
    
    if (errorMessage.includes('weak password') || errorMessage.includes('password too short')) {
      return {
        title: t('auth.registrationFailed'),
        message: t('auth.errors.weakPassword', 'Password must be at least 8 characters long.')
      }
    }
    
    if (errorMessage.includes('invalid email')) {
      return {
        title: t('auth.error'),
        message: t('auth.errors.invalidEmail', 'Please enter a valid email address.')
      }
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return {
        title: t('auth.error'),
        message: t('auth.errors.networkError', 'Network error. Please check your connection.')
      }
    }
    
    return {
      title: t('auth.error', 'Authentication Error'),
      message: error.message || t('auth.errors.unexpected', 'An unexpected error occurred.')
    }
  }

  /**
   * Handle authentication errors
   */
  const handleAuthError = async (error: any, context: 'login' | 'register' | 'general' = 'general') => {
    const errorInfo = getErrorMessage(error)
    error.value = errorInfo.message

    try {
      await notificationStore.error(errorInfo.title, errorInfo.message)
    } catch (notificationError) {
      console.error('Failed to show error notification:', notificationError)
    }

    console.error(`Auth error (${context}):`, error)
  }

  /**
   * Clear error message
   */
  const clearError = () => {
    error.value = ''
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize auth state from localStorage and validate token
   */
  const initAuth = async () => {
    console.log('Initializing auth...')
    initializing.value = true

    try {
      // Load from localStorage
      const hasAuthData = loadAuthData()
      
      if (hasAuthData) {
        console.log('Found stored auth data, validating...')
        // Validate token with auth service
        const isValid = await validateToken()
        
        if (!isValid) {
          console.log('Stored token invalid, attempting refresh...')
          const refreshed = await refreshAccessToken()
          
          if (!refreshed) {
            console.log('Token refresh failed, clearing auth data')
            clearAuthData()
          }
        } else {
          console.log('User authenticated:', userProfile.value?.email)
        }
      } else {
        console.log('No stored auth data found')
      }
    } catch (err) {
      console.error('Error initializing auth:', err)
      clearAuthData()
    } finally {
      initializing.value = false
    }
  }

  return {
    // State
    accessToken: computed(() => accessToken.value),
    userProfile,
    user: computed(() => userProfile.value), // Alias for compatibility
    loading,
    error,
    initializing,
    
    // Computed
    isAuthenticated,
    isAdmin,
    isCustomer,
    isVerified,
    isActiveUser,
    canAccess,
    
    // Methods
    initAuth,
    login,
    register,
    logout,
    requestPasswordReset,
    confirmPasswordReset,
    validateToken,
    refreshAccessToken,
    authenticatedFetch,
    clearError,
  }
})
