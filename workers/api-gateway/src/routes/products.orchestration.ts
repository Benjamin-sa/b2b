/**
 * Products Orchestration Routes
 * 
 * Proxies product requests to inventory-service via service binding
 */

import { Hono } from 'hono';
import type { Env } from '../types';

const products = new Hono<{ Bindings: Env }>();

/**
 * GET /api/products
 * List all products with pagination and filters
 */
products.get('/', async (c) => {
  try {
    // Forward request to inventory service via service binding
    const url = new URL(c.req.url);
    const inventoryUrl = `http://inventory-service/products${url.search}`;
    
    const request = new Request(inventoryUrl, {
      method: 'GET',
      headers: c.req.raw.headers,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);
    
    // Return the response directly
    return response;
  } catch (error: any) {
    console.error('[Products Orchestration] Error fetching products:', error);
    throw error;
  }
});

/**
 * GET /api/products/:id
 * Get a single product by ID
 */
products.get('/:id', async (c) => {
  try {
    const productId = c.req.param('id');
    
    const request = new Request(`http://inventory-service/products/${productId}`, {
      method: 'GET',
      headers: c.req.raw.headers,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);
    
    return response;
  } catch (error: any) {
    console.error('[Products Orchestration] Error fetching product:', error);
    throw error;
  }
});

/**
 * GET /api/products/category/:categoryId
 * Get products by category
 */
products.get('/category/:categoryId', async (c) => {
  try {
    const categoryId = c.req.param('categoryId');
    const url = new URL(c.req.url);
    const inventoryUrl = `http://inventory-service/products/category/${categoryId}${url.search}`;
    
    const request = new Request(inventoryUrl, {
      method: 'GET',
      headers: c.req.raw.headers,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);
    
    return response;
  } catch (error: any) {
    console.error('[Products Orchestration] Error fetching products by category:', error);
    throw error;
  }
});

/**
 * POST /api/products
 * Create a new product (admin only)
 */
products.post('/', async (c) => {
  try {
    const request = new Request('http://inventory-service/products', {
      method: 'POST',
      headers: c.req.raw.headers,
      body: c.req.raw.body,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);
    
    return response;
  } catch (error: any) {
    console.error('[Products Orchestration] Error creating product:', error);
    throw error;
  }
});

/**
 * PUT /api/products/:id
 * Update a product (admin only)
 */
products.put('/:id', async (c) => {
  try {
    const productId = c.req.param('id');
    
    const request = new Request(`http://inventory-service/products/${productId}`, {
      method: 'PUT',
      headers: c.req.raw.headers,
      body: c.req.raw.body,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);
    
    return response;
  } catch (error: any) {
    console.error('[Products Orchestration] Error updating product:', error);
    throw error;
  }
});

/**
 * PATCH /api/products/:id
 * Partially update a product (admin only)
 */
products.patch('/:id', async (c) => {
  try {
    const productId = c.req.param('id');
    
    const request = new Request(`http://inventory-service/products/${productId}`, {
      method: 'PATCH',
      headers: c.req.raw.headers,
      body: c.req.raw.body,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);
    
    return response;
  } catch (error: any) {
    console.error('[Products Orchestration] Error updating product:', error);
    throw error;
  }
});

/**
 * DELETE /api/products/:id
 * Delete a product (admin only)
 */
products.delete('/:id', async (c) => {
  try {
    const productId = c.req.param('id');
    
    const request = new Request(`http://inventory-service/products/${productId}`, {
      method: 'DELETE',
      headers: c.req.raw.headers,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);
    
    return response;
  } catch (error: any) {
    console.error('[Products Orchestration] Error deleting product:', error);
    throw error;
  }
});

/**
 * POST /api/products/:id/stock
 * Update product stock (admin only)
 */
products.post('/:id/stock', async (c) => {
  try {
    const productId = c.req.param('id');
    
    const request = new Request(`http://inventory-service/products/${productId}/stock`, {
      method: 'POST',
      headers: c.req.raw.headers,
      body: c.req.raw.body,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);
    
    return response;
  } catch (error: any) {
    console.error('[Products Orchestration] Error updating stock:', error);
    throw error;
  }
});

export default products;
