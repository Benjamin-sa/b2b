import type { Environment, EmailResponse } from '../types/email';

export class SendGridClient {
  private apiKey: string;
  private baseUrl = 'https://api.sendgrid.com/v3/mail/send';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string
  ): Promise<EmailResponse> {
    try {
      const emailData = {
        personalizations: [
          {
            to: [{ email: to }],
            subject: subject
          }
        ],
        from: {
          email: 'noreply@motordash.com',
          name: 'MotorDash B2B'
        },
        content: [
          {
            type: 'text/html',
            value: htmlContent
          },
          ...(textContent ? [{
            type: 'text/plain',
            value: textContent
          }] : [])
        ]
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
      }

      // SendGrid returns empty body on success, but includes X-Message-Id header
      const messageId = response.headers.get('X-Message-Id');

      return {
        success: true,
        messageId: messageId || 'unknown'
      };
    } catch (error) {
      console.error('SendGrid email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export function createSendGridClient(env: Environment): SendGridClient {
  if (!env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is required');
  }
  return new SendGridClient(env.SENDGRID_API_KEY);
}
