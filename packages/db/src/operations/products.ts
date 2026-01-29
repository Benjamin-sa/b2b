import { eq, like, or, sql, desc, inArray, and, isNotNull, gt, getTableColumns } from 'drizzle-orm';
import {
  products,
  product_images,
  product_specifications,
  product_tags,
  product_dimensions,
  product_inventory,
} from '../schema';
import type { DbClient } from '../db';
import type {
  Product,
  NewProduct,
  ProductImage,
  NewProductImage,
  ProductSpecification,
  NewProductSpecification,
  ProductTag,
  ProductDimension,
  NewProductDimension,
  ProductInventory,
} from '../types';

// ============================================================================
// PRODUCT CRUD
// ============================================================================

export async function getProductById(
  db: DbClient,
  productId: string
): Promise<Product | undefined> {
  const result = await db
    .select({
      ...getTableColumns(products),
      inventory: product_inventory,
    })
    .from(products)
    .leftJoin(product_inventory, eq(products.id, product_inventory.product_id))
    .where(eq(products.id, productId))
    .get();

  return result as Product | undefined;
}

export async function getProductByPartNumber(
  db: DbClient,
  partNumber: string
): Promise<Product | undefined> {
  return db.select().from(products).where(eq(products.part_number, partNumber)).get();
}

export async function getProductByB2bSku(
  db: DbClient,
  b2bSku: string
): Promise<Product | undefined> {
  return db.select().from(products).where(eq(products.b2b_sku, b2bSku)).get();
}

export async function getProductByBarcode(
  db: DbClient,
  barcode: string
): Promise<Product | undefined> {
  return db.select().from(products).where(eq(products.barcode, barcode)).get();
}

export async function getProductByShopifyVariantId(
  db: DbClient,
  shopifyVariantId: string
): Promise<Product | undefined> {
  const result = await db
    .select({
      ...getTableColumns(products),
      inventory: product_inventory,
    })
    .from(products)
    .innerJoin(product_inventory, eq(products.id, product_inventory.product_id))
    .where(eq(product_inventory.shopify_variant_id, shopifyVariantId))
    .get();

  return result as Product | undefined;
}

export async function createProduct(db: DbClient, data: NewProduct): Promise<Product | undefined> {
  await db.insert(products).values(data).run();
  return getProductById(db, data.id);
}

export async function updateProduct(
  db: DbClient,
  productId: string,
  data: Partial<Omit<Product, 'id' | 'created_at'>>
): Promise<Product | undefined> {
  await db
    .update(products)
    .set({ ...data, updated_at: new Date().toISOString() })
    .where(eq(products.id, productId))
    .run();
  return getProductById(db, productId);
}

export async function deleteProduct(db: DbClient, productId: string): Promise<void> {
  // Delete related data first
  await db.delete(product_images).where(eq(product_images.product_id, productId)).run();
  await db
    .delete(product_specifications)
    .where(eq(product_specifications.product_id, productId))
    .run();
  await db.delete(product_tags).where(eq(product_tags.product_id, productId)).run();
  await db.delete(product_dimensions).where(eq(product_dimensions.product_id, productId)).run();
  await db.delete(product_inventory).where(eq(product_inventory.product_id, productId)).run();
  // Delete product
  await db.delete(products).where(eq(products.id, productId)).run();
}

export interface GetProductsOptions {
  limit?: number;
  offset?: number;
  search?: string;
  categoryId?: string;
  inStockOnly?: boolean;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface GetProductsResult {
  products: Product[];
  total: number;
}

export async function getProducts(
  db: DbClient,
  options: GetProductsOptions = {}
): Promise<GetProductsResult> {
  const {
    limit = 50,
    offset = 0,
    search,
    categoryId,
    inStockOnly,
    brand,
    minPrice,
    maxPrice,
  } = options;

  const conditions: ReturnType<typeof eq>[] = [];

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        like(products.name, searchPattern),
        like(products.description, searchPattern),
        like(products.part_number, searchPattern),
        like(products.b2b_sku, searchPattern),
        like(products.brand, searchPattern)
      )!
    );
  }

  if (categoryId) {
    conditions.push(eq(products.category_id, categoryId));
  }

  if (inStockOnly) {
    conditions.push(gt(product_inventory.stock, 0));
  }

  if (brand) {
    conditions.push(eq(products.brand, brand));
  }

  if (minPrice !== undefined) {
    conditions.push(sql`${products.price} >= ${minPrice}`);
  }

  if (maxPrice !== undefined) {
    conditions.push(sql`${products.price} <= ${maxPrice}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const baseQuery = db
    .select({
      ...getTableColumns(products),
      inventory: product_inventory,
    })
    .from(products)
    .leftJoin(product_inventory, eq(products.id, product_inventory.product_id));

  const [productsList, countResult] = await Promise.all([
    whereClause
      ? baseQuery.where(whereClause).orderBy(desc(products.created_at)).limit(limit).offset(offset)
      : baseQuery.orderBy(desc(products.created_at)).limit(limit).offset(offset),
    whereClause
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(products)
          .leftJoin(product_inventory, eq(products.id, product_inventory.product_id))
          .where(whereClause)
          .get()
      : db
          .select({ count: sql<number>`count(*)` })
          .from(products)
          .get(),
  ]);

  return {
    products: productsList as Product[],
    total: countResult?.count || 0,
  };
}

export async function getProductsByIds(db: DbClient, productIds: string[]): Promise<Product[]> {
  if (productIds.length === 0) return [];
  return db
    .select({
      ...getTableColumns(products),
      inventory: product_inventory,
    })
    .from(products)
    .leftJoin(product_inventory, eq(products.id, product_inventory.product_id))
    .where(inArray(products.id, productIds)) as unknown as Product[];
}

export async function getProductsByCategory(
  db: DbClient,
  categoryId: string,
  limit = 50,
  offset = 0
): Promise<Product[]> {
  return db
    .select({
      ...getTableColumns(products),
      inventory: product_inventory,
    })
    .from(products)
    .leftJoin(product_inventory, eq(products.id, product_inventory.product_id))
    .where(eq(products.category_id, categoryId))
    .orderBy(desc(products.created_at))
    .limit(limit)
    .offset(offset) as unknown as Product[];
}

export async function getProductsWithInventory(
  db: DbClient,
  options: GetProductsOptions = {}
): Promise<(Product & { inventory: ProductInventory | null })[]> {
  const { limit = 50, offset = 0, categoryId, inStockOnly } = options;

  const conditions: ReturnType<typeof eq>[] = [];

  if (categoryId) {
    conditions.push(eq(products.category_id, categoryId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let query = db
    .select({
      product: products,
      inventory: product_inventory,
    })
    .from(products)
    .leftJoin(product_inventory, eq(products.id, product_inventory.product_id))
    .$dynamic();

  if (whereClause) {
    query = query.where(whereClause);
  }

  if (inStockOnly) {
    query = query.where(gt(product_inventory.stock, 0));
  }

  const results = await query.orderBy(desc(products.created_at)).limit(limit).offset(offset);

  return results.map((r) => ({
    ...r.product,
    inventory: r.inventory,
  }));
}

// ============================================================================
// PRODUCT IMAGES
// ============================================================================

export async function getProductImages(db: DbClient, productId: string): Promise<ProductImage[]> {
  return db
    .select()
    .from(product_images)
    .where(eq(product_images.product_id, productId))
    .orderBy(product_images.sort_order);
}

export async function addProductImage(db: DbClient, data: NewProductImage): Promise<void> {
  await db.insert(product_images).values(data).run();
}

export async function deleteProductImage(db: DbClient, imageId: string): Promise<void> {
  await db.delete(product_images).where(eq(product_images.id, imageId)).run();
}

export async function deleteProductImages(db: DbClient, productId: string): Promise<void> {
  await db.delete(product_images).where(eq(product_images.product_id, productId)).run();
}

export async function updateProductImageOrder(
  db: DbClient,
  imageId: string,
  sortOrder: number
): Promise<void> {
  await db
    .update(product_images)
    .set({ sort_order: sortOrder })
    .where(eq(product_images.id, imageId))
    .run();
}

// ============================================================================
// PRODUCT SPECIFICATIONS
// ============================================================================

export async function getProductSpecifications(
  db: DbClient,
  productId: string
): Promise<ProductSpecification[]> {
  return db
    .select()
    .from(product_specifications)
    .where(eq(product_specifications.product_id, productId))
    .orderBy(product_specifications.sort_order);
}

export async function addProductSpecification(
  db: DbClient,
  data: NewProductSpecification
): Promise<void> {
  await db.insert(product_specifications).values(data).run();
}

export async function updateProductSpecification(
  db: DbClient,
  specId: string,
  data: Partial<Omit<ProductSpecification, 'id' | 'product_id'>>
): Promise<void> {
  await db
    .update(product_specifications)
    .set(data)
    .where(eq(product_specifications.id, specId))
    .run();
}

export async function deleteProductSpecification(db: DbClient, specId: string): Promise<void> {
  await db.delete(product_specifications).where(eq(product_specifications.id, specId)).run();
}

export async function deleteProductSpecifications(db: DbClient, productId: string): Promise<void> {
  await db
    .delete(product_specifications)
    .where(eq(product_specifications.product_id, productId))
    .run();
}

// ============================================================================
// PRODUCT TAGS
// ============================================================================

export async function getProductTags(db: DbClient, productId: string): Promise<ProductTag[]> {
  return db.select().from(product_tags).where(eq(product_tags.product_id, productId));
}

export async function addProductTag(db: DbClient, productId: string, tag: string): Promise<void> {
  await db.insert(product_tags).values({ product_id: productId, tag }).run();
}

export async function deleteProductTag(
  db: DbClient,
  productId: string,
  tag: string
): Promise<void> {
  await db
    .delete(product_tags)
    .where(and(eq(product_tags.product_id, productId), eq(product_tags.tag, tag)))
    .run();
}

export async function setProductTags(
  db: DbClient,
  productId: string,
  tags: string[]
): Promise<void> {
  // Delete existing tags
  await db.delete(product_tags).where(eq(product_tags.product_id, productId)).run();
  // Insert new tags
  if (tags.length > 0) {
    await db
      .insert(product_tags)
      .values(tags.map((tag) => ({ product_id: productId, tag })))
      .run();
  }
}

// ============================================================================
// PRODUCT DIMENSIONS
// ============================================================================

export async function getProductDimensions(
  db: DbClient,
  productId: string
): Promise<ProductDimension | undefined> {
  return db
    .select()
    .from(product_dimensions)
    .where(eq(product_dimensions.product_id, productId))
    .get();
}

export async function setProductDimensions(db: DbClient, data: NewProductDimension): Promise<void> {
  await db
    .insert(product_dimensions)
    .values(data)
    .onConflictDoUpdate({
      target: product_dimensions.product_id,
      set: {
        length: data.length,
        width: data.width,
        height: data.height,
        unit: data.unit,
      },
    })
    .run();
}

export async function deleteProductDimensions(db: DbClient, productId: string): Promise<void> {
  await db.delete(product_dimensions).where(eq(product_dimensions.product_id, productId)).run();
}

// ============================================================================
// PRODUCT WITH FULL DETAILS
// ============================================================================

export interface ProductWithDetails extends Product {
  images: ProductImage[];
  specifications: ProductSpecification[];
  /** Tags as string array (transformed from ProductTag objects) */
  tags: string[];
  dimensions: ProductDimension | null;
  inventory: ProductInventory | null;
}

export async function getProductWithDetails(
  db: DbClient,
  productId: string
): Promise<ProductWithDetails | null> {
  const product = await getProductById(db, productId);
  if (!product) return null;

  const [images, specifications, tagObjects, dimensions, inventory] = await Promise.all([
    getProductImages(db, productId),
    getProductSpecifications(db, productId),
    getProductTags(db, productId),
    getProductDimensions(db, productId),
    db.select().from(product_inventory).where(eq(product_inventory.product_id, productId)).get(),
  ]);

  // Transform tags from objects to strings
  const tags = tagObjects.map((t) => t.tag);

  return {
    ...product,
    images,
    specifications,
    tags,
    dimensions: dimensions || null,
    inventory: inventory || null,
  };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export async function bulkUpdateProducts(
  db: DbClient,
  updates: { id: string; data: Partial<Omit<Product, 'id' | 'created_at'>> }[]
): Promise<void> {
  const now = new Date().toISOString();
  for (const { id, data } of updates) {
    await db
      .update(products)
      .set({ ...data, updated_at: now })
      .where(eq(products.id, id))
      .run();
  }
}

export async function getProductBrands(db: DbClient): Promise<string[]> {
  const results = await db
    .selectDistinct({ brand: products.brand })
    .from(products)
    .where(isNotNull(products.brand));
  return results.map((r) => r.brand).filter((b): b is string => b !== null);
}
