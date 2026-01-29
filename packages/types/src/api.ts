/**
 * @b2b/types - API Types
 *
 * Types specific to API requests, responses, and worker bindings.
 * These types are used by the API Gateway and other workers.
 */

import type { ISODateString, SQLiteBoolean } from './common';

// ============================================================================
// WORKER ENVIRONMENT TYPES
// ============================================================================

/**
 * Service binding interface for external services
 */
export interface ServiceBinding extends Fetcher {
  fetch: (request: Request) => Promise<Response>;
}

/**
 * API Gateway environment bindings
 */
export interface ApiGatewayEnv {
  ENVIRONMENT: 'development' | 'production';

  // D1 Database - Primary data store
  DB: D1Database;

  // JWT Secrets
  JWT_SECRET: string;
  REFRESH_SECRET: string;

  // Service Bindings (external services only)
  STRIPE_SERVICE: ServiceBinding;
  SHOPIFY_SYNC_SERVICE: ServiceBinding;
  TELEGRAM_SERVICE: ServiceBinding;

  // Queue Bindings
  EMAIL_QUEUE: Queue;

  // Service-to-service authentication
  SERVICE_SECRET: string;

  // CORS configuration
  ALLOWED_ORIGINS: string;

  // Rate limiting (optional)
  RATE_LIMIT?: KVNamespace;
}

/**
 * Context variables set in middleware
 * Note: Uses camelCase for internal Hono context compatibility
 */
export interface ContextVariables {
  user: {
    userId: string;
    email: string;
    role: string;
    stripeCustomerId: string | null;
  };
}

// ============================================================================
// EMAIL QUEUE TYPES
// ============================================================================

/**
 * Base email message
 */
interface BaseEmailMessage {
  type: string;
  email: string;
  timestamp: string;
}

/**
 * Welcome email (after registration)
 */
export interface WelcomeEmailMessage extends BaseEmailMessage {
  type: 'welcome';
  firstName?: string;
  companyName?: string;
}

/**
 * Password reset email
 */
export interface PasswordResetEmailMessage extends BaseEmailMessage {
  type: 'password-reset';
  resetToken?: string;
  firstName?: string | null;
}

/**
 * Email verification email
 */
export interface VerificationEmailMessage extends BaseEmailMessage {
  type: 'verification';
  firstName?: string;
  companyName?: string;
  verificationToken: string;
}

/**
 * Account verified email (admin approval)
 */
export interface AccountVerifiedEmailMessage extends BaseEmailMessage {
  type: 'account-verified';
  firstName?: string;
  companyName?: string;
}

/**
 * Discriminated union of all email types
 */
export type EmailQueueMessage =
  | WelcomeEmailMessage
  | PasswordResetEmailMessage
  | VerificationEmailMessage
  | AccountVerifiedEmailMessage;

// ============================================================================
// WEBHOOK EVENT TYPES (matches D1 `webhook_events` table)
// ============================================================================

/**
 * Webhook event record
 * Note: timestamps can be null due to D1 defaults
 */
export interface WebhookEvent {
  id: string;
  event_type: string;
  event_id: string;
  payload: string;
  processed: SQLiteBoolean;
  success: SQLiteBoolean | null;
  error_message: string | null;
  created_at: ISODateString | null;
  processed_at: ISODateString | null;
}

/**
 * Input for creating webhook event
 */
export interface CreateWebhookEventInput {
  id: string;
  event_type: string;
  event_id: string;
  payload: string;
  processed: SQLiteBoolean;
  created_at: ISODateString;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isWelcomeEmail(message: EmailQueueMessage): message is WelcomeEmailMessage {
  return message.type === 'welcome';
}

export function isPasswordResetEmail(
  message: EmailQueueMessage
): message is PasswordResetEmailMessage {
  return message.type === 'password-reset';
}

export function isVerificationEmail(
  message: EmailQueueMessage
): message is VerificationEmailMessage {
  return message.type === 'verification';
}

export function isAccountVerifiedEmail(
  message: EmailQueueMessage
): message is AccountVerifiedEmailMessage {
  return message.type === 'account-verified';
}
