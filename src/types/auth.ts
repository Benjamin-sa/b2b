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
