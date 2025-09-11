import type { Environment } from '../types/email';

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateRequest(request: any, requiredFields: string[]): { valid: boolean; error?: string } {
  for (const field of requiredFields) {
    if (!request[field]) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }
  
  if (request.to && !validateEmail(request.to)) {
    return { valid: false, error: 'Invalid email address' };
  }
  
  return { valid: true };
}

export function corsHeaders(env: Environment, origin?: string): Record<string, string> {
  // Fallback for ALLOWED_ORIGINS if not set
  const allowedOriginsString = env.ALLOWED_ORIGINS || 'localhost:5173,localhost:3000';
  const allowedOrigins = allowedOriginsString.split(',');
  const isAllowed = origin && allowedOrigins.includes(new URL(origin).hostname);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

export function jsonResponse(data: any, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}
