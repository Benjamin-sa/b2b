// Email types for the service

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface Environment {
  SENDGRID_API_KEY: string;
  SERVICE_SECRET: string; // Service-to-service authentication
  ENVIRONMENT: string;
  FRONTEND_URL: string;
  ALLOWED_ORIGINS: string;
}
