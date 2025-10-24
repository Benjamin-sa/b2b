/**
 * Auth Orchestration Routes
 * 
 * Handles multi-service workflows for authentication
 * Uses service bindings for direct worker-to-worker communication
 */

import { Hono } from 'hono';
import type { Env } from '../types';

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
    
    // Step 2: Send welcome email (NON-BLOCKING)
    // Use waitUntil to fire-and-forget
    // Email failure should NOT fail the registration
    c.executionCtx.waitUntil(
      (async () => {
        try {
          console.log('📧 [Gateway] Sending welcome email to:', authResult.user.email);
          
          const emailRequest = new Request('http://internal/email/welcome', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Gateway-Request': 'true',
            },
            body: JSON.stringify({
              email: authResult.user.email,
              firstName: authResult.user.firstName,
              companyName: authResult.user.companyName,
            }),
          });
          
          const emailResponse = await c.env.EMAIL_SERVICE.fetch(emailRequest);
          
          if (emailResponse.ok) {
            console.log('✅ [Gateway] Welcome email sent successfully');
          } else {
            const errorData = await emailResponse.json();
            console.error('⚠️ [Gateway] Email failed (non-critical):', errorData);
            // Don't throw - email failure is not critical
          }
        } catch (error) {
          console.error('⚠️ [Gateway] Email service error (non-critical):', error);
          // Don't throw - email failure is not critical
        }
      })()
    );
    
    // Step 3: Return success immediately (don't wait for email)
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
  
  const request = new Request('http://internal/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
  
  const request = new Request('http://internal/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
  
  const request = new Request('http://internal/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
    
    // Step 1: Create reset token (BLOCKING)
    const authRequest = new Request('http://internal/auth/password-reset/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const authResponse = await c.env.AUTH_SERVICE.fetch(authRequest);
    
    if (!authResponse.ok) {
      // Return the error response directly from auth service
      return authResponse;
    }
    
    const authResult = (await authResponse.json()) as PasswordResetResponse;
    
    // Step 2: Send password reset email (NON-BLOCKING)
    c.executionCtx.waitUntil(
      (async () => {
        try {
          console.log('📧 [Gateway] Sending password reset email to:', data.email);
          
          const emailRequest = new Request('http://internal/email/password-reset', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: data.email,
              resetToken: authResult.resetToken, // Only in dev
              // In production, token is stored in KV and emailed via SendGrid
            }),
          });
          
          const emailResponse = await c.env.EMAIL_SERVICE.fetch(emailRequest);
          
          if (emailResponse.ok) {
            console.log('✅ [Gateway] Password reset email sent');
          } else {
            console.error('⚠️ [Gateway] Password reset email failed (non-critical)');
          }
        } catch (error) {
          console.error('⚠️ [Gateway] Email service error:', error);
        }
      })()
    );
    
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
  
  const request = new Request('http://internal/auth/password-reset/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  return c.env.AUTH_SERVICE.fetch(request);
});

export default authOrchestration;
