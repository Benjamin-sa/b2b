import { Hono } from 'hono';
import type { Env, InvoiceNotification, UserRegistrationNotification } from '../types';
import {
  notifyInvoiceCreated,
  notifyInvoicePaymentSucceeded,
  notifyNewUserRegistration,
  sendCustomMessage,
} from '../services/notification.service';

const notifications = new Hono<{ Bindings: Env }>();

// ============================================================================
// INVOICE NOTIFICATIONS
// ============================================================================

/**
 * POST /notifications/invoice/created
 * Send invoice created notification
 */
notifications.post('/invoice/created', async (c) => {
  try {
    const invoice = await c.req.json<InvoiceNotification>();
    
    if (!invoice.id || !invoice.amount_due || !invoice.currency) {
      return c.json(
        {
          error: 'Validation Error',
          code: 'telegram/invalid-invoice-data',
          message: 'Missing required invoice fields',
        },
        400
      );
    }

    await notifyInvoiceCreated(c.env, invoice);

    return c.json({
      success: true,
      message: 'Invoice created notification sent',
    });
  } catch (error) {
    console.error('[Telegram] Invoice created notification error:', error);
    return c.json(
      {
        error: 'Notification Failed',
        code: 'telegram/notification-failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /notifications/invoice/paid
 * Send invoice payment success notification
 */
notifications.post('/invoice/paid', async (c) => {
  try {
    const invoice = await c.req.json<InvoiceNotification>();
    
    if (!invoice.id || !invoice.currency) {
      return c.json(
        {
          error: 'Validation Error',
          code: 'telegram/invalid-invoice-data',
          message: 'Missing required invoice fields',
        },
        400
      );
    }

    await notifyInvoicePaymentSucceeded(c.env, invoice);

    return c.json({
      success: true,
      message: 'Invoice payment notification sent',
    });
  } catch (error) {
    console.error('[Telegram] Invoice payment notification error:', error);
    return c.json(
      {
        error: 'Notification Failed',
        code: 'telegram/notification-failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// ============================================================================
// USER NOTIFICATIONS
// ============================================================================

/**
 * POST /notifications/user/registered
 * Send new user registration notification
 */
notifications.post('/user/registered', async (c) => {
  try {
    const body = await c.req.json<{ userData: UserRegistrationNotification; userId: string }>();
    
    if (!body.userId || !body.userData) {
      return c.json(
        {
          error: 'Validation Error',
          code: 'telegram/invalid-user-data',
          message: 'Missing required user fields',
        },
        400
      );
    }

    await notifyNewUserRegistration(c.env, body.userData, body.userId);

    return c.json({
      success: true,
      message: 'User registration notification sent',
    });
  } catch (error) {
    console.error('[Telegram] User registration notification error:', error);
    return c.json(
      {
        error: 'Notification Failed',
        code: 'telegram/notification-failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// ============================================================================
// CUSTOM MESSAGES
// ============================================================================

/**
 * POST /notifications/custom
 * Send custom message to Telegram
 */
notifications.post('/custom', async (c) => {
  try {
    const body = await c.req.json<{
      message: string;
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    }>();
    
    if (!body.message) {
      return c.json(
        {
          error: 'Validation Error',
          code: 'telegram/missing-message',
          message: 'Message is required',
        },
        400
      );
    }

    await sendCustomMessage(c.env, body.message, body.parseMode);

    return c.json({
      success: true,
      message: 'Custom message sent',
    });
  } catch (error) {
    console.error('[Telegram] Custom message error:', error);
    return c.json(
      {
        error: 'Notification Failed',
        code: 'telegram/notification-failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default notifications;
