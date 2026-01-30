import type { Environment, EmailResponse } from '../types/email';

export class ResendClient {
  private apiKey: string;
  private baseUrl = 'https://api.resend.com/emails';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
    options?: {
      tags?: { name: string; value: string }[];
      replyTo?: string;
      headers?: Record<string, string>;
    }
  ): Promise<EmailResponse> {
    try {
      const emailData: Record<string, unknown> = {
        from: '4Tparts B2B <noreply@4tparts.com>',
        to: [to],
        subject: subject,
        html: htmlContent,
        reply_to: options?.replyTo || 'support@4tparts.com',
        headers: {
          'X-Entity-Ref-ID': crypto.randomUUID(),
          ...options?.headers,
        },
      };

      // Add plain text if provided
      if (textContent) {
        emailData.text = textContent;
      }

      // Add tags for tracking/analytics
      if (options?.tags && options.tags.length > 0) {
        emailData.tags = options.tags;
      }

      console.log(`📤 [Resend] Sending email to ${to}, subject: "${subject}"`);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof responseData === 'object' && responseData !== null
            ? (responseData as { message?: string }).message || JSON.stringify(responseData)
            : 'Unknown error';
        throw new Error(`Resend API error: ${response.status} - ${errorMessage}`);
      }

      const result = responseData as { id?: string };
      console.log(`✅ [Resend] Email sent successfully, ID: ${result.id}`);

      return {
        success: true,
        messageId: result.id || 'unknown',
      };
    } catch (error) {
      console.error('❌ [Resend] Email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export function createResendClient(env: Environment): ResendClient {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required');
  }
  return new ResendClient(env.RESEND_API_KEY);
}
