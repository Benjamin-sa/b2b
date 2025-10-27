import type { Environment } from './types/email';
import type { EmailQueueMessage } from '../../shared-types/email-queue';
import { handleWelcomeEmail, sendWelcomeEmail } from './handlers/welcome';
import { handlePasswordResetEmail, sendPasswordResetEmail } from './handlers/passwordReset';
import { handleVerificationEmail, sendVerificationEmail } from './handlers/verification';
import { jsonResponse, corsHeaders } from './utils/validators';

export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(env, origin || undefined);
    
    // Handle CORS preflight for all routes
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }
    
    // Route handling (HTTP endpoints - kept for backwards compatibility)
    switch (url.pathname) {
      case '/email/welcome':
        return handleWelcomeEmail(request, env);
        
      case '/email/password-reset':
        return handlePasswordResetEmail(request, env);
        
      case '/email/verification':
        return handleVerificationEmail(request, env);
        
      case '/health':
        return jsonResponse(
          { 
            status: 'healthy', 
            service: 'motordash-email-service',
            timestamp: new Date().toISOString(),
            environment: env.ENVIRONMENT
          },
          200,
          cors
        );
        
      case '/':
        return jsonResponse(
          {
            service: 'MotorDash Email Service',
            version: '2.0.0',
            mode: 'queue-consumer',
            endpoints: [
              'POST /api/email/welcome (deprecated - use queue)',
              'POST /api/email/password-reset (deprecated - use queue)',
              'POST /api/email/verification (deprecated - use queue)',
              'GET /health'
            ]
          },
          200,
          cors
        );
        
      default:
        return jsonResponse(
          { success: false, error: 'Not found' }, 
          404, 
          cors
        );
    }
  },

  /**
   * Queue Consumer Handler
   * 
   * Processes email messages from the EMAIL_QUEUE
   * Provides automatic retries, batching, and dead letter queue
   */
  async queue(batch: MessageBatch<EmailQueueMessage>, env: Environment): Promise<void> {
    console.log(`📬 [Email Queue] Processing batch of ${batch.messages.length} messages`);
    
    for (const message of batch.messages) {
      try {
        const emailMessage = message.body;
        console.log(`📧 [Email Queue] Processing ${emailMessage.type} email for ${emailMessage.email}`);
        
        let result: { success: boolean; messageId?: string; error?: string };
        
        // Route to appropriate email sender based on type
        switch (emailMessage.type) {
          case 'welcome':
            result = await sendWelcomeEmail(
              env,
              emailMessage.email,
              emailMessage.firstName || 'there',
              emailMessage.companyName || 'your company'
            );
            break;
            
          case 'password-reset':
            // Build reset URL based on environment
            const resetUrl = env.ENVIRONMENT === 'development' && emailMessage.resetToken
              ? `${env.FRONTEND_URL}/auth?mode=resetPassword&token=${emailMessage.resetToken}`
              : `${env.FRONTEND_URL}/auth?mode=resetPassword`;
            
            result = await sendPasswordResetEmail(
              env,
              emailMessage.email,
              'User', // Default username for password reset
              emailMessage.resetToken || '',
              resetUrl
            );
            break;
            
          case 'verification':
            const verificationUrl = `${env.FRONTEND_URL}/auth?mode=verify&token=${emailMessage.verificationToken}`;
            
            result = await sendVerificationEmail(
              env,
              emailMessage.email,
              emailMessage.firstName || 'there',
              emailMessage.companyName || 'your company',
              verificationUrl
            );
            break;
            
          default:
            console.error(`❌ [Email Queue] Unknown email type: ${(emailMessage as any).type}`);
            message.ack(); // Acknowledge to remove from queue (don't retry unknown types)
            continue;
        }
        
        if (result.success) {
          console.log(`✅ [Email Queue] ${emailMessage.type} email sent successfully to ${emailMessage.email}`);
          message.ack(); // Success - remove from queue
        } else {
          console.error(`❌ [Email Queue] Failed to send ${emailMessage.type} email:`, result.error);
          message.retry(); // Retry - will go to DLQ after max retries
        }
      } catch (error) {
        console.error(`❌ [Email Queue] Error processing message:`, error);
        message.retry(); // Retry on unexpected errors
      }
    }
    
    console.log(`✅ [Email Queue] Batch processing completed`);
  }
};
