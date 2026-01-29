// ============================================================================
// Environment Bindings
// ============================================================================
export interface Env {
  ENVIRONMENT: 'development' | 'production';
  SERVICE_SECRET: string; // Service-to-service authentication
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
    order_metadata?: string;
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
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  btw_number?: string;
  address?: {
    street: string;
    house_number: string;
    postal_code: string;
    city: string;
    country: string;
  };
}

export interface OrderMetadata {
  user_info?: {
    company_name?: string;
    contact_person?: string;
    email?: string;
    btw_number?: string;
  };
  order_items?: Array<{
    product_name: string;
    quantity: number;
    unit_price: string;
  }>;
  shipping_address?: {
    company?: string;
    contact_person?: string;
    street: string;
    zip_code: string;
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
