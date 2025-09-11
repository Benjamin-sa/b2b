// Email types for the service
export interface EmailRequest {
  to: string;
  subject: string;
  templateData?: Record<string, any>;
}

export interface WelcomeEmailRequest extends EmailRequest {
  userName: string;
  companyName: string;
}

export interface VerificationEmailRequest extends EmailRequest {
  userName: string;
  companyName: string;
}

export interface PasswordResetRequest extends EmailRequest {
  resetToken: string;
  userName: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface Environment {
  SENDGRID_API_KEY: string;
  ENVIRONMENT: string;
  FRONTEND_URL: string;
  ALLOWED_ORIGINS: string;
}
