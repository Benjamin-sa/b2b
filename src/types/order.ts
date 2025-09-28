// Cart and Order related types
import type { Product } from './product'

export interface CartItem {
  productId: string
  product: Product
  quantity: number
  price: number
  addedAt?: Date
}

export interface ShippingAddress {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  company?: string
  contactPerson?: string
  phone?: string
}

export interface Order {
  id: string
  userId: string
  items: OrderItem[]
  totalAmount: number
  subtotal: number
  tax: number
  shipping: number
  status: OrderStatus
  orderDate: Date
  estimatedDelivery?: Date
  shippingAddress: ShippingAddress
  billingAddress?: ShippingAddress
  paymentMethod?: string
  notes?: string
  trackingNumber?: string
  createdAt: Date
  updatedAt: Date
  invoiceUrl?: string
  invoicePdf?: string
  invoiceNumber?: string
  stripeInvoiceId?: string
  stripeStatus?: string
  metadata?: Record<string, any>
  shippingCostCents?: number
  dueDate?: Date
  paidAt?: Date
  stripeShippingInvoiceItemId?: string | null
}

export interface OrderItem {
  productId: string
  productName: string
  productSku?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  imageUrl?: string
  stripeInvoiceItemId?: string | null
  taxCents?: number | null
  metadata?: {
    shopifyVariantId?: string
    productName?: string
    productId?: string
    brand?: string | null
    unit?: string | null
    weight?: number | null
    stripePriceId?: string
    stripeInvoiceItemId?: string | null
    taxCents?: number | null
    taxAmounts?: Array<{ taxRateId?: string | null; amount: number }>
  }
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled' 
  | 'refunded'

export interface OrderFilter {
  status?: OrderStatus
  startDate?: Date
  endDate?: Date
  userId?: string
}
