import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db, functions } from '../init/firebase'
import type { UserProfile } from '../types'
import { httpsCallable } from 'firebase/functions'
// Import for notifications and i18n
import { useNotificationStore } from './notifications'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const userProfile = ref<UserProfile | null>(null)
  const loading = ref(false)
  const error = ref('')
  const initializing = ref(true) // Add this to track initial auth state

  // Get access to notifications and translations
  const notificationStore = useNotificationStore()
  const { t } = useI18n()

  // Router instance
  const router = useRouter()

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => userProfile.value?.role === 'admin')
  const isCustomer = computed(() => userProfile.value?.role === 'customer')
  const isVerified = computed(() => userProfile.value?.isVerified === true)
  const isActiveUser = computed(() => userProfile.value?.isActive === true)
  
  // Security check: Only verified and active users can access the app
  const canAccess = computed(() => 
    isAuthenticated.value && isActiveUser.value && (isAdmin.value || isVerified.value)
  )

  // Initialize auth state listener
  const initAuth = () => {
    return new Promise<void>((resolve) => {
      onAuthStateChanged(auth, async (firebaseUser) => {
        console.log('Auth state changed:', firebaseUser?.email || 'No user')
        user.value = firebaseUser
        if (firebaseUser) {
          await loadUserProfile(firebaseUser.uid)
        } else {
          userProfile.value = null
        }
        initializing.value = false
        resolve()
      })
    })
  }

  const loadUserProfile = async (uid: string, retryCount = 0) => {
    try {
      console.log('Loading user profile for:', uid)
      const userDoc = await getDoc(doc(db, 'users', uid))
      if (userDoc.exists()) {
        userProfile.value = userDoc.data() as UserProfile
        console.log('User profile loaded:', userProfile.value)
      } else {
        console.log('No user profile found in Firestore for:', uid)
        
        // If this is during initial load and profile doesn't exist, 
        // it might be a new registration - retry a few times
        if (retryCount < 3) {
          console.log(`Retrying to load profile (attempt ${retryCount + 1}/3)...`)
          await new Promise(resolve => setTimeout(resolve, 500)) // Wait 500ms
          return loadUserProfile(uid, retryCount + 1)
        }
      }
    } catch (err) {
      console.error('Error loading user profile:', err)
      
      // Retry logic for network errors
      if (retryCount < 2) {
        console.log(`Retrying due to error (attempt ${retryCount + 1}/2)...`)
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s
        return loadUserProfile(uid, retryCount + 1)
      }
    }
  }

  const login = async (email: string, password: string) => {
    loading.value = true
    error.value = ''
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      await loadUserProfile(result.user.uid)
      
      // Show success notification
      await notificationStore.success(
        t('auth.welcomeBack'),
        t('auth.loggedInMessage', 'You have been successfully logged in.')
      )
      
      return result.user
    } catch (err: any) {
      await handleAuthError(err, 'login')
    } finally {
      loading.value = false
    }
  }

  const register = async (
    email: string, 
    password: string, 
    companyName: string,
    firstName: string,
    lastName: string,
    btwNumber: string,
    address: {
      street: string
      houseNumber: string
      postalCode: string
      city: string
      country: string
    },
    phone?: string
  ) => {
    loading.value = true
    error.value = ''
    try {
      console.log('Creating user account...', { email, companyName, firstName, lastName, btwNumber, address })
      const result = await createUserWithEmailAndPassword(auth, email, password)
      console.log('Firebase user created:', result.user.uid)
      
      // Create user profile in Firestore
      const userProfileData: UserProfile = {
        uid: result.user.uid,
        email: result.user.email!,
        role: 'customer', // Default role
        companyName,
        firstName,
        lastName,
        btwNumber,
        address,
        isActive: true,
        isVerified: false, // New users need to be verified
        createdAt: new Date().toISOString()
      }

      // Add phone if provided
      if (phone) {
        userProfileData.phone = phone
      }
      
      console.log('Creating user profile in Firestore:', userProfileData)
      await setDoc(doc(db, 'users', result.user.uid), userProfileData)
      console.log('User profile created successfully')
      
      // Set the user profile immediately to prevent race condition
      userProfile.value = userProfileData
      
      // Small delay to ensure Firestore write is fully propagated
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Show success notification
      await notificationStore.success(
        t('auth.accountCreated'),
        t('auth.welcomeToPlatform', 'Welcome to our B2B platform! Your account has been created successfully.')
      )
      
      return result.user
    } catch (err: any) {
      console.error('Registration error:', err)
      await handleAuthError(err, 'register')
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      user.value = null
      userProfile.value = null
      router.push('/auth')
    } catch (err: any) {
      await handleAuthError(err, 'general')
    }
  }

  const requestPasswordReset = async (email: string): Promise<any> => {
    loading.value = true
    error.value = ''
    
    try {
      console.log('Requesting password reset for:', email)
      const requestPasswordResetFunction = httpsCallable(functions, 'requestPasswordReset')
      const result = await requestPasswordResetFunction({ email })
      
      console.log('Password reset request successful:', result.data)
      return result.data
    } catch (err: any) {
      console.error('Password reset request failed:', err)
      await handleAuthError(err, 'general')
      return null // Return null on error
    } finally {
      loading.value = false
    }
  }

  
  const updateUserVerification = async (uid: string, isVerified: boolean): Promise<boolean> => {
    // Security check: Only admins can verify/unverify users
    if (!isAdmin.value) {
      throw new Error('Unauthorized: Only admins can update user verification')
    }

    try {
      await updateDoc(doc(db, 'users', uid), { isVerified })
      return true
    } catch (err: any) {
      await handleAuthError(err, 'general')
      return false // Return false on error
    }
  }

  const updateUserStatus = async (uid: string, isActive: boolean): Promise<boolean> => {
    // Security check: Only admins can activate/deactivate users
    if (!isAdmin.value) {
      throw new Error('Unauthorized: Only admins can update user status')
    }

    try {
      await updateDoc(doc(db, 'users', uid), { isActive })
      return true
    } catch (err: any) {
      await handleAuthError(err, 'general')
      return false // Return false on error
    }
  }

  const getAllUsers = async (): Promise<UserProfile[]> => {
    // Security check: Only admins can view all users
    if (!isAdmin.value) {
      throw new Error('Unauthorized: Only admins can view all users')
    }

    try {
      const usersSnapshot = await getDocs(collection(db, 'users'))
      return usersSnapshot.docs.map(doc => doc.data() as UserProfile)
    } catch (err: any) {
      await handleAuthError(err, 'general')
      return [] // Return empty array on error
    }
  }

  const getUnverifiedUsers = async (): Promise<UserProfile[]> => {
    // Security check: Only admins can view unverified users
    if (!isAdmin.value) {
      throw new Error('Unauthorized: Only admins can view unverified users')
    }

    try {
      const q = query(
        collection(db, 'users'),
        where('isVerified', '==', false),
        where('role', '==', 'customer')
      )
      const usersSnapshot = await getDocs(q)
      return usersSnapshot.docs.map(doc => doc.data() as UserProfile)
    } catch (err: any) {
      await handleAuthError(err, 'general')
      return [] // Return empty array on error
    }
  }

  const getErrorMessage = (error: any): { title: string; message: string } => {
    const errorCode = error.code || error.message || 'unknown'
    
    switch (errorCode) {
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return {
          title: t('auth.loginFailed'),
          message: t('auth.errors.invalidCredentials', 'The email or password you entered is incorrect. Please check your credentials and try again.')
        }
      
      case 'auth/user-disabled':
        return {
          title: t('auth.loginFailed'),
          message: t('auth.errors.accountDisabled', 'Your account has been disabled. Please contact support for assistance.')
        }
      
      case 'auth/too-many-requests':
        return {
          title: t('auth.loginFailed'),
          message: t('auth.errors.tooManyAttempts', 'Too many failed login attempts. Please try again later or reset your password.')
        }
      
      case 'auth/email-already-in-use':
        return {
          title: t('auth.registrationFailed'),
          message: t('auth.errors.emailInUse', 'An account with this email already exists. Please use a different email or try logging in.')
        }
      
      case 'auth/weak-password':
        return {
          title: t('auth.registrationFailed'),
          message: t('auth.errors.weakPassword', 'Password should be at least 6 characters long and contain a mix of letters and numbers.')
        }
      
      case 'auth/invalid-email':
        return {
          title: t('auth.error'),
          message: t('auth.errors.invalidEmail', 'Please enter a valid email address.')
        }
      
      case 'auth/operation-not-allowed':
        return {
          title: t('auth.error'),
          message: t('auth.errors.operationNotAllowed', 'This authentication method is not enabled. Please contact support.')
        }
      
      case 'auth/network-request-failed':
        return {
          title: t('auth.error'),
          message: t('auth.errors.networkError', 'Network connection failed. Please check your internet connection and try again.')
        }
      
      default:
        console.error('Unhandled auth error:', error)
        return {
          title: t('auth.error', 'Authentication Error'),
          message: error.message || t('auth.errors.unexpected', 'An unexpected error occurred. Please try again or contact support if the problem persists.')
        }
    }
  }

  // Helper function to handle errors with notifications
  const handleAuthError = async (error: any, context: 'login' | 'register' | 'general' = 'general') => {
    const errorInfo = getErrorMessage(error)
    error.value = errorInfo.message

    // Show notification
    try {
      await notificationStore.error(errorInfo.title, errorInfo.message)
    } catch (notificationError) {
      console.error('Failed to show error notification:', notificationError)
    }

    console.error(`Auth error (${context}):`, error)
    throw error
  }

  const clearError = () => {
    error.value = ''
  }

  return {
    user,
    userProfile,
    loading,
    error,
    initializing,
    isAuthenticated,
    isAdmin,
    isCustomer,
    isVerified,
    isActiveUser,
    canAccess,
    initAuth,
    login,
    register,
    logout,
    requestPasswordReset,
    clearError,
    // Admin functions
    updateUserVerification,
    updateUserStatus,
    getAllUsers,
    getUnverifiedUsers
  }
})
