/**
 * Webhook verification and utilities
 */

import type { Env } from '../types';

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
export async function isWebhookProcessed(
  db: D1Database,
  webhookId: string
): Promise<boolean> {
  const result = await db
    .prepare('SELECT id FROM webhook_events WHERE event_id = ?')
    .bind(webhookId)
    .first();

  return result !== null;
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
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO webhook_events (id, event_type, event_id, payload, processed, success, error_message, created_at, processed_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      eventType,
      webhookId,
      payload,
      success ? 1 : 0,
      errorMessage,
      now,
      now
    )
    .run();
}
