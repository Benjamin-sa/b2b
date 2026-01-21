/**
 * Products Orchestration Routes
 *
 * Orchestrates product operations across services:
 * 1. Stripe Service - Create/Update/Archive products and prices
 * 2. Inventory Service - D1 database operations
 * 3. Shopify Sync Service - Sync products to Shopify
 *
 * This keeps Stripe operations in the orchestration layer
 * and keeps inventory-service focused on D1 database operations only.
 */

import { Hono } from "hono";
import type { Env } from "../types";
import {
  createStripeProduct,
  updateStripeProduct,
  replaceStripePrice,
  archiveStripeProduct,
} from "../utils/stripe";
import { syncToShopify } from "../utils/shopify-sync";

const products = new Hono<{ Bindings: Env }>();

// ============================================================================
// INVENTORY SERVICE HELPERS
// ============================================================================

/**
 * Get existing product from inventory service to check for Stripe IDs
 */
async function getExistingProduct(
  env: Env,
  productId: string,
  headers: Headers
): Promise<any | null> {
  try {
    const request = new Request(`http://inventory-service/products/${productId}`, {
      method: "GET",
      headers,
    });

    const response = await env.INVENTORY_SERVICE.fetch(request);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("[Orchestration] Failed to get existing product:", error);
    return null;
  }
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/products
 * List all products with pagination and filters
 */
products.get("/", async (c) => {
  try {
    // Forward request to inventory service via service binding
    const url = new URL(c.req.url);
    const inventoryUrl = `http://inventory-service/products${url.search}`;

    const headers = new Headers(c.req.raw.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    const request = new Request(inventoryUrl, {
      method: "GET",
      headers,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);

    // Return the response directly
    return response;
  } catch (error: any) {
    console.error("[Products Orchestration] Error fetching products:", error);
    throw error;
  }
});

/**
 * GET /api/products/:id
 * Get a single product by ID
 */
products.get("/:id", async (c) => {
  try {
    const productId = c.req.param("id");

    const headers = new Headers(c.req.raw.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    const request = new Request(
      `http://inventory-service/products/${productId}`,
      {
        method: "GET",
        headers,
      }
    );

    const response = await c.env.INVENTORY_SERVICE.fetch(request);

    return response;
  } catch (error: any) {
    console.error("[Products Orchestration] Error fetching product:", error);
    throw error;
  }
});

/**
 * GET /api/products/category/:categoryId
 * Get products by category
 */
products.get("/category/:categoryId", async (c) => {
  try {
    const categoryId = c.req.param("categoryId");
    const url = new URL(c.req.url);
    const inventoryUrl = `http://inventory-service/products/category/${categoryId}${url.search}`;

    const headers = new Headers(c.req.raw.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    const request = new Request(inventoryUrl, {
      method: "GET",
      headers,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);

    return response;
  } catch (error: any) {
    console.error(
      "[Products Orchestration] Error fetching products by category:",
      error
    );
    throw error;
  }
});

/**
 * POST /api/products
 * Create a new product (admin only)
 *
 * Orchestration flow:
 * 1. Validate required fields (name, price)
 * 2. Create product in Stripe (get stripe_product_id, stripe_price_id)
 * 3. Create product in D1 via inventory-service (with Stripe IDs)
 * 4. Trigger Shopify sync (non-blocking)
 */
products.post("/", async (c) => {
  try {
    // Parse the request body
    const body = await c.req.json();

    // Validate required fields at gateway level
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return c.json(
        {
          error: "Validation Error",
          code: "validation/missing-name",
          message: "Product name is required",
        },
        400
      );
    }

    if (body.price === undefined || body.price === null) {
      return c.json(
        {
          error: "Validation Error",
          code: "validation/missing-price",
          message: "Product price is required",
        },
        400
      );
    }

    if (typeof body.price !== 'number' || body.price < 0) {
      return c.json(
        {
          error: "Validation Error",
          code: "validation/invalid-price",
          message: "Product price must be a positive number",
        },
        400
      );
    }

    // Generate product ID for Stripe (inventory-service will use this)
    const productId = body.id || crypto.randomUUID().replace(/-/g, "").slice(0, 21);

    // Step 1: Create Stripe product (required - blocking operation)
    let stripeProductId = body.stripe_product_id || null;
    let stripePriceId = body.stripe_price_id || null;

    if (!stripeProductId && !stripePriceId && body.price) {
      const stripeResult = await createStripeProduct(c.env, {
        product_id: productId,
        name: body.name,
        description: body.description,
        price: body.price,
        images: body.image_url ? [body.image_url] : body.images,
        category: body.category_id,
        brand: body.brand,
        part_number: body.part_number,
        b2b_sku: body.b2b_sku,
      });

      if (!stripeResult) {
        return c.json(
          {
            error: "Failed to create product in Stripe",
            code: "stripe/product-creation-failed",
            message: "Product could not be created in Stripe. Please try again.",
          },
          500
        );
      }

      stripeProductId = stripeResult.stripe_product_id;
      stripePriceId = stripeResult.stripe_price_id;
    }

    // Step 2: Create product in D1 via inventory-service
    const headers = new Headers(c.req.raw.headers);
    headers.set("Content-Type", "application/json");
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    // Add Stripe IDs to the body for inventory-service
    const inventoryBody = {
      ...body,
      id: productId,
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId,
    };

    const request = new Request("http://inventory-service/products", {
      method: "POST",
      headers,
      body: JSON.stringify(inventoryBody),
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);

    // Only trigger Shopify sync if inventory-service succeeded
    if (response.ok) {
      // Step 3: Trigger Shopify sync (blocking to prevent overselling)
      await syncToShopify(c.env, productId);
    }

    return response;
  } catch (error: any) {
    console.error("[Products Orchestration] Error creating product:", error);
    throw error;
  }
});

/**
 * PATCH /api/products/:id
 * Partially update a product (admin only)
 *
 * Orchestration flow:
 * 1. Get existing product (to check for Stripe IDs and current price)
 * 2. Update Stripe product (if stripe_product_id exists)
 * 3. Replace Stripe price (if price changed and stripe_price_id exists)
 * 4. Update product in D1 via inventory-service (with new Stripe price ID if replaced)
 * 5. Trigger Shopify sync (non-blocking)
 */
products.patch("/:id", async (c) => {
  try {
    const productId = c.req.param("id");
    const body = await c.req.json();

    // Step 1: Get existing product to check for Stripe IDs
    const authHeaders = new Headers();
    authHeaders.set("X-Service-Token", c.env.SERVICE_SECRET);

    const existingProduct = await getExistingProduct(c.env, productId, authHeaders);

    let newStripePriceId: string | null = null;

    if (existingProduct) {
      const hasStripeIntegration = existingProduct.stripe_product_id;

      // Step 2: Update Stripe product (if has Stripe integration and non-inventory changes)
      if (hasStripeIntegration) {
        const hasNonInventoryChanges = Object.keys(body).some(
          (key) =>
            !["stock", "in_stock", "total_stock", "b2b_stock", "b2c_stock", 
              "shopify_product_id", "shopify_variant_id", "shopify_inventory_item_id"].includes(key)
        );

        if (hasNonInventoryChanges) {
          const stripeUpdateSuccess = await updateStripeProduct(c.env, {
            product_id: productId,
            stripe_product_id: existingProduct.stripe_product_id,
            name: body.name ?? existingProduct.name,
            description: body.description ?? existingProduct.description,
            images: body.image_url ? [body.image_url] : body.images,
            category: body.category_id ?? existingProduct.category_id,
            brand: body.brand ?? existingProduct.brand,
            part_number: body.part_number ?? existingProduct.part_number,
            b2b_sku: body.b2b_sku ?? existingProduct.b2b_sku,
          });

          if (!stripeUpdateSuccess) {
            return c.json(
              {
                error: "Failed to update product in Stripe",
                code: "stripe/product-update-failed",
                message: "Product could not be updated in Stripe. Please try again.",
              },
              500
            );
          }
        }

        // Step 3: Replace Stripe price if price changed
        const priceChanged = body.price !== undefined && body.price !== existingProduct.price;

        if (priceChanged && existingProduct.stripe_price_id) {
          newStripePriceId = await replaceStripePrice(c.env, {
            product_id: productId,
            stripe_product_id: existingProduct.stripe_product_id,
            stripe_price_id: existingProduct.stripe_price_id,
            new_price: body.price,
          });

          if (!newStripePriceId) {
            return c.json(
              {
                error: "Failed to update price in Stripe",
                code: "stripe/price-update-failed",
                message: "Price could not be updated in Stripe. Please try again.",
              },
              500
            );
          }
        }
      }
    }

    // Step 4: Update product in D1 via inventory-service
    const headers = new Headers(c.req.raw.headers);
    headers.set("Content-Type", "application/json");
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    // Include new Stripe price ID if we replaced the price
    const inventoryBody = {
      ...body,
      ...(newStripePriceId && { stripe_price_id: newStripePriceId }),
    };

    const request = new Request(
      `http://inventory-service/products/${productId}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify(inventoryBody),
      }
    );

    const response = await c.env.INVENTORY_SERVICE.fetch(request);

    // Only trigger Shopify sync if inventory-service succeeded
    if (response.ok) {
      // Step 5: Trigger Shopify sync (blocking to prevent overselling)
      await syncToShopify(c.env, productId);
    }

    return response;
  } catch (error: any) {
    console.error("[Products Orchestration] Error updating product:", error);
    throw error;
  }
});

/**
 * DELETE /api/products/:id
 * Delete a product (admin only)
 *
 * Orchestration flow:
 * 1. Get existing product (to check for Stripe IDs)
 * 2. Archive Stripe product (soft delete - preserves for historical orders)
 * 3. Delete product from D1 via inventory-service
 */
products.delete("/:id", async (c) => {
  try {
    const productId = c.req.param("id");

    // Step 1: Get existing product to check for Stripe IDs
    const authHeaders = new Headers();
    authHeaders.set("X-Service-Token", c.env.SERVICE_SECRET);

    const existingProduct = await getExistingProduct(c.env, productId, authHeaders);

    // Step 2: Archive Stripe product (if has Stripe integration - blocking operation)
    if (existingProduct?.stripe_product_id) {
      const archiveSuccess = await archiveStripeProduct(
        c.env,
        existingProduct.stripe_product_id,
        existingProduct.stripe_price_id
      );

      if (!archiveSuccess) {
        return c.json(
          {
            error: "Failed to archive product in Stripe",
            code: "stripe/product-archive-failed",
            message: "Product could not be archived in Stripe. Please try again.",
          },
          500
        );
      }
    }

    // Step 3: Delete product from D1 via inventory-service
    const headers = new Headers(c.req.raw.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    const request = new Request(
      `http://inventory-service/products/${productId}`,
      {
        method: "DELETE",
        headers,
      }
    );

    const response = await c.env.INVENTORY_SERVICE.fetch(request);

    return response;
  } catch (error: any) {
    console.error("[Products Orchestration] Error deleting product:", error);
    throw error;
  }
});

/**
 * POST /api/inventory/:id/stock
 * Update product inventory (B2B/B2C stock allocation) - admin only
 */
products.post("/inventory/:id/stock", async (c) => {
  try {
    const productId = c.req.param("id");
    const clonedRequest = c.req.raw.clone();

    const headers = new Headers(clonedRequest.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    const request = new Request(
      `http://inventory-service/products/inventory/${productId}/stock`,
      {
        method: "POST",
        headers,
        body: clonedRequest.body,
      }
    );

    const response = await c.env.INVENTORY_SERVICE.fetch(request);

    return response;
  } catch (error: any) {
    console.error("[Products Orchestration] Error updating inventory:", error);
    throw error;
  }
});

export default products;
