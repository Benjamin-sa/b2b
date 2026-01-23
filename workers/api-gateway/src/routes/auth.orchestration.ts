/**
 * Auth Orchestration Routes
 *
 * Handles multi-service workflows for authentication
 * Uses service bindings for direct worker-to-worker communication
 * Uses Queue for async email delivery (robust, reliable)
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import type { EmailQueueMessage } from '../../../shared-types/email-queue';

const authOrchestration = new Hono<{ Bindings: Env }>();

// Type definitions for service responses
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    uid: string;
    email: string;
    role: string;
    companyName?: string;
    firstName?: string;
    lastName?: string;
    isVerified: boolean;
    isActive: boolean;
  };
}

interface PasswordResetResponse {
  message: string;
  resetToken?: string; // Only in development
  firstName?: string | null; // User's first name for email personalization
}

/**
 * POST /auth/register
 * Orchestrates: User Registration + Welcome Email
 *
 * Flow:
 * 1. Create user + Stripe customer (BLOCKING - critical)
 * 2. Send welcome email (NON-BLOCKING - fire and forget)
 * 3. Return tokens to frontend
 */
authOrchestration.post('/register', async (c) => {
  try {
    const data = await c.req.json();

    console.log('🎯 [Gateway] Orchestrating user registration for:', data.email);

    // Step 1: Create user + Stripe customer (BLOCKING)
    // This is critical - if it fails, nothing else should happen
    const authRequest = new Request('http://internal/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Request': 'true',
        'X-Service-Token': c.env.SERVICE_SECRET, // 👈 Pass the secret
      },
      body: JSON.stringify(data),
    });

    const authResponse = await c.env.AUTH_SERVICE.fetch(authRequest);

    if (!authResponse.ok) {
      // Return the error response directly from auth service
      return authResponse;
    }

    const authResult = (await authResponse.json()) as AuthResponse;
    console.log('✅ [Gateway] User created:', authResult.user.email);

    // Step 2: Send welcome email via QUEUE (NON-BLOCKING)

    console.log('📧 [Gateway] Queuing welcome email for:', authResult.user.email);

    const emailMessage: EmailQueueMessage = {
      type: 'welcome',
      email: authResult.user.email,
      firstName: authResult.user.firstName,
      companyName: authResult.user.companyName,
      timestamp: new Date().toISOString(),
    };

    await c.env.EMAIL_QUEUE.send(emailMessage);
    console.log('✅ [Gateway] Welcome email queued successfully');

    // Step 3: Send Telegram notification to admins (NON-BLOCKING)
    console.log('📱 [Gateway] Sending Telegram notification for new user registration');

    try {
      const telegramRequest = new Request('https://dummy/notifications/user/registered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Token': c.env.SERVICE_SECRET,
        },
        body: JSON.stringify({
          userId: authResult.user.uid,
          userData: {
            firstName: authResult.user.firstName,
            lastName: authResult.user.lastName,
            companyName: authResult.user.companyName,
            email: authResult.user.email,
            // phone and btwNumber would be added here if available in authResult
          },
        }),
      });

      await c.env.TELEGRAM_SERVICE.fetch(telegramRequest);
      console.log('✅ [Gateway] Telegram notification sent successfully');
    } catch (telegramError) {
      // Log Telegram error but don't fail the request
      console.error('⚠️  [Gateway] Failed to send Telegram notification:', telegramError);
    }

    // Step 4: Return success immediately (don't wait for notifications)
    console.log('🎉 [Gateway] Registration orchestration completed');
    return c.json(authResult, 201);
  } catch (error: any) {
    console.error('❌ [Gateway] Registration orchestration failed:', error);
    return c.json(
      {
        error: 'OrchestrationError',
        code: 'gateway/registration-failed',
        message: error.message || 'Registration failed',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * POST /auth/login
 * Simple proxy - no orchestration needed
 */
authOrchestration.post('/login', async (c) => {
  const data = await c.req.json();

  const headers = new Headers(c.req.raw.headers);
  headers.set('X-Service-Token', c.env.SERVICE_SECRET);

  const request = new Request('http://internal/auth/login', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  return c.env.AUTH_SERVICE.fetch(request);
});

/**
 * POST /auth/refresh
 * Simple proxy - no orchestration needed
 */
authOrchestration.post('/refresh', async (c) => {
  const data = await c.req.json();

  const headers = new Headers(c.req.raw.headers);
  headers.set('X-Service-Token', c.env.SERVICE_SECRET);

  const request = new Request('http://internal/auth/refresh', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  return c.env.AUTH_SERVICE.fetch(request);
});

/**
 * POST /auth/logout
 * Simple proxy - no orchestration needed
 */
authOrchestration.post('/logout', async (c) => {
  const data = await c.req.json();

  const headers = new Headers(c.req.raw.headers);
  headers.set('X-Service-Token', c.env.SERVICE_SECRET);

  const request = new Request('http://internal/auth/logout', {
    method: 'POST',
    headers,

    body: JSON.stringify(data),
  });

  return c.env.AUTH_SERVICE.fetch(request);
});

/**
 * POST /auth/password-reset/request
 * Orchestrates: Password Reset Token + Email
 */
authOrchestration.post('/password-reset/request', async (c) => {
  try {
    const data = await c.req.json();

    console.log('🎯 [Gateway] Orchestrating password reset for:', data.email);

    const headers = new Headers(c.req.raw.headers);
    headers.set('X-Service-Token', c.env.SERVICE_SECRET);

    // Step 1: Create reset token (BLOCKING)
    const authRequest = new Request('http://internal/auth/password-reset/request', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    const authResponse = await c.env.AUTH_SERVICE.fetch(authRequest);

    if (!authResponse.ok) {
      // Return the error response directly from auth service
      return authResponse;
    }

    const authResult = (await authResponse.json()) as PasswordResetResponse;

    // Step 2: Send password reset email via QUEUE (NON-BLOCKING, ROBUST)

    console.log('📧 [Gateway] Queuing password reset email for:', data.email);

    const emailMessage: EmailQueueMessage = {
      type: 'password-reset',
      email: data.email,
      resetToken: authResult.resetToken, // Only in dev
      firstName: authResult.firstName, // User's first name for personalization
      timestamp: new Date().toISOString(),
    };

    await c.env.EMAIL_QUEUE.send(emailMessage);
    console.log('✅ [Gateway] Password reset email queued successfully');

    return c.json(authResult);
  } catch (error: any) {
    console.error('❌ [Gateway] Password reset orchestration failed:', error);
    return c.json(
      {
        error: 'OrchestrationError',
        code: 'gateway/password-reset-failed',
        message: error.message || 'Password reset failed',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * POST /auth/password-reset/confirm
 * Simple proxy - no orchestration needed
 */
authOrchestration.post('/password-reset/confirm', async (c) => {
  const data = await c.req.json();

  const headers = new Headers(c.req.raw.headers);
  headers.set('X-Service-Token', c.env.SERVICE_SECRET);

  const request = new Request('http://internal/auth/password-reset/confirm', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  return c.env.AUTH_SERVICE.fetch(request);
});

authOrchestration.post('/validate', async (c) => {
  const data = await c.req.json();

  const headers = new Headers(c.req.raw.headers);
  headers.set('X-Service-Token', c.env.SERVICE_SECRET);

  const request = new Request('http://internal/auth/validate', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  return c.env.AUTH_SERVICE.fetch(request);
});

export default authOrchestration;
