/**
 * Product Routes
 * 
 * HTTP endpoints for product management
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';
import {
  getProductById,
  getProducts,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../services/product.service';
import { validatePagination, validateSort } from '../utils/validation';
import { errors } from '../utils/errors';

const products = new Hono<{ Bindings: Env }>();

// ============================================================================
// PUBLIC ROUTES (No auth required for GET operations)
// ============================================================================

/**
 * GET /products
 * Get all products with pagination and filters
 */
products.get('/', optionalAuth, async (c) => {
  try {
    // Parse pagination
    const page = c.req.query('page');
    const limit = c.req.query('limit');
    const maxLimit = parseInt(c.env.MAX_PAGE_SIZE);
    const defaultLimit = parseInt(c.env.DEFAULT_PAGE_SIZE);

    const pagination = validatePagination(page, limit || defaultLimit, maxLimit);

    // Parse sort
    const sortBy = c.req.query('sortBy');
    const sortOrder = c.req.query('sortOrder');
    const sort = validateSort(sortBy, sortOrder, [
      'name',
      'price',
      'created_at',
      'updated_at',
      'stock',
    ]);

    // Parse filters
    const filters = {
      categoryId: c.req.query('categoryId'),
      brand: c.req.query('brand'),
      inStock: c.req.query('inStock') === 'true' ? true : undefined,
      comingSoon: c.req.query('comingSoon') === 'true' ? true : undefined,
      minPrice: c.req.query('minPrice') ? parseFloat(c.req.query('minPrice')!) : undefined,
      maxPrice: c.req.query('maxPrice') ? parseFloat(c.req.query('maxPrice')!) : undefined,
      searchTerm: c.req.query('search'),
    };

    const result = await getProducts(c.env.DB, filters, {
      ...pagination,
      ...sort,
    });

    return c.json(result);
  } catch (error) {
    throw error;
  }
});

/**
 * GET /products/:id
 * Get a single product by ID
 */
products.get('/:id', optionalAuth, async (c) => {
  try {
    const productId = c.req.param('id');

    const product = await getProductById(c.env.DB, productId);

    return c.json(product);
  } catch (error) {
    throw error;
  }
});

/**
 * GET /products/category/:categoryId
 * Get products by category with pagination
 */
products.get('/category/:categoryId', optionalAuth, async (c) => {
  try {
    const categoryId = c.req.param('categoryId');

    // Parse pagination
    const page = c.req.query('page');
    const limit = c.req.query('limit');
    const maxLimit = parseInt(c.env.MAX_PAGE_SIZE);
    const defaultLimit = parseInt(c.env.DEFAULT_PAGE_SIZE);

    const pagination = validatePagination(page, limit || defaultLimit, maxLimit);

    // Parse sort
    const sortBy = c.req.query('sortBy');
    const sortOrder = c.req.query('sortOrder');
    const sort = validateSort(sortBy, sortOrder, [
      'name',
      'price',
      'created_at',
      'updated_at',
      'stock',
    ]);

    const result = await getProductsByCategory(c.env.DB, categoryId, {
      ...pagination,
      ...sort,
    });

    return c.json(result);
  } catch (error) {
    throw error;
  }
});

// ============================================================================
// ADMIN ROUTES (Require authentication + admin role)
// ============================================================================

/**
 * POST /products
 * Create a new product (admin only)
 */
products.post('/', requireAuth, requireAdmin, async (c) => {
  try {
    const data = await c.req.json();

    const product = await createProduct(c.env.DB, data);

    return c.json(product, 201);
  } catch (error) {
    throw error;
  }
});

/**
 * PUT /products/:id
 * Update a product (admin only)
 */
products.put('/:id', requireAuth, requireAdmin, async (c) => {
  try {
    const productId = c.req.param('id');
    const data = await c.req.json();

    const product = await updateProduct(c.env.DB, productId, data);

    return c.json(product);
  } catch (error) {
    throw error;
  }
});

/**
 * PATCH /products/:id
 * Partially update a product (admin only)
 */
products.patch('/:id', requireAuth, requireAdmin, async (c) => {
  try {
    const productId = c.req.param('id');
    const data = await c.req.json();

    const product = await updateProduct(c.env.DB, productId, data);

    return c.json(product);
  } catch (error) {
    throw error;
  }
});

/**
 * DELETE /products/:id
 * Delete a product (admin only)
 */
products.delete('/:id', requireAuth, requireAdmin, async (c) => {
  try {
    const productId = c.req.param('id');

    await deleteProduct(c.env.DB, productId);

    return c.json({ message: 'Product deleted successfully' });
  } catch (error) {
    throw error;
  }
});

/**
 * POST /products/:id/stock
 * Update product stock (admin only)
 * Simplified endpoint for stock updates
 */
products.post('/:id/stock', requireAuth, requireAdmin, async (c) => {
  try {
    const productId = c.req.param('id');
    const { stock } = await c.req.json<{ stock: number }>();

    if (typeof stock !== 'number' || stock < 0) {
      throw errors.validationError('Stock must be a non-negative number');
    }

    const product = await updateProduct(c.env.DB, productId, { stock });

    return c.json(product);
  } catch (error) {
    throw error;
  }
});

export default products;
