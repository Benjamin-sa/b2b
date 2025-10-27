// ============================================================================
// Environment Bindings
// ============================================================================
export interface Env {
  ENVIRONMENT: 'development' | 'production';
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
}

// ============================================================================
// Telegram API Types
// ============================================================================
export interface TelegramMessage {
  message: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableWebPagePreview?: boolean;
}

export interface TelegramResponse {
  ok: boolean;
  result?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text: string;
  };
  description?: string;
  error_code?: number;
}

// ============================================================================
// Notification Types
// ============================================================================
export interface InvoiceNotification {
  amount_due: number;
  amount_paid?: number;
  currency: string;
  due_date?: number;
  customer_name?: string;
  customer_email?: string;
  number?: string;
  id: string;
  status_transitions?: {
    paid_at?: number;
  };
  metadata?: {
    orderMetadata?: string;
  };
  lines?: {
    data: Array<{
      amount: number;
      quantity: number;
      description: string;
    }>;
  };
}

export interface UserRegistrationNotification {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  btwNumber?: string;
  address?: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    country: string;
  };
}

export interface OrderMetadata {
  userInfo?: {
    companyName?: string;
    contactPerson?: string;
    email?: string;
    btwNumber?: string;
  };
  orderItems?: Array<{
    productName: string;
    quantity: number;
    unitPrice: string;
  }>;
  shippingAddress?: {
    company?: string;
    contactPerson?: string;
    street: string;
    zipCode: string;
    city: string;
  };
}

// ============================================================================
// Custom Error Types
// ============================================================================
export class TelegramServiceError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'TelegramServiceError';
  }
}
