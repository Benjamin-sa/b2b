import type {
  Env,
  InvoiceNotification,
  UserRegistrationNotification,
  OrderMetadata,
} from '../types';
import { sendTelegramMessage } from '../utils/telegram';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

/**
 * Send invoice created notification to Telegram
 */
export async function notifyInvoiceCreated(env: Env, invoice: InvoiceNotification): Promise<void> {
  try {
    const amount = formatCurrency(invoice.amount_due, invoice.currency);
    const dueDate = invoice.due_date ? formatDate(invoice.due_date) : 'No due date';

    let customerInfo = invoice.customer_name || invoice.customer_email || 'Unknown';
    let itemsInfo = '';
    let orderDetailsInfo = '';

    // Parse order metadata if available
    if (invoice.metadata?.order_metadata) {
      try {
        const order_metadata: OrderMetadata = JSON.parse(invoice.metadata.order_metadata);

        // Use customer info from order metadata
        if (order_metadata.user_info) {
          const { company_name, contact_person, email } = order_metadata.user_info;
          customerInfo = contact_person || company_name || email || 'Unknown';
          if (company_name && contact_person) {
            customerInfo = `${contact_person} (${company_name})`;
          }
        }

        // Format order items
        if (order_metadata.order_items && order_metadata.order_items.length > 0) {
          const items = order_metadata.order_items
            .slice(0, 3)
            .map((item) => `• ${item.product_name} (${item.quantity}x) - €${item.unit_price}`)
            .join('\n');

          itemsInfo = `\n\n📦 <b>Items:</b>\n${items}`;

          if (order_metadata.order_items.length > 3) {
            itemsInfo += `\n... and ${order_metadata.order_items.length - 3} more items`;
          }
        }

        // Add shipping info if available
        if (order_metadata.shipping_address) {
          const addr = order_metadata.shipping_address;
          orderDetailsInfo = `\n\n🚚 <b>Shipping:</b>\n${addr.company || addr.contact_person}\n${addr.street}, ${addr.zip_code} ${addr.city}`;
        }
      } catch (parseError) {
        console.warn('Failed to parse order metadata for notification:', parseError);
      }
    }

    // Fallback to line items from invoice if no order metadata
    if (!itemsInfo && invoice.lines?.data && invoice.lines.data.length > 0) {
      const items = invoice.lines.data
        .slice(0, 3)
        .map((item) => {
          const itemAmount = (item.amount / 100).toFixed(2);
          return `• ${item.description} (${item.quantity}x) - €${itemAmount}`;
        })
        .join('\n');

      itemsInfo = `\n\n📦 <b>Items:</b>\n${items}`;

      if (invoice.lines.data.length > 3) {
        itemsInfo += `\n... and ${invoice.lines.data.length - 3} more items`;
      }
    }

    const message = `
📄 <b>New Invoice Created</b>

Amount: <b>${amount}</b>
Customer: <code>${customerInfo}</code>
Invoice #: <code>${invoice.number || invoice.id}</code>
Due Date: ${dueDate}
Created: ${formatDateTime(Date.now() / 1000)}${itemsInfo}${orderDetailsInfo}

Status: <b>⏳ PENDING</b>
    `.trim();

    await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, {
      message,
      parseMode: 'HTML',
    });
  } catch (error) {
    console.error('❌ Failed to send invoice created notification:', error);
    // Don't throw - we don't want to fail the caller because of notification issues
  }
}

/**
 * Send invoice payment success notification to Telegram
 */
export async function notifyInvoicePaymentSucceeded(
  env: Env,
  invoice: InvoiceNotification
): Promise<void> {
  try {
    const amount = formatCurrency(invoice.amount_paid || invoice.amount_due, invoice.currency);
    const paidAt = invoice.status_transitions?.paid_at
      ? formatDateTime(invoice.status_transitions.paid_at)
      : formatDateTime(Date.now() / 1000);

    let customerInfo = invoice.customer_name || invoice.customer_email || 'Unknown';
    let itemsInfo = '';

    // Parse order metadata if available
    if (invoice.metadata?.order_metadata) {
      try {
        const order_metadata: OrderMetadata = JSON.parse(invoice.metadata.order_metadata);

        // Use customer info from order metadata
        if (order_metadata.user_info) {
          const { company_name, contact_person, email } = order_metadata.user_info;
          customerInfo = contact_person || company_name || email || 'Unknown';
          if (company_name && contact_person) {
            customerInfo = `${contact_person} (${company_name})`;
          }
        }

        // Format order items (show fewer items for payment notifications)
        if (order_metadata.order_items && order_metadata.order_items.length > 0) {
          const items = order_metadata.order_items
            .slice(0, 2)
            .map((item) => `• ${item.product_name} (${item.quantity}x)`)
            .join('\n');

          itemsInfo = `\n\n📦 <b>Items:</b>\n${items}`;

          if (order_metadata.order_items.length > 2) {
            itemsInfo += `\n... and ${order_metadata.order_items.length - 2} more items`;
          }
        }
      } catch (parseError) {
        console.warn('Failed to parse order metadata for payment notification:', parseError);
      }
    }

    // Fallback to line items from invoice if no order metadata
    if (!itemsInfo && invoice.lines?.data && invoice.lines.data.length > 0) {
      const items = invoice.lines.data
        .slice(0, 2)
        .map((item) => `• ${item.description} (${item.quantity}x)`)
        .join('\n');

      itemsInfo = `\n\n📦 <b>Items:</b>\n${items}`;

      if (invoice.lines.data.length > 2) {
        itemsInfo += `\n... and ${invoice.lines.data.length - 2} more items`;
      }
    }

    const message = `
💰 <b>Invoice Payment Received!</b>

Amount: <b>${amount}</b>
Customer: <code>${customerInfo}</code>
Invoice #: <code>${invoice.number || invoice.id}</code>
Paid At: ${paidAt}${itemsInfo}

Status: <b>✅ PAID</b>
    `.trim();

    await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, {
      message,
      parseMode: 'HTML',
    });
  } catch (error) {
    console.error('❌ Failed to send invoice payment success notification:', error);
    // Don't throw - we don't want to fail the caller because of notification issues
  }
}

/**
 * Send invoice voided notification to Telegram
 */
export async function notifyInvoiceVoided(env: Env, invoice: InvoiceNotification): Promise<void> {
  try {
    const amount = formatCurrency(invoice.amount_due, invoice.currency);

    let customerInfo = invoice.customer_name || invoice.customer_email || 'Unknown';
    let itemsInfo = '';

    // Parse order metadata if available
    if (invoice.metadata?.order_metadata) {
      try {
        const orderMetadata: OrderMetadata = JSON.parse(invoice.metadata.order_metadata);

        // Use customer info from order metadata
        if (orderMetadata.user_info) {
          const {
            company_name: companyName,
            contact_person: contactPerson,
            email,
          } = orderMetadata.user_info;
          customerInfo = contactPerson || companyName || email || 'Unknown';
          if (companyName && contactPerson) {
            customerInfo = `${contactPerson} (${companyName})`;
          }
        }

        // Format order items (show fewer items for voided notifications)
        if (orderMetadata.order_items && orderMetadata.order_items.length > 0) {
          const items = orderMetadata.order_items
            .slice(0, 2)
            .map((item) => `• ${item.product_name} (${item.quantity}x)`)
            .join('\n');

          itemsInfo = `\n\n📦 <b>Items:</b>\n${items}`;

          if (orderMetadata.order_items.length > 2) {
            itemsInfo += `\n... and ${orderMetadata.order_items.length - 2} more items`;
          }
        }
      } catch (parseError) {
        console.warn('Failed to parse order metadata for voided notification:', parseError);
      }
    }

    // Fallback to line items from invoice if no order metadata
    if (!itemsInfo && invoice.lines?.data && invoice.lines.data.length > 0) {
      const items = invoice.lines.data
        .slice(0, 2)
        .map((item) => `• ${item.description} (${item.quantity}x)`)
        .join('\n');

      itemsInfo = `\n\n📦 <b>Items:</b>\n${items}`;

      if (invoice.lines.data.length > 2) {
        itemsInfo += `\n... and ${invoice.lines.data.length - 2} more items`;
      }
    }

    const message = `
🚫 <b>Invoice Voided/Cancelled</b>

Amount: <b>${amount}</b>
Customer: <code>${customerInfo}</code>
Invoice #: <code>${invoice.number || invoice.id}</code>
Voided: ${formatDateTime(Date.now() / 1000)}${itemsInfo}

Status: <b>❌ VOIDED</b>

<i>Stock has been returned to B2B inventory.</i>
    `.trim();

    await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, {
      message,
      parseMode: 'HTML',
    });
  } catch (error) {
    console.error('❌ Failed to send invoice voided notification:', error);
    // Don't throw - we don't want to fail the caller because of notification issues
  }
}

/**
 * Send new user registration notification to Telegram
 */
export async function notifyNewUserRegistration(
  env: Env,
  userData: UserRegistrationNotification,
  userId: string
): Promise<void> {
  try {
    const userName =
      userData.first_name && userData.last_name
        ? `${userData.first_name} ${userData.last_name}`
        : userData.company_name || 'Unknown User';

    const companyName = userData.company_name || 'N/A';
    const email = userData.email || 'N/A';
    const phone = userData.phone || 'N/A';
    const btwNumber = userData.btw_number || 'N/A';
    const registrationTime = formatDateTime(Date.now() / 1000);

    // Format address if available
    let addressInfo = 'N/A';
    if (userData.address) {
      const {
        street,
        house_number: houseNumber,
        postal_code: postalCode,
        city,
        country,
      } = userData.address;
      addressInfo = `${street} ${houseNumber}, ${postalCode} ${city}, ${country}`;
    }

    const message = `
👤 <b>New User Registration!</b>

<b>Name:</b> ${userName}
<b>Company:</b> ${companyName}
<b>Email:</b> <code>${email}</code>
<b>Phone:</b> ${phone}
<b>BTW Number:</b> ${btwNumber}
<b>Address:</b> ${addressInfo}
<b>Registered:</b> ${registrationTime}

<b>User ID:</b> <code>${userId}</code>
<b>Status:</b> <i>Needs manual verification</i>

<i>Please review and approve this user in the admin panel.</i>
    `.trim();

    await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, {
      message,
      parseMode: 'HTML',
    });
  } catch (error) {
    console.error('❌ Failed to send new user registration notification:', error);
    // Don't throw - we don't want to fail the caller because of notification issues
  }
}

/**
 * Send custom message to Telegram
 */
export async function sendCustomMessage(
  env: Env,
  message: string,
  parseMode: 'HTML' | 'Markdown' | 'MarkdownV2' = 'HTML'
): Promise<void> {
  await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, {
    message,
    parseMode,
  });
}
