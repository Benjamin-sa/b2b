/**
 * Category Service
 *
 * Business logic for category management
 */

import { nanoid } from 'nanoid';
import { createDb, schema } from '@b2b/db';
import { and, asc, eq, isNull, like, or } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import type {
  Category,
  CategoryWithChildren,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryFilters,
} from '../types';
import { errors } from '../utils/errors';
import { validateRequired } from '../utils/validation';

const { categories, products } = schema;

/**
 * Get category by ID
 */
export async function getCategoryById(db: D1Database, categoryId: string): Promise<Category> {
  const client = createDb(db);
  const category = await client
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .get();

  if (!category) {
    throw errors.notFound('Category', categoryId);
  }

  return category as Category;
}

/**
 * Get all categories with filters
 */
export async function getCategories(db: D1Database, filters: CategoryFilters): Promise<Category[]> {
  const client = createDb(db);
  const conditions: any[] = [];

  if (filters.parentId !== undefined) {
    if (filters.parentId === null) {
      conditions.push(isNull(categories.parent_id));
    } else {
      conditions.push(eq(categories.parent_id, filters.parentId));
    }
  }

  if (filters.isActive !== undefined) {
    conditions.push(eq(categories.is_active, filters.isActive ? 1 : 0));
  }

  if (filters.searchTerm) {
    const searchPattern = `%${filters.searchTerm}%`;
    conditions.push(
      or(like(categories.name, searchPattern), like(categories.description, searchPattern))
    );
  }

  const query = client
    .select()
    .from(categories)
    .orderBy(asc(categories.sort_order), asc(categories.name));

  if (conditions.length > 0) {
    return (await query.where(and(...conditions))) as Category[];
  }

  return (await query) as Category[];
}

/**
 * Get category tree structure with children
 */
export async function getCategoriesTree(db: D1Database): Promise<CategoryWithChildren[]> {
  const client = createDb(db);
  const allCategories = (await client
    .select()
    .from(categories)
    .where(eq(categories.is_active, 1))
    .orderBy(asc(categories.sort_order), asc(categories.name))) as Category[];

  // Build tree structure
  const categoryMap = new Map<string, CategoryWithChildren>();
  const rootCategories: CategoryWithChildren[] = [];

  // First pass: Create map of all categories
  allCategories.forEach((cat) => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  // Second pass: Build tree structure
  allCategories.forEach((cat) => {
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
export async function getCategoryBySlug(db: D1Database, slug: string): Promise<Category | null> {
  const client = createDb(db);
  return (await client
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .get()) as Category | null;
}

/**
 * Get category by name
 */
export async function getCategoryByName(db: D1Database, name: string): Promise<Category | null> {
  const client = createDb(db);
  return (await client
    .select()
    .from(categories)
    .where(eq(categories.name, name))
    .get()) as Category | null;
}

/**
 * Create a new category
 */
export async function createCategory(
  db: D1Database,
  data: CreateCategoryRequest
): Promise<Category> {
  const client = createDb(db);

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
    const parent = await client
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, data.parentId))
      .get();
    if (!parent) {
      throw errors.notFound('Parent category', data.parentId);
    }
  }

  const categoryId = nanoid();
  const now = new Date().toISOString();

  await client
    .insert(categories)
    .values({
      id: categoryId,
      name: data.name,
      description: data.description || null,
      slug: data.slug,
      parent_id: data.parentId || null,
      image_url: data.imageUrl || null,
      sort_order: data.sortOrder || 0,
      is_active: data.isActive !== false ? 1 : 0,
      created_at: now,
      updated_at: now,
    })
    .run();

  return getCategoryById(db, categoryId);
}

/**
 * Update a category
 */
export async function updateCategory(
  db: D1Database,
  categoryId: string,
  data: UpdateCategoryRequest
): Promise<Category> {
  const client = createDb(db);

  // Check if category exists
  const existing = await client
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .get();

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
    const parent = await client
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, data.parentId))
      .get();
    if (!parent) {
      throw errors.notFound('Parent category', data.parentId);
    }
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {};

  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.slug !== undefined) updates.slug = data.slug;
  if (data.parentId !== undefined) updates.parent_id = data.parentId;
  if (data.imageUrl !== undefined) updates.image_url = data.imageUrl;
  if (data.sortOrder !== undefined) updates.sort_order = data.sortOrder;
  if (data.isActive !== undefined) updates.is_active = data.isActive ? 1 : 0;

  if (Object.keys(updates).length > 0) {
    updates.updated_at = now;
    await client.update(categories).set(updates).where(eq(categories.id, categoryId)).run();
  }

  return getCategoryById(db, categoryId);
}

/**
 * Delete a category
 */
export async function deleteCategory(db: D1Database, categoryId: string): Promise<void> {
  const client = createDb(db);

  // Check if category exists
  const existing = await client
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .get();

  if (!existing) {
    throw errors.notFound('Category', categoryId);
  }

  // Check if category has children
  const children = await client
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parent_id, categoryId));

  if (children.length > 0) {
    throw errors.badRequest(
      'Cannot delete category with subcategories. Please delete or move subcategories first.'
    );
  }

  // Check if category has products
  const productsInCategory = await client
    .select({ id: products.id })
    .from(products)
    .where(eq(products.category_id, categoryId));

  if (productsInCategory.length > 0) {
    throw errors.badRequest(
      `Cannot delete category with ${productsInCategory.length} product(s). Please reassign or delete products first.`
    );
  }

  await client.delete(categories).where(eq(categories.id, categoryId)).run();
}

/**
 * Reorder categories
 */
export async function reorderCategories(db: D1Database, categoryIds: string[]): Promise<void> {
  const client = createDb(db);
  const now = new Date().toISOString();

  for (const [index, id] of categoryIds.entries()) {
    await client
      .update(categories)
      .set({ sort_order: index, updated_at: now })
      .where(eq(categories.id, id))
      .run();
  }
}
