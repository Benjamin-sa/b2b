/**
 * Categories Orchestration Routes
 * 
 * Proxies category requests to inventory-service via service binding
 */

import { Hono } from 'hono';
import type { Env } from '../types';

const categories = new Hono<{ Bindings: Env }>();

/**
 * GET /api/categories
 * List all categories with filters
 */
categories.get('/', async (c) => {
  try {
    // Forward request to inventory service via service binding
    const url = new URL(c.req.url);
    const inventoryUrl = `http://inventory-service/categories${url.search}`;
    
    const request = new Request(inventoryUrl, {
      method: 'GET',
      headers: c.req.raw.headers,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);
    
    return response;
  } catch (error: any) {
    console.error('[Categories Orchestration] Error fetching categories:', error);
    throw error;
  }
});

/**
 * GET /api/categories/tree
 * Get categories in tree structure
 */
categories.get('/tree', async (c) => {
  try {
    const request = new Request('http://inventory-service/categories/tree', {
      method: 'GET',
      headers: c.req.raw.headers,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);
    
    return response;
  } catch (error: any) {
    console.error('[Categories Orchestration] Error fetching category tree:', error);
    throw error;
  }
});

/**
 * GET /api/categories/:id
 * Get a single category by ID
 */
categories.get('/:id', async (c) => {
  try {
    const categoryId = c.req.param('id');
    
    const request = new Request(`http://inventory-service/categories/${categoryId}`, {
      method: 'GET',
      headers: c.req.raw.headers,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);
    
    return response;
  } catch (error: any) {
    console.error('[Categories Orchestration] Error fetching category:', error);
    throw error;
  }
});

/**
 * GET /api/categories/slug/:slug
 * Get a category by slug
 */
categories.get('/slug/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    
    const request = new Request(`http://inventory-service/categories/slug/${slug}`, {
      method: 'GET',
      headers: c.req.raw.headers,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);
    
    return response;
  } catch (error: any) {
    console.error('[Categories Orchestration] Error fetching category by slug:', error);
    throw error;
  }
});

/**
 * POST /api/categories
 * Create a new category (admin only)
 */
categories.post('/', async (c) => {
  try {
    // Clone the request to avoid consuming the body stream
    const clonedRequest = c.req.raw.clone();
    
    const request = new Request('http://inventory-service/categories', {
      method: 'POST',
      headers: clonedRequest.headers,
      body: clonedRequest.body,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);
    
    return response;
  } catch (error: any) {
    console.error('[Categories Orchestration] Error creating category:', error);
    throw error;
  }
});

/**
 * PUT /api/categories/:id
 * Update a category (admin only)
 */
categories.put('/:id', async (c) => {
  try {
    const categoryId = c.req.param('id');
    
    // Clone the request to avoid consuming the body stream
    const clonedRequest = c.req.raw.clone();
    
    const request = new Request(`http://inventory-service/categories/${categoryId}`, {
      method: 'PUT',
      headers: clonedRequest.headers,
      body: clonedRequest.body,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);
    
    return response;
  } catch (error: any) {
    console.error('[Categories Orchestration] Error updating category:', error);
    throw error;
  }
});

/**
 * PATCH /api/categories/:id
 * Partially update a category (admin only)
 */
categories.patch('/:id', async (c) => {
  try {
    const categoryId = c.req.param('id');
    
    // Clone the request to avoid consuming the body stream
    const clonedRequest = c.req.raw.clone();
    
    const request = new Request(`http://inventory-service/categories/${categoryId}`, {
      method: 'PATCH',
      headers: clonedRequest.headers,
      body: clonedRequest.body,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);
    
    return response;
  } catch (error: any) {
    console.error('[Categories Orchestration] Error updating category:', error);
    throw error;
  }
});

/**
 * DELETE /api/categories/:id
 * Delete a category (admin only)
 */
categories.delete('/:id', async (c) => {
  try {
    const categoryId = c.req.param('id');
    
    const request = new Request(`http://inventory-service/categories/${categoryId}`, {
      method: 'DELETE',
      headers: c.req.raw.headers,
    });

    const response = await c.env.INVENTORY_SERVICE.fetch(request);
    
    return response;
  } catch (error: any) {
    console.error('[Categories Orchestration] Error deleting category:', error);
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
      headers: clonedRequest.headers,
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
