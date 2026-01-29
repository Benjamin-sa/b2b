/**
 * API Gateway Types
 *
 * Re-exports from @b2b/types with gateway-specific additions.
 * New code should import types from '@b2b/types' where possible.
 */

// Re-export API types from @b2b/types
export type {
  ServiceBinding,
  ApiGatewayEnv,
  ContextVariables,
  EmailQueueMessage,
  WelcomeEmailMessage,
  PasswordResetEmailMessage,
  VerificationEmailMessage,
  AccountVerifiedEmailMessage,
} from '@b2b/types';

// Service binding type aliases for compatibility
export type StripeService = import('@b2b/types').ServiceBinding;
export type ShopifySyncService = import('@b2b/types').ServiceBinding;
export type TelegramService = import('@b2b/types').ServiceBinding;

// Re-export Env as ApiGatewayEnv for backward compatibility
export type { ApiGatewayEnv as Env } from '@b2b/types';

// Proxy options (gateway-specific)
export interface ProxyOptions {
  serviceUrl: string;
  stripPrefix?: string;
  timeout?: number;
}
