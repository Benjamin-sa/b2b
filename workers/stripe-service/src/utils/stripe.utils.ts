/**
 * Stripe Client Utilities
 */

import Stripe from 'stripe';
import type { Env } from '../types';
import { StripeServiceError } from '../types';

/**
 * Initialize Stripe client with API key
 * Uses fetch-based HTTP client for Cloudflare Workers compatibility
 */
export function getStripeClient(env: Env): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new StripeServiceError(
      'STRIPE_NOT_CONFIGURED',
      'Stripe secret key is not configured',
      500
    );
  }

  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia',
    httpClient: Stripe.createFetchHttpClient(), // Use fetch for Cloudflare Workers
  });
}

/**
 * Handle Stripe API errors with proper error formatting
 */
export function handleStripeError(error: any, operation: string): never {
  console.error(`❌ Stripe ${operation} failed:`, error);

  if (error.type === 'StripeCardError') {
    throw new StripeServiceError('CARD_ERROR', error.message || 'Card error occurred', 402, {
      decline_code: error.decline_code,
    });
  }

  if (error.type === 'StripeInvalidRequestError') {
    throw new StripeServiceError(
      'INVALID_REQUEST',
      error.message || 'Invalid request to Stripe',
      400,
      { param: error.param }
    );
  }

  if (error.type === 'StripeAPIError') {
    throw new StripeServiceError('STRIPE_API_ERROR', 'Stripe API error occurred', 502);
  }

  if (error.type === 'StripeConnectionError') {
    throw new StripeServiceError('CONNECTION_ERROR', 'Failed to connect to Stripe', 503);
  }

  if (error.type === 'StripeAuthenticationError') {
    throw new StripeServiceError('AUTHENTICATION_ERROR', 'Stripe authentication failed', 401);
  }

  // Generic error
  throw new StripeServiceError('STRIPE_ERROR', error.message || `Failed to ${operation}`, 500, {
    type: error.type,
  });
}

/**
 * Validate required fields
 */
export function validateRequired<T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[]
): void {
  const missing = fields.filter((field) => !data[field]);

  if (missing.length > 0) {
    throw new StripeServiceError(
      'VALIDATION_ERROR',
      `Missing required fields: ${missing.join(', ')}`,
      400
    );
  }
}
