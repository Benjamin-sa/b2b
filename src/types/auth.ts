// User and Authentication related types
export interface UserProfile {
  uid: string
  email: string
  role: 'admin' | 'customer'
  companyName: string
  firstName: string
  lastName: string
  phone?: string
  btwNumber: string // Belgian VAT number
  address: {
    street: string
    houseNumber: string
    postalCode: string
    city: string
    country: string
  }
  isActive: boolean
  isVerified: boolean
  createdAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  confirmPassword: string
  companyName: string
  firstName: string
  lastName: string
  phone?: string
  btwNumber: string
  address: {
    street: string
    houseNumber: string
    postalCode: string
    city: string
    country: string
  }
}

// JWT Authentication types
export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

// Response format from auth worker
export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: UserProfile
}

export interface ValidationResponse {
  valid: boolean
  user: UserProfile
  permissions: string[]
  sessionId: string
}

// Password Reset types
export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  token: string
  newPassword: string
}
