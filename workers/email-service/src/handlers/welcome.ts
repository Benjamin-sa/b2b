import type { Environment, WelcomeEmailRequest, EmailResponse } from '../types/email';
import { createSendGridClient } from '../utils/sendgrid';
import { validateRequest, jsonResponse, corsHeaders } from '../utils/validators';

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
    
    // Create email content (simple HTML for now)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to MotorDash B2B</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h1 style="color: #466478; margin-bottom: 20px;">Welcome to MotorDash B2B!</h1>
          <p>Hello ${body.userName},</p>
          <p>Thank you for creating an account with MotorDash B2B for <strong>${body.companyName}</strong>.</p>
          <p>Your account is currently under review. Once verified by our team, you'll receive another email with access to our full B2B platform.</p>
          <div style="background: #e8edef; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #466478;">What's Next?</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Our team will review your account within 24-48 hours</li>
              <li>You'll receive a verification email once approved</li>
              <li>Then you can access our full product catalog and place orders</li>
            </ul>
          </div>
          <p>If you have any questions, feel free to contact our support team.</p>
          <p>Best regards,<br>The MotorDash Team</p>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
      Welcome to MotorDash B2B!
      
      Hello ${body.userName},
      
      Thank you for creating an account with MotorDash B2B for ${body.companyName}.
      
      Your account is currently under review. Once verified by our team, you'll receive another email with access to our full B2B platform.
      
      What's Next?
      - Our team will review your account within 24-48 hours
      - You'll receive a verification email once approved
      - Then you can access our full product catalog and place orders
      
      If you have any questions, feel free to contact our support team.
      
      Best regards,
      The MotorDash Team
    `;
    
    // Send email via SendGrid
    const sendGridClient = createSendGridClient(env);
    const result = await sendGridClient.sendEmail(
      body.to,
      'Welcome to MotorDash B2B Platform',
      htmlContent,
      textContent
    );
    
    return jsonResponse(result, result.success ? 200 : 500, cors);
    
  } catch (error) {
    console.error('Welcome email error:', error);
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
