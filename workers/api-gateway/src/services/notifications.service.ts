/**
 * Notifications Service
 *
 * Handles Telegram notifications for various events.
 * All notifications are non-blocking (fire-and-forget).
 */

import type { Env } from '../types';
import { callService } from '../utils/service-calls';

// ============================================================================
// TYPES
// ============================================================================

export interface InvoiceCreatedNotification {
  invoiceId: string;
  invoiceNumber: string;
  amountDue: number;
  currency: string;
  customerEmail?: string;
  userId: string;
  invoiceUrl: string;
  status: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  shippingAddress?: {
    company?: string;
    contactPerson?: string;
    street?: string;
    zipCode?: string;
    city?: string;
  };
  userInfo?: any;
}

export interface UserRegisteredNotification {
  email: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
}

export interface UserVerifiedNotification {
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone?: string;
  btwNumber?: string;
}

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Send invoice created notification to Telegram
 */
export async function notifyInvoiceCreated(
  env: Env,
  data: InvoiceCreatedNotification
): Promise<void> {
  try {
    const payload = {
      id: data.invoiceId,
      number: data.invoiceNumber,
      amount_due: data.amountDue,
      currency: data.currency,
      customer_email: data.customerEmail,
      lines: {
        data: data.items.map((item) => ({
          amount: item.amount,
          quantity: item.quantity,
          description: item.productName,
        })),
      },
      metadata: {
        order_metadata: JSON.stringify({
          user_id: data.userId,
          invoice_url: data.invoiceUrl,
          status: data.status,
          user_info: data.userInfo,
          order_items: data.items.map((item) => ({
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.unitPrice.toString(),
          })),
          shipping_address: data.shippingAddress,
        }),
      },
    };

    await callService(env.TELEGRAM_SERVICE, env.SERVICE_SECRET, {
      path: '/notifications/invoice/created',
      method: 'POST',
      body: payload,
    });

    console.log('✅ Telegram notification sent (invoice created)');
  } catch (error) {
    console.warn('⚠️ Failed to send Telegram notification:', error);
  }
}

/**
 * Send user registered notification to Telegram
 */
export async function notifyUserRegistered(
  env: Env,
  data: UserRegisteredNotification
): Promise<void> {
  try {
    await callService(env.TELEGRAM_SERVICE, env.SERVICE_SECRET, {
      path: '/notifications/user/registered',
      method: 'POST',
      body: {
        email: data.email,
        companyName: data.companyName,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });

    console.log('✅ Telegram notification sent (user registered)');
  } catch (error) {
    console.warn('⚠️ Failed to send Telegram notification:', error);
  }
}

/**
 * Send user verified notification to Telegram
 */
export async function notifyUserVerified(
  env: Env,
  data: UserVerifiedNotification
): Promise<void> {
  try {
    const message = `
✅ <b>User Verified</b>

👤 <b>User:</b> ${data.firstName || ''} ${data.lastName || ''}
🏢 <b>Company:</b> ${data.companyName || 'N/A'}
📧 <b>Email:</b> ${data.email}
${data.phone ? `📞 <b>Phone:</b> ${data.phone}` : ''}
${data.btwNumber ? `🔖 <b>VAT:</b> ${data.btwNumber}` : ''}

<i>User has been verified and notified via email.</i>
    `.trim();

    await callService(env.TELEGRAM_SERVICE, env.SERVICE_SECRET, {
      path: '/notifications/custom',
      method: 'POST',
      body: { message, parseMode: 'HTML' },
    });

    console.log('✅ Telegram notification sent (user verified)');
  } catch (error) {
    console.warn('⚠️ Failed to send Telegram notification:', error);
  }
}

/**
 * Send custom message to Telegram
 */
export async function notifyCustom(
  env: Env,
  message: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<void> {
  try {
    await callService(env.TELEGRAM_SERVICE, env.SERVICE_SECRET, {
      path: '/notifications/custom',
      method: 'POST',
      body: { message, parseMode },
    });

    console.log('✅ Telegram notification sent (custom)');
  } catch (error) {
    console.warn('⚠️ Failed to send Telegram notification:', error);
  }
}
