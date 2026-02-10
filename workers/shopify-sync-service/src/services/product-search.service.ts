/**
 * Shopify Product Search Service
 *
 * Search Shopify products to link them with B2B products
 */

import type { Env } from '../types';
import { shopifyGraphQL } from '../utils/shopify-client';

export interface ShopifyProduct {
  id: string; // Shopify product ID (gid://shopify/Product/123)
  title: string;
  handle: string;
  variants: ShopifyVariant[];
}

export interface InventoryLevel {
  locationId: string; // gid://shopify/Location/123
  locationName: string;
  available: number;
}

export interface ShopifyVariant {
  id: string; // Shopify variant ID (gid://shopify/ProductVariant/456)
  title: string;
  sku: string | null;
  price: string;
  inventoryItemId: string; // CRITICAL: Required for inventory sync
  inventoryQuantity: number; // Total across all locations
  inventoryLevels: InventoryLevel[]; // Stock per location
  productId: string; // Parent product ID
  productTitle: string; // Parent product title
}

export interface SearchParams {
  query?: string; // Search by name/title
  productId?: string; // Search by Shopify product ID
  variantId?: string; // Search by Shopify variant ID
  sku?: string; // Search by SKU
  limit?: number;
}

/**
 * Search Shopify products using GraphQL Admin API
 */
export async function searchShopifyProducts(
  env: Env,
  params: SearchParams
): Promise<ShopifyVariant[]> {
  const { query, productId, variantId, sku, limit = 20 } = params;

  console.log('🔍 Searching Shopify products:', params);

  // Build GraphQL query based on search parameters
  let graphqlQuery: string;
  let variables: Record<string, any> = {};

  if (variantId) {
    // Search by specific variant ID
    graphqlQuery = buildVariantByIdQuery();
    // Extract numeric ID from GID format (gid://shopify/ProductVariant/123 → 123)
    const numericId = extractNumericId(variantId);
    variables = { variantId: `gid://shopify/ProductVariant/${numericId}` };
  } else if (productId) {
    // Search by specific product ID
    graphqlQuery = buildProductByIdQuery();
    const numericId = extractNumericId(productId);
    variables = { productId: `gid://shopify/Product/${numericId}` };
  } else if (sku) {
    // Search by SKU
    graphqlQuery = buildProductsSearchQuery();
    variables = { query: `sku:${sku}`, limit };
  } else if (query) {
    // Search by title/name
    graphqlQuery = buildProductsSearchQuery();
    variables = { query: `title:*${query}*`, limit };
  } else {
    // List recent products
    graphqlQuery = buildProductsSearchQuery();
    variables = { query: '', limit };
  }

  const data = await shopifyGraphQL<any>(env, graphqlQuery, variables);

  // Parse response and extract variants
  const variants = parseShopifyResponse(data, variantId, productId);

  console.log(`✅ Found ${variants.length} Shopify variants`);

  return variants;
}

/**
 * Extract numeric ID from Shopify GID format
 * Examples:
 * - "gid://shopify/Product/123" → "123"
 * - "123" → "123"
 */
function extractNumericId(id: string): string {
  if (id.startsWith('gid://')) {
    return id.split('/').pop() || id;
  }
  return id;
}

/**
 * GraphQL query to get a single variant by ID
 */
function buildVariantByIdQuery(): string {
  return `
    query getVariant($variantId: ID!) {
      productVariant(id: $variantId) {
        id
        title
        sku
        price
        inventoryItem {
          id
          inventoryLevels(first: 10) {
            edges {
              node {
                location {
                  id
                  name
                }
                quantities(names: ["available"]) {
                  name
                  quantity
                }
              }
            }
          }
        }
        inventoryQuantity
        product {
          id
          title
          handle
        }
      }
    }
  `;
}

/**
 * GraphQL query to get a product by ID (with all variants)
 */
function buildProductByIdQuery(): string {
  return `
    query getProduct($productId: ID!) {
      product(id: $productId) {
        id
        title
        handle
        variants(first: 100) {
          edges {
            node {
              id
              title
              sku
              price
              inventoryItem {
                id
                inventoryLevels(first: 10) {
                  edges {
                    node {
                      location {
                        id
                        name
                      }
                      quantities(names: ["available"]) {
                        name
                        quantity
                      }
                    }
                  }
                }
              }
              inventoryQuantity
            }
          }
        }
      }
    }
  `;
}

/**
 * GraphQL query to search products
 */
function buildProductsSearchQuery(): string {
  return `
    query searchProducts($query: String!, $limit: Int!) {
      products(first: $limit, query: $query) {
        edges {
          node {
            id
            title
            handle
            variants(first: 100) {
              edges {
                node {
                  id
                  title
                  sku
                  price
                  inventoryItem {
                    id
                    inventoryLevels(first: 10) {
                      edges {
                        node {
                          location {
                            id
                            name
                          }
                          quantities(names: ["available"]) {
                            name
                            quantity
                          }
                        }
                      }
                    }
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
}

/**
 * Parse Shopify GraphQL response and flatten to variant list
 */
function parseShopifyResponse(data: any, variantId?: string, productId?: string): ShopifyVariant[] {
  const variants: ShopifyVariant[] = [];

  if (variantId && data.productVariant) {
    // Single variant response
    const v = data.productVariant;
    const inventoryLevels = parseInventoryLevels(v.inventoryItem);
    variants.push({
      id: v.id,
      title: v.title,
      sku: v.sku,
      price: v.price,
      inventoryItemId: v.inventoryItem?.id || '',
      inventoryQuantity: v.inventoryQuantity || 0,
      inventoryLevels,
      productId: v.product.id,
      productTitle: v.product.title,
    });
  } else if (productId && data.product) {
    // Single product response (with variants)
    const product = data.product;
    const variantEdges = product.variants?.edges || [];

    for (const edge of variantEdges) {
      const v = edge.node;
      const inventoryLevels = parseInventoryLevels(v.inventoryItem);
      variants.push({
        id: v.id,
        title: `${product.title} - ${v.title}`,
        sku: v.sku,
        price: v.price,
        inventoryItemId: v.inventoryItem?.id || '',
        inventoryQuantity: v.inventoryQuantity || 0,
        inventoryLevels,
        productId: product.id,
        productTitle: product.title,
      });
    }
  } else if (data.products) {
    // Search results (multiple products)
    const productEdges = data.products?.edges || [];

    for (const productEdge of productEdges) {
      const product = productEdge.node;
      const variantEdges = product.variants?.edges || [];

      for (const variantEdge of variantEdges) {
        const v = variantEdge.node;
        const inventoryLevels = parseInventoryLevels(v.inventoryItem);
        variants.push({
          id: v.id,
          title: `${product.title} - ${v.title}`,
          sku: v.sku,
          price: v.price,
          inventoryItemId: v.inventoryItem?.id || '',
          inventoryQuantity: v.inventoryQuantity || 0,
          inventoryLevels,
          productId: product.id,
          productTitle: product.title,
        });
      }
    }
  }

  return variants;
}

/**
 * Parse inventory levels from Shopify GraphQL response
 */
function parseInventoryLevels(inventoryItem: any): InventoryLevel[] {
  if (!inventoryItem?.inventoryLevels?.edges) {
    return [];
  }

  const levels: InventoryLevel[] = [];

  for (const edge of inventoryItem.inventoryLevels.edges) {
    const node = edge.node;
    const availableQty = node.quantities?.find((q: any) => q.name === 'available');

    levels.push({
      locationId: node.location.id,
      locationName: node.location.name,
      available: availableQty?.quantity || 0,
    });
  }

  return levels;
}
