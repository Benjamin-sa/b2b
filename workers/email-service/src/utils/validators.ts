import type { Environment } from '../types/email';

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateRequest(
  body: any, 
  requiredFields: string[]
): { valid: boolean; error?: string } {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }

  for (const field of requiredFields) {
    if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
      return { valid: false, error: `${field} is required` };
    }
  }

  return { valid: true };
}

export function validateFirebaseAuth(request: Request, env: Environment): boolean {
  const authHeader = request.headers.get('X-Firebase-Auth');
  const expectedSecret = env.FIREBASE_AUTH_SECRET;
  
  if (!expectedSecret) {
    console.warn('FIREBASE_AUTH_SECRET not configured - allowing all requests');
    return true; // Allow if not configured for backward compatibility
  }
  
  if (!authHeader || authHeader !== expectedSecret) {
    console.error('Invalid or missing Firebase auth header');
    return false;
  }
  
  return true;
}

export function jsonResponse(
  data: any, 
  status: number = 200, 
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

export function corsHeaders(env: Environment, origin?: string): Record<string, string> {
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',') || ['localhost:5173', 'localhost:3000'];
  const isAllowedOrigin = origin && allowedOrigins.some(allowed => 
    origin.includes(allowed) || allowed === '*'
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Firebase-Auth',
    'Access-Control-Max-Age': '3600',
  };
}
