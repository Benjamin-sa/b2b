/**
 * Category Routes
 * 
 * REST API endpoints for category management
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAuth, requireAdmin } from '../middleware/auth';
import * as categoryService from '../services/category.service';

const categories = new Hono<{ Bindings: Env }>();

/**
 * GET /categories
 * List all categories with optional filters
 */
categories.get('/', async (c) => {
  try {
    const parentId = c.req.query('parentId');
    const isActive = c.req.query('isActive');
    const searchTerm = c.req.query('search');

    const filters: any = {};

    if (parentId !== undefined) {
      filters.parentId = parentId === 'null' || parentId === '' ? null : parentId;
    }

    if (isActive !== undefined) {
      filters.isActive = isActive === 'true' || isActive === '1';
    }

    if (searchTerm) {
      filters.searchTerm = searchTerm;
    }

    const results = await categoryService.getCategories(c.env.DB, filters);

    return c.json({
      categories: results,
      total: results.length,
    });
  } catch (error: any) {
    console.error('[Category Routes] Error fetching categories:', error);
    throw error;
  }
});

/**
 * GET /categories/tree
 * Get categories in tree structure with children
 */
categories.get('/tree', async (c) => {
  try {
    const tree = await categoryService.getCategoriesTree(c.env.DB);

    return c.json({
      categories: tree,
    });
  } catch (error: any) {
    console.error('[Category Routes] Error fetching category tree:', error);
    throw error;
  }
});

/**
 * GET /categories/:id
 * Get a single category by ID
 */
categories.get('/:id', async (c) => {
  try {
    const categoryId = c.req.param('id');
    const category = await categoryService.getCategoryById(c.env.DB, categoryId);

    return c.json(category);
  } catch (error: any) {
    console.error('[Category Routes] Error fetching category:', error);
    throw error;
  }
});

/**
 * GET /categories/slug/:slug
 * Get a category by slug
 */
categories.get('/slug/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const category = await categoryService.getCategoryBySlug(c.env.DB, slug);

    if (!category) {
      return c.json(
        {
          error: 'Not Found',
          code: 'CATEGORY_NOT_FOUND',
          message: `Category with slug '${slug}' not found`,
        },
        404
      );
    }

    return c.json(category);
  } catch (error: any) {
    console.error('[Category Routes] Error fetching category by slug:', error);
    throw error;
  }
});

/**
 * POST /categories
 * Create a new category (admin only)
 */
categories.post('/', requireAuth, requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const category = await categoryService.createCategory(c.env.DB, body);

    return c.json(category, 201);
  } catch (error: any) {
    console.error('[Category Routes] Error creating category:', error);
    throw error;
  }
});

/**
 * PUT /categories/:id
 * Update a category (admin only)
 */
categories.put('/:id', requireAuth, requireAdmin, async (c) => {
  try {
    const categoryId = c.req.param('id');
    const body = await c.req.json();
    const category = await categoryService.updateCategory(c.env.DB, categoryId, body);

    return c.json(category);
  } catch (error: any) {
    console.error('[Category Routes] Error updating category:', error);
    throw error;
  }
});

/**
 * PATCH /categories/:id
 * Partially update a category (admin only)
 */
categories.patch('/:id', requireAuth, requireAdmin, async (c) => {
  try {
    const categoryId = c.req.param('id');
    const body = await c.req.json();
    const category = await categoryService.updateCategory(c.env.DB, categoryId, body);

    return c.json(category);
  } catch (error: any) {
    console.error('[Category Routes] Error updating category:', error);
    throw error;
  }
});

/**
 * DELETE /categories/:id
 * Delete a category (admin only)
 */
categories.delete('/:id', requireAuth, requireAdmin, async (c) => {
  try {
    const categoryId = c.req.param('id');
    await categoryService.deleteCategory(c.env.DB, categoryId);

    return c.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    console.error('[Category Routes] Error deleting category:', error);
    throw error;
  }
});

/**
 * POST /categories/reorder
 * Reorder categories (admin only)
 */
categories.post('/reorder', requireAuth, requireAdmin, async (c) => {
  try {
    const { categoryIds } = await c.req.json();

    if (!Array.isArray(categoryIds)) {
      return c.json(
        {
          error: 'Bad Request',
          code: 'INVALID_INPUT',
          message: 'categoryIds must be an array',
        },
        400
      );
    }

    await categoryService.reorderCategories(c.env.DB, categoryIds);

    return c.json({ message: 'Categories reordered successfully' });
  } catch (error: any) {
    console.error('[Category Routes] Error reordering categories:', error);
    throw error;
  }
});

export default categories;
