/**
 * Categories Orchestration Routes
 *
 * Proxies category requests to inventory-service via service binding
 */

import { Hono } from "hono";
import type { Env } from "../types";

const categories = new Hono<{ Bindings: Env }>();

/**
 * GET /api/categories
 * List all categories
 */
categories.get("/", async (c) => {
  try {
    // Forward request to inventory service via service binding
    const url = new URL(c.req.url);
    const inventoryUrl = `http://inventory-service/categories${url.search}`;

    const headers = new Headers(c.req.raw.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);
    
    const request = new Request(inventoryUrl, {
      method: 'GET',
      headers ,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);

    return response;
  } catch (error: any) {
    console.error("[Categories Orchestration] Error fetching categories:", error);
    throw error;
  }
});

/**
 * GET /api/categories/:id
 * Get a single category by ID
 */
categories.get("/:id", async (c) => {
  try {
    const categoryId = c.req.param("id");

    const headers = new Headers(c.req.raw.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    const request = new Request(
      `http://inventory-service/categories/${categoryId}`,
      {
        method: "GET",
        headers,
      }
    );

    const response = await c.env.INVENTORY_SERVICE.fetch(request);

    return response;
  } catch (error: any) {
    console.error("[Categories Orchestration] Error fetching category:", error);
    throw error;
  }
});

/**
 * POST /api/categories
 * Create a new category (admin only)
 */
categories.post("/", async (c) => {
  try {
    const clonedRequest = c.req.raw.clone();

    const headers = new Headers(clonedRequest.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    const request = new Request("http://inventory-service/categories", {
      method: "POST",
      headers,
      body: clonedRequest.body,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);

    return response;
  } catch (error: any) {
    console.error("[Categories Orchestration] Error creating category:", error);
    throw error;
  }
});

/**
 * PUT /api/categories/:id
 * Update a category (admin only)
 */
categories.put("/:id", async (c) => {
  try {
    const categoryId = c.req.param("id");
    const clonedRequest = c.req.raw.clone();

    const headers = new Headers(clonedRequest.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    const request = new Request(
      `http://inventory-service/categories/${categoryId}`,
      {
        method: "PUT",
        headers,
        body: clonedRequest.body,
      }
    );

    const response = await c.env.INVENTORY_SERVICE.fetch(request);

    return response;
  } catch (error: any) {
    console.error("[Categories Orchestration] Error updating category:", error);
    throw error;
  }
});

/**
 * PATCH /api/categories/:id
 * Partially update a category (admin only)
 */
categories.patch("/:id", async (c) => {
  try {
    const categoryId = c.req.param("id");
    const clonedRequest = c.req.raw.clone();

    const headers = new Headers(clonedRequest.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    const request = new Request(
      `http://inventory-service/categories/${categoryId}`,
      {
        method: "PATCH",
        headers,
        body: clonedRequest.body,
      }
    );

    const response = await c.env.INVENTORY_SERVICE.fetch(request);

    return response;
  } catch (error: any) {
    console.error("[Categories Orchestration] Error updating category:", error);
    throw error;
  }
});

/**
 * DELETE /api/categories/:id
 * Delete a category (admin only)
 */
categories.delete("/:id", async (c) => {
  try {
    const categoryId = c.req.param("id");

    const headers = new Headers(c.req.raw.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    const request = new Request(
      `http://inventory-service/categories/${categoryId}`,
      {
        method: "DELETE",
        headers,
      }
    );

    const response = await c.env.INVENTORY_SERVICE.fetch(request);

    return response;
  } catch (error: any) {
    console.error("[Categories Orchestration] Error deleting category:", error);
    throw error;
  }
});

    

/**
 * POST /api/categories/reorder
 * Reorder categories (admin only)
 */
categories.post('/reorder', async (c) => {
  try {
    // Clone the request to avoid consuming the body stream
    const clonedRequest = c.req.raw.clone();
    
    const request = new Request('http://inventory-service/categories/reorder', {
      method: 'POST',
      headers: {
          ...c.req.raw.headers,
          'X-Service-Token': c.env.SERVICE_SECRET,  // 👈 Pass the secret
        },
      body: clonedRequest.body,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);
    
    return response;
  } catch (error: any) {
    console.error('[Categories Orchestration] Error reordering categories:', error);
    throw error;
  }
});

export default categories;
