/**
 * Webhook verification and utilities
 */

import { createDb, schema } from '@b2b/db';
import { eq } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';

const { webhook_events } = schema;

/**
 * Verify Shopify webhook HMAC signature
 */
export async function verifyShopifyWebhook(
  body: string,
  hmacHeader: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));

  const hashArray = Array.from(new Uint8Array(signature));
  const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray as any));

  return hashBase64 === hmacHeader;
}

/**
 * Check if webhook has already been processed (deduplication)
 */
export async function isWebhookProcessed(db: D1Database, webhookId: string): Promise<boolean> {
  const client = createDb(db);
  const result = await client
    .select({ id: webhook_events.id })
    .from(webhook_events)
    .where(eq(webhook_events.event_id, webhookId))
    .get();

  return result !== undefined && result !== null;
}

/**
 * Mark webhook as processed
 */
export async function markWebhookProcessed(
  db: D1Database,
  webhookId: string,
  eventType: string,
  payload: string,
  success: boolean,
  errorMessage: string | null = null
): Promise<void> {
  const client = createDb(db);
  const now = new Date().toISOString();

  await client
    .insert(webhook_events)
    .values({
      id: crypto.randomUUID(),
      event_type: eventType,
      event_id: webhookId,
      payload,
      processed: 1,
      success: success ? 1 : 0,
      error_message: errorMessage,
      created_at: now,
      processed_at: now,
    })
    .run();
}
