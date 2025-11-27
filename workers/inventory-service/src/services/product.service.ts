/**
 * Product Service
 * 
 * Business logic for product management (D1 database operations only)
 * 
 * NOTE: Stripe operations are handled at the API Gateway orchestration layer.
 * This service only handles D1 database operations.
 */

import { nanoid } from 'nanoid';
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
import { getOne, getOneOrNull, getMany, getPaginated, batch } from '../utils/database';
import { errors } from '../utils/errors';
import { validateRequired, validatePrice } from '../utils/validation';
import { buildUpdateQuery, buildFieldUpdates, boolToInt } from '../utils/query-builder';

/**
 * Get product by ID with all relations
 */
export async function getProductById(
  db: any,
  productId: string
): Promise<ProductWithRelations> {
  // Get product
  const product = await getOne<Product>(
    db,
    'SELECT * FROM products WHERE id = ?',
    [productId]
  );

  // Get related data (including inventory from product_inventory table)
  const [images, specifications, tags, dimensions, inventory] = await Promise.all([
    getMany(db, 'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order', [
      productId,
    ]),
    getMany(
      db,
      'SELECT * FROM product_specifications WHERE product_id = ? ORDER BY sort_order',
      [productId]
    ),
    getMany(db, 'SELECT tag FROM product_tags WHERE product_id = ?', [productId]),
    getOneOrNull(db, 'SELECT * FROM product_dimensions WHERE product_id = ?', [productId]),
    // ✅ CRITICAL: Fetch inventory from product_inventory table (single source of truth)
    getOneOrNull(db, 'SELECT * FROM product_inventory WHERE product_id = ?', [productId]),
  ]);

  return {
    ...product,
    images: images as ProductImage[],
    specifications: specifications as ProductSpecification[],
    tags: tags.map((t: any) => t.tag),
    dimensions: dimensions as ProductDimension | null,
    inventory: (inventory as ProductInventory | null) || undefined, // Include inventory data
  };
}

/**
 * Get all products with pagination and filters
 */
export async function getProducts(
  db: any,
  filters: ProductFilters,
  pagination: PaginationParams
): Promise<PaginatedResponse<ProductWithRelations>> {
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = pagination;

  // Build WHERE clause
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.categoryId) {
    conditions.push('p.category_id = ?');
    params.push(filters.categoryId);
  }

  if (filters.brand) {
    conditions.push('p.brand = ?');
    params.push(filters.brand);
  }

  if (filters.inStock !== undefined) {
    conditions.push('p.in_stock = ?');
    params.push(filters.inStock ? 1 : 0);
  }

  if (filters.comingSoon !== undefined) {
    conditions.push('p.coming_soon = ?');
    params.push(filters.comingSoon ? 1 : 0);
  }

  if (filters.minPrice !== undefined) {
    conditions.push('p.price >= ?');
    params.push(filters.minPrice);
  }

  if (filters.maxPrice !== undefined) {
    conditions.push('p.price <= ?');
    params.push(filters.maxPrice);
  }

  if (filters.searchTerm) {
    conditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)');
    const searchPattern = `%${filters.searchTerm}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // ✅ CRITICAL: When sorting by stock, use product_inventory.b2b_stock (not deprecated products.stock)
  // Always LEFT JOIN with product_inventory to ensure we can sort by actual inventory
  let sortField = sortBy;
  let fromClause = 'FROM products p';
  
  if (sortBy === 'stock') {
    // Join with product_inventory and sort by b2b_stock
    fromClause = 'FROM products p LEFT JOIN product_inventory i ON p.id = i.product_id';
    sortField = 'COALESCE(i.b2b_stock, 0)'; // Use b2b_stock, default to 0 if no inventory record
  } else {
    // Prefix sort field with table alias for consistency
    sortField = `p.${sortBy}`;
  }

  // Build queries
  const baseQuery = `SELECT p.* ${fromClause} ${whereClause} ORDER BY ${sortField} ${sortOrder}`;
  const countQuery = `SELECT COUNT(*) as count ${fromClause} ${whereClause}`;

  // Get paginated results
  const result = await getPaginated<Product>(db, baseQuery, countQuery, params, page, limit);

  // Get related data for each product
  const itemsWithRelations = await Promise.all(
    result.items.map(async (product) => {
      const [images, specifications, tags, dimensions, inventory] = await Promise.all([
        getMany(db, 'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order', [
          product.id,
        ]),
        getMany(
          db,
          'SELECT * FROM product_specifications WHERE product_id = ? ORDER BY sort_order',
          [product.id]
        ),
        getMany(db, 'SELECT tag FROM product_tags WHERE product_id = ?', [product.id]),
        getOneOrNull(db, 'SELECT * FROM product_dimensions WHERE product_id = ?', [
          product.id,
        ]),
        // ✅ CRITICAL: Fetch inventory from product_inventory table (single source of truth)
        getOneOrNull(db, 'SELECT * FROM product_inventory WHERE product_id = ?', [product.id]),
      ]);

      return {
        ...product,
        images: images as ProductImage[],
        specifications: specifications as ProductSpecification[],
        tags: tags.map((t: any) => t.tag),
        dimensions: dimensions as ProductDimension | null,
        inventory: (inventory as ProductInventory | null) || undefined, // Include inventory data
      };
    })
  );

  return {
    items: itemsWithRelations,
    pagination: {
      currentPage: result.currentPage,
      pageSize: limit,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage,
      hasPreviousPage: result.hasPreviousPage,
    },
  };
}

/**
 * Get products by category
 */
export async function getProductsByCategory(
  db: any,
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
  db: any,
  data: CreateProductRequest
): Promise<ProductWithRelations> {
  // Validate required fields
  validateRequired(data, ['name', 'price']);
  validatePrice(data.price);

  // Generate ID (or use provided ID from orchestration layer)
  const productId = (data as any).id || nanoid();
  const now = new Date().toISOString();

  // Stripe IDs are passed from the orchestration layer
  const stripeProductId = data.stripe_product_id || null;
  const stripePriceId = data.stripe_price_id || null;

  // Prepare statements
  const statements: any[] = [];

  // Insert product (DEPRECATED columns: stock, in_stock, shopify_product_id, shopify_variant_id)
  // These are kept for backwards compatibility but should NOT be used
  statements.push(
    db
      .prepare(
        `INSERT INTO products (
        id, name, description, price, original_price, image_url, category_id,
        in_stock, coming_soon, stock, brand, part_number, unit,
        min_order_quantity, max_order_quantity, weight,
        shopify_product_id, shopify_variant_id, stripe_product_id, stripe_price_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        productId,
        data.name,
        data.description || null,
        data.price,
        data.original_price || null,
        data.image_url || null,
        data.category_id || null,
        1, // DEPRECATED: in_stock - always 1, use product_inventory instead
        data.coming_soon ? 1 : 0,
        0, // DEPRECATED: stock - always 0, use product_inventory instead
        data.brand || null,
        data.part_number || null,
        data.unit || null,
        data.min_order_quantity || 1,
        data.max_order_quantity || null,
        data.weight || null,
        null, // DEPRECATED: shopify_product_id - use product_inventory instead
        null, // DEPRECATED: shopify_variant_id - use product_inventory instead
        stripeProductId,
        stripePriceId,
        now,
        now
      )
  );

  // ✅ ALWAYS create inventory record with stock allocation
  // sync_enabled = 1 only when Shopify fields are provided
  const hasShopifyIntegration = !!(
    data.shopify_product_id || 
    data.shopify_variant_id || 
    data.shopify_inventory_item_id
  );

  // Determine stock mode (default to 'split')
  const stockMode = data.stock_mode || 'split';

  // Extract stock values from request (sent from ProductForm)
  const totalStock = data.total_stock ?? 0;
  
  // In unified mode: b2b_stock = total_stock, b2c_stock = 0 (Shopify syncs total_stock directly)
  // In split mode: use provided values
  let b2bStock: number;
  let b2cStock: number;
  
  if (stockMode === 'unified') {
    b2bStock = totalStock;
    b2cStock = 0;
  } else {
    b2bStock = data.b2b_stock ?? 0;
    b2cStock = data.b2c_stock ?? 0;
  }

  statements.push(
    db
      .prepare(
        `INSERT INTO product_inventory (
        product_id, shopify_product_id, shopify_variant_id, shopify_inventory_item_id,
        total_stock, b2b_stock, b2c_stock, reserved_stock,
        stock_mode, sync_enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        productId,
        data.shopify_product_id || null,
        data.shopify_variant_id || null,
        data.shopify_inventory_item_id || null,
        totalStock,
        b2bStock,
        b2cStock,
        0, // reserved_stock starts at 0
        stockMode,
        hasShopifyIntegration ? 1 : 0, // Enable sync only when Shopify codes exist
        now,
        now
      )
  );

  // Insert images
  if (data.images && data.images.length > 0) {
    data.images.forEach((imageUrl, index) => {
      statements.push(
        db
          .prepare(
            'INSERT INTO product_images (id, product_id, image_url, sort_order, created_at) VALUES (?, ?, ?, ?, ?)'
          )
          .bind(nanoid(), productId, imageUrl, index, now)
      );
    });
  }

  // Insert specifications
  if (data.specifications && data.specifications.length > 0) {
    data.specifications.forEach((spec, index) => {
      statements.push(
        db
          .prepare(
            'INSERT INTO product_specifications (id, product_id, spec_key, spec_value, sort_order) VALUES (?, ?, ?, ?, ?)'
          )
          .bind(nanoid(), productId, spec.key, spec.value, index)
      );
    });
  }

  // Insert tags
  if (data.tags && data.tags.length > 0) {
    data.tags.forEach((tag) => {
      statements.push(
        db
          .prepare('INSERT INTO product_tags (product_id, tag) VALUES (?, ?)')
          .bind(productId, tag)
      );
    });
  }

  // Insert dimensions
  if (data.dimensions) {
    statements.push(
      db
        .prepare(
          'INSERT INTO product_dimensions (product_id, length, width, height, unit) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(
          productId,
          data.dimensions.length,
          data.dimensions.width,
          data.dimensions.height,
          data.dimensions.unit || 'cm'
        )
    );
  }

  // Execute batch
  await batch(db, statements);

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
  db: any,
  productId: string,
  data: UpdateProductRequest
): Promise<ProductWithRelations> {
  // Check if product exists and get current data
  const existing = await getOneOrNull<Product>(
    db,
    'SELECT * FROM products WHERE id = ?',
    [productId]
  );

  if (!existing) {
    throw errors.notFound('Product', productId);
  }

  // Validate data
  if (data.price !== undefined) {
    validatePrice(data.price);
  }

  const now = new Date().toISOString();
  const statements: any[] = [];

  // NOTE: Stripe updates are handled at the API Gateway orchestration layer.
  // If a new stripe_price_id is passed from orchestration (due to price change),
  // it will be included in the data and updated below.

  // ============================================================================
  // UPDATE PRODUCTS TABLE
  // ============================================================================
  const productUpdates = buildFieldUpdates({
    name: data.name,
    description: data.description,
    price: data.price,
    original_price: data.original_price,
    image_url: data.image_url,
    category_id: data.category_id,
    in_stock: boolToInt(data.in_stock),
    coming_soon: boolToInt(data.coming_soon),
    brand: data.brand,
    part_number: data.part_number,
    unit: data.unit,
    min_order_quantity: data.min_order_quantity,
    max_order_quantity: data.max_order_quantity,
    weight: data.weight,
    stripe_product_id: data.stripe_product_id,
    stripe_price_id: data.stripe_price_id,
    updated_at: now,
  });

  // NOTE: shopify_product_id and shopify_variant_id are DEPRECATED in products table
  // They should NOT be updated here - use product_inventory table instead

  if (Object.keys(productUpdates).length > 0) {
    const { sql, params } = buildUpdateQuery('products', productUpdates, 'id = ?', [productId]);
    statements.push(db.prepare(sql).bind(...params));
  }

  // ============================================================================
  // UPDATE PRODUCT_INVENTORY TABLE (Shopify fields + Stock allocation)
  // ============================================================================
  
  // Determine stock mode - use provided value or keep existing
  const stockMode = data.stock_mode;
  
  // Build inventory updates
  const inventoryUpdates = buildFieldUpdates({
    shopify_product_id: data.shopify_product_id,
    shopify_variant_id: data.shopify_variant_id,
    shopify_inventory_item_id: data.shopify_inventory_item_id,
    total_stock: data.total_stock,
    // In unified mode: b2b_stock = total_stock, b2c_stock = 0
    // In split mode: use provided values
    b2b_stock: stockMode === 'unified' && data.total_stock !== undefined 
      ? data.total_stock 
      : data.b2b_stock,
    b2c_stock: stockMode === 'unified' 
      ? 0 
      : data.b2c_stock,
    stock_mode: stockMode,
    updated_at: now,
  });

  // Check if inventory record exists
  const inventoryExists = await getOneOrNull(
    db,
    'SELECT product_id FROM product_inventory WHERE product_id = ?',
    [productId]
  );

  // Determine if sync should be enabled (any Shopify field present)
  const hasShopifyIntegration = !!(
    data.shopify_product_id || 
    data.shopify_variant_id || 
    data.shopify_inventory_item_id
  );

  if (inventoryExists) {
    // Update existing inventory record (Shopify fields + stock + sync_enabled)
    if (Object.keys(inventoryUpdates).length > 1) { // More than just updated_at
      inventoryUpdates.sync_enabled = hasShopifyIntegration ? 1 : 0;
      const { sql, params } = buildUpdateQuery(
        'product_inventory',
        inventoryUpdates,
        'product_id = ?',
        [productId]
      );
      statements.push(db.prepare(sql).bind(...params));
    }
  } else {
    // ✅ ALWAYS create inventory record if missing with stock allocation
    // This handles legacy products that don't have inventory records yet
    const totalStock = data.total_stock ?? 0;
    const newStockMode = stockMode || 'split';
    
    // In unified mode: b2b_stock = total_stock, b2c_stock = 0
    let b2bStock: number;
    let b2cStock: number;
    
    if (newStockMode === 'unified') {
      b2bStock = totalStock;
      b2cStock = 0;
    } else {
      b2bStock = data.b2b_stock ?? 0;
      b2cStock = data.b2c_stock ?? 0;
    }
    
    statements.push(
      db
        .prepare(
          `INSERT INTO product_inventory (
            product_id, shopify_product_id, shopify_variant_id, shopify_inventory_item_id,
            total_stock, b2b_stock, b2c_stock, reserved_stock,
            stock_mode, sync_enabled, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          productId,
          data.shopify_product_id || null,
          data.shopify_variant_id || null,
          data.shopify_inventory_item_id || null,
          totalStock,
          b2bStock,
          b2cStock,
          0, // reserved_stock starts at 0
          newStockMode,
          hasShopifyIntegration ? 1 : 0, // Enable sync only when Shopify codes exist
          now,
          now
        )
    );
  }

  // ============================================================================
  // UPDATE RELATED TABLES
  // ============================================================================

  // Update images (replace all)
  if (data.images !== undefined) {
    statements.push(db.prepare('DELETE FROM product_images WHERE product_id = ?').bind(productId));
    data.images.forEach((imageUrl, index) => {
      statements.push(
        db
          .prepare(
            'INSERT INTO product_images (id, product_id, image_url, sort_order, created_at) VALUES (?, ?, ?, ?, ?)'
          )
          .bind(nanoid(), productId, imageUrl, index, now)
      );
    });
  }

  // Update specifications (replace all)
  if (data.specifications !== undefined) {
    statements.push(
      db.prepare('DELETE FROM product_specifications WHERE product_id = ?').bind(productId)
    );
    data.specifications.forEach((spec, index) => {
      statements.push(
        db
          .prepare(
            'INSERT INTO product_specifications (id, product_id, spec_key, spec_value, sort_order) VALUES (?, ?, ?, ?, ?)'
          )
          .bind(nanoid(), productId, spec.key, spec.value, index)
      );
    });
  }

  // Update tags (replace all)
  if (data.tags !== undefined) {
    statements.push(db.prepare('DELETE FROM product_tags WHERE product_id = ?').bind(productId));
    data.tags.forEach((tag) => {
      statements.push(
        db.prepare('INSERT INTO product_tags (product_id, tag) VALUES (?, ?)').bind(productId, tag)
      );
    });
  }

  // Update dimensions
  if (data.dimensions !== undefined) {
    statements.push(
      db.prepare('DELETE FROM product_dimensions WHERE product_id = ?').bind(productId)
    );
    statements.push(
      db
        .prepare(
          'INSERT INTO product_dimensions (product_id, length, width, height, unit) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(
          productId,
          data.dimensions.length,
          data.dimensions.width,
          data.dimensions.height,
          data.dimensions.unit || 'cm'
        )
    );
  }

  // Execute batch
  if (statements.length > 0) {
    await batch(db, statements);
  }

  // Return updated product
  return getProductById(db, productId);
}

/**
 * Delete a product
 * 
 * NOTE: Stripe archival is handled at the API Gateway orchestration layer.
 * This function only handles D1 database deletion.
 */
export async function deleteProduct(db: any, productId: string): Promise<void> {
  // Check if product exists
  const existing = await getOneOrNull<Product>(
    db,
    'SELECT * FROM products WHERE id = ?',
    [productId]
  );

  if (!existing) {
    throw errors.notFound('Product', productId);
  }

  // Delete product and all related records from D1
  const statements = [
    db.prepare('DELETE FROM product_images WHERE product_id = ?').bind(productId),
    db.prepare('DELETE FROM product_specifications WHERE product_id = ?').bind(productId),
    db.prepare('DELETE FROM product_tags WHERE product_id = ?').bind(productId),
    db.prepare('DELETE FROM product_dimensions WHERE product_id = ?').bind(productId),
    db.prepare('DELETE FROM product_inventory WHERE product_id = ?').bind(productId),
    db.prepare('DELETE FROM products WHERE id = ?').bind(productId),
  ];

  await batch(db, statements);
}

