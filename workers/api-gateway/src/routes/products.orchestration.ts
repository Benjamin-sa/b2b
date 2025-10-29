/**
 * Products Orchestration Routes
 *
 * Proxies product requests to inventory-service via service binding
 */

import { Hono } from "hono";
import type { Env } from "../types";

const products = new Hono<{ Bindings: Env }>();

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
 */
products.post("/", async (c) => {
  try {
    // Clone the request to avoid consuming the body stream
    const clonedRequest = c.req.raw.clone();

    // Properly copy headers from the original request
    const headers = new Headers(clonedRequest.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    const request = new Request("http://inventory-service/products", {
      method: "POST",
      headers,
      body: clonedRequest.body,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);

    // Trigger Shopify sync (non-blocking, errors don't fail the request)
    try {
      const syncRequest = new Request(`http://shopify-sync/sync/all`, {
        method: "POST",
        headers: {
          "X-Service-Token": c.env.SERVICE_SECRET,
        },
      });
      await c.env.SHOPIFY_SYNC_SERVICE.fetch(syncRequest);
    } catch (syncError: any) {
      console.error(
        "[Products Orchestration] Shopify sync failed after product creation:",
        syncError
      );
    }

    return response;
  } catch (error: any) {
    console.error("[Products Orchestration] Error creating product:", error);
    throw error;
  }
});

/**
 * PUT /api/products/:id
 * Update a product (admin only)
 */
products.put("/:id", async (c) => {
  try {
    const productId = c.req.param("id");
    const clonedRequest = c.req.raw.clone();

    const headers = new Headers(clonedRequest.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    const request = new Request(
      `http://inventory-service/products/${productId}`,
      {
        method: "PUT",
        headers,
        body: clonedRequest.body,
      }
    );

    const response = await c.env.INVENTORY_SERVICE.fetch(request);

    // Trigger Shopify sync (non-blocking)
    try {
      const syncHeaders = new Headers();
      syncHeaders.set("X-Service-Token", c.env.SERVICE_SECRET);
      
      const syncRequest = new Request(`http://shopify-sync/sync/${productId}`, {
        method: "POST",
        headers: syncHeaders,
      });
      await c.env.SHOPIFY_SYNC_SERVICE.fetch(syncRequest);
    } catch (syncError: any) {
      console.error(
        "[Products Orchestration] Shopify sync failed after product update:",
        syncError
      );
    }

    return response;
  } catch (error: any) {
    console.error("[Products Orchestration] Error updating product:", error);
    throw error;
  }
});

/**
 * PATCH /api/products/:id
 * Partially update a product (admin only)
 */
products.patch("/:id", async (c) => {
  try {
    const productId = c.req.param("id");
    const clonedRequest = c.req.raw.clone();

    const headers = new Headers(clonedRequest.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    const request = new Request(
      `http://inventory-service/products/${productId}`,
      {
        method: "PATCH",
        headers,
        body: clonedRequest.body,
      }
    );

    const response = await c.env.INVENTORY_SERVICE.fetch(request);

    // Trigger Shopify sync (non-blocking)
    try {
      const syncHeaders = new Headers();
      syncHeaders.set("X-Service-Token", c.env.SERVICE_SECRET);
      
      const syncRequest = new Request(`http://shopify-sync/sync/${productId}`, {
        method: "POST",
        headers: syncHeaders,
      });
      await c.env.SHOPIFY_SYNC_SERVICE.fetch(syncRequest);
    } catch (syncError: any) {
      console.error(
        "[Products Orchestration] Shopify sync failed after product patch:",
        syncError
      );
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
 */
products.delete("/:id", async (c) => {
  try {
    const productId = c.req.param("id");
    const clonedRequest = c.req.raw.clone();

    const headers = new Headers(clonedRequest.headers);
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
