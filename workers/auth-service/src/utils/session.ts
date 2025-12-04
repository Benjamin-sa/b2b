/**
 * Session Management
 * 
 * Store and manage user sessions in Cloudflare KV
 */

import { nanoid } from 'nanoid';
import type { Session } from '../types';

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return nanoid(32);
}

/**
 * Store session in KV
 */
export async function storeSession(
  kv: KVNamespace,
  session: Session,
  ttl: number
): Promise<void> {
  const key = `session:${session.sessionId}`;
  await kv.put(key, JSON.stringify(session), {
    expirationTtl: ttl,
  });
}

/**
 * Get session from KV
 */
export async function getSession(
  kv: KVNamespace,
  sessionId: string
): Promise<Session | null> {
  const key = `session:${sessionId}`;
  const data = await kv.get(key);
  
  if (!data) return null;
  
  return JSON.parse(data) as Session;
}

/**
 * Delete session from KV
 */
export async function deleteSession(
  kv: KVNamespace,
  sessionId: string
): Promise<void> {
  const key = `session:${sessionId}`;
  await kv.delete(key);
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(
  kv: KVNamespace,
  userId: string
): Promise<void> {
  // List all sessions (limited to 1000)
  const list = await kv.list({ prefix: 'session:' });
  
  for (const key of list.keys) {
    const session = await kv.get(key.name);
    if (session) {
      const parsedSession = JSON.parse(session) as Session;
      if (parsedSession.userId === userId) {
        await kv.delete(key.name);
      }
    }
  }
}

/**
 * Store password reset token in KV
 */
export async function storePasswordResetToken(
  kv: KVNamespace,
  email: string,
  token: string,
  ttl: number = 3600 // 1 hour
): Promise<void> {
  const key = `reset:${token}`;
  await kv.put(key, email, { expirationTtl: ttl });
}

/**
 * Get email from password reset token
 */
export async function getPasswordResetEmail(
  kv: KVNamespace,
  token: string
): Promise<string | null> {
  const key = `reset:${token}`;
  return await kv.get(key);
}

/**
 * Delete password reset token
 */
export async function deletePasswordResetToken(
  kv: KVNamespace,
  token: string
): Promise<void> {
  const key = `reset:${token}`;
  await kv.delete(key);
}
