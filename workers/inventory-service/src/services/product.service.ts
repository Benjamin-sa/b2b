/**
 * Product Service
 * 
 * Business logic for product management
 */

import { nanoid } from 'nanoid';
import type {
  Env,
  Product,
  ProductWithRelations,
  CreateProductRequest,
  UpdateProductRequest,
  PaginatedResponse,
  ProductFilters,
  PaginationParams,
} from '../types';
import { getOne, getOneOrNull, getMany, getPaginated, batch } from '../utils/database';
import { errors } from '../utils/errors';
import { validateRequired, validatePrice, validateStock } from '../utils/validation';

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
 */
export async function createProduct(
  db: any,
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

  // Prepare statements
  const statements: any[] = [];

  // Insert product
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
        data.inStock !== false ? 1 : 0,
        data.comingSoon ? 1 : 0,
        data.stock || 0,
        data.brand || null,
        data.partNumber || null,
        data.unit || null,
        data.minOrderQuantity || 1,
        data.maxOrderQuantity || null,
        data.weight || null,
        data.shopifyProductId || null,
        data.shopifyVariantId || null,
        data.stripeProductId || null,
        data.stripePriceId || null,
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
 */
export async function updateProduct(
  db: any,
  productId: string,
  data: UpdateProductRequest
): Promise<ProductWithRelations> {
  // Check if product exists
  const existing = await getOneOrNull<Product>(
    db,
    'SELECT id FROM products WHERE id = ?',
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
  if (data.stripePriceId !== undefined) {
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
 */
export async function deleteProduct(db: any, productId: string): Promise<void> {
  // Check if product exists
  const existing = await getOneOrNull<Product>(
    db,
    'SELECT id FROM products WHERE id = ?',
    [productId]
  );

  if (!existing) {
    throw errors.notFound('Product', productId);
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
