/**
 * JWT Utilities
 * 
 * Uses 'jose' library for Web Crypto API compatible JWT operations
 * Perfect for Cloudflare Workers environment
 */

import { SignJWT, jwtVerify } from 'jose';
import type { AccessTokenPayload, RefreshTokenPayload, UserClaims } from '../types';

/**
 * Create an access token (short-lived, contains user claims)
 */
export async function createAccessToken(
  claims: UserClaims,
  sessionId: string,
  secret: string,
  expiresIn: number = 3600
): Promise<string> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  const token = await new SignJWT({ ...claims, sessionId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .sign(secretKey);

  return token;
}

/**
 * Create a refresh token (long-lived, minimal claims)
 */
export async function createRefreshToken(
  userId: string,
  sessionId: string,
  secret: string,
  expiresIn: number = 2592000 // 30 days
): Promise<string> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  const token = await new SignJWT({ uid: userId, sessionId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .sign(secretKey);

  return token;
}

/**
 * Verify and decode an access token
 */
export async function verifyAccessToken(
  token: string,
  secret: string
): Promise<AccessTokenPayload> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  const { payload } = await jwtVerify(token, secretKey, {
    algorithms: ['HS256'],
  });

  return payload as unknown as AccessTokenPayload;
}

/**
 * Verify and decode a refresh token
 */
export async function verifyRefreshToken(
  token: string,
  secret: string
): Promise<RefreshTokenPayload> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  const { payload } = await jwtVerify(token, secretKey, {
    algorithms: ['HS256'],
  });

  return payload as unknown as RefreshTokenPayload;
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1];
}
