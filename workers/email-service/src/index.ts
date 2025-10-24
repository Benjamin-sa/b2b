import type { Environment } from './types/email';
import { handleWelcomeEmail } from './handlers/welcome';
import { handlePasswordResetEmail } from './handlers/passwordReset';
import { handleVerificationEmail } from './handlers/verification';
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
    
    // Route handling
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
            version: '1.0.0',
            endpoints: [
              'POST /api/email/welcome',
              'POST /api/email/password-reset',
              'POST /api/email/verification',
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
  }
};
