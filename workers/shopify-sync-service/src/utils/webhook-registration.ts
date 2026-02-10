/**
 * Shopify Webhook Registration via GraphQL Admin API
 *
 * Ensures the inventory-update webhook subscription is always registered
 * so webhooks actually arrive at this worker.
 */

import type { Env } from '../types';
import { shopifyGraphQL } from './shopify-client';

interface WebhookSubscription {
  id: string;
  topic: string;
  callbackUrl: string;
  format: string;
  apiVersion: { handle: string };
}

interface WebhookCheckResult {
  registered: boolean;
  subscriptions: WebhookSubscription[];
  expectedUrl: string;
  matchingSubscription: WebhookSubscription | null;
}

interface WebhookEnsureResult {
  action: 'already_registered' | 'created' | 'updated';
  subscription: WebhookSubscription | null;
  error?: string;
}

/**
 * Build the webhook callback URL based on the environment
 */
function getWebhookCallbackUrl(env: Env): string {
  if (env.ENVIRONMENT === 'development') {
    return 'https://b2b-shopify-sync-service-dev.benkee-sauter.workers.dev/webhooks/inventory-update';
  }
  return 'https://b2b-shopify-sync-service.benkee-sauter.workers.dev/webhooks/inventory-update';
}

/**
 * List all existing webhook subscriptions from Shopify
 */
async function listWebhookSubscriptions(env: Env): Promise<WebhookSubscription[]> {
  const query = `
    query {
      webhookSubscriptions(first: 50) {
        edges {
          node {
            id
            topic
            callbackUrl
            format
            apiVersion {
              handle
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(env, query);
  return data.webhookSubscriptions.edges.map((edge: any) => edge.node);
}

/**
 * Check whether the inventory-update webhook is registered and pointing at us
 */
export async function checkWebhookRegistration(env: Env): Promise<WebhookCheckResult> {
  const expectedUrl = getWebhookCallbackUrl(env);
  const subscriptions = await listWebhookSubscriptions(env);

  const inventorySubscriptions = subscriptions.filter((s) => s.topic === 'INVENTORY_LEVELS_UPDATE');

  const matchingSubscription =
    inventorySubscriptions.find((s) => s.callbackUrl === expectedUrl) ?? null;

  return {
    registered: matchingSubscription !== null,
    subscriptions: inventorySubscriptions,
    expectedUrl,
    matchingSubscription,
  };
}

/**
 * Create a new webhook subscription for inventory level updates
 */
async function createWebhookSubscription(
  env: Env,
  callbackUrl: string
): Promise<WebhookSubscription | null> {
  const mutation = `
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        webhookSubscription {
          id
          topic
          callbackUrl
          format
          apiVersion {
            handle
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    topic: 'INVENTORY_LEVELS_UPDATE',
    webhookSubscription: {
      callbackUrl,
      format: 'JSON',
    },
  };

  const data = await shopifyGraphQL(env, mutation, variables);

  if (data.webhookSubscriptionCreate.userErrors?.length > 0) {
    const errors = data.webhookSubscriptionCreate.userErrors;
    throw new Error(`Webhook creation failed: ${JSON.stringify(errors)}`);
  }

  return data.webhookSubscriptionCreate.webhookSubscription;
}

/**
 * Update an existing webhook subscription to point to the correct URL
 */
async function updateWebhookSubscription(
  env: Env,
  webhookId: string,
  callbackUrl: string
): Promise<WebhookSubscription | null> {
  const mutation = `
    mutation webhookSubscriptionUpdate($id: ID!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionUpdate(id: $id, webhookSubscription: $webhookSubscription) {
        webhookSubscription {
          id
          topic
          callbackUrl
          format
          apiVersion {
            handle
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    id: webhookId,
    webhookSubscription: {
      callbackUrl,
      format: 'JSON',
    },
  };

  const data = await shopifyGraphQL(env, mutation, variables);

  if (data.webhookSubscriptionUpdate.userErrors?.length > 0) {
    const errors = data.webhookSubscriptionUpdate.userErrors;
    throw new Error(`Webhook update failed: ${JSON.stringify(errors)}`);
  }

  return data.webhookSubscriptionUpdate.webhookSubscription;
}

/**
 * Delete a webhook subscription by ID
 */
async function deleteWebhookSubscription(env: Env, webhookId: string): Promise<void> {
  const mutation = `
    mutation webhookSubscriptionDelete($id: ID!) {
      webhookSubscriptionDelete(id: $id) {
        deletedWebhookSubscriptionId
        userErrors {
          field
          message
        }
      }
    }
  `;

  await shopifyGraphQL(env, mutation, { id: webhookId });
}

/**
 * Ensure the webhook is registered with the correct callback URL.
 *
 * - If no INVENTORY_LEVELS_UPDATE subscription exists → create one
 * - If one exists but points to wrong URL → update it
 * - If one exists with correct URL → no-op
 * - If multiple exist → clean up duplicates, keep/update one
 */
export async function ensureWebhookRegistration(env: Env): Promise<WebhookEnsureResult> {
  const expectedUrl = getWebhookCallbackUrl(env);

  console.log(`🔗 Ensuring webhook registration for: ${expectedUrl}`);

  const subscriptions = await listWebhookSubscriptions(env);
  const inventorySubscriptions = subscriptions.filter((s) => s.topic === 'INVENTORY_LEVELS_UPDATE');

  // Case 1: No subscriptions exist → create one
  if (inventorySubscriptions.length === 0) {
    console.log('📝 No INVENTORY_LEVELS_UPDATE webhook found, creating...');
    const created = await createWebhookSubscription(env, expectedUrl);
    console.log(`✅ Webhook created: ${created?.id}`);
    return { action: 'created', subscription: created };
  }

  // Case 2: Check if one already points to the correct URL
  const correctSub = inventorySubscriptions.find((s) => s.callbackUrl === expectedUrl);

  if (correctSub) {
    // Clean up duplicates if any
    const duplicates = inventorySubscriptions.filter((s) => s.id !== correctSub.id);
    for (const dup of duplicates) {
      console.log(`🗑️ Removing duplicate webhook: ${dup.id} → ${dup.callbackUrl}`);
      await deleteWebhookSubscription(env, dup.id);
    }

    console.log(`✅ Webhook already registered: ${correctSub.id}`);
    return { action: 'already_registered', subscription: correctSub };
  }

  // Case 3: Subscription(s) exist but point to wrong URL → update first, delete rest
  const [first, ...rest] = inventorySubscriptions;
  console.log(`🔄 Updating webhook ${first.id}: ${first.callbackUrl} → ${expectedUrl}`);
  const updated = await updateWebhookSubscription(env, first.id, expectedUrl);

  // Clean up extras
  for (const extra of rest) {
    console.log(`🗑️ Removing extra webhook: ${extra.id}`);
    await deleteWebhookSubscription(env, extra.id);
  }

  console.log(`✅ Webhook updated: ${updated?.id}`);
  return { action: 'updated', subscription: updated };
}
