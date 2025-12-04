/**
 * Shopify Sync Helper
 * 
 * Centralized helper for triggering Shopify inventory sync.
 * Used across orchestration routes to keep inventory in sync.
 */

import type { Env } from '../types';

/**
 * Trigger Shopify inventory sync for a specific product
 * 
 * @param env - Worker environment bindings
 * @param productId - The product ID to sync
 * @returns true if sync succeeded, false otherwise
 */
export async function syncToShopify(
  env: Env,
  productId: string
): Promise<boolean> {
  try {
    const syncHeaders = new Headers();
    syncHeaders.set('X-Service-Token', env.SERVICE_SECRET);

    const syncRequest = new Request(`http://shopify-sync/sync/${productId}`, {
      method: 'POST',
      headers: syncHeaders,
    });

    const response = await env.SHOPIFY_SYNC_SERVICE.fetch(syncRequest);
    
    if (!response.ok) {
      console.error(`[Shopify Sync] Failed to sync ${productId}: ${response.status}`);
      return false;
    }
    
    console.log(`[Shopify Sync] ✅ Successfully synced ${productId}`);
    return true;
  } catch (error: any) {
    console.error(`[Shopify Sync] Error syncing ${productId}:`, error);
    return false;
  }
}

/**
 * Sync multiple products to Shopify
 * 
 * @param env - Worker environment bindings
 * @param productIds - Array of product IDs to sync
 * @returns Array of results for each product
 */
export async function syncProductsToShopify(
  env: Env,
  productIds: string[]
): Promise<{ productId: string; success: boolean }[]> {
  const results = await Promise.all(
    productIds.map(async (productId) => ({
      productId,
      success: await syncToShopify(env, productId),
    }))
  );
  
  return results;
}
