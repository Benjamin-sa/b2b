import type { ShopifyProduct } from '../types/inventory';

// Type declaration for fetch in Cloudflare Workers
declare const fetch: typeof globalThis.fetch;

export class ShopifyService {
  private storeUrl: string;
  private accessToken: string;

  constructor(storeUrl: string, accessToken: string) {
    this.storeUrl = storeUrl;
    this.accessToken = accessToken;
  }

  /**
   * Fetch all products from Shopify with pagination
   */
  async getAllProducts(): Promise<ShopifyProduct[]> {
    let allProducts: ShopifyProduct[] = [];
    let nextPageInfo: string | null = null;
    let hasNextPage = true;

    while (hasNextPage) {
      let url = `${this.storeUrl}/admin/api/2025-07/products.json?limit=250`;
      
      // Add pagination parameter if we have it
      if (nextPageInfo) {
        url += `&page_info=${nextPageInfo}`;
      }

      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products from Shopify: ${response.statusText}`);
      }

      const data = await response.json() as { products: ShopifyProduct[] };
      allProducts = allProducts.concat(data.products);

      // Check for next page using Link header
      const linkHeader = response.headers.get('Link');
      if (linkHeader && linkHeader.includes('rel="next"')) {
        // Extract page_info from the Link header
        const nextMatch = linkHeader.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/);
        nextPageInfo = nextMatch ? decodeURIComponent(nextMatch[1]) : null;
        hasNextPage = !!nextPageInfo;
      } else {
        hasNextPage = false;
      }

      // Add a small delay to be respectful to Shopify's API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return allProducts;
  }

  /**
   * Fetch inventory levels for a product variant
   */
  async getInventoryLevel(variantId: number): Promise<number> {
    const response = await fetch(`${this.storeUrl}/admin/api/2025-07/inventory_levels.json?inventory_item_ids=${variantId}`, {
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch inventory level for variant ${variantId}: ${response.statusText}`);
    }

    const data = await response.json() as { inventory_levels: Array<{ available: number }> };
    return data.inventory_levels[0]?.available || 0;
  }

  /**
   * Fetch variant information by inventory_item_id
   */
  async getVariantByInventoryItemId(inventoryItemId: string): Promise<{
    product_id: number;
    variant_id: number;
    title: string;
  } | null> {
    try {
      // Search through products to find the variant with matching inventory_item_id
      const productsResponse = await fetch(`${this.storeUrl}/admin/api/2025-07/products.json?limit=250&fields=id,title,variants`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (!productsResponse.ok) {
        throw new Error(`Failed to fetch products: ${productsResponse.statusText}`);
      }

      const productsData = await productsResponse.json() as { 
        products: Array<{
          id: number;
          title: string;
          variants: Array<{
            id: number;
            inventory_item_id: number;
            title?: string;
          }>;
        }>
      };

      // Find the variant with matching inventory_item_id
      for (const product of productsData.products) {
        for (const variant of product.variants) {
          if (variant.inventory_item_id.toString() === inventoryItemId) {
            const variantTitle = variant.title 
              ? `${product.title} - ${variant.title}`
              : `${product.title} - Variant ${variant.id}`;
              
            return {
              product_id: product.id,
              variant_id: variant.id,
              title: variantTitle
            };
          }
        }
      }

      return null;
    } catch (error) {
      throw new Error(`Failed to fetch variant by inventory_item_id ${inventoryItemId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update inventory level in Shopify
   * This is critical for B2C to B2B transfers - we need to update Shopify with the new B2C stock level
   */
  async updateInventoryLevel(inventoryItemId: string, newAvailableQuantity: number, locationId?: string): Promise<void> {
    try {
      // First, we need to get the location ID if not provided
      if (!locationId) {
        // Get the primary location (usually the first/default location)
        const locationsResponse = await fetch(`${this.storeUrl}/admin/api/2025-07/locations.json`, {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        });

        if (!locationsResponse.ok) {
          throw new Error(`Failed to fetch locations: ${locationsResponse.statusText}`);
        }

        const locationsData = await locationsResponse.json() as { locations: Array<{ id: number }> };
        if (locationsData.locations.length === 0) {
          throw new Error('No locations found in Shopify store');
        }
        
        const primaryLocation = locationsData.locations[0];
        if (!primaryLocation) {
          throw new Error('Primary location is undefined');
        }
        
        locationId = primaryLocation.id.toString();
      }

      // Update the inventory level using the Inventory API
      const updateResponse = await fetch(`${this.storeUrl}/admin/api/2025-07/inventory_levels/set.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          location_id: parseInt(locationId),
          inventory_item_id: parseInt(inventoryItemId),
          available: newAvailableQuantity
        })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        throw new Error(`Failed to update inventory in Shopify: ${updateResponse.statusText}. ${JSON.stringify(errorData)}`);
      }

      const result = await updateResponse.json() as { inventory_level: { available: number } };
      
      // Verify the update was successful
      if (result.inventory_level.available !== newAvailableQuantity) {
        throw new Error(`Inventory update verification failed. Expected: ${newAvailableQuantity}, Got: ${result.inventory_level.available}`);
      }

      console.log(`✅ Successfully updated Shopify inventory for item ${inventoryItemId} to ${newAvailableQuantity} units`);
    } catch (error) {
      console.error(`❌ Error updating Shopify inventory for item ${inventoryItemId}:`, error);
      throw new Error(`Failed to update Shopify inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
