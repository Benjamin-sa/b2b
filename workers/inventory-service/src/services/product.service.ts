/**
 * Product Service
 * 
 * Business logic for product management
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
  Env,
} from '../types';
import { getOne, getOneOrNull, getMany, getPaginated, batch } from '../utils/database';
import { errors } from '../utils/errors';
import { validateRequired, validatePrice } from '../utils/validation';
import {
  createStripeProductWithPrice,
  updateStripeProduct,
  replaceStripePrice,
  archiveStripeProduct,
} from './stripe.service';
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
 * Automatically creates Stripe product and price
 */
export async function createProduct(
  db: any,
  env: Env,
  data: CreateProductRequest
): Promise<ProductWithRelations> {
  // Validate required fields
  validateRequired(data, ['name', 'price']);
  validatePrice(data.price);

  // Generate ID
  const productId = nanoid();
  const now = new Date().toISOString();

  // Create Stripe product and price first (if not provided)
  let stripeProductId = data.stripe_product_id || null;
  let stripePriceId = data.stripe_price_id || null;

  if (!stripeProductId && !stripePriceId) {
    try {
      console.log(`🔄 Creating Stripe product for: ${data.name}`);
      
      const stripeResult = await createStripeProductWithPrice(env, {
        id: productId,
        name: data.name,
        description: data.description,
        price: data.price,
        image_url: data.image_url || (data.images && data.images[0]) || null,
        category_id: data.category_id,
        brand: data.brand,
        part_number: data.part_number,
        shopify_product_id: data.shopify_product_id,
        shopify_variant_id: data.shopify_variant_id,
      });

      stripeProductId = stripeResult.stripeProductId;
      stripePriceId = stripeResult.stripePriceId;

      console.log(`✅ Stripe product created: ${stripeProductId}, price: ${stripePriceId}`);
    } catch (error: any) {
      console.error('❌ Failed to create Stripe product:', error);
      console.warn('⚠️ Product will be created without Stripe integration');
    }
  }

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

  // Extract stock values from request (sent from ProductForm)
  const totalStock = data.total_stock ?? 0;
  const b2bStock = data.b2b_stock ?? 0;
  const b2cStock = data.b2c_stock ?? 0;

  statements.push(
    db
      .prepare(
        `INSERT INTO product_inventory (
        product_id, shopify_product_id, shopify_variant_id, shopify_inventory_item_id,
        total_stock, b2b_stock, b2c_stock, reserved_stock,
        sync_enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
 * Automatically updates Stripe product and handles price changes
 */
export async function updateProduct(
  db: any,
  env: Env,
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

  // Handle Stripe updates if product has Stripe integration
  let newStripePriceId = existing.stripe_price_id;

    try {
      // Check if price changed - need to create new price in Stripe
      const priceChanged = data.price !== undefined && data.price !== existing.price;

      if (priceChanged && existing.stripe_price_id) {
        console.log(`🔄 Replacing Stripe price for product ${productId}`);
        
        newStripePriceId = await replaceStripePrice(env, {
          id: productId,
          stripe_product_id: existing.stripe_product_id,
          stripe_price_id: existing.stripe_price_id,
          price: data.price!,
        }, data.price!);

        console.log(`✅ New Stripe price created: ${newStripePriceId}`);
      }

      // Update product details in Stripe (if not just a stock/inventory update)
      const hasNonInventoryChanges = Object.keys(data).some(
        (key) => !['stock', 'inStock', 'shopifyProductId', 'shopifyVariantId', 'shopifyInventoryItemId'].includes(key)
      );

      if (hasNonInventoryChanges) {
        console.log(`🔄 Updating Stripe product ${existing.stripe_product_id}`);
        
        await updateStripeProduct(env, {
          id: productId,
          stripe_product_id: existing.stripe_product_id,
          name: data.name ?? existing.name,
          description: data.description ?? existing.description,
          price: data.price ?? existing.price,
          image_url: data.image_url ?? existing.image_url,
          category_id: data.category_id ?? existing.category_id,
          brand: data.brand ?? existing.brand,
          part_number: data.part_number ?? existing.part_number,
          shopify_product_id: null, // Not stored in products table anymore
          shopify_variant_id: null,  // Not stored in products table anymore
        });

        console.log(`✅ Stripe product updated`);
      }
    } catch (error: any) {
      console.error('❌ Failed to update Stripe product:', error);
      // Continue with D1 update - Stripe sync can be done later
      console.warn('⚠️ Product will be updated in D1 only, Stripe sync failed');
    }


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
    updated_at: now,
  });

  // Update stripe_price_id if we created a new price
  if (newStripePriceId !== existing.stripe_price_id) {
    productUpdates.stripe_price_id = newStripePriceId;
  } else if (data.stripe_price_id !== undefined) {
    productUpdates.stripe_price_id = data.stripe_price_id;
  }

  // NOTE: shopify_product_id and shopify_variant_id are DEPRECATED in products table
  // They should NOT be updated here - use product_inventory table instead

  if (Object.keys(productUpdates).length > 0) {
    const { sql, params } = buildUpdateQuery('products', productUpdates, 'id = ?', [productId]);
    statements.push(db.prepare(sql).bind(...params));
  }

  // ============================================================================
  // UPDATE PRODUCT_INVENTORY TABLE (Shopify fields + Stock allocation)
  // ============================================================================
  const inventoryUpdates = buildFieldUpdates({
    shopify_product_id: data.shopify_product_id,
    shopify_variant_id: data.shopify_variant_id,
    shopify_inventory_item_id: data.shopify_inventory_item_id,
    total_stock: data.total_stock,
    b2b_stock: data.b2b_stock,
    b2c_stock: data.b2c_stock,
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
    const b2bStock = data.b2b_stock ?? 0;
    const b2cStock = data.b2c_stock ?? 0;
    
    statements.push(
      db
        .prepare(
          `INSERT INTO product_inventory (
            product_id, shopify_product_id, shopify_variant_id, shopify_inventory_item_id,
            total_stock, b2b_stock, b2c_stock, reserved_stock,
            sync_enabled, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
 * Archives product in Stripe (soft delete) before deleting from D1
 */
export async function deleteProduct(db: any, env: Env, productId: string): Promise<void> {
  // Check if product exists and get Stripe IDs
  const existing = await getOneOrNull<Product>(
    db,
    'SELECT * FROM products WHERE id = ?',
    [productId]
  );

  if (!existing) {
    throw errors.notFound('Product', productId);
  }

  // Archive in Stripe if product has Stripe integration
  if (existing.stripe_product_id) {
    try {
      console.log(`🔄 Archiving Stripe product ${existing.stripe_product_id}`);
      
      await archiveStripeProduct(env, {
        id: productId,
        stripe_product_id: existing.stripe_product_id,
        stripe_price_id: existing.stripe_price_id,
      });

      console.log(`✅ Stripe product archived`);
    } catch (error: any) {
      console.error('❌ Failed to archive Stripe product:', error);
      // Continue with D1 deletion - Stripe archive can be done manually
      console.warn('⚠️ Product will be deleted from D1, but Stripe product remains active');
    }
  }

  // Delete product (cascade will delete related records)
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

