/**
 * Shopify Admin API Client
 *
 * Handles all communication with Shopify's GraphQL Admin API
 */

import type { Env, ShopifyVariant } from '../types';

/**
 * Make a GraphQL request to Shopify Admin API
 */
async function shopifyGraphQL(
  env: Env,
  query: string,
  variables: Record<string, any> = {}
): Promise<any> {
  const url = `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': env.SHOPIFY_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Shopify GraphQL error: ${response.status} - ${error}`);
  }

  const result = (await response.json()) as { data?: any; errors?: any };

  if (result.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

/**
 * Update inventory level for a specific item at a location
 */
export async function updateShopifyInventory(
  env: Env,
  inventoryItemId: string,
  available: number
): Promise<void> {
  const locationId = env.SHOPIFY_LOCATION_ID;

  console.log(
    `📦 Updating Shopify inventory: item=${inventoryItemId}, location=${locationId}, available=${available}`
  );

  const mutation = `
    mutation inventorySetOnHandQuantities($input: InventorySetOnHandQuantitiesInput!) {
      inventorySetOnHandQuantities(input: $input) {
        inventoryAdjustmentGroup {
          id
          reason
          changes {
            name
            delta
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
    input: {
      reason: 'correction',
      setQuantities: [
        {
          inventoryItemId: `gid://shopify/InventoryItem/${inventoryItemId}`,
          locationId: `gid://shopify/Location/${locationId}`,
          quantity: available,
        },
      ],
    },
  };

  const data = await shopifyGraphQL(env, mutation, variables);

  if (data.inventorySetOnHandQuantities.userErrors.length > 0) {
    throw new Error(
      `Shopify inventory update errors: ${JSON.stringify(data.inventorySetOnHandQuantities.userErrors)}`
    );
  }

  console.log(`✅ Shopify inventory updated successfully`);
}

/**
 * Adjust inventory by delta (positive = add, negative = subtract)
 * Used for invoice stock deduction
 *
 * Valid Shopify reasons: correction, received, shrinkage, restock, safety_stock,
 * damaged, promotion, reservation_created, reservation_deleted, reservation_updated, quality_control
 */
export async function adjustShopifyInventory(
  env: Env,
  inventoryItemId: string,
  locationId: string,
  delta: number,
  reason: string = 'correction'
): Promise<{ success: boolean; newQuantity: number; error?: string }> {
  console.log(
    `📦 Adjusting Shopify inventory: item=${inventoryItemId}, location=${locationId}, delta=${delta}`
  );

  const mutation = `
    mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
      inventoryAdjustQuantities(input: $input) {
        inventoryAdjustmentGroup {
          id
          reason
          changes {
            name
            delta
            quantityAfterChange
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
    input: {
      reason: reason,
      name: 'available',
      changes: [
        {
          inventoryItemId: `gid://shopify/InventoryItem/${inventoryItemId}`,
          locationId: `gid://shopify/Location/${locationId}`,
          delta: delta,
        },
      ],
    },
  };

  try {
    const data = await shopifyGraphQL(env, mutation, variables);

    if (data.inventoryAdjustQuantities.userErrors.length > 0) {
      const errorMsg = JSON.stringify(data.inventoryAdjustQuantities.userErrors);
      console.error(`❌ Shopify inventory adjust errors: ${errorMsg}`);
      return { success: false, newQuantity: 0, error: errorMsg };
    }

    const changes = data.inventoryAdjustQuantities.inventoryAdjustmentGroup?.changes || [];
    const newQuantity = changes[0]?.quantityAfterChange || 0;

    console.log(`✅ Shopify inventory adjusted: delta=${delta}, newQuantity=${newQuantity}`);
    return { success: true, newQuantity };
  } catch (error: any) {
    console.error(`❌ Shopify inventory adjust failed:`, error);
    return { success: false, newQuantity: 0, error: error.message };
  }
}

/**
 * Get current inventory level from Shopify
 */
export async function getShopifyInventory(env: Env, inventoryItemId: string): Promise<number> {
  const locationId = env.SHOPIFY_LOCATION_ID;

  // Shopify inventoryLevel requires an ID in format: gid://shopify/InventoryLevel/?inventory_item_id=X&location_id=Y
  const inventoryLevelId = `gid://shopify/InventoryLevel/${inventoryItemId}?location_id=${locationId}`;

  const query = `
    query getInventoryLevel($id: ID!) {
      inventoryLevel(id: $id) {
        id
        quantities(names: ["available"]) {
          name
          quantity
        }
      }
    }
  `;

  const variables = {
    id: inventoryLevelId,
  };

  const data = await shopifyGraphQL(env, query, variables);

  // Extract 'available' quantity from the quantities array
  const availableQuantity = data.inventoryLevel?.quantities?.find(
    (q: any) => q.name === 'available'
  );

  return availableQuantity?.quantity ?? 0;
}

/**
 * Get variant details by variant ID
 */
export async function getShopifyVariant(
  env: Env,
  variantId: string
): Promise<ShopifyVariant | null> {
  const query = `
    query getVariant($id: ID!) {
      productVariant(id: $id) {
        id
        title
        sku
        product {
          id
        }
        inventoryItem {
          id
        }
        inventoryQuantity
      }
    }
  `;

  const variables = {
    id: `gid://shopify/ProductVariant/${variantId}`,
  };

  try {
    const data = await shopifyGraphQL(env, query, variables);

    if (!data.productVariant) {
      return null;
    }

    const variant = data.productVariant;

    return {
      id: variantId,
      product_id: variant.product.id.replace('gid://shopify/Product/', ''),
      title: variant.title,
      sku: variant.sku,
      inventory_item_id: variant.inventoryItem.id.replace('gid://shopify/InventoryItem/', ''),
      inventory_quantity: variant.inventoryQuantity,
    };
  } catch (error) {
    console.error(`Failed to get Shopify variant ${variantId}:`, error);
    return null;
  }
}

/**
 * Search for products by SKU/part number
 */
export async function searchShopifyProductsBySKU(env: Env, sku: string): Promise<ShopifyVariant[]> {
  const query = `
    query searchProducts($query: String!) {
      products(first: 10, query: $query) {
        edges {
          node {
            id
            title
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  sku
                  inventoryItem {
                    id
                  }
                  inventoryQuantity
                }
              }
            }
          }
        }
      }
    }
  `;

  const variables = {
    query: `sku:${sku}`,
  };

  try {
    const data = await shopifyGraphQL(env, query, variables);

    const variants: ShopifyVariant[] = [];

    for (const productEdge of data.products.edges) {
      const product = productEdge.node;
      const productId = product.id.replace('gid://shopify/Product/', '');

      for (const variantEdge of product.variants.edges) {
        const variant = variantEdge.node;
        variants.push({
          id: variant.id.replace('gid://shopify/ProductVariant/', ''),
          product_id: productId,
          title: `${product.title} - ${variant.title}`,
          sku: variant.sku,
          inventory_item_id: variant.inventoryItem.id.replace('gid://shopify/InventoryItem/', ''),
          inventory_quantity: variant.inventoryQuantity,
        });
      }
    }

    return variants;
  } catch (error) {
    console.error(`Failed to search Shopify products by SKU ${sku}:`, error);
    return [];
  }
}
