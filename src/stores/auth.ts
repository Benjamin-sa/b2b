import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useNotificationStore } from './notifications';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import type {
  LoginCredentials,
  RegisterData,
  UserProfile,
  AuthTokens,
  ValidationResponse,
} from '../types/auth';

// ============================================================================
// CONFIGURATION
// ============================================================================

const VITE_API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8787';
const ACCESS_TOKEN_KEY = 'b2b_access_token';
const REFRESH_TOKEN_KEY = 'b2b_refresh_token';
const USER_PROFILE_KEY = 'b2b_user_profile';

// Shared promise for deduplicating refresh token requests
let refreshPromise: Promise<boolean> | null = null;

// ============================================================================
// STORE DEFINITION
// ============================================================================

export const useAuthStore = defineStore('auth', () => {
  // Get access to dependencies
  const notificationStore = useNotificationStore();
  const { t } = useI18n();
  const router = useRouter();

  // State
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const userProfile = ref<UserProfile | null>(null);
  const loading = ref(false);
  const error = ref('');
  const initializing = ref(true);

  // Computed properties
  const isAuthenticated = computed(() => !!accessToken.value && !!userProfile.value);
  const isAdmin = computed(() => userProfile.value?.role === 'admin');
  const isCustomer = computed(() => userProfile.value?.role === 'customer');
  const isVerified = computed(() => userProfile.value?.is_verified === 1);
  const isActiveUser = computed(() => userProfile.value?.is_active === 1);

  // Security check: Only verified and active users can access the app
  const canAccess = computed(
    () => isAuthenticated.value && isActiveUser.value && (isAdmin.value || isVerified.value)
  );

  // VAT/BTW check: Only Belgian customers pay VAT
  // Based on user's registered country from profile
  const isBelgianCustomer = computed(() => {
    const country = userProfile.value?.address_country?.toUpperCase();

    if (!country) return true; // Default to Belgian (show VAT) if no country set
    // Support multiple formats: 'BE', 'Belgium', 'BELGIUM', 'BEL'
    return country === 'BE' || country === 'BELGIUM' || country === 'BEL';
  });

  // ============================================================================
  // LOCALSTORAGE MANAGEMENT
  // ============================================================================

  /**
   * Save tokens and user profile to localStorage
   */
  const saveAuthData = (tokens: AuthTokens, profile: UserProfile) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));

    accessToken.value = tokens.access_token;
    refreshToken.value = tokens.refresh_token;
    userProfile.value = profile;
  };

  /**
   * Clear tokens and user profile from localStorage
   */
  const clearAuthData = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_PROFILE_KEY);

    accessToken.value = null;
    refreshToken.value = null;
    userProfile.value = null;
  };

  /**
   * Load tokens and user profile from localStorage
   */
  const loadAuthData = (): boolean => {
    try {
      const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      const storedProfile = localStorage.getItem(USER_PROFILE_KEY);

      if (storedAccessToken && storedRefreshToken && storedProfile) {
        accessToken.value = storedAccessToken;
        refreshToken.value = storedRefreshToken;
        userProfile.value = JSON.parse(storedProfile);
        return true;
      }
    } catch {
      clearAuthData();
    }
    return false;
  };

  // ============================================================================
  // TOKEN MANAGEMENT
  // ============================================================================

  /**
   * Decode JWT token and check if it's expired or about to expire
   * @param token - JWT token to check
   * @param bufferSeconds - Consider token expired if it expires within this many seconds (default: 30)
   * @returns true if token is valid and not expired
   */
  const isTokenValid = (token: string | null, bufferSeconds: number = 30): boolean => {
    if (!token) return false;

    try {
      // Decode JWT payload (base64 decode the middle part)
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      const payload = JSON.parse(atob(parts[1]!));

      // Check expiration (exp is in seconds, Date.now() is in milliseconds)
      if (!payload.exp) return false;

      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const bufferTime = bufferSeconds * 1000;

      // Token is valid if it doesn't expire within the buffer period
      return expirationTime > currentTime + bufferTime;
    } catch {
      return false;
    }
  };

  /**
   * Refresh the access token using the refresh token
   */
  const refreshAccessToken = async (): Promise<boolean> => {
    // If a refresh is already in progress, return the existing promise
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      try {
        const currentRefreshToken = refreshToken.value || localStorage.getItem(REFRESH_TOKEN_KEY);

        if (!currentRefreshToken) {
          return false;
        }
        const response = await fetch(`${VITE_API_GATEWAY_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: currentRefreshToken }),
        });

        if (!response.ok) {
          clearAuthData();
          return false;
        }

        const data = await response.json();
        // Refresh endpoint only returns new accessToken, keep existing refreshToken and user
        if (data.accessToken && userProfile.value && currentRefreshToken) {
          accessToken.value = data.accessToken;
          localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
        }
        return true;
      } catch {
        clearAuthData();
        return false;
      } finally {
        // Clear the promise when done so future refreshes can start
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  };

  /**
   * Validate current access token and refresh user profile
   */
  const validateToken = async (): Promise<boolean> => {
    try {
      if (!accessToken.value) {
        return false;
      }

      const response = await fetch(`${VITE_API_GATEWAY_URL}/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken: accessToken.value }),
      });

      if (!response.ok) {
        // Try to refresh token
        return await refreshAccessToken();
      }

      const data: ValidationResponse = await response.json();

      if (data.valid && data.user) {
        // Update user profile with fresh data
        userProfile.value = data.user;
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(data.user));
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  /**
   * Make an authenticated API request with automatic token refresh
   * Proactively checks token expiration and refreshes before making the request
   */
  const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    // Proactively check if access token is expired or about to expire
    if (!isTokenValid(accessToken.value)) {
      const refreshed = await refreshAccessToken();

      if (!refreshed) {
        // Refresh failed - session is truly expired
        clearAuthData();
        if (router) {
          router.push('/auth');
        } else {
          window.location.href = '/auth';
        }
        throw new Error('Session expired. Please login again.');
      }
    }

    // Add Authorization header with valid token
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${accessToken.value}`,
    };

    let response = await fetch(url, { ...options, headers });

    // Fallback: If still 401 (edge case - token expired during request), try refresh once
    if (response.status === 401) {
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        headers.Authorization = `Bearer ${accessToken.value}`;
        response = await fetch(url, { ...options, headers });
      } else {
        clearAuthData();
        router.push('/auth');
        throw new Error('Session expired. Please login again.');
      }
    }

    return response;
  };

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  /**
   * Login with email and password
   */
  const login = async (credentials: LoginCredentials) => {
    loading.value = true;
    error.value = '';

    try {
      const response = await fetch(`${VITE_API_GATEWAY_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Create structured error with code from API
        const err = new Error(errorData.message || errorData.error || 'Login failed');
        (err as any).code = errorData.code;
        throw err;
      }

      const data = await response.json();

      // Save tokens and profile
      // Worker returns { accessToken, refreshToken, expiresIn, user }
      saveAuthData(
        {
          access_token: data.accessToken,
          refresh_token: data.refreshToken,
        },
        data.user
      );

      // Show success notification
      await notificationStore.success(
        t('auth.welcomeBack'),
        t('auth.loggedInMessage', 'You have been successfully logged in.')
      );

      return data.user;
    } catch (err: any) {
      error.value = err.message;
      await handleAuthError(err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Register a new user
   */
  const register = async (data: RegisterData) => {
    loading.value = true;
    error.value = '';

    try {
      const response = await fetch(`${VITE_API_GATEWAY_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Create structured error with code from API
        const err = new Error(errorData.message || errorData.error || 'Registration failed');
        (err as any).code = errorData.code;
        throw err;
      }

      const responseData = await response.json();

      // Save tokens and profile
      // Worker returns { accessToken, refreshToken, expiresIn, user }
      saveAuthData(
        {
          access_token: responseData.accessToken,
          refresh_token: responseData.refreshToken,
        },
        responseData.user
      );

      // Show success notification
      await notificationStore.success(
        t('auth.accountCreated'),
        t(
          'auth.welcomeToPlatform',
          'Welcome to our B2B platform! Your account has been created successfully.'
        )
      );

      return responseData.user;
    } catch (err: any) {
      error.value = err.message;
      await handleAuthError(err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Logout user and clear all auth data
   */
  const logout = async () => {
    loading.value = true;

    try {
      // Call logout endpoint to invalidate session on server
      if (refreshToken.value) {
        await fetch(`${VITE_API_GATEWAY_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: refreshToken.value }),
        }).catch(() => {
          // Continue with local logout even if API call fails
        });
      }

      // Clear local auth data
      clearAuthData();

      // Clear cart on logout
      localStorage.removeItem('b2b_cart_items');

      // Show notification
      await notificationStore.info(
        t('auth.loggedOut'),
        t('auth.loggedOutMessage', 'You have been logged out successfully.')
      );

      // Redirect to login
      router.push('/auth');
    } catch {
      // Still clear local data even on error
      clearAuthData();
      localStorage.removeItem('b2b_cart_items');
      router.push('/auth');
    } finally {
      loading.value = false;
    }
  };

  /**
   * Request password reset
   */
  const requestPasswordReset = async (email: string): Promise<boolean> => {
    loading.value = true;
    error.value = '';

    try {
      const response = await fetch(`${VITE_API_GATEWAY_URL}/auth/password-reset/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const err = new Error(
          errorData.message || errorData.error || 'Password reset request failed'
        );
        (err as any).code = errorData.code;
        throw err;
      }

      await notificationStore.success(
        t('auth.resetEmailSent'),
        t('auth.resetEmailSentMessage', 'Password reset instructions have been sent to your email.')
      );

      return true;
    } catch (err: any) {
      error.value = err.message;
      await handleAuthError(err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Confirm password reset with token
   */
  const confirmPasswordReset = async (token: string, newPassword: string): Promise<boolean> => {
    loading.value = true;
    error.value = '';

    try {
      const response = await fetch(`${VITE_API_GATEWAY_URL}/auth/password-reset/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password: newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const err = new Error(
          errorData.message || errorData.error || 'Password reset confirmation failed'
        );
        (err as any).code = errorData.code;
        throw err;
      }

      await notificationStore.success(
        t('auth.passwordResetSuccess'),
        t(
          'auth.passwordResetSuccessMessage',
          'Your password has been reset successfully. You can now login with your new password.'
        )
      );

      return true;
    } catch (err: any) {
      error.value = err.message;
      await handleAuthError(err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  /**
   * Get error message for display based on error code from auth service
   */
  const getErrorMessage = (error: any): { title: string; message: string } => {
    const errorCode = error.code || '';
    const errorMessage = error.message || '';

    // Map auth service error codes to user-friendly messages
    switch (errorCode) {
      case 'auth/invalid-email':
        return {
          title: t('auth.error'),
          message: t('auth.errors.invalidEmail', 'Please enter a valid email address.'),
        };

      case 'auth/user-not-found':
        return {
          title: t('auth.loginFailed'),
          message: t(
            'auth.errors.invalidCredentials',
            'The email or password you entered is incorrect.'
          ),
        };

      case 'auth/wrong-password':
        return {
          title: t('auth.loginFailed'),
          message: t(
            'auth.errors.invalidCredentials',
            'The email or password you entered is incorrect.'
          ),
        };

      case 'auth/email-already-in-use':
        return {
          title: t('auth.registrationFailed'),
          message: t('auth.errors.emailInUse', 'An account with this email already exists.'),
        };

      case 'auth/weak-password':
        return {
          title: t('auth.registrationFailed'),
          message: t('auth.errors.weakPassword', 'Password must be at least 8 characters long.'),
        };

      case 'auth/too-many-requests':
        return {
          title: t('auth.error'),
          message: t(
            'auth.errors.tooManyAttempts',
            'Too many failed attempts. Please try again later.'
          ),
        };

      case 'auth/user-disabled':
        return {
          title: t('auth.loginFailed'),
          message: t(
            'auth.errors.accountDisabled',
            'Your account has been disabled. Please contact support.'
          ),
        };

      case 'auth/user-not-verified':
        return {
          title: t('auth.loginFailed'),
          message: t(
            'auth.errors.notVerified',
            'Your account has not been verified yet. Please contact support.'
          ),
        };

      case 'auth/invalid-token':
      case 'auth/token-expired':
      case 'auth/session-expired':
        return {
          title: t('auth.error'),
          message: t('auth.errors.sessionExpired', 'Your session has expired. Please login again.'),
        };

      case 'auth/missing-fields':
        return {
          title: t('auth.error'),
          message: t('auth.errors.missingFields', 'Please fill in all required fields.'),
        };

      case 'auth/database-error':
      case 'auth/internal-error':
        return {
          title: t('auth.error'),
          message: t('auth.errors.serverError', 'A server error occurred. Please try again later.'),
        };

      default:
        // Fallback: use error message from API or generic message
        return {
          title: t('auth.error', 'Authentication Error'),
          message: errorMessage || t('auth.errors.unexpected', 'An unexpected error occurred.'),
        };
    }
  };

  /**
   * Handle authentication errors
   */
  const handleAuthError = async (error: any) => {
    const errorInfo = getErrorMessage(error);
    error.value = errorInfo.message;

    try {
      await notificationStore.error(errorInfo.title, errorInfo.message);
    } catch {
      // Ignore notification errors
    }
  };

  /**
   * Clear error message
   */
  const clearError = () => {
    error.value = '';
  };

  // ============================================================================
  // ADMIN METHODS
  // ============================================================================

  /**
   * Get all users (admin only)
   */
  const getAllUsers = async (): Promise<UserProfile[]> => {
    if (!isAdmin.value) {
      throw new Error('Access denied: Admin privileges required');
    }

    try {
      const response = await authenticatedFetch(`${VITE_API_GATEWAY_URL}/admin/users`);

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      return data.users || [];
    } catch (err: any) {
      await handleAuthError(err);
      throw err;
    }
  };

  /**
   * Update user verification status (admin only)
   * This calls the admin orchestration endpoint which verifies the user and sends an email
   */
  const updateUserVerification = async (userId: string, isVerified: boolean): Promise<void> => {
    if (!isAdmin.value) {
      throw new Error('Access denied: Admin privileges required');
    }

    try {
      if (isVerified) {
        // POST /admin/users/:userId/verify - orchestrates verification + email
        const response = await authenticatedFetch(
          `${VITE_API_GATEWAY_URL}/admin/users/${userId}/verify`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to verify user');
        }

        await notificationStore.success(
          t('admin.userUpdated'),
          t('admin.userVerificationUpdated', 'User has been verified and notified via email.')
        );
      } else {
        // For unverifying, we use PUT /admin/users/:userId with is_verified: 0
        const response = await authenticatedFetch(`${VITE_API_GATEWAY_URL}/admin/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_verified: 0 }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update user verification status');
        }

        await notificationStore.success(
          t('admin.userUpdated'),
          t('admin.userVerificationUpdated', 'User verification has been removed.')
        );
      }
    } catch (err: any) {
      await handleAuthError(err);
      throw err;
    }
  };

  /**
   * Update user active status (admin only)
   */
  const updateUserStatus = async (userId: string, isActive: boolean): Promise<void> => {
    if (!isAdmin.value) {
      throw new Error('Access denied: Admin privileges required');
    }

    try {
      if (!isActive) {
        // DELETE /admin/users/:userId - soft deletes (deactivates) the user
        const response = await authenticatedFetch(`${VITE_API_GATEWAY_URL}/admin/users/${userId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to deactivate user');
        }

        await notificationStore.success(
          t('admin.userUpdated'),
          t('admin.userStatusUpdated', 'User account has been deactivated.')
        );
      } else {
        // For activating, we use PUT /admin/users/:userId with is_active: 1
        const response = await authenticatedFetch(`${VITE_API_GATEWAY_URL}/admin/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_active: 1 }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to activate user');
        }
        await notificationStore.success(
          t('admin.userUpdated'),
          t('admin.userStatusUpdated', 'User account has been activated.')
        );
      }
    } catch (err: any) {
      await handleAuthError(err);
      throw err;
    }
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize auth state from localStorage and validate token
   */
  const initAuth = async () => {
    initializing.value = true;

    try {
      const hasAuthData = loadAuthData();

      if (!hasAuthData) {
        // No stored auth data, user is logged out
        initializing.value = false;
        return;
      }

      // ✅ NEW: Check if access token is still valid (not expired)
      if (isTokenValid(accessToken.value, 60)) {
        // Token is valid for at least 60 more seconds
        // No need to validate with server - trust the JWT signature
        initializing.value = false;
        return;
      }

      // Access token is expired or expiring soon - try to refresh
      const refreshed = await refreshAccessToken();

      if (!refreshed) {
        // Refresh failed - clear everything
        clearAuthData();
      }
    } catch {
      clearAuthData();
    } finally {
      initializing.value = false;
    }
  };

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
    isBelgianCustomer, // VAT/BTW: true if user is from Belgium

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
    isTokenValid,
    clearError,

    // Admin methods
    getAllUsers,
    updateUserVerification,
    updateUserStatus,
  };
});
