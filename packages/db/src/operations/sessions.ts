import { eq, and, lt, desc, sql } from 'drizzle-orm';
import { sessions, password_reset_tokens, email_verification_tokens } from '../schema';
import type { DbClient } from '../db';
import type {
  Session,
  NewSession,
  PasswordResetToken,
  NewPasswordResetToken,
  EmailVerificationToken,
  NewEmailVerificationToken,
} from '../types';

// ============================================================================
// SESSION CRUD
// ============================================================================

export async function getSessionById(
  db: DbClient,
  sessionId: string
): Promise<Session | undefined> {
  return db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
}

export async function getSessionByToken(db: DbClient, token: string): Promise<Session | undefined> {
  return db.select().from(sessions).where(eq(sessions.token, token)).get();
}

export async function createSession(db: DbClient, data: NewSession): Promise<Session | undefined> {
  await db.insert(sessions).values(data).run();
  return getSessionById(db, data.id);
}

export async function updateSessionActivity(db: DbClient, sessionId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ last_activity: new Date().toISOString() })
    .where(eq(sessions.id, sessionId))
    .run();
}

export async function deleteSession(db: DbClient, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId)).run();
}

export async function deleteSessionByToken(db: DbClient, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token)).run();
}

export async function deleteUserSessions(db: DbClient, userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.user_id, userId)).run();
}

// ============================================================================
// SESSION QUERIES
// ============================================================================

export async function getUserSessions(db: DbClient, userId: string): Promise<Session[]> {
  return db
    .select()
    .from(sessions)
    .where(eq(sessions.user_id, userId))
    .orderBy(desc(sessions.last_activity));
}

export async function getActiveSessions(db: DbClient, userId: string): Promise<Session[]> {
  const now = new Date().toISOString();
  return db
    .select()
    .from(sessions)
    .where(and(eq(sessions.user_id, userId), sql`${sessions.expires_at} > ${now}`))
    .orderBy(desc(sessions.last_activity));
}

export async function isSessionValid(db: DbClient, sessionId: string): Promise<boolean> {
  const session = await getSessionById(db, sessionId);
  if (!session) return false;
  return new Date(session.expires_at) > new Date();
}

export async function cleanExpiredSessions(db: DbClient): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.delete(sessions).where(lt(sessions.expires_at, now)).run();
  return result.meta.changes || 0;
}

// ============================================================================
// PASSWORD RESET TOKENS
// ============================================================================

export async function getPasswordResetToken(
  db: DbClient,
  token: string
): Promise<PasswordResetToken | undefined> {
  return db
    .select()
    .from(password_reset_tokens)
    .where(eq(password_reset_tokens.token, token))
    .get();
}

export async function getPasswordResetTokenById(
  db: DbClient,
  tokenId: string
): Promise<PasswordResetToken | undefined> {
  return db.select().from(password_reset_tokens).where(eq(password_reset_tokens.id, tokenId)).get();
}

export async function createPasswordResetToken(
  db: DbClient,
  data: NewPasswordResetToken
): Promise<PasswordResetToken | undefined> {
  await db.insert(password_reset_tokens).values(data).run();
  return getPasswordResetTokenById(db, data.id);
}

export async function markPasswordResetTokenUsed(db: DbClient, tokenId: string): Promise<void> {
  await db
    .update(password_reset_tokens)
    .set({ used: 1, used_at: new Date().toISOString() })
    .where(eq(password_reset_tokens.id, tokenId))
    .run();
}

export async function deleteUserPasswordResetTokens(db: DbClient, userId: string): Promise<void> {
  await db.delete(password_reset_tokens).where(eq(password_reset_tokens.user_id, userId)).run();
}

export async function isPasswordResetTokenValid(
  db: DbClient,
  token: string
): Promise<{ valid: boolean; tokenRecord?: PasswordResetToken; error?: string }> {
  const tokenRecord = await getPasswordResetToken(db, token);

  if (!tokenRecord) {
    return { valid: false, error: 'Token not found' };
  }

  if (tokenRecord.used === 1) {
    return { valid: false, error: 'Token already used' };
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    return { valid: false, error: 'Token expired' };
  }

  return { valid: true, tokenRecord };
}

export async function cleanExpiredPasswordResetTokens(db: DbClient): Promise<number> {
  const now = new Date().toISOString();
  const result = await db
    .delete(password_reset_tokens)
    .where(lt(password_reset_tokens.expires_at, now))
    .run();
  return result.meta.changes || 0;
}

// ============================================================================
// EMAIL VERIFICATION TOKENS
// ============================================================================

export async function getEmailVerificationToken(
  db: DbClient,
  token: string
): Promise<EmailVerificationToken | undefined> {
  return db
    .select()
    .from(email_verification_tokens)
    .where(eq(email_verification_tokens.token, token))
    .get();
}

export async function getEmailVerificationTokenById(
  db: DbClient,
  tokenId: string
): Promise<EmailVerificationToken | undefined> {
  return db
    .select()
    .from(email_verification_tokens)
    .where(eq(email_verification_tokens.id, tokenId))
    .get();
}

export async function createEmailVerificationToken(
  db: DbClient,
  data: NewEmailVerificationToken
): Promise<EmailVerificationToken | undefined> {
  await db.insert(email_verification_tokens).values(data).run();
  return getEmailVerificationTokenById(db, data.id);
}

export async function markEmailVerificationTokenUsed(db: DbClient, tokenId: string): Promise<void> {
  await db
    .update(email_verification_tokens)
    .set({ used: 1, used_at: new Date().toISOString() })
    .where(eq(email_verification_tokens.id, tokenId))
    .run();
}

export async function deleteUserEmailVerificationTokens(
  db: DbClient,
  userId: string
): Promise<void> {
  await db
    .delete(email_verification_tokens)
    .where(eq(email_verification_tokens.user_id, userId))
    .run();
}

export async function isEmailVerificationTokenValid(
  db: DbClient,
  token: string
): Promise<{ valid: boolean; tokenRecord?: EmailVerificationToken; error?: string }> {
  const tokenRecord = await getEmailVerificationToken(db, token);

  if (!tokenRecord) {
    return { valid: false, error: 'Token not found' };
  }

  if (tokenRecord.used === 1) {
    return { valid: false, error: 'Token already used' };
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    return { valid: false, error: 'Token expired' };
  }

  return { valid: true, tokenRecord };
}

export async function cleanExpiredEmailVerificationTokens(db: DbClient): Promise<number> {
  const now = new Date().toISOString();
  const result = await db
    .delete(email_verification_tokens)
    .where(lt(email_verification_tokens.expires_at, now))
    .run();
  return result.meta.changes || 0;
}

// ============================================================================
// CLEANUP ALL EXPIRED TOKENS
// ============================================================================

export async function cleanAllExpiredTokens(
  db: DbClient
): Promise<{ sessions: number; passwordResets: number; emailVerifications: number }> {
  const [sessions, passwordResets, emailVerifications] = await Promise.all([
    cleanExpiredSessions(db),
    cleanExpiredPasswordResetTokens(db),
    cleanExpiredEmailVerificationTokens(db),
  ]);

  return { sessions, passwordResets, emailVerifications };
}
