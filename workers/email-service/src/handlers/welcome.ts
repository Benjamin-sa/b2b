import type { Environment, WelcomeEmailRequest, EmailResponse } from '../types/email';
import { createSendGridClient } from '../utils/sendgrid';
import { validateRequest, jsonResponse, corsHeaders } from '../utils/validators';

/**
 * Core email sending logic - used by both HTTP handler and queue consumer
 */
export async function sendWelcomeEmail(
  env: Environment,
  to: string,
  userName: string,
  companyName: string
): Promise<EmailResponse> {
  try {
    // Create email content with deliverability best practices
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to 4Tparts B2B</title>
        <!--[if mso]>
        <noscript>
          <xml>
            <o:OfficeDocumentSettings>
              <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
          </xml>
        </noscript>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #ffffff;">
        <!-- Preheader text -->
        <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
          Your 4Tparts B2B account is being reviewed. We'll notify you once approved.
        </div>
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 40px 40px 20px 40px;">
                    <h1 style="margin: 0; color: #466478; font-size: 28px; font-weight: 600; text-align: center;">
                      Welcome to 4Tparts B2B!
                    </h1>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                      Hello <strong>${userName}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                      Thank you for creating an account with 4Tparts B2B for <strong>${companyName}</strong>. 
                      We're excited to welcome you to our business platform!
                    </p>
                    
                    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">
                      Your account is currently under review by our team. Once verified, you'll receive another email 
                      with access to our full B2B platform and exclusive pricing.
                    </p>
                    
                    <!-- What's Next Box -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #e8edef; border-radius: 6px; margin: 30px 0;">
                      <tr>
                        <td style="padding: 25px;">
                          <h3 style="margin: 0 0 15px 0; color: #466478; font-size: 18px; font-weight: 600;">
                            What's Next?
                          </h3>
                          <ul style="margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.8;">
                            <li style="margin-bottom: 8px;">Our team will review your account within 48 hours</li>
                            <li style="margin-bottom: 8px;">You'll receive a verification email once approved</li>
                            <li style="margin-bottom: 0;">Access our full product catalog and place orders</li>
                          </ul>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 30px 0 20px 0; font-size: 16px; line-height: 1.6;">
                      If you have any questions or need assistance, don't hesitate to contact our support team 
                      at <a href="mailto:support@4tparts.com" style="color: #466478; text-decoration: none;">support@4tparts.com</a>.
                    </p>
                    
                    <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6;">
                      Best regards,<br>
                      <strong>The 4Tparts Team</strong>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #eee;">
                    <p style="margin: 0; font-size: 12px; color: #666; text-align: center; line-height: 1.5;">
                      This email was sent to ${to} because you created an account on 4Tparts B2B.<br>
                      If you didn't create this account, please contact us immediately.
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
4Tparts B2B - Welcome!

Hello ${userName},

Thank you for creating an account with 4Tparts B2B for ${companyName}. We're excited to welcome you to our business platform!

Your account is currently under review by our team. Once verified, you'll receive another email with access to our full B2B platform and exclusive pricing.

WHAT'S NEXT?
• Our team will review your account within 48 hours
• You'll receive a verification email once approved  
• Access our full product catalog and place orders

If you have any questions or need assistance, contact our support team at support@4tparts.com.

Best regards,
The 4Tparts Team

---
This email was sent to ${to} because you created an account on 4Tparts B2B.
If you didn't create this account, please contact us immediately.
    `;
    
    // Send email via SendGrid
    const sendGridClient = createSendGridClient(env);
    const result = await sendGridClient.sendEmail(
      to,
      'Welcome to 4Tparts B2B Platform',
      htmlContent,
      textContent
    );
    
    return result;
    
  } catch (error) {
    console.error('Welcome email error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    };
  }
}

/**
 * HTTP Handler - wraps core logic with HTTP request/response handling
 */
export async function handleWelcomeEmail(request: Request, env: Environment): Promise<Response> {
  const origin = request.headers.get('Origin');
  const cors = corsHeaders(env, origin || undefined);
  
  // Handle OPTIONS request for CORS
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
    const body: WelcomeEmailRequest = await request.json();
    
    // Validate request
    const validation = validateRequest(body, ['to', 'userName', 'companyName']);
    if (!validation.valid) {
      return jsonResponse(
        { success: false, error: validation.error }, 
        400, 
        cors
      );
    }
    
    // Call core email sending function
    const result = await sendWelcomeEmail(env, body.to, body.userName, body.companyName);
    
    return jsonResponse(result, result.success ? 200 : 500, cors);
    
  } catch (error) {
    console.error('Welcome email handler error:', error);
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
