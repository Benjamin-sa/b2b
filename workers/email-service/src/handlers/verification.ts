import type { Environment, VerificationEmailRequest, EmailResponse } from '../types/email';
import { createSendGridClient } from '../utils/sendgrid';
import { validateRequest, jsonResponse, corsHeaders } from '../utils/validators';

/**
 * Core email sending logic - used by both HTTP handler and queue consumer
 */
export async function sendVerificationEmail(
  env: Environment,
  to: string,
  userName: string,
  companyName: string,
  verificationUrl: string
): Promise<EmailResponse> {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Approved - 4Tparts B2B</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #ffffff;">
        <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
          Great news! Your 4Tparts B2B account has been approved.
        </div>
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px;">
                
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #466478; font-size: 24px; font-weight: bold;">
                      Account Approved!
                    </h1>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <p style="margin: 0 0 20px 0; font-size: 16px;">
                      Hello <strong>${userName}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 20px 0; font-size: 16px;">
                      Your 4Tparts B2B account for <strong>${companyName}</strong> has been successfully reviewed and approved by our team.
                    </p>
                    
                    <p style="margin: 0 0 30px 0; font-size: 16px;">
                      You now have full access to our B2B platform with exclusive pricing, bulk ordering, and priority support.
                    </p>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 30px auto;">
                      <tr>
                        <td style="text-align: center;">
                          <a href="${verificationUrl}" style="background-color: #466478; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; font-size: 16px; display: inline-block;">
                            Access Your Account
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 30px 0;">
                      <h3 style="margin: 0 0 15px 0; color: #466478; font-size: 18px; font-weight: bold;">
                        What You Can Do Now:
                      </h3>
                      <ul style="margin: 0; padding-left: 20px; font-size: 15px;">
                        <li style="margin-bottom: 8px;">Browse our complete product catalog with B2B pricing</li>
                        <li style="margin-bottom: 8px;">Access exclusive B2B products and services</li>
                        <li style="margin-bottom: 8px;">Get priority customer support</li>
                        <li style="margin-bottom: 0;">Manage orders and track shipments</li>
                      </ul>
                    </div>
                    
                    <p style="margin: 30px 0 20px 0; font-size: 16px;">
                      If you have any questions, our support team is here to help at 
                      <a href="mailto:support@4tparts.com" style="color: #466478;">support@4tparts.com</a>.
                    </p>
                    
                    <p style="margin: 30px 0 0 0; font-size: 16px;">
                      Best regards,<br>
                      <strong>The 4Tparts Team</strong>
                    </p>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 20px 40px; border-top: 1px solid #eee; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #666;">
                      This email was sent to ${to} for your 4Tparts B2B account.<br>
                      You're receiving this because your account was recently approved.
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
4Tparts B2B - Account Verified!

Hello ${userName},

Excellent news! Your 4Tparts B2B account for ${companyName} has been successfully verified and approved by our team.

You now have full access to our B2B platform, including exclusive pricing, bulk ordering capabilities, and priority support.

Access Your Account:
${verificationUrl}

WHAT YOU CAN DO NOW:
• Browse our complete product catalog with B2B pricing
• Access exclusive B2B products and services
• Get priority customer support
• Manage orders and track shipments in real-time

If you have any questions or need assistance getting started, our dedicated B2B support team is here to help at support@4tparts.com.

Welcome to 4Tparts B2B!
The 4Tparts Team

---
This verification email was sent to ${to} for your 4Tparts B2B account.
You're receiving this because your account was recently approved.
    `;
    
    const sendGridClient = createSendGridClient(env);
    const result = await sendGridClient.sendEmail(
      to,
      'Account Approved - 4Tparts B2B',
      htmlContent,
      textContent
    );
    
    return result;
    
  } catch (error) {
    console.error('Verification email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    };
  }
}

/**
 * HTTP Handler - wraps core logic with HTTP request/response handling
 */
export async function handleVerificationEmail(request: Request, env: Environment): Promise<Response> {
  const origin = request.headers.get('Origin');
  const cors = corsHeaders(env, origin || undefined);
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }
  
  if (request.method !== 'POST') {
    return jsonResponse(
      { success: false, error: 'Method not allowed' }, 
      405, 
      cors
    );
  }
  
  try {
    const body: VerificationEmailRequest = await request.json();
    
    const validation = validateRequest(body, ['to', 'userName', 'companyName', 'verificationUrl']);
    if (!validation.valid) {
      return jsonResponse(
        { success: false, error: validation.error }, 
        400, 
        cors
      );
    }
    
    const result = await sendVerificationEmail(env, body.to, body.userName, body.companyName, body.verificationUrl);
    
    return jsonResponse(result, result.success ? 200 : 500, cors);
    
  } catch (error) {
    console.error('Verification email handler error:', error);
    return jsonResponse(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }, 
      500, 
      cors
    );
  }
}
