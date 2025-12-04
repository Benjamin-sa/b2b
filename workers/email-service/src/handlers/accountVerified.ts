/**
 * Account Verified Email Handler
 * 
 * Sends an email notification when an admin verifies/approves a user account
 */

import type { Environment, EmailResponse } from '../types/email';
import { createSendGridClient } from '../utils/sendgrid';

/**
 * Send account verified email
 * 
 * @param env - Worker environment with SendGrid API key
 * @param to - Recipient email address
 * @param firstName - User's first name
 * @param companyName - User's company name
 * @returns Result object with success status
 */
export async function sendAccountVerifiedEmail(
  env: Environment,
  to: string,
  firstName: string,
  companyName: string
): Promise<EmailResponse> {
  console.log(`📧 [Account Verified Email] Sending to ${to}`);
  
  const subject = '✅ Your B2B Account Has Been Approved';
  const text = `Hello ${firstName},

Great news! Your B2B account for ${companyName} has been verified and approved by our team.

You now have full access to:
- Browse our complete product catalog
- Place orders for your business
- Manage your account and orders
- Access exclusive B2B pricing

You can log in at any time to start ordering: ${env.FRONTEND_URL}

If you have any questions or need assistance, please don't hesitate to reach out to our support team.

Welcome to our B2B platform!

Best regards,
The B2B Team`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #4CAF50;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #4CAF50;
      margin: 0;
      font-size: 24px;
    }
    .success-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .content {
      margin-bottom: 30px;
    }
    .feature-list {
      background-color: #f5f5f5;
      border-left: 4px solid #4CAF50;
      padding: 15px 20px;
      margin: 20px 0;
    }
    .feature-list ul {
      margin: 0;
      padding-left: 20px;
    }
    .feature-list li {
      margin: 8px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #4CAF50;
      color: white !important;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 20px 0;
    }
    .cta-button:hover {
      background-color: #45a049;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="success-icon">✅</div>
      <h1>Account Approved!</h1>
    </div>
    
    <div class="content">
      <p>Hello <strong>${firstName}</strong>,</p>
      
      <p>Great news! Your B2B account for <strong>${companyName}</strong> has been verified and approved by our team.</p>
      
      <div class="feature-list">
        <p><strong>You now have full access to:</strong></p>
        <ul>
          <li>Browse our complete product catalog</li>
          <li>Place orders for your business</li>
          <li>Manage your account and orders</li>
          <li>Access exclusive B2B pricing</li>
        </ul>
      </div>
      
      <p style="text-align: center;">
        <a href="${env.FRONTEND_URL}" class="cta-button">Start Shopping Now</a>
      </p>
      
      <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
      
      <p><strong>Welcome to our B2B platform!</strong></p>
    </div>
    
    <div class="footer">
      <p>Best regards,<br>The B2B Team</p>
      <p style="font-size: 12px; color: #999;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    // Send email via SendGrid
    const sendGridClient = createSendGridClient(env);
    const result = await sendGridClient.sendEmail(
      to,
      subject,
      html,
      text,
      {
        clickTracking: true, // Can track clicks for marketing purposes
        emailType: 'account-verified',
        categories: ['b2b-transactional', 'account-verified']
      }
    );
    
    return result;
  } catch (error) {
    console.error('Account verified email error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    };
  }
}
