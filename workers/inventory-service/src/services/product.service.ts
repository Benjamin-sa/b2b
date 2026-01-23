/**
 * Product Service
 *
 * Business logic for product management (D1 database operations only)
 *
 * NOTE: Stripe operations are handled at the API Gateway orchestration layer.
 * This service only handles D1 database operations.
 */

import { nanoid } from 'nanoid';
import { createDb, schema } from '@b2b/db';
import { and, asc, desc, eq, isNotNull, like, or, sql } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import type {
  Product,
  ProductWithRelations,
  ProductInventory,
  ProductImage,
  ProductSpecification,
  ProductDimension,
  CreateProductRequest,
  UpdateProductRequest,
  PaginatedResponse,
  ProductFilters,
  PaginationParams,
} from '../types';
import { errors } from '../utils/errors';
import { validateRequired, validatePrice } from '../utils/validation';

const {
  products,
  product_images,
  product_specifications,
  product_tags,
  product_dimensions,
  product_inventory,
} = schema;

/**
 * Generate next B2B SKU
 * Format: TP-00001, TP-00002, etc.
 *
 * Finds the highest existing SKU number and increments it.
 * If no SKUs exist, starts at TP-00001.
 */
async function getNextB2BSku(db: ReturnType<typeof createDb>): Promise<string> {
  try {
    const result = await db
      .select({ b2b_sku: products.b2b_sku })
      .from(products)
      .where(and(isNotNull(products.b2b_sku), like(products.b2b_sku, 'TP-%')))
      .orderBy(desc(products.b2b_sku))
      .limit(1)
      .get();

    if (!result || !result.b2b_sku) {
      // No existing SKUs, start at TP-00001
      return 'TP-00001';
    }

    // Extract the numeric part from format TP-00001
    const currentSku = result.b2b_sku as string;
    const numericPart = currentSku.replace('TP-', '');
    const currentNumber = parseInt(numericPart, 10);

    // Increment and pad with zeros (5 digits)
    const nextNumber = currentNumber + 1;
    const paddedNumber = nextNumber.toString().padStart(5, '0');

    return `TP-${paddedNumber}`;
  } catch (error) {
    console.error('[Product Service] Error generating B2B SKU:', error);
    // Fallback to a random SKU if query fails
    const randomNumber = Math.floor(Math.random() * 99999) + 1;
    return `TP-${randomNumber.toString().padStart(5, '0')}`;
  }
}

/**
 * Calculate EAN-13 check digit
 * Uses the standard EAN-13 checksum algorithm
 */
function calculateEAN13CheckDigit(first12Digits: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(first12Digits[i], 10);
    // Odd positions (1st, 3rd, 5th...) multiply by 1, even positions by 3
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

/**
 * Generate EAN-13 barcode
 * Format: 2XXXXXXXXXXXC (13 digits)
 * - First digit: 2 (internal product identifier)
 * - Next 11 digits: zero-padded sequential number
 * - Last digit: EAN-13 check digit
 *
 * Example: 2000000000017 (product #1 with check digit 7)
 */
async function generateBarcode(db: ReturnType<typeof createDb>): Promise<string> {
  try {
    const result = await db
      .select({ barcode: products.barcode })
      .from(products)
      .where(and(isNotNull(products.barcode), like(products.barcode, '2%')))
      .orderBy(desc(products.barcode))
      .limit(1)
      .get();

    let sequenceNumber = 1;

    if (result && result.barcode) {
      // Extract sequence number (skip first digit '2', take next 11 digits, ignore check digit)
      const existingBarcode = result.barcode as string;
      const sequencePart = existingBarcode.substring(1, 12);
      sequenceNumber = parseInt(sequencePart, 10) + 1;
    }

    // Build first 12 digits: '2' + 11-digit sequence number
    const first12 = '2' + sequenceNumber.toString().padStart(11, '0');

    // Calculate check digit
    const checkDigit = calculateEAN13CheckDigit(first12);

    // Return complete 13-digit barcode
    return first12 + checkDigit;
  } catch (error) {
    console.error('[Product Service] Error generating barcode:', error);
    // Fallback to random barcode if query fails
    const randomSeq = Math.floor(Math.random() * 99999999999) + 1;
    const first12 = '2' + randomSeq.toString().padStart(11, '0');
    const checkDigit = calculateEAN13CheckDigit(first12);
    return first12 + checkDigit;
  }
}

/**
 * Get product by ID with all relations
 */
export async function getProductById(
  db: D1Database,
  productId: string
): Promise<ProductWithRelations> {
  const client = createDb(db);

  const product = await client.select().from(products).where(eq(products.id, productId)).get();

  if (!product) {
    throw errors.notFound('Product', productId);
  }

  const [images, specifications, tags, dimensions, inventory] = await Promise.all([
    client
      .select()
      .from(product_images)
      .where(eq(product_images.product_id, productId))
      .orderBy(asc(product_images.sort_order)),
    client
      .select()
      .from(product_specifications)
      .where(eq(product_specifications.product_id, productId))
      .orderBy(asc(product_specifications.sort_order)),
    client
      .select({ tag: product_tags.tag })
      .from(product_tags)
      .where(eq(product_tags.product_id, productId)),
    client
      .select()
      .from(product_dimensions)
      .where(eq(product_dimensions.product_id, productId))
      .get(),
    client
      .select()
      .from(product_inventory)
      .where(eq(product_inventory.product_id, productId))
      .get(),
  ]);

  // Compute in_stock dynamically based on inventory.stock
  const computedInStock = inventory && inventory.stock > 0 ? 1 : 0;

  return {
    ...(product as Product),
    in_stock: computedInStock, // Override with computed value
    images: images as ProductImage[],
    specifications: specifications as ProductSpecification[],
    tags: (tags as Array<{ tag: string }>).map((tag) => tag.tag),
    dimensions: (dimensions as ProductDimension | null) || null,
    inventory: (inventory as ProductInventory | null) || undefined,
  };
}

/**
 * Get all products with pagination and filters
 * SIMPLIFIED: Uses product_inventory.stock for stock filtering
 */
export async function getProducts(
  db: D1Database,
  filters: ProductFilters,
  pagination: PaginationParams
): Promise<PaginatedResponse<ProductWithRelations>> {
  const client = createDb(db);
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = pagination;

  const conditions: any[] = [];

  if (filters.categoryId) {
    conditions.push(eq(products.category_id, filters.categoryId));
  }

  if (filters.brand) {
    conditions.push(eq(products.brand, filters.brand));
  }

  // FIXED: inStock filter now uses product_inventory.stock instead of deprecated products.in_stock
  // This is handled by always joining with product_inventory and filtering there

  if (filters.comingSoon !== undefined) {
    conditions.push(eq(products.coming_soon, filters.comingSoon ? 1 : 0));
  }

  if (filters.minPrice !== undefined) {
    conditions.push(sql`${products.price} >= ${filters.minPrice}`);
  }

  if (filters.maxPrice !== undefined) {
    conditions.push(sql`${products.price} <= ${filters.maxPrice}`);
  }

  if (filters.searchTerm) {
    const searchPattern = `%${filters.searchTerm}%`;
    conditions.push(
      or(
        like(products.name, searchPattern),
        like(products.description, searchPattern),
        like(products.brand, searchPattern),
        like(products.part_number, searchPattern),
        like(products.b2b_sku, searchPattern)
      )
    );
  }

  // Add inventory-based inStock filter
  if (filters.inStock !== undefined) {
    if (filters.inStock) {
      // Only products with stock > 0
      conditions.push(sql`COALESCE(${product_inventory.stock}, 0) > 0`);
    } else {
      // Only products with stock = 0
      conditions.push(sql`COALESCE(${product_inventory.stock}, 0) = 0`);
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumns: Record<string, any> = {
    name: products.name,
    price: products.price,
    created_at: products.created_at,
    updated_at: products.updated_at,
  };

  const offset = (page - 1) * limit;
  let productRows: any[];

  // SIMPLIFIED: Always join with product_inventory for accurate stock data
  // This fixes the "ghost stock" bug where products.in_stock was stale
  const stockSort = sql`COALESCE(${product_inventory.stock}, 0)`;
  
  if (sortBy === 'stock') {
    // Sort by stock
    let query = client
      .select()
      .from(products)
      .leftJoin(product_inventory, eq(products.id, product_inventory.product_id))
      .$dynamic();

    if (whereClause) {
      query = query.where(whereClause);
    }

    query = query.orderBy(sortOrder === 'asc' ? asc(stockSort) : desc(stockSort));

    const rows = await query.limit(limit).offset(offset);
    productRows = rows.map((row: any) => row.products);
  } else if (filters.inStock !== undefined) {
    // Need to join for inStock filter
    const sortColumn = sortColumns[sortBy] || products.created_at;
    let query = client
      .select()
      .from(products)
      .leftJoin(product_inventory, eq(products.id, product_inventory.product_id))
      .$dynamic();

    if (whereClause) {
      query = query.where(whereClause);
    }

    query = query.orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn));

    const rows = await query.limit(limit).offset(offset);
    productRows = rows.map((row: any) => row.products);
  } else {
    // Build query without join for regular sorting (no stock filter)
    const sortColumn = sortColumns[sortBy] || products.created_at;
    let query = client.select().from(products).$dynamic();

    if (whereClause) {
      query = query.where(whereClause);
    }

    query = query.orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn));

    productRows = await query.limit(limit).offset(offset);
  }

  // Count query also needs to join if there's an inStock filter
  let totalItems: number;
  if (filters.inStock !== undefined) {
    const countQuery = client
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .leftJoin(product_inventory, eq(products.id, product_inventory.product_id));
    const countRow = whereClause
      ? await countQuery.where(whereClause).get()
      : await countQuery.get();
    totalItems = countRow?.count ?? 0;
  } else {
    const countQuery = client.select({ count: sql<number>`count(*)` }).from(products);
    const countRow = whereClause
      ? await countQuery.where(whereClause).get()
      : await countQuery.get();
    totalItems = countRow?.count ?? 0;
  }
  const totalPages = Math.ceil(totalItems / limit);

  const itemsWithRelations = await Promise.all(
    (productRows as Product[]).map(async (product) => {
      const [images, specifications, tags, dimensions, inventory] = await Promise.all([
        client
          .select()
          .from(product_images)
          .where(eq(product_images.product_id, product.id))
          .orderBy(asc(product_images.sort_order)),
        client
          .select()
          .from(product_specifications)
          .where(eq(product_specifications.product_id, product.id))
          .orderBy(asc(product_specifications.sort_order)),
        client
          .select({ tag: product_tags.tag })
          .from(product_tags)
          .where(eq(product_tags.product_id, product.id)),
        client
          .select()
          .from(product_dimensions)
          .where(eq(product_dimensions.product_id, product.id))
          .get(),
        client
          .select()
          .from(product_inventory)
          .where(eq(product_inventory.product_id, product.id))
          .get(),
      ]);

      // Compute in_stock dynamically based on inventory.stock
      // This fixes the bug where products.in_stock was stale
      const computedInStock = inventory && inventory.stock > 0 ? 1 : 0;

      return {
        ...product,
        in_stock: computedInStock, // Override with computed value
        images: images as ProductImage[],
        specifications: specifications as ProductSpecification[],
        tags: (tags as Array<{ tag: string }>).map((tag) => tag.tag),
        dimensions: (dimensions as ProductDimension | null) || null,
        inventory: (inventory as ProductInventory | null) || undefined,
      };
    })
  );

  return {
    items: itemsWithRelations,
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

/**
 * Get products by category
 */
export async function getProductsByCategory(
  db: D1Database,
  categoryId: string,
  pagination: PaginationParams
): Promise<PaginatedResponse<ProductWithRelations>> {
  return getProducts(db, { categoryId }, pagination);
}

/**
 * Create a new product
 *
 * NOTE: Stripe product/price creation is handled at the API Gateway orchestration layer.
 * This function expects stripe_product_id and stripe_price_id to be passed in the request.
 */
export async function createProduct(
  db: D1Database,
  data: CreateProductRequest
): Promise<ProductWithRelations> {
  const client = createDb(db);

  // Validate required fields
  validateRequired(data, ['name', 'price']);
  validatePrice(data.price);

  // Generate ID (or use provided ID from orchestration layer)
  const productId = (data as any).id || nanoid();
  const now = new Date().toISOString();

  // Stripe IDs are passed from the orchestration layer
  const stripeProductId = data.stripe_product_id || null;
  const stripePriceId = data.stripe_price_id || null;

  // ✅ Auto-generate B2B SKU if not provided (with retry logic for constraint violations)
  let b2bSku = data.b2b_sku || null;
  if (!b2bSku) {
    let retries = 3;
    while (retries > 0) {
      try {
        b2bSku = await getNextB2BSku(client);
        break; // Success, exit retry loop
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error('[Product Service] Failed to generate B2B SKU after retries:', error);
          throw errors.internalError('Failed to generate B2B SKU');
        }
        // Wait a bit before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 100 * (4 - retries)));
      }
    }
  }

  // ✅ Auto-generate EAN-13 barcode (always generated, never provided by user)
  let barcode = '';
  let barcodeRetries = 3;
  while (barcodeRetries > 0) {
    try {
      barcode = await generateBarcode(client);
      break; // Success, exit retry loop
    } catch (error) {
      barcodeRetries--;
      if (barcodeRetries === 0) {
        console.error('[Product Service] Failed to generate barcode after retries:', error);
        throw errors.internalError('Failed to generate barcode');
      }
      // Wait a bit before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 100 * (4 - barcodeRetries)));
    }
  }

  if (!barcode) {
    throw errors.internalError('Failed to generate barcode');
  }

  await client
    .insert(products)
    .values({
      id: productId,
      name: data.name,
      description: data.description || null,
      price: data.price,
      original_price: data.original_price || null,
      image_url: data.image_url || null,
      category_id: data.category_id || null,
      in_stock: 1,
      coming_soon: data.coming_soon ? 1 : 0,
      stock: 0,
      brand: data.brand || null,
      part_number: data.part_number || null,
      b2b_sku: b2bSku,
      barcode,
      unit: data.unit || null,
      min_order_quantity: data.min_order_quantity || 1,
      max_order_quantity: data.max_order_quantity || null,
      weight: data.weight || null,
      shopify_product_id: null,
      shopify_variant_id: null,
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId,
      created_at: now,
      updated_at: now,
    })
    .run();

  // ✅ ALWAYS create inventory record with stock allocation
  // sync_enabled = 1 only when Shopify fields are provided
  const hasShopifyIntegration = !!(
    data.shopify_product_id ||
    data.shopify_variant_id ||
    data.shopify_inventory_item_id
  );

  // SIMPLIFIED: Always unified mode, Shopify is source of truth
  const stockValue = data.total_stock ?? 0;

  await client
    .insert(product_inventory)
    .values({
      product_id: productId,
      shopify_product_id: data.shopify_product_id || null,
      shopify_variant_id: data.shopify_variant_id || null,
      shopify_inventory_item_id: data.shopify_inventory_item_id || null,
      stock: stockValue,
      sync_enabled: hasShopifyIntegration ? 1 : 0,
      created_at: now,
      updated_at: now,
    })
    .run();

  // Insert images
  if (data.images && data.images.length > 0) {
    for (const [index, imageUrl] of data.images.entries()) {
      await client
        .insert(product_images)
        .values({
          id: nanoid(),
          product_id: productId,
          image_url: imageUrl,
          sort_order: index,
          created_at: now,
        })
        .run();
    }
  }

  // Insert specifications
  if (data.specifications && data.specifications.length > 0) {
    for (const [index, spec] of data.specifications.entries()) {
      await client
        .insert(product_specifications)
        .values({
          id: nanoid(),
          product_id: productId,
          spec_key: spec.key,
          spec_value: spec.value,
          sort_order: index,
        })
        .run();
    }
  }

  // Insert tags
  if (data.tags && data.tags.length > 0) {
    for (const tag of data.tags) {
      await client.insert(product_tags).values({ product_id: productId, tag }).run();
    }
  }

  // Insert dimensions
  if (data.dimensions) {
    await client
      .insert(product_dimensions)
      .values({
        product_id: productId,
        length: data.dimensions.length,
        width: data.dimensions.width,
        height: data.dimensions.height,
        unit: data.dimensions.unit || 'cm',
      })
      .run();
  }

  // Return created product
  return getProductById(db, productId);
}

/**
 * Update a product
 *
 * NOTE: Stripe updates are handled at the API Gateway orchestration layer.
 * This function only handles D1 database updates.
 */
export async function updateProduct(
  db: D1Database,
  productId: string,
  data: UpdateProductRequest
): Promise<ProductWithRelations> {
  const client = createDb(db);

  const existing = await client.select().from(products).where(eq(products.id, productId)).get();

  if (!existing) {
    throw errors.notFound('Product', productId);
  }

  if (data.price !== undefined) {
    validatePrice(data.price);
  }

  const now = new Date().toISOString();

  const productUpdates: Record<string, unknown> = {};
  if (data.name !== undefined) productUpdates.name = data.name;
  if (data.description !== undefined) productUpdates.description = data.description;
  if (data.price !== undefined) productUpdates.price = data.price;
  if (data.original_price !== undefined) productUpdates.original_price = data.original_price;
  if (data.image_url !== undefined) productUpdates.image_url = data.image_url;
  if (data.category_id !== undefined) productUpdates.category_id = data.category_id;
  if (data.in_stock !== undefined) productUpdates.in_stock = data.in_stock ? 1 : 0;
  if (data.coming_soon !== undefined) productUpdates.coming_soon = data.coming_soon ? 1 : 0;
  if (data.brand !== undefined) productUpdates.brand = data.brand;
  if (data.part_number !== undefined) productUpdates.part_number = data.part_number;
  if (data.b2b_sku !== undefined) productUpdates.b2b_sku = data.b2b_sku;
  if (data.unit !== undefined) productUpdates.unit = data.unit;
  if (data.min_order_quantity !== undefined)
    productUpdates.min_order_quantity = data.min_order_quantity;
  if (data.max_order_quantity !== undefined)
    productUpdates.max_order_quantity = data.max_order_quantity;
  if (data.weight !== undefined) productUpdates.weight = data.weight;
  if (data.stripe_product_id !== undefined)
    productUpdates.stripe_product_id = data.stripe_product_id;
  if (data.stripe_price_id !== undefined) productUpdates.stripe_price_id = data.stripe_price_id;

  if (Object.keys(productUpdates).length > 0) {
    productUpdates.updated_at = now;
    await client.update(products).set(productUpdates).where(eq(products.id, productId)).run();
  }

  // SIMPLIFIED: Stock updates now use single 'stock' column (Shopify is source of truth)
  const inventoryUpdates: Record<string, unknown> = {};

  if (data.shopify_product_id !== undefined)
    inventoryUpdates.shopify_product_id = data.shopify_product_id;
  if (data.shopify_variant_id !== undefined)
    inventoryUpdates.shopify_variant_id = data.shopify_variant_id;
  if (data.shopify_inventory_item_id !== undefined)
    inventoryUpdates.shopify_inventory_item_id = data.shopify_inventory_item_id;
  
  // SIMPLIFIED: Use 'stock' as the only field
  if (data.total_stock !== undefined) {
    inventoryUpdates.stock = data.total_stock;
  }

  const inventoryExists = await client
    .select({ product_id: product_inventory.product_id })
    .from(product_inventory)
    .where(eq(product_inventory.product_id, productId))
    .get();

  const hasShopifyIntegration = !!(
    data.shopify_product_id ||
    data.shopify_variant_id ||
    data.shopify_inventory_item_id
  );

  const touchedShopifyFields =
    data.shopify_product_id !== undefined ||
    data.shopify_variant_id !== undefined ||
    data.shopify_inventory_item_id !== undefined;

  if (inventoryExists) {
    if (Object.keys(inventoryUpdates).length > 0 || touchedShopifyFields) {
      if (touchedShopifyFields) {
        inventoryUpdates.sync_enabled = hasShopifyIntegration ? 1 : 0;
      }
      inventoryUpdates.updated_at = now;
      await client
        .update(product_inventory)
        .set(inventoryUpdates)
        .where(eq(product_inventory.product_id, productId))
        .run();
    }
  } else {
    // SIMPLIFIED: New inventory
    const stockValue = data.total_stock ?? 0;

    await client
      .insert(product_inventory)
      .values({
        product_id: productId,
        shopify_product_id: data.shopify_product_id || null,
        shopify_variant_id: data.shopify_variant_id || null,
        shopify_inventory_item_id: data.shopify_inventory_item_id || null,
        stock: stockValue,
        sync_enabled: hasShopifyIntegration ? 1 : 0,
        created_at: now,
        updated_at: now,
      })
      .run();
  }

  if (data.images !== undefined) {
    await client.delete(product_images).where(eq(product_images.product_id, productId)).run();
    for (const [index, imageUrl] of data.images.entries()) {
      await client
        .insert(product_images)
        .values({
          id: nanoid(),
          product_id: productId,
          image_url: imageUrl,
          sort_order: index,
          created_at: now,
        })
        .run();
    }
  }

  if (data.specifications !== undefined) {
    await client
      .delete(product_specifications)
      .where(eq(product_specifications.product_id, productId))
      .run();
    for (const [index, spec] of data.specifications.entries()) {
      await client
        .insert(product_specifications)
        .values({
          id: nanoid(),
          product_id: productId,
          spec_key: spec.key,
          spec_value: spec.value,
          sort_order: index,
        })
        .run();
    }
  }

  if (data.tags !== undefined) {
    await client.delete(product_tags).where(eq(product_tags.product_id, productId)).run();
    for (const tag of data.tags) {
      await client.insert(product_tags).values({ product_id: productId, tag }).run();
    }
  }

  if (data.dimensions !== undefined) {
    await client
      .delete(product_dimensions)
      .where(eq(product_dimensions.product_id, productId))
      .run();
    await client
      .insert(product_dimensions)
      .values({
        product_id: productId,
        length: data.dimensions.length,
        width: data.dimensions.width,
        height: data.dimensions.height,
        unit: data.dimensions.unit || 'cm',
      })
      .run();
  }

  return getProductById(db, productId);
}

/**
 * Delete a product
 *
 * NOTE: Stripe archival is handled at the API Gateway orchestration layer.
 * This function only handles D1 database deletion.
 */
export async function deleteProduct(db: D1Database, productId: string): Promise<void> {
  const client = createDb(db);

  const existing = await client.select().from(products).where(eq(products.id, productId)).get();

  if (!existing) {
    throw errors.notFound('Product', productId);
  }

  await client.delete(product_images).where(eq(product_images.product_id, productId)).run();
  await client
    .delete(product_specifications)
    .where(eq(product_specifications.product_id, productId))
    .run();
  await client.delete(product_tags).where(eq(product_tags.product_id, productId)).run();
  await client.delete(product_dimensions).where(eq(product_dimensions.product_id, productId)).run();
  await client.delete(product_inventory).where(eq(product_inventory.product_id, productId)).run();
  await client.delete(products).where(eq(products.id, productId)).run();
}
