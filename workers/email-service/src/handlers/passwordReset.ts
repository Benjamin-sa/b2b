import type { Environment, EmailResponse } from '../types/email';
import { createSendGridClient } from '../utils/sendgrid';

/**
 * Core email sending logic - used by both HTTP handler and queue consumer
 */
export async function sendPasswordResetEmail(
  env: Environment,
  to: string,
  userName: string,
  resetToken: string,
  resetUrl: string
): Promise<EmailResponse> {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - 4Tparts B2B</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #ffffff;">
        <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
          Reset your 4Tparts B2B account password securely. Link expires in 24 hours.
        </div>
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px;">
                
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #466478; font-size: 24px; font-weight: bold;">
                      Password Reset Request
                    </h1>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <p style="margin: 0 0 20px 0; font-size: 16px;">
                      Hello <strong>${userName}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 20px 0; font-size: 16px;">
                      We received a request to reset the password for your 4Tparts B2B account. 
                      If you made this request, click the button below to reset your password.
                    </p>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 30px auto;">
                      <tr>
                        <td style="text-align: center;">
                          <a href="${resetUrl}" style="background-color: #dc3545; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; font-size: 16px; display: inline-block;">
                            Reset My Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 30px 0 10px 0; font-size: 14px; color: #666;">
                      If the button doesn't work, copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0 0 30px 0; font-size: 14px; word-break: break-all;">
                      <a href="${resetUrl}" style="color: #466478;">${resetUrl}</a>
                    </p>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 4px; margin: 30px 0;">
                      <h3 style="margin: 0 0 10px 0; color: #856404; font-size: 16px; font-weight: bold;">
                        Security Notice
                      </h3>
                      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #856404;">
                        <li style="margin-bottom: 8px;">This link will expire in 24 hours</li>
                        <li style="margin-bottom: 8px;">Only use this link if you requested the password reset</li>
                        <li style="margin-bottom: 0;">If you didn't request this, please ignore this email</li>
                      </ul>
                    </div>
                    
                    <p style="margin: 30px 0 20px 0; font-size: 16px;">
                      If you have any questions or need assistance, contact our support team at 
                      <a href="mailto:support@4tparts.com" style="color: #466478;">support@4tparts.com</a>.
                    </p>
                    
                    <p style="margin: 30px 0 0 0; font-size: 16px;">
                      Best regards,<br>
                      <strong>The 4Tparts Security Team</strong>
                    </p>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 20px 40px; border-top: 1px solid #eee; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #666;">
                      This password reset was requested for ${to} on 4Tparts B2B.<br>
                      If you didn't request this, please contact support immediately.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    
    const textContent = `
4Tparts B2B - Password Reset Request

Hello ${userName},

We received a request to reset the password for your 4Tparts B2B account. If you made this request, use the link below to reset your password.

Reset Password Link:
${resetUrl}

SECURITY NOTICE:
• This link will expire in 24 hours
• Only use this link if you requested the password reset  
• If you didn't request this, please ignore this email

If you have any questions or need assistance, contact our support team at support@4tparts.com.

Best regards,
The 4Tparts Security Team

---
This password reset was requested for ${to} on 4Tparts B2B.
If you didn't request this, please contact support immediately.
    `;
    
    const sendGridClient = createSendGridClient(env);
    const result = await sendGridClient.sendEmail(
      to,
      'Password Reset - 4Tparts B2B',
      htmlContent,
      textContent,
      {
        clickTracking: false, // CRITICAL: Disable click tracking to preserve reset URL
        emailType: 'password-reset',
        categories: ['b2b-transactional', 'password-reset']
      }
    );
    
    return result;
    
  } catch (error) {
    console.error('Password reset email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    };
  }
}

