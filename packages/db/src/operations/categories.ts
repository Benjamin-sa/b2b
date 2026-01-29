import { eq, like, or, sql, asc, isNull, and } from 'drizzle-orm';
import { categories, products } from '../schema';
import type { DbClient } from '../db';
import type { Category, NewCategory } from '../types';

// ============================================================================
// CATEGORY CRUD
// ============================================================================

export async function getCategoryById(
  db: DbClient,
  categoryId: string
): Promise<Category | undefined> {
  return db.select().from(categories).where(eq(categories.id, categoryId)).get();
}

export async function getCategoryBySlug(db: DbClient, slug: string): Promise<Category | undefined> {
  return db.select().from(categories).where(eq(categories.slug, slug)).get();
}

export async function createCategory(
  db: DbClient,
  data: NewCategory
): Promise<Category | undefined> {
  await db.insert(categories).values(data).run();
  return getCategoryById(db, data.id);
}

export async function updateCategory(
  db: DbClient,
  categoryId: string,
  data: Partial<Omit<Category, 'id' | 'created_at'>>
): Promise<Category | undefined> {
  await db
    .update(categories)
    .set({ ...data, updated_at: new Date().toISOString() })
    .where(eq(categories.id, categoryId))
    .run();
  return getCategoryById(db, categoryId);
}

export async function deleteCategory(db: DbClient, categoryId: string): Promise<void> {
  // Update products to remove category reference
  await db
    .update(products)
    .set({ category_id: null, updated_at: new Date().toISOString() })
    .where(eq(products.category_id, categoryId))
    .run();

  // Update child categories to remove parent reference
  await db
    .update(categories)
    .set({ parent_id: null, updated_at: new Date().toISOString() })
    .where(eq(categories.parent_id, categoryId))
    .run();

  // Delete category
  await db.delete(categories).where(eq(categories.id, categoryId)).run();
}

// ============================================================================
// CATEGORY LISTING
// ============================================================================

export interface GetCategoriesOptions {
  limit?: number;
  offset?: number;
  search?: string;
  parentId?: string | null;
  activeOnly?: boolean;
}

export interface GetCategoriesResult {
  categories: Category[];
  total: number;
}

export async function getCategories(
  db: DbClient,
  options: GetCategoriesOptions = {}
): Promise<GetCategoriesResult> {
  const { limit = 100, offset = 0, search, parentId, activeOnly = false } = options;

  const conditions: ReturnType<typeof eq>[] = [];

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(like(categories.name, searchPattern), like(categories.description, searchPattern))!
    );
  }

  if (parentId !== undefined) {
    if (parentId === null) {
      conditions.push(isNull(categories.parent_id));
    } else {
      conditions.push(eq(categories.parent_id, parentId));
    }
  }

  if (activeOnly) {
    conditions.push(eq(categories.is_active, 1));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [categoriesList, countResult] = await Promise.all([
    whereClause
      ? db
          .select()
          .from(categories)
          .where(whereClause)
          .orderBy(asc(categories.sort_order), asc(categories.name))
          .limit(limit)
          .offset(offset)
      : db
          .select()
          .from(categories)
          .orderBy(asc(categories.sort_order), asc(categories.name))
          .limit(limit)
          .offset(offset),
    whereClause
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(categories)
          .where(whereClause)
          .get()
      : db
          .select({ count: sql<number>`count(*)` })
          .from(categories)
          .get(),
  ]);

  return {
    categories: categoriesList,
    total: countResult?.count || 0,
  };
}

export async function getRootCategories(db: DbClient, activeOnly = true): Promise<Category[]> {
  const conditions = [isNull(categories.parent_id)];
  if (activeOnly) {
    conditions.push(eq(categories.is_active, 1));
  }

  return db
    .select()
    .from(categories)
    .where(and(...conditions))
    .orderBy(asc(categories.sort_order), asc(categories.name));
}

export async function getChildCategories(
  db: DbClient,
  parentId: string,
  activeOnly = true
): Promise<Category[]> {
  const conditions = [eq(categories.parent_id, parentId)];
  if (activeOnly) {
    conditions.push(eq(categories.is_active, 1));
  }

  return db
    .select()
    .from(categories)
    .where(and(...conditions))
    .orderBy(asc(categories.sort_order), asc(categories.name));
}

export async function getAllCategories(db: DbClient, activeOnly = true): Promise<Category[]> {
  if (activeOnly) {
    return db
      .select()
      .from(categories)
      .where(eq(categories.is_active, 1))
      .orderBy(asc(categories.sort_order), asc(categories.name));
  }
  return db.select().from(categories).orderBy(asc(categories.sort_order), asc(categories.name));
}

// ============================================================================
// CATEGORY TREE
// ============================================================================

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
  productCount: number;
}

export async function getCategoryTree(
  db: DbClient,
  activeOnly = true
): Promise<CategoryTreeNode[]> {
  const allCategories = await getAllCategories(db, activeOnly);

  // Get product counts per category
  const productCounts = await db
    .select({
      category_id: products.category_id,
      count: sql<number>`count(*)`,
    })
    .from(products)
    .groupBy(products.category_id);

  const countMap = new Map(
    productCounts.filter((p) => p.category_id !== null).map((p) => [p.category_id!, p.count])
  );

  // Build tree
  const categoryMap = new Map<string, CategoryTreeNode>();
  const rootCategories: CategoryTreeNode[] = [];

  // First pass: create nodes
  for (const cat of allCategories) {
    categoryMap.set(cat.id, {
      ...cat,
      children: [],
      productCount: countMap.get(cat.id) || 0,
    });
  }

  // Second pass: build tree
  for (const cat of allCategories) {
    const node = categoryMap.get(cat.id)!;
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      categoryMap.get(cat.parent_id)!.children.push(node);
    } else {
      rootCategories.push(node);
    }
  }

  return rootCategories;
}

// ============================================================================
// CATEGORY UTILITIES
// ============================================================================

export async function getCategoryPath(db: DbClient, categoryId: string): Promise<Category[]> {
  const path: Category[] = [];
  let currentId: string | null = categoryId;

  while (currentId) {
    const category = await getCategoryById(db, currentId);
    if (!category) break;
    path.unshift(category);
    currentId = category.parent_id;
  }

  return path;
}

export async function getCategoryProductCount(db: DbClient, categoryId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(eq(products.category_id, categoryId))
    .get();
  return result?.count || 0;
}

export async function updateCategoryOrder(
  db: DbClient,
  categoryId: string,
  sortOrder: number
): Promise<void> {
  await db
    .update(categories)
    .set({ sort_order: sortOrder, updated_at: new Date().toISOString() })
    .where(eq(categories.id, categoryId))
    .run();
}

export async function toggleCategoryActive(
  db: DbClient,
  categoryId: string,
  isActive: boolean
): Promise<Category | undefined> {
  await db
    .update(categories)
    .set({ is_active: isActive ? 1 : 0, updated_at: new Date().toISOString() })
    .where(eq(categories.id, categoryId))
    .run();
  return getCategoryById(db, categoryId);
}
