import { eq, and, sql, desc, lt } from 'drizzle-orm';
import { webhook_events } from '../schema';
import type { DbClient } from '../db';
import type { WebhookEvent, NewWebhookEvent } from '../types';

// ============================================================================
// WEBHOOK EVENT CRUD
// ============================================================================

export async function getWebhookEventById(
  db: DbClient,
  id: string
): Promise<WebhookEvent | undefined> {
  return db.select().from(webhook_events).where(eq(webhook_events.id, id)).get();
}

export async function getWebhookEventByEventId(
  db: DbClient,
  eventId: string
): Promise<WebhookEvent | undefined> {
  return db.select().from(webhook_events).where(eq(webhook_events.event_id, eventId)).get();
}

export async function createWebhookEvent(
  db: DbClient,
  data: NewWebhookEvent
): Promise<WebhookEvent | undefined> {
  await db.insert(webhook_events).values(data).run();
  return getWebhookEventById(db, data.id);
}

export async function markWebhookEventProcessed(
  db: DbClient,
  id: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  await db
    .update(webhook_events)
    .set({
      processed: 1,
      success: success ? 1 : 0,
      error_message: errorMessage || null,
      processed_at: new Date().toISOString(),
    })
    .where(eq(webhook_events.id, id))
    .run();
}

// ============================================================================
// WEBHOOK EVENT QUERIES
// ============================================================================

export interface GetWebhookEventsOptions {
  limit?: number;
  offset?: number;
  eventType?: string;
  processed?: boolean;
  success?: boolean;
}

export interface GetWebhookEventsResult {
  events: WebhookEvent[];
  total: number;
}

export async function getWebhookEvents(
  db: DbClient,
  options: GetWebhookEventsOptions = {}
): Promise<GetWebhookEventsResult> {
  const { limit = 50, offset = 0, eventType, processed, success } = options;

  const conditions: ReturnType<typeof eq>[] = [];

  if (eventType) {
    conditions.push(eq(webhook_events.event_type, eventType));
  }

  if (processed !== undefined) {
    conditions.push(eq(webhook_events.processed, processed ? 1 : 0));
  }

  if (success !== undefined) {
    conditions.push(eq(webhook_events.success, success ? 1 : 0));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [events, countResult] = await Promise.all([
    whereClause
      ? db
          .select()
          .from(webhook_events)
          .where(whereClause)
          .orderBy(desc(webhook_events.created_at))
          .limit(limit)
          .offset(offset)
      : db
          .select()
          .from(webhook_events)
          .orderBy(desc(webhook_events.created_at))
          .limit(limit)
          .offset(offset),
    whereClause
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(webhook_events)
          .where(whereClause)
          .get()
      : db
          .select({ count: sql<number>`count(*)` })
          .from(webhook_events)
          .get(),
  ]);

  return {
    events,
    total: countResult?.count || 0,
  };
}

export async function getUnprocessedWebhookEvents(
  db: DbClient,
  limit = 100
): Promise<WebhookEvent[]> {
  return db
    .select()
    .from(webhook_events)
    .where(eq(webhook_events.processed, 0))
    .orderBy(webhook_events.created_at)
    .limit(limit);
}

export async function getFailedWebhookEvents(db: DbClient, limit = 100): Promise<WebhookEvent[]> {
  return db
    .select()
    .from(webhook_events)
    .where(and(eq(webhook_events.processed, 1), eq(webhook_events.success, 0)))
    .orderBy(desc(webhook_events.created_at))
    .limit(limit);
}

// ============================================================================
// IDEMPOTENCY CHECK
// ============================================================================

export async function hasWebhookEventBeenProcessed(
  db: DbClient,
  eventId: string
): Promise<boolean> {
  const event = await getWebhookEventByEventId(db, eventId);
  return event?.processed === 1;
}

export async function getOrCreateWebhookEvent(
  db: DbClient,
  data: NewWebhookEvent
): Promise<{ event: WebhookEvent; isNew: boolean }> {
  const existing = await getWebhookEventByEventId(db, data.event_id);
  if (existing) {
    return { event: existing, isNew: false };
  }

  const created = await createWebhookEvent(db, data);
  return { event: created!, isNew: true };
}

// ============================================================================
// WEBHOOK EVENT CLEANUP
// ============================================================================

export async function cleanOldWebhookEvents(db: DbClient, daysOld = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  const cutoffStr = cutoffDate.toISOString();

  const result = await db
    .delete(webhook_events)
    .where(lt(webhook_events.created_at, cutoffStr))
    .run();

  return result.meta.changes || 0;
}

// ============================================================================
// WEBHOOK STATS
// ============================================================================

export interface WebhookStats {
  total: number;
  processed: number;
  unprocessed: number;
  successful: number;
  failed: number;
}

export async function getWebhookStats(db: DbClient): Promise<WebhookStats> {
  const [total, processed, successful] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(webhook_events)
      .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(webhook_events)
      .where(eq(webhook_events.processed, 1))
      .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(webhook_events)
      .where(and(eq(webhook_events.processed, 1), eq(webhook_events.success, 1)))
      .get(),
  ]);

  const totalCount = total?.count || 0;
  const processedCount = processed?.count || 0;
  const successfulCount = successful?.count || 0;

  return {
    total: totalCount,
    processed: processedCount,
    unprocessed: totalCount - processedCount,
    successful: successfulCount,
    failed: processedCount - successfulCount,
  };
}

export async function getWebhookEventsByType(db: DbClient): Promise<Map<string, number>> {
  const results = await db
    .select({
      event_type: webhook_events.event_type,
      count: sql<number>`count(*)`,
    })
    .from(webhook_events)
    .groupBy(webhook_events.event_type);

  return new Map(results.map((r) => [r.event_type, r.count]));
}
