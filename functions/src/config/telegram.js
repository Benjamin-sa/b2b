const { defineSecret } = require("firebase-functions/params");

// Define secrets for Telegram configuration
const telegramBotToken = defineSecret("TELEGRAM_BOT_TOKEN");
const telegramChatId = defineSecret("TELEGRAM_CHAT_ID");

// Detect if we're running in emulator
const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";

/**
 * Get Telegram bot token
 */
const getTelegramBotToken = () => {
  if (isEmulator) {
    const token = process.env.TELEGRAM_BOT_TOKEN_LOCAL;
    if (!token) {
      throw new Error(
        "TELEGRAM_BOT_TOKEN_LOCAL not found in .env file for emulator"
      );
    }
    return token;
  } else {
    return telegramBotToken.value();
  }
};

/**
 * Get Telegram chat ID
 */
const getTelegramChatId = () => {
  if (isEmulator) {
    const chatId = process.env.TELEGRAM_CHAT_ID_LOCAL;
    if (!chatId) {
      throw new Error(
        "TELEGRAM_CHAT_ID_LOCAL not found in .env file for emulator"
      );
    }
    return chatId;
  } else {
    return telegramChatId.value();
  }
};

/**
 * Send a message to Telegram
 */
const sendTelegramMessage = async (message, parseMode = "HTML") => {
  try {
    const botToken = getTelegramBotToken();
    const chatId = getTelegramChatId();

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Telegram API error: ${errorData.description || response.statusText}`
      );
    }

    const result = await response.json();
    console.log("✅ Telegram message sent successfully");
    return result;
  } catch (error) {
    console.error("❌ Failed to send Telegram message:", error.message);
    throw error;
  }
};

/**
 * Format currency amount for display
 */
const formatCurrency = (amount, currency = "EUR") => {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100); // Stripe amounts are in cents
};

/**
 * Send payment success notification to Telegram with enriched data
 */
const notifyPaymentSuccess = async (paymentIntent, enrichedData = null) => {
  try {
    const amount = formatCurrency(paymentIntent.amount, paymentIntent.currency);
    const orderId = paymentIntent.metadata?.orderId || paymentIntent.id;

    // Use enriched customer data if available, otherwise fallback to metadata
    let customerInfo = paymentIntent.metadata?.customerEmail || "Unknown";

    if (enrichedData?.customer) {
      const customerName =
        enrichedData.customer.name ||
        `${enrichedData.customer.metadata?.firstName || ""} ${
          enrichedData.customer.metadata?.lastName || ""
        }`.trim();

      if (customerName && customerName !== "") {
        customerInfo = `${customerName}`;
        if (enrichedData.customer.email) {
          customerInfo += ` (${enrichedData.customer.email})`;
        }
      } else if (enrichedData.customer.email) {
        customerInfo = enrichedData.customer.email;
      }
    }

    const message = `
🎉 <b>Payment Successful!</b>

Amount: <b>${amount}</b>
Customer: <code>${customerInfo}</code>
Order ID: <code>${orderId}</code>
Time: ${new Date().toLocaleString("nl-NL")}

Status: <b>✅ PAID</b>
    `.trim();

    await sendTelegramMessage(message);
  } catch (error) {
    console.error("❌ Failed to send payment success notification:", error);
    // Don't throw - we don't want to fail the webhook because of notification issues
  }
};

/**
 * Send invoice created notification to Telegram with enriched data
 */
const notifyInvoiceCreated = async (invoice, enrichedData = null) => {
  try {
    const amount = formatCurrency(invoice.amount_due, invoice.currency);
    const dueDate = invoice.due_date
      ? new Date(invoice.due_date * 1000).toLocaleDateString("nl-NL")
      : "No due date";

    // Use enriched customer data if available, otherwise fallback to webhook data
    let customerInfo = invoice.customer_email || "Unknown";
    let itemsInfo = "";

    if (enrichedData) {
      // Format customer information
      if (enrichedData.customer) {
        const customerName =
          enrichedData.customer.name ||
          `${enrichedData.customer.metadata?.firstName || ""} ${
            enrichedData.customer.metadata?.lastName || ""
          }`.trim();

        if (customerName && customerName !== "") {
          customerInfo = `${customerName}`;
          if (enrichedData.customer.email) {
            customerInfo += ` (${enrichedData.customer.email})`;
          }
        } else if (enrichedData.customer.email) {
          customerInfo = enrichedData.customer.email;
        }
      }

      // Format line items
      if (
        enrichedData.lines &&
        enrichedData.lines.data &&
        enrichedData.lines.data.length > 0
      ) {
        const items = enrichedData.lines.data
          .slice(0, 3)
          .map((item) => {
            const productName =
              item.price?.product?.name || item.description || "Item";
            const quantity = item.quantity || 1;
            const itemAmount = (item.amount / 100).toFixed(2);
            return `• ${productName} (${quantity}x) - €${itemAmount}`;
          })
          .join("\n");

        itemsInfo = `\n\n📦 <b>Items:</b>\n${items}`;

        if (enrichedData.lines.data.length > 3) {
          itemsInfo += `\n... and ${
            enrichedData.lines.data.length - 3
          } more items`;
        }
      }
    }

    const message = `
📄 <b>New Invoice Created</b>

Amount: <b>${amount}</b>
Customer: <code>${customerInfo}</code>
Invoice ID: <code>${invoice.id}</code>
Due Date: ${dueDate}
Created: ${new Date().toLocaleString("nl-NL")}${itemsInfo}

Status: <b>⏳ PENDING</b>
    `.trim();

    await sendTelegramMessage(message);
  } catch (error) {
    console.error("❌ Failed to send invoice created notification:", error);
    // Don't throw - we don't want to fail the webhook because of notification issues
  }
};

/**
 * Send invoice payment success notification to Telegram with enriched data
 */
const notifyInvoicePaymentSucceeded = async (invoice, enrichedData = null) => {
  try {
    const amount = formatCurrency(
      invoice.amount_paid || invoice.amount_due,
      invoice.currency
    );
    const paidAt = invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toLocaleString(
          "nl-NL"
        )
      : new Date().toLocaleString("nl-NL");

    // Use enriched customer data if available, otherwise fallback to webhook data
    let customerInfo = invoice.customer_email || "Unknown";
    let itemsInfo = "";

    if (enrichedData) {
      // Format customer information
      if (enrichedData.customer) {
        const customerName =
          enrichedData.customer.name ||
          `${enrichedData.customer.metadata?.firstName || ""} ${
            enrichedData.customer.metadata?.lastName || ""
          }`.trim();

        if (customerName && customerName !== "") {
          customerInfo = `${customerName}`;
          if (enrichedData.customer.email) {
            customerInfo += ` (${enrichedData.customer.email})`;
          }
        } else if (enrichedData.customer.email) {
          customerInfo = enrichedData.customer.email;
        }
      }

      // Format line items (show fewer items for payment notifications)
      if (
        enrichedData.lines &&
        enrichedData.lines.data &&
        enrichedData.lines.data.length > 0
      ) {
        const items = enrichedData.lines.data
          .slice(0, 2)
          .map((item) => {
            const productName =
              item.price?.product?.name || item.description || "Item";
            const quantity = item.quantity || 1;
            return `• ${productName} (${quantity}x)`;
          })
          .join("\n");

        itemsInfo = `\n\n📦 <b>Items:</b>\n${items}`;

        if (enrichedData.lines.data.length > 2) {
          itemsInfo += `\n... and ${
            enrichedData.lines.data.length - 2
          } more items`;
        }
      }
    }

    const message = `
💰 <b>Invoice Payment Received!</b>

Amount: <b>${amount}</b>
Customer: <code>${customerInfo}</code>
Invoice ID: <code>${invoice.id}</code>
Paid At: ${paidAt}${itemsInfo}

Status: <b>✅ PAID</b>
    `.trim();

    await sendTelegramMessage(message);
  } catch (error) {
    console.error(
      "❌ Failed to send invoice payment success notification:",
      error
    );
    // Don't throw - we don't want to fail the webhook because of notification issues
  }
};

/**
 * Send new user registration notification to Telegram
 */
const notifyNewUserRegistration = async (userData, userId) => {
  try {
    const userName =
      userData.firstName && userData.lastName
        ? `${userData.firstName} ${userData.lastName}`
        : userData.companyName || "Unknown User";

    const companyName = userData.companyName || "N/A";
    const email = userData.email || "N/A";
    const phone = userData.phone || "N/A";
    const btwNumber = userData.btwNumber || "N/A";
    const registrationTime = new Date().toLocaleString("nl-NL");

    // Format address if available
    let addressInfo = "N/A";
    if (userData.address) {
      const { street, houseNumber, postalCode, city, country } =
        userData.address;
      addressInfo = `${street} ${houseNumber}, ${postalCode} ${city}, ${country}`;
    }

    const message = `
<b>New User Registration!</b>

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

    await sendTelegramMessage(message);
  } catch (error) {
    console.error(
      "❌ Failed to send new user registration notification:",
      error
    );
    // Don't throw - we don't want to fail user creation because of notification issues
  }
};

module.exports = {
  telegramBotToken,
  telegramChatId,
  sendTelegramMessage,
  notifyPaymentSuccess,
  notifyInvoiceCreated,
  notifyInvoicePaymentSucceeded,
  notifyNewUserRegistration,
  formatCurrency,
  isEmulator,
};
