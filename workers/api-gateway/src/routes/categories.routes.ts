/**
 * Categories Routes - Direct Database Operations
 *
 * Replaces the service binding proxy with direct D1 operations via @b2b/db
 * Much simpler, no HTTP overhead, better LLM context
 */

import { Hono } from 'hono';
import type { Env, ContextVariables } from '../types';
import { createDb } from '@b2b/db';
import {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree,
  updateCategoryOrder,
  toggleCategoryActive,
  type GetCategoriesOptions,
} from '@b2b/db/operations';

const categories = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * GET /api/categories
 * List all categories with optional filters
 */
categories.get('/', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const url = new URL(c.req.url);

    const options: GetCategoriesOptions = {
      limit: parseInt(url.searchParams.get('limit') || '100'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
      search: url.searchParams.get('search') || undefined,
      activeOnly: url.searchParams.get('active') !== 'false',
    };

    const parentId = url.searchParams.get('parent_id');
    if (parentId !== null) {
      options.parentId = parentId === 'null' ? null : parentId;
    }

    const result = await getCategories(db, options);

    return c.json({
      categories: result.categories,
      total: result.total,
      limit: options.limit,
      offset: options.offset,
    });
  } catch (error: any) {
    console.error('[Categories] Error fetching categories:', error);
    return c.json(
      {
        error: 'Failed to fetch categories',
        code: 'categories/fetch-failed',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/categories/tree
 * Get full category tree with product counts
 */
categories.get('/tree', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const activeOnly = c.req.query('active') !== 'false';

    const tree = await getCategoryTree(db, activeOnly);

    return c.json({ tree });
  } catch (error: any) {
    console.error('[Categories] Error fetching category tree:', error);
    return c.json(
      {
        error: 'Failed to fetch category tree',
        code: 'categories/tree-failed',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/categories/:id
 * Get a single category by ID
 */
categories.get('/:id', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const categoryId = c.req.param('id');

    // Try by ID first, then by slug
    let category = await getCategoryById(db, categoryId);
    if (!category) {
      category = await getCategoryBySlug(db, categoryId);
    }

    if (!category) {
      return c.json(
        {
          error: 'Category not found',
          code: 'categories/not-found',
        },
        404
      );
    }

    return c.json(category);
  } catch (error: any) {
    console.error('[Categories] Error fetching category:', error);
    return c.json(
      {
        error: 'Failed to fetch category',
        code: 'categories/fetch-failed',
        message: error.message,
      },
      500
    );
  }
});

// ============================================================================
// ADMIN ROUTES (TODO: Add auth middleware)
// ============================================================================

/**
 * POST /api/categories
 * Create a new category (admin only)
 */
categories.post('/', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const body = await c.req.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return c.json(
        {
          error: 'Validation Error',
          code: 'validation/missing-name',
          message: 'Category name is required',
        },
        400
      );
    }

    // Generate slug if not provided
    const slug =
      body.slug ||
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    // Check for duplicate slug
    const existing = await getCategoryBySlug(db, slug);
    if (existing) {
      return c.json(
        {
          error: 'Validation Error',
          code: 'validation/duplicate-slug',
          message: 'A category with this slug already exists',
        },
        400
      );
    }

    const categoryId = body.id || crypto.randomUUID();

    const category = await createCategory(db, {
      id: categoryId,
      name: body.name.trim(),
      description: body.description || null,
      slug,
      parent_id: body.parent_id || null,
      image_url: body.image_url || null,
      sort_order: body.sort_order ?? 0,
      is_active: body.is_active ?? 1,
    });

    return c.json(category, 201);
  } catch (error: any) {
    console.error('[Categories] Error creating category:', error);
    return c.json(
      {
        error: 'Failed to create category',
        code: 'categories/create-failed',
        message: error.message,
      },
      500
    );
  }
});

/**
 * PUT /api/categories/:id
 * Full update of a category (admin only)
 */
categories.put('/:id', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const categoryId = c.req.param('id');
    const body = await c.req.json();

    const existing = await getCategoryById(db, categoryId);
    if (!existing) {
      return c.json(
        {
          error: 'Category not found',
          code: 'categories/not-found',
        },
        404
      );
    }

    // Check for duplicate slug if changing
    if (body.slug && body.slug !== existing.slug) {
      const slugExists = await getCategoryBySlug(db, body.slug);
      if (slugExists) {
        return c.json(
          {
            error: 'Validation Error',
            code: 'validation/duplicate-slug',
            message: 'A category with this slug already exists',
          },
          400
        );
      }
    }

    const updated = await updateCategory(db, categoryId, {
      name: body.name ?? existing.name,
      description: body.description ?? existing.description,
      slug: body.slug ?? existing.slug,
      parent_id: body.parent_id ?? existing.parent_id,
      image_url: body.image_url ?? existing.image_url,
      sort_order: body.sort_order ?? existing.sort_order,
      is_active: body.is_active ?? existing.is_active,
    });

    return c.json(updated);
  } catch (error: any) {
    console.error('[Categories] Error updating category:', error);
    return c.json(
      {
        error: 'Failed to update category',
        code: 'categories/update-failed',
        message: error.message,
      },
      500
    );
  }
});

/**
 * PATCH /api/categories/:id
 * Partial update of a category (admin only)
 */
categories.patch('/:id', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const categoryId = c.req.param('id');
    const body = await c.req.json();

    const existing = await getCategoryById(db, categoryId);
    if (!existing) {
      return c.json(
        {
          error: 'Category not found',
          code: 'categories/not-found',
        },
        404
      );
    }

    // Check for duplicate slug if changing
    if (body.slug && body.slug !== existing.slug) {
      const slugExists = await getCategoryBySlug(db, body.slug);
      if (slugExists) {
        return c.json(
          {
            error: 'Validation Error',
            code: 'validation/duplicate-slug',
            message: 'A category with this slug already exists',
          },
          400
        );
      }
    }

    const updated = await updateCategory(db, categoryId, body);

    return c.json(updated);
  } catch (error: any) {
    console.error('[Categories] Error updating category:', error);
    return c.json(
      {
        error: 'Failed to update category',
        code: 'categories/update-failed',
        message: error.message,
      },
      500
    );
  }
});

/**
 * DELETE /api/categories/:id
 * Delete a category (admin only)
 */
categories.delete('/:id', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const categoryId = c.req.param('id');

    const existing = await getCategoryById(db, categoryId);
    if (!existing) {
      return c.json(
        {
          error: 'Category not found',
          code: 'categories/not-found',
        },
        404
      );
    }

    await deleteCategory(db, categoryId);

    return c.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    console.error('[Categories] Error deleting category:', error);
    return c.json(
      {
        error: 'Failed to delete category',
        code: 'categories/delete-failed',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/categories/reorder
 * Reorder categories (admin only)
 */
categories.post('/reorder', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const body = await c.req.json<{ orders: { id: string; sort_order: number }[] }>();

    if (!Array.isArray(body.orders)) {
      return c.json(
        {
          error: 'Validation Error',
          code: 'validation/invalid-orders',
          message: 'Orders must be an array',
        },
        400
      );
    }

    // Update each category's sort order
    for (const { id, sort_order } of body.orders) {
      await updateCategoryOrder(db, id, sort_order);
    }

    return c.json({ message: 'Categories reordered successfully' });
  } catch (error: any) {
    console.error('[Categories] Error reordering categories:', error);
    return c.json(
      {
        error: 'Failed to reorder categories',
        code: 'categories/reorder-failed',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/categories/:id/toggle-active
 * Toggle category active status (admin only)
 */
categories.post('/:id/toggle-active', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const categoryId = c.req.param('id');
    const body = await c.req.json<{ is_active: boolean }>();

    const existing = await getCategoryById(db, categoryId);
    if (!existing) {
      return c.json(
        {
          error: 'Category not found',
          code: 'categories/not-found',
        },
        404
      );
    }

    const updated = await toggleCategoryActive(db, categoryId, body.is_active);

    return c.json(updated);
  } catch (error: any) {
    console.error('[Categories] Error toggling category:', error);
    return c.json(
      {
        error: 'Failed to toggle category',
        code: 'categories/toggle-failed',
        message: error.message,
      },
      500
    );
  }
});

export default categories;
