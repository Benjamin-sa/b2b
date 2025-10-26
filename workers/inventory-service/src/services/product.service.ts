/**
 * Product Service
 * 
 * Business logic for product management
 */

import { nanoid } from 'nanoid';
import type {
  Product,
  ProductWithRelations,
  CreateProductRequest,
  UpdateProductRequest,
  PaginatedResponse,
  ProductFilters,
  PaginationParams,
  Env,
} from '../types';
import { getOne, getOneOrNull, getMany, getPaginated, batch } from '../utils/database';
import { errors } from '../utils/errors';
import { validateRequired, validatePrice, validateStock } from '../utils/validation';
import {
  createStripeProductWithPrice,
  updateStripeProduct,
  replaceStripePrice,
  archiveStripeProduct,
} from './stripe.service';

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

  // Get related data
  const [images, specifications, tags, dimensions] = await Promise.all([
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
  ]);

  return {
    ...product,
    images,
    specifications,
    tags: tags.map((t: any) => t.tag),
    dimensions,
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
    conditions.push('category_id = ?');
    params.push(filters.categoryId);
  }

  if (filters.brand) {
    conditions.push('brand = ?');
    params.push(filters.brand);
  }

  if (filters.inStock !== undefined) {
    conditions.push('in_stock = ?');
    params.push(filters.inStock ? 1 : 0);
  }

  if (filters.comingSoon !== undefined) {
    conditions.push('coming_soon = ?');
    params.push(filters.comingSoon ? 1 : 0);
  }

  if (filters.minPrice !== undefined) {
    conditions.push('price >= ?');
    params.push(filters.minPrice);
  }

  if (filters.maxPrice !== undefined) {
    conditions.push('price <= ?');
    params.push(filters.maxPrice);
  }

  if (filters.searchTerm) {
    conditions.push('(name LIKE ? OR description LIKE ? OR brand LIKE ?)');
    const searchPattern = `%${filters.searchTerm}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Build queries
  const baseQuery = `SELECT * FROM products ${whereClause} ORDER BY ${sortBy} ${sortOrder}`;
  const countQuery = `SELECT COUNT(*) as count FROM products ${whereClause}`;

  // Get paginated results
  const result = await getPaginated<Product>(db, baseQuery, countQuery, params, page, limit);

  // Get related data for each product
  const itemsWithRelations = await Promise.all(
    result.items.map(async (product) => {
      const [images, specifications, tags, dimensions] = await Promise.all([
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
      ]);

      return {
        ...product,
        images,
        specifications,
        tags: tags.map((t: any) => t.tag),
        dimensions,
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

  if (data.stock !== undefined) {
    validateStock(data.stock);
  }

  // Generate ID
  const productId = nanoid();
  const now = new Date().toISOString();

  // Create Stripe product and price first (if not provided)
  let stripeProductId = data.stripeProductId || null;
  let stripePriceId = data.stripePriceId || null;

  if (!stripeProductId && !stripePriceId) {
    try {
      console.log(`🔄 Creating Stripe product for: ${data.name}`);
      
      const stripeResult = await createStripeProductWithPrice(env, {
        id: productId,
        name: data.name,
        description: data.description,
        price: data.price,
        image_url: data.imageUrl || (data.images && data.images[0]) || null,
        category_id: data.categoryId,
        brand: data.brand,
        part_number: data.partNumber,
        shopify_product_id: data.shopifyProductId,
        shopify_variant_id: data.shopifyVariantId,
      });

      stripeProductId = stripeResult.stripeProductId;
      stripePriceId = stripeResult.stripePriceId;

      console.log(`✅ Stripe product created: ${stripeProductId}, price: ${stripePriceId}`);
    } catch (error: any) {
      console.error('❌ Failed to create Stripe product:', error);
      // Continue without Stripe - product will be created in D1 only
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
        data.originalPrice || null,
        data.imageUrl || null,
        data.categoryId || null,
        1, // DEPRECATED: in_stock - always 1, use product_inventory instead
        data.comingSoon ? 1 : 0,
        0, // DEPRECATED: stock - always 0, use product_inventory instead
        data.brand || null,
        data.partNumber || null,
        data.unit || null,
        data.minOrderQuantity || 1,
        data.maxOrderQuantity || null,
        data.weight || null,
        null, // DEPRECATED: shopify_product_id - use product_inventory instead
        null, // DEPRECATED: shopify_variant_id - use product_inventory instead
        stripeProductId,
        stripePriceId,
        now,
        now
      )
  );

  // ⚠️ CRITICAL: Insert into product_inventory table (single source of truth for stock)
  const initialStock = data.stock || 0;
  statements.push(
    db
      .prepare(
        `INSERT INTO product_inventory (
        product_id, total_stock, b2b_stock, b2c_stock, reserved_stock,
        shopify_product_id, shopify_variant_id, shopify_inventory_item_id,
        shopify_location_id, sync_enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        productId,
        initialStock,
        initialStock, // Initially allocate all stock to B2B
        0, // No B2C stock initially
        0, // No reserved stock
        data.shopifyProductId || null,
        data.shopifyVariantId || null,
        data.shopifyInventoryItemId || null, // ✅ NEW: Store inventory_item_id
        null, // shopify_location_id - set later if needed
        0, // sync_enabled - disabled by default
        now,
        now
      )
  );

  // Log initial stock creation
  if (initialStock > 0) {
    statements.push(
      db
        .prepare(
          `INSERT INTO inventory_sync_log (
          id, product_id, action, source,
          total_change, b2b_change, b2c_change,
          total_stock_after, b2b_stock_after, b2c_stock_after,
          synced_to_shopify, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          nanoid(),
          productId,
          'restock',
          'admin_manual',
          initialStock,
          initialStock,
          0,
          initialStock,
          initialStock,
          0,
          0,
          now
        )
    );
  }

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

  if (data.stock !== undefined) {
    validateStock(data.stock);
  }

  const now = new Date().toISOString();
  const statements: any[] = [];

  // Handle Stripe updates if product has Stripe integration
  let newStripePriceId = existing.stripe_price_id;

  if (existing.stripe_product_id) {
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

      // Update product details in Stripe (if not just a stock update)
      const hasNonStockChanges = Object.keys(data).some(
        (key) => key !== 'stock' && key !== 'inStock'
      );

      if (hasNonStockChanges) {
        console.log(`🔄 Updating Stripe product ${existing.stripe_product_id}`);
        
        await updateStripeProduct(env, {
          id: productId,
          stripe_product_id: existing.stripe_product_id,
          name: data.name ?? existing.name,
          description: data.description ?? existing.description,
          price: data.price ?? existing.price,
          image_url: data.imageUrl ?? existing.image_url,
          category_id: data.categoryId ?? existing.category_id,
          brand: data.brand ?? existing.brand,
          part_number: data.partNumber ?? existing.part_number,
          shopify_product_id: data.shopifyProductId ?? existing.shopify_product_id,
          shopify_variant_id: data.shopifyVariantId ?? existing.shopify_variant_id,
        });

        console.log(`✅ Stripe product updated`);
      }
    } catch (error: any) {
      console.error('❌ Failed to update Stripe product:', error);
      // Continue with D1 update - Stripe sync can be done later
      console.warn('⚠️ Product will be updated in D1 only, Stripe sync failed');
    }
  }

  // Build update query for product
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
  if (data.price !== undefined) {
    updateFields.push('price = ?');
    updateParams.push(data.price);
  }
  if (data.originalPrice !== undefined) {
    updateFields.push('original_price = ?');
    updateParams.push(data.originalPrice);
  }
  if (data.imageUrl !== undefined) {
    updateFields.push('image_url = ?');
    updateParams.push(data.imageUrl);
  }
  if (data.categoryId !== undefined) {
    updateFields.push('category_id = ?');
    updateParams.push(data.categoryId);
  }
  if (data.inStock !== undefined) {
    updateFields.push('in_stock = ?');
    updateParams.push(data.inStock ? 1 : 0);
  }
  if (data.comingSoon !== undefined) {
    updateFields.push('coming_soon = ?');
    updateParams.push(data.comingSoon ? 1 : 0);
  }
  if (data.stock !== undefined) {
    updateFields.push('stock = ?');
    updateParams.push(data.stock);
  }
  if (data.brand !== undefined) {
    updateFields.push('brand = ?');
    updateParams.push(data.brand);
  }
  if (data.partNumber !== undefined) {
    updateFields.push('part_number = ?');
    updateParams.push(data.partNumber);
  }
  if (data.unit !== undefined) {
    updateFields.push('unit = ?');
    updateParams.push(data.unit);
  }
  if (data.minOrderQuantity !== undefined) {
    updateFields.push('min_order_quantity = ?');
    updateParams.push(data.minOrderQuantity);
  }
  if (data.maxOrderQuantity !== undefined) {
    updateFields.push('max_order_quantity = ?');
    updateParams.push(data.maxOrderQuantity);
  }
  if (data.weight !== undefined) {
    updateFields.push('weight = ?');
    updateParams.push(data.weight);
  }
  if (data.shopifyProductId !== undefined) {
    updateFields.push('shopify_product_id = ?');
    updateParams.push(data.shopifyProductId);
  }
  if (data.shopifyVariantId !== undefined) {
    updateFields.push('shopify_variant_id = ?');
    updateParams.push(data.shopifyVariantId);
  }
  if (data.stripeProductId !== undefined) {
    updateFields.push('stripe_product_id = ?');
    updateParams.push(data.stripeProductId);
  }
  // Update stripe_price_id if we created a new price
  if (newStripePriceId !== existing.stripe_price_id) {
    updateFields.push('stripe_price_id = ?');
    updateParams.push(newStripePriceId);
  } else if (data.stripePriceId !== undefined) {
    updateFields.push('stripe_price_id = ?');
    updateParams.push(data.stripePriceId);
  }

  updateFields.push('updated_at = ?');
  updateParams.push(now);

  if (updateFields.length > 0) {
    updateParams.push(productId);
    statements.push(
      db
        .prepare(`UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`)
        .bind(...updateParams)
    );
  }

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
    db.prepare('DELETE FROM products WHERE id = ?').bind(productId),
  ];

  await batch(db, statements);
}
