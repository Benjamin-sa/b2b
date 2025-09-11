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
          email: 'n@4tparts.com',
          name: '4Tparts B2B'
        },
        // Reply-to for better deliverability and customer support
        reply_to: {
          email: 'support@4tparts.com',
          name: '4Tparts Support Team'
        },
        content: [
          ...(textContent ? [{
            type: 'text/plain',
            value: textContent
          }] : []),
          {
            type: 'text/html',
            value: htmlContent
          }
        ],
        // Tracking settings for better analytics
        tracking_settings: {
          click_tracking: {
            enable: true,
            enable_text: false
          },
          open_tracking: {
            enable: true,
            substitution_tag: '%open-track%'
          },
          subscription_tracking: {
            enable: false // B2B emails typically don't need this
          }
        },
        // Mail settings for better deliverability
        mail_settings: {
          sandbox_mode: {
            enable: false
          }
        },
        // Categories for analytics and organization
        categories: ['b2b-transactional', 'welcome-email'],
        // Custom args for internal tracking
        custom_args: {
          email_type: 'welcome',
          platform: '4tparts-b2b'
        }
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          // User-Agent for better identification
          'User-Agent': '4Tparts-EmailService/1.0'
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
