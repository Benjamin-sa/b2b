import type { Environment } from './types/email';
import type { EmailQueueMessage } from '../../shared-types/email-queue';
import {sendWelcomeEmail } from './handlers/welcome';
import {sendPasswordResetEmail } from './handlers/passwordReset';
import {sendVerificationEmail } from './handlers/verification';
import {sendAccountVerifiedEmail } from './handlers/accountVerified';

export default {

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
            // Build reset URL - ALWAYS include token when available
            if (!emailMessage.resetToken) {
              console.error('❌ [Email Queue] Missing reset token for password reset email');
              message.retry();
              continue;
            }
            
            const resetUrl = `${env.FRONTEND_URL}/auth?mode=resetPassword&token=${emailMessage.resetToken}`;
            
            result = await sendPasswordResetEmail(
              env,
              emailMessage.email,
              emailMessage.firstName || 'there', // Use firstName from message or fallback
              emailMessage.resetToken,
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
            
          case 'account-verified':
            result = await sendAccountVerifiedEmail(
              env,
              emailMessage.email,
              emailMessage.firstName || 'there',
              emailMessage.companyName || 'your company'
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
