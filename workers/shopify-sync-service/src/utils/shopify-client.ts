/**
 * Shopify Admin API Client
 *
 * Shared GraphQL request helper for the Shopify Admin API.
 */

import type { Env } from '../types';

export interface ShopifyGraphQLError {
  message: string;
  field?: string[];
}

export async function shopifyGraphQL<T = any>(
  env: Env,
  query: string,
  variables: Record<string, any> = {}
): Promise<T> {
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

  const result = (await response.json()) as { data?: T; errors?: ShopifyGraphQLError[] };

  if (result.errors?.length) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  if (!result.data) {
    throw new Error('Shopify GraphQL response missing data');
  }

  return result.data;
}
