/**
 * Telegram Message Utilities
 * 
 * Formats Stripe invoice data for Telegram notifications.
 * Provides clean separation between webhook logic and notification formatting.
 */

import Stripe from 'stripe';
import type { Env } from '../types';

/**
 * Invoice data structure for Telegram notifications
 */
interface InvoiceNotificationData {
  id: string;
  number: string | null;
  amount_due: number;
  amount_paid?: number;
  currency: string;
  customer_name: string | null;
  customer_email: string | null;
  status_transitions?: Stripe.Invoice.StatusTransitions;
  metadata?: Stripe.Metadata | null;
  lines?: Stripe.ApiList<Stripe.InvoiceLineItem>;
}

/**
 * Send invoice paid notification to Telegram
 * 
 * @param env - Worker environment bindings
 * @param invoice - Stripe invoice object
 */
export async function sendInvoicePaidNotification(
  env: Env,
  invoice: Stripe.Invoice
): Promise<void> {
  try {
    console.log(`[Telegram] 📬 Sending invoice paid notification for ${invoice.id}`);

    const payload = formatInvoicePaidPayload(invoice);
    await sendTelegramNotification(env, '/notifications/invoice/paid', payload);

    console.log(`[Telegram] ✅ Invoice paid notification sent for ${invoice.id}`);
  } catch (error) {
    console.error(`[Telegram] ⚠️  Failed to send invoice paid notification:`, error);
    // Don't throw - notifications are not critical to webhook processing
  }
}

/**
 * Send invoice voided notification to Telegram
 * 
 * @param env - Worker environment bindings
 * @param invoice - Stripe invoice object
 */
export async function sendInvoiceVoidedNotification(
  env: Env,
  invoice: Stripe.Invoice
): Promise<void> {
  try {
    console.log(`[Telegram] 📬 Sending invoice voided notification for ${invoice.id}`);

    const payload = formatInvoiceVoidedPayload(invoice);
    await sendTelegramNotification(env, '/notifications/invoice/voided', payload);

    console.log(`[Telegram] ✅ Invoice voided notification sent for ${invoice.id}`);
  } catch (error) {
    console.error(`[Telegram] ⚠️  Failed to send invoice voided notification:`, error);
    // Don't throw - notifications are not critical to webhook processing
  }
}

/**
 * Format invoice data for "paid" notification
 * 
 * @param invoice - Stripe invoice object
 * @returns Formatted notification payload
 */
function formatInvoicePaidPayload(invoice: Stripe.Invoice): InvoiceNotificationData {
  return {
    id: invoice.id,
    number: invoice.number,
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
    customer_name: invoice.customer_name,
    customer_email: invoice.customer_email,
    status_transitions: invoice.status_transitions,
    metadata: invoice.metadata,
    lines: invoice.lines,
  };
}

/**
 * Format invoice data for "voided" notification
 * 
 * @param invoice - Stripe invoice object
 * @returns Formatted notification payload
 */
function formatInvoiceVoidedPayload(invoice: Stripe.Invoice): InvoiceNotificationData {
  return {
    id: invoice.id,
    number: invoice.number,
    amount_due: invoice.amount_due,
    currency: invoice.currency,
    customer_name: invoice.customer_name,
    customer_email: invoice.customer_email,
    metadata: invoice.metadata,
    lines: invoice.lines,
  };
}

/**
 * Send notification to Telegram service via service binding
 * 
 * @param env - Worker environment bindings
 * @param endpoint - Telegram service endpoint path
 * @param payload - Notification data
 */
async function sendTelegramNotification(
  env: Env,
  endpoint: string,
  payload: InvoiceNotificationData
): Promise<void> {
  const request = new Request(`https://dummy${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Token': env.SERVICE_SECRET,
    },
    body: JSON.stringify(payload),
  });

  await env.TELEGRAM_SERVICE.fetch(request);
}
