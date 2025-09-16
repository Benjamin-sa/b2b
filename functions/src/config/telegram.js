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
 * Send invoice created notification to Telegram
 */
const notifyInvoiceCreated = async (invoice) => {
  try {
    const amount = formatCurrency(invoice.amount_due, invoice.currency);
    const dueDate = invoice.due_date
      ? new Date(invoice.due_date * 1000).toLocaleDateString("nl-NL")
      : "No due date";

    // Use webhook data directly
    let customerInfo =
      invoice.customer_name || invoice.customer_email || "Unknown";
    let itemsInfo = "";
    let orderDetailsInfo = "";

    // Parse order metadata if available
    if (invoice.metadata?.orderMetadata) {
      try {
        const orderMetadata = JSON.parse(invoice.metadata.orderMetadata);

        // Use customer info from order metadata
        if (orderMetadata.userInfo) {
          const { companyName, contactPerson, email, btwNumber } =
            orderMetadata.userInfo;
          customerInfo = `${contactPerson || companyName || email}`;
          if (companyName && contactPerson) {
            customerInfo = `${contactPerson} (${companyName})`;
          }
        }

        // Format order items
        if (orderMetadata.orderItems && orderMetadata.orderItems.length > 0) {
          const items = orderMetadata.orderItems
            .slice(0, 3)
            .map((item) => {
              return `• ${item.productName} (${item.quantity}x) - €${item.unitPrice}`;
            })
            .join("\n");

          itemsInfo = `\n\n📦 <b>Items:</b>\n${items}`;

          if (orderMetadata.orderItems.length > 3) {
            itemsInfo += `\n... and ${
              orderMetadata.orderItems.length - 3
            } more items`;
          }
        }

        // Add shipping info if available
        if (orderMetadata.shippingAddress) {
          const addr = orderMetadata.shippingAddress;
          orderDetailsInfo = `\n\n🚚 <b>Shipping:</b>\n${
            addr.company || addr.contactPerson
          }\n${addr.street}, ${addr.zipCode} ${addr.city}`;
        }
      } catch (parseError) {
        console.warn(
          "Failed to parse order metadata for notification:",
          parseError
        );
      }
    }

    // Fallback to line items from webhook if no order metadata
    if (!itemsInfo && invoice.lines?.data && invoice.lines.data.length > 0) {
      const items = invoice.lines.data
        .slice(0, 3)
        .map((item) => {
          const itemAmount = (item.amount / 100).toFixed(2);
          return `• ${item.description} (${item.quantity}x) - €${itemAmount}`;
        })
        .join("\n");

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
Created: ${new Date().toLocaleString("nl-NL")}${itemsInfo}${orderDetailsInfo}

Status: <b>⏳ PENDING</b>
    `.trim();

    await sendTelegramMessage(message);
  } catch (error) {
    console.error("❌ Failed to send invoice created notification:", error);
    // Don't throw - we don't want to fail the webhook because of notification issues
  }
};

/**
 * Send invoice payment success notification to Telegram
 */
const notifyInvoicePaymentSucceeded = async (invoice) => {
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

    // Use webhook data directly
    let customerInfo =
      invoice.customer_name || invoice.customer_email || "Unknown";
    let itemsInfo = "";

    // Parse order metadata if available
    if (invoice.metadata?.orderMetadata) {
      try {
        const orderMetadata = JSON.parse(invoice.metadata.orderMetadata);

        // Use customer info from order metadata
        if (orderMetadata.userInfo) {
          const { companyName, contactPerson, email } = orderMetadata.userInfo;
          customerInfo = `${contactPerson || companyName || email}`;
          if (companyName && contactPerson) {
            customerInfo = `${contactPerson} (${companyName})`;
          }
        }

        // Format order items (show fewer items for payment notifications)
        if (orderMetadata.orderItems && orderMetadata.orderItems.length > 0) {
          const items = orderMetadata.orderItems
            .slice(0, 2)
            .map((item) => {
              return `• ${item.productName} (${item.quantity}x)`;
            })
            .join("\n");

          itemsInfo = `\n\n📦 <b>Items:</b>\n${items}`;

          if (orderMetadata.orderItems.length > 2) {
            itemsInfo += `\n... and ${
              orderMetadata.orderItems.length - 2
            } more items`;
          }
        }
      } catch (parseError) {
        console.warn(
          "Failed to parse order metadata for payment notification:",
          parseError
        );
      }
    }

    // Fallback to line items from webhook if no order metadata
    if (!itemsInfo && invoice.lines?.data && invoice.lines.data.length > 0) {
      const items = invoice.lines.data
        .slice(0, 2)
        .map((item) => {
          return `• ${item.description} (${item.quantity}x)`;
        })
        .join("\n");

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
  notifyInvoiceCreated,
  notifyInvoicePaymentSucceeded,
  notifyNewUserRegistration,
  formatCurrency,
  isEmulator,
};
