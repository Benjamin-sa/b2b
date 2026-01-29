import { eq, like, or, sql, desc } from 'drizzle-orm';
import { users } from '../schema';
import type { DbClient } from '../db';
import type { NewUser, User, UserWithPassword } from '../types';

/**
 * Get user by email including password hash (for auth)
 * IMPORTANT: UserWithPassword should never be returned via API
 */
export async function getUserByEmail(
  db: DbClient,
  email: string
): Promise<UserWithPassword | undefined> {
  const result = await db.select().from(users).where(eq(users.email, email)).get();
  return result as UserWithPassword | undefined;
}

/**
 * Get user by ID including password hash (for auth)
 * IMPORTANT: UserWithPassword should never be returned via API
 */
export async function getUserById(
  db: DbClient,
  userId: string
): Promise<UserWithPassword | undefined> {
  const result = await db.select().from(users).where(eq(users.id, userId)).get();
  return result as UserWithPassword | undefined;
}

export async function createUser(
  db: DbClient,
  data: NewUser
): Promise<UserWithPassword | undefined> {
  await db.insert(users).values(data).run();
  return getUserById(db, data.id);
}

export async function updateUserStripeCustomerId(
  db: DbClient,
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  await db
    .update(users)
    .set({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() })
    .where(eq(users.id, userId))
    .run();
}

export async function updateUser(
  db: DbClient,
  userId: string,
  data: Partial<Omit<User, 'id' | 'email' | 'password_hash' | 'created_at'>>
): Promise<User | undefined> {
  await db
    .update(users)
    .set({ ...data, updated_at: new Date().toISOString() })
    .where(eq(users.id, userId))
    .run();
  return getUserById(db, userId);
}

export async function updateUserPassword(
  db: DbClient,
  userId: string,
  passwordHash: string
): Promise<void> {
  await db
    .update(users)
    .set({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .where(eq(users.id, userId))
    .run();
}

export async function updateUserPasswordByEmail(
  db: DbClient,
  email: string,
  passwordHash: string
): Promise<void> {
  await db
    .update(users)
    .set({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .where(eq(users.email, email))
    .run();
}

export async function verifyUser(db: DbClient, userId: string): Promise<User | undefined> {
  await db
    .update(users)
    .set({ is_verified: 1, updated_at: new Date().toISOString() })
    .where(eq(users.id, userId))
    .run();
  return getUserById(db, userId);
}

export async function deactivateUser(db: DbClient, userId: string): Promise<void> {
  await db
    .update(users)
    .set({ is_active: 0, updated_at: new Date().toISOString() })
    .where(eq(users.id, userId))
    .run();
}

export async function deleteUserById(db: DbClient, userId: string): Promise<void> {
  await db.delete(users).where(eq(users.id, userId)).run();
}

export interface GetUsersOptions {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface GetUsersResult {
  users: User[];
  total: number;
}

export async function getUsers(
  db: DbClient,
  options: GetUsersOptions = {}
): Promise<GetUsersResult> {
  const { limit = 50, offset = 0, search = '' } = options;

  let query = db.select().from(users).$dynamic();
  let countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .$dynamic();

  if (search) {
    const searchPattern = `%${search}%`;
    const searchCondition = or(
      like(users.email, searchPattern),
      like(users.company_name, searchPattern),
      like(users.first_name, searchPattern),
      like(users.last_name, searchPattern)
    );
    query = query.where(searchCondition);
    countQuery = countQuery.where(searchCondition);
  }

  query = query.orderBy(desc(users.created_at)).limit(limit).offset(offset);

  const [usersResult, countResult] = await Promise.all([query, countQuery.get()]);

  return {
    users: usersResult,
    total: countResult?.count || 0,
  };
}
