/**
 * Category Service
 * 
 * Business logic for category management
 */

import { nanoid } from 'nanoid';
import type {
  Category,
  CategoryWithChildren,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryFilters,
} from '../types';
import { getOne, getOneOrNull, getMany, batch } from '../utils/database';
import { errors } from '../utils/errors';
import { validateRequired } from '../utils/validation';

/**
 * Get category by ID
 */
export async function getCategoryById(
  db: any,
  categoryId: string
): Promise<Category> {
  return getOne<Category>(
    db,
    'SELECT * FROM categories WHERE id = ?',
    [categoryId]
  );
}

/**
 * Get all categories with filters
 */
export async function getCategories(
  db: any,
  filters: CategoryFilters
): Promise<Category[]> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.parentId !== undefined) {
    if (filters.parentId === null) {
      conditions.push('parent_id IS NULL');
    } else {
      conditions.push('parent_id = ?');
      params.push(filters.parentId);
    }
  }

  if (filters.isActive !== undefined) {
    conditions.push('is_active = ?');
    params.push(filters.isActive ? 1 : 0);
  }

  if (filters.searchTerm) {
    conditions.push('(name LIKE ? OR description LIKE ?)');
    const searchPattern = `%${filters.searchTerm}%`;
    params.push(searchPattern, searchPattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `SELECT * FROM categories ${whereClause} ORDER BY sort_order ASC, name ASC`;

  return getMany<Category>(db, query, params);
}

/**
 * Get category tree structure with children
 */
export async function getCategoriesTree(db: any): Promise<CategoryWithChildren[]> {
  // Get all active categories
  const allCategories = await getMany<Category>(
    db,
    'SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC',
    []
  );

  // Build tree structure
  const categoryMap = new Map<string, CategoryWithChildren>();
  const rootCategories: CategoryWithChildren[] = [];

  // First pass: Create map of all categories
  allCategories.forEach(cat => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  // Second pass: Build tree structure
  allCategories.forEach(cat => {
    const categoryWithChildren = categoryMap.get(cat.id)!;
    
    if (cat.parent_id) {
      const parent = categoryMap.get(cat.parent_id);
      if (parent) {
        parent.children!.push(categoryWithChildren);
      } else {
        // Parent not found or inactive, treat as root
        rootCategories.push(categoryWithChildren);
      }
    } else {
      rootCategories.push(categoryWithChildren);
    }
  });

  return rootCategories;
}

/**
 * Get category by slug
 */
export async function getCategoryBySlug(
  db: any,
  slug: string
): Promise<Category | null> {
  return getOneOrNull<Category>(
    db,
    'SELECT * FROM categories WHERE slug = ?',
    [slug]
  );
}

/**
 * Get category by name
 */
export async function getCategoryByName(
  db: any,
  name: string
): Promise<Category | null> {
  return getOneOrNull<Category>(
    db,
    'SELECT * FROM categories WHERE name = ?',
    [name]
  );
}

/**
 * Create a new category
 */
export async function createCategory(
  db: any,
  data: CreateCategoryRequest
): Promise<Category> {
  validateRequired(data, ['name', 'slug']);

  // Check if category name already exists
  const existingByName = await getCategoryByName(db, data.name);
  if (existingByName) {
    throw errors.conflict('Category with this name already exists');
  }

  // Check if slug already exists
  const existingBySlug = await getCategoryBySlug(db, data.slug);
  if (existingBySlug) {
    throw errors.conflict('Category with this slug already exists');
  }

  // Verify parent exists if specified
  if (data.parentId) {
    const parent = await getOneOrNull<Category>(
      db,
      'SELECT id FROM categories WHERE id = ?',
      [data.parentId]
    );
    if (!parent) {
      throw errors.notFound('Parent category', data.parentId);
    }
  }

  const categoryId = nanoid();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO categories (
        id, name, description, slug, parent_id, image_url, sort_order, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      categoryId,
      data.name,
      data.description || null,
      data.slug,
      data.parentId || null,
      data.imageUrl || null,
      data.sortOrder || 0,
      data.isActive !== false ? 1 : 0,
      now,
      now
    )
    .run();

  return getCategoryById(db, categoryId);
}

/**
 * Update a category
 */
export async function updateCategory(
  db: any,
  categoryId: string,
  data: UpdateCategoryRequest
): Promise<Category> {
  // Check if category exists
  const existing = await getOneOrNull<Category>(
    db,
    'SELECT * FROM categories WHERE id = ?',
    [categoryId]
  );

  if (!existing) {
    throw errors.notFound('Category', categoryId);
  }

  // Check if new name already exists (excluding current category)
  if (data.name) {
    const existingByName = await getCategoryByName(db, data.name);
    if (existingByName && existingByName.id !== categoryId) {
      throw errors.conflict('Category with this name already exists');
    }
  }

  // Check if new slug already exists (excluding current category)
  if (data.slug) {
    const existingBySlug = await getCategoryBySlug(db, data.slug);
    if (existingBySlug && existingBySlug.id !== categoryId) {
      throw errors.conflict('Category with this slug already exists');
    }
  }

  // Verify parent exists if specified
  if (data.parentId) {
    if (data.parentId === categoryId) {
      throw errors.badRequest('Category cannot be its own parent');
    }
    const parent = await getOneOrNull<Category>(
      db,
      'SELECT id FROM categories WHERE id = ?',
      [data.parentId]
    );
    if (!parent) {
      throw errors.notFound('Parent category', data.parentId);
    }
  }

  const now = new Date().toISOString();
  const updateFields: string[] = [];
  const updateParams: any[] = [];

  if (data.name !== undefined) {
    updateFields.push('name = ?');
    updateParams.push(data.name);
  }
  if (data.description !== undefined) {
    updateFields.push('description = ?');
    updateParams.push(data.description);
  }
  if (data.slug !== undefined) {
    updateFields.push('slug = ?');
    updateParams.push(data.slug);
  }
  if (data.parentId !== undefined) {
    updateFields.push('parent_id = ?');
    updateParams.push(data.parentId);
  }
  if (data.imageUrl !== undefined) {
    updateFields.push('image_url = ?');
    updateParams.push(data.imageUrl);
  }
  if (data.sortOrder !== undefined) {
    updateFields.push('sort_order = ?');
    updateParams.push(data.sortOrder);
  }
  if (data.isActive !== undefined) {
    updateFields.push('is_active = ?');
    updateParams.push(data.isActive ? 1 : 0);
  }

  updateFields.push('updated_at = ?');
  updateParams.push(now);

  if (updateFields.length > 1) { // More than just updated_at
    updateParams.push(categoryId);
    await db
      .prepare(`UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`)
      .bind(...updateParams)
      .run();
  }

  return getCategoryById(db, categoryId);
}

/**
 * Delete a category
 */
export async function deleteCategory(db: any, categoryId: string): Promise<void> {
  // Check if category exists
  const existing = await getOneOrNull<Category>(
    db,
    'SELECT id FROM categories WHERE id = ?',
    [categoryId]
  );

  if (!existing) {
    throw errors.notFound('Category', categoryId);
  }

  // Check if category has children
  const children = await getMany<Category>(
    db,
    'SELECT id FROM categories WHERE parent_id = ?',
    [categoryId]
  );

  if (children.length > 0) {
    throw errors.badRequest(
      'Cannot delete category with subcategories. Please delete or move subcategories first.'
    );
  }

  // Check if category has products
  const products = await getMany(
    db,
    'SELECT id FROM products WHERE category_id = ?',
    [categoryId]
  );

  if (products.length > 0) {
    throw errors.badRequest(
      `Cannot delete category with ${products.length} product(s). Please reassign or delete products first.`
    );
  }

  await db
    .prepare('DELETE FROM categories WHERE id = ?')
    .bind(categoryId)
    .run();
}

/**
 * Reorder categories
 */
export async function reorderCategories(
  db: any,
  categoryIds: string[]
): Promise<void> {
  const statements = categoryIds.map((id, index) => {
    const now = new Date().toISOString();
    return db
      .prepare('UPDATE categories SET sort_order = ?, updated_at = ? WHERE id = ?')
      .bind(index, now, id);
  });

  await batch(db, statements);
}
