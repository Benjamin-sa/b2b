/**
 * Shared Email Queue Message Types
 * 
 * Used by both API Gateway (producer) and Email Service (consumer)
 * Implements discriminated union pattern for type safety
 */

// Base message type
interface BaseEmailMessage {
  type: string;
  email: string;
  timestamp: string;
}

// Welcome email message (sent after registration)
export interface WelcomeEmailMessage extends BaseEmailMessage {
  type: 'welcome';
  firstName?: string;
  companyName?: string;
}

// Password reset email message
export interface PasswordResetEmailMessage extends BaseEmailMessage {
  type: 'password-reset';
  resetToken?: string; // Only in development
  firstName?: string | null; // User's first name for personalization
  // In production, token is stored in KV and sent via SendGrid
}

// Verification email message (for email verification)
export interface VerificationEmailMessage extends BaseEmailMessage {
  type: 'verification';
  firstName?: string;
  companyName?: string;
  verificationToken: string;
}

// Account verified email message (sent by admin after account approval)
export interface AccountVerifiedEmailMessage extends BaseEmailMessage {
  type: 'account-verified';
  firstName?: string;
  companyName?: string;
}

// Discriminated union of all email message types
export type EmailQueueMessage =
  | WelcomeEmailMessage
  | PasswordResetEmailMessage
  | VerificationEmailMessage
  | AccountVerifiedEmailMessage;

// Type guard functions
export function isWelcomeEmail(message: EmailQueueMessage): message is WelcomeEmailMessage {
  return message.type === 'welcome';
}

export function isPasswordResetEmail(message: EmailQueueMessage): message is PasswordResetEmailMessage {
  return message.type === 'password-reset';
}

export function isVerificationEmail(message: EmailQueueMessage): message is VerificationEmailMessage {
  return message.type === 'verification';
}

export function isAccountVerifiedEmail(message: EmailQueueMessage): message is AccountVerifiedEmailMessage {
  return message.type === 'account-verified';
}
