/**
 * Products Routes - Direct Database Operations
 *
 * Replaces the service binding proxy with direct D1 operations via @b2b/db
 * Stripe operations remain in this file for orchestration
 */

import { Hono } from 'hono';
import type { Env, ContextVariables } from '../types';
import { createDb } from '@b2b/db';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductWithDetails,
  getProductsByCategory,
  addProductImage,
  deleteProductImages,
  setProductTags,
  setProductDimensions,
  addProductSpecification,
  deleteProductSpecifications,
  type GetProductsOptions,
} from '@b2b/db/operations';
import { getInventoryByProductId, upsertInventory } from '@b2b/db/operations';
import {
  createStripeProduct,
  updateStripeProduct,
  replaceStripePrice,
  archiveStripeProduct,
} from '../utils/stripe';
import { generateNextB2BSku, generateNextBarcode } from '../services/product-codes.service';

const products = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * GET /api/products
 * List all products with pagination and filters
 */
products.get('/', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const url = new URL(c.req.url);

    const options: GetProductsOptions = {
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
      search: url.searchParams.get('search') || undefined,
      categoryId: url.searchParams.get('category_id') || undefined,
      brand: url.searchParams.get('brand') || undefined,
      inStockOnly: url.searchParams.get('in_stock') === 'true',
    };

    const minPrice = url.searchParams.get('min_price');
    if (minPrice) options.minPrice = parseFloat(minPrice);

    const maxPrice = url.searchParams.get('max_price');
    if (maxPrice) options.maxPrice = parseFloat(maxPrice);

    const result = await getProducts(db, options);

    // Fetch inventory for each product
    const productsWithInventory = await Promise.all(
      result.products.map(async (product) => {
        const inventory = await getInventoryByProductId(db, product.id);
        return {
          ...product,
          stock: inventory?.stock ?? 0,
          in_stock: (inventory?.stock ?? 0) > 0 ? 1 : 0,
        };
      })
    );

    return c.json({
      products: productsWithInventory,
      total: result.total,
      limit: options.limit,
      offset: options.offset,
    });
  } catch (error: any) {
    console.error('[Products] Error fetching products:', error);
    return c.json(
      {
        error: 'Failed to fetch products',
        code: 'products/fetch-failed',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/products/category/:categoryId
 * Get products by category
 */
products.get('/category/:categoryId', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const categoryId = c.req.param('categoryId');
    const url = new URL(c.req.url);

    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const productsList = await getProductsByCategory(db, categoryId, limit, offset);

    // Fetch inventory for each product
    const productsWithInventory = await Promise.all(
      productsList.map(async (product) => {
        const inventory = await getInventoryByProductId(db, product.id);
        return {
          ...product,
          stock: inventory?.stock ?? 0,
          in_stock: (inventory?.stock ?? 0) > 0 ? 1 : 0,
        };
      })
    );

    return c.json({
      products: productsWithInventory,
      category_id: categoryId,
    });
  } catch (error: any) {
    console.error('[Products] Error fetching products by category:', error);
    return c.json(
      {
        error: 'Failed to fetch products',
        code: 'products/fetch-failed',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/products/:id
 * Get a single product by ID with full details
 */
products.get('/:id', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const productId = c.req.param('id');

    // Get full product details including images, specs, tags, dimensions, inventory
    const product = await getProductWithDetails(db, productId);

    if (!product) {
      return c.json(
        {
          error: 'Product not found',
          code: 'products/not-found',
        },
        404
      );
    }

    // Transform to expected response format
    return c.json({
      ...product,
      stock: product.inventory?.stock ?? 0,
      in_stock: (product.inventory?.stock ?? 0) > 0 ? 1 : 0,
    });
  } catch (error: any) {
    console.error('[Products] Error fetching product:', error);
    return c.json(
      {
        error: 'Failed to fetch product',
        code: 'products/fetch-failed',
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
 * POST /api/products
 * Create a new product (admin only)
 *
 * Orchestration flow:
 * 1. Validate required fields
 * 2. Create product in Stripe (get stripe_product_id, stripe_price_id)
 * 3. Create product in D1 database
 * 4. Create inventory record
 */
products.post('/', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const body = await c.req.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return c.json(
        {
          error: 'Validation Error',
          code: 'validation/missing-name',
          message: 'Product name is required',
        },
        400
      );
    }

    if (body.price === undefined || body.price === null) {
      return c.json(
        {
          error: 'Validation Error',
          code: 'validation/missing-price',
          message: 'Product price is required',
        },
        400
      );
    }

    if (typeof body.price !== 'number' || body.price < 0) {
      return c.json(
        {
          error: 'Validation Error',
          code: 'validation/invalid-price',
          message: 'Product price must be a positive number',
        },
        400
      );
    }

    // Generate product ID
    const productId = body.id || crypto.randomUUID().replace(/-/g, '').slice(0, 21);

    // Auto-generate B2B SKU if not provided
    const b2bSku = body.b2b_sku || (await generateNextB2BSku(c.env.DB));

    // Auto-generate barcode if not provided
    const barcode = body.barcode || (await generateNextBarcode(c.env.DB));

    // Step 1: Create Stripe product (required for invoicing)
    let stripeProductId = body.stripe_product_id || null;
    let stripePriceId = body.stripe_price_id || null;

    if (!stripeProductId && body.price > 0) {
      const stripeResult = await createStripeProduct(c.env, {
        product_id: productId,
        name: body.name,
        description: body.description,
        price: body.price,
        images: body.image_url ? [body.image_url] : body.images,
        category: body.category_id,
        brand: body.brand,
        part_number: body.part_number,
        b2b_sku: b2bSku,
      });

      if (!stripeResult) {
        return c.json(
          {
            error: 'Failed to create product in Stripe',
            code: 'stripe/product-creation-failed',
            message: 'Product could not be created in Stripe. Please try again.',
          },
          500
        );
      }

      stripeProductId = stripeResult.stripe_product_id;
      stripePriceId = stripeResult.stripe_price_id;
    }

    // Step 2: Create product in D1
    // Note: shopify_product_id and shopify_variant_id are stored in inventory table (not here)
    const product = await createProduct(db, {
      id: productId,
      name: body.name.trim(),
      description: body.description || null,
      price: body.price,
      original_price: body.original_price || null,
      image_url: body.image_url || null,
      category_id: body.category_id || null,
      brand: body.brand || null,
      part_number: body.part_number || null,
      b2b_sku: b2bSku,
      barcode: barcode,
      unit: body.unit || null,
      min_order_quantity: body.min_order_quantity || 1,
      max_order_quantity: body.max_order_quantity || null,
      weight: body.weight || null,
      coming_soon: body.coming_soon || 0,
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId,
    });

    // Step 3: Create inventory record
    // Check if this product will be linked to Shopify
    const isShopifyLinked = !!(
      body.shopify_variant_id &&
      body.shopify_inventory_item_id &&
      body.shopify_location_id
    );

    // IMPORTANT: Use the stock value provided by frontend
    // For Shopify-linked: frontend sends the stock fetched from Shopify search
    // For standalone: frontend sends the manually entered stock value
    // After initial creation, only Shopify webhooks can update stock for linked products
    const initialStock = body.stock ?? 0;

    await upsertInventory(db, {
      product_id: productId,
      stock: initialStock,
      shopify_product_id: body.shopify_product_id || null,
      shopify_variant_id: body.shopify_variant_id || null,
      shopify_inventory_item_id: body.shopify_inventory_item_id || null,
      shopify_location_id: body.shopify_location_id || null,
      sync_enabled: isShopifyLinked ? 1 : 0, // Auto-enable sync for Shopify-linked products
    });

    if (isShopifyLinked) {
      console.log(
        `[Products] ✅ Created Shopify-linked product ${productId} - stock will sync from Shopify webhook`
      );
    } else {
      console.log(
        `[Products] ✅ Created standalone product ${productId} with stock: ${initialStock}`
      );
    }

    // Step 4: Handle additional data (images, tags, dimensions)
    if (body.images && Array.isArray(body.images)) {
      for (let i = 0; i < body.images.length; i++) {
        await addProductImage(db, {
          id: crypto.randomUUID(),
          product_id: productId,
          image_url: body.images[i],
          sort_order: i,
        });
      }
    }

    if (body.tags && Array.isArray(body.tags)) {
      await setProductTags(db, productId, body.tags);
    }

    if (body.dimensions) {
      await setProductDimensions(db, {
        product_id: productId,
        length: body.dimensions.length,
        width: body.dimensions.width,
        height: body.dimensions.height,
        unit: body.dimensions.unit || 'cm',
      });
    }

    // Get the created inventory record
    const inventory = await getInventoryByProductId(db, productId);

    return c.json(
      {
        ...product,
        stock: inventory?.stock ?? initialStock,
        in_stock: (inventory?.stock ?? initialStock) > 0 ? 1 : 0,
        inventory: inventory || null,
      },
      201
    );
  } catch (error: any) {
    console.error('[Products] Error creating product:', error);
    return c.json(
      {
        error: 'Failed to create product',
        code: 'products/create-failed',
        message: error.message,
      },
      500
    );
  }
});

/**
 * PATCH /api/products/:id
 * Partially update a product (admin only)
 *
 * Orchestration flow:
 * 1. Get existing product
 * 2. Update Stripe product (if has Stripe integration)
 * 3. Replace Stripe price (if price changed)
 * 4. Update product in D1
 */
products.patch('/:id', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const productId = c.req.param('id');
    const body = await c.req.json();

    // Get existing product
    const existing = await getProductById(db, productId);
    if (!existing) {
      return c.json(
        {
          error: 'Product not found',
          code: 'products/not-found',
        },
        404
      );
    }

    let newStripePriceId: string | null = null;

    // Handle Stripe updates
    if (existing.stripe_product_id) {
      const hasNonInventoryChanges = Object.keys(body).some(
        (key) =>
          ![
            'stock',
            'in_stock',
            'shopify_product_id',
            'shopify_variant_id',
            'shopify_inventory_item_id',
          ].includes(key)
      );

      // Update Stripe product metadata
      if (hasNonInventoryChanges) {
        const stripeUpdateSuccess = await updateStripeProduct(c.env, {
          product_id: productId,
          stripe_product_id: existing.stripe_product_id,
          name: body.name ?? existing.name,
          description: body.description ?? existing.description,
          images: body.image_url ? [body.image_url] : body.images,
          category: body.category_id ?? existing.category_id,
          brand: body.brand ?? existing.brand,
          part_number: body.part_number ?? existing.part_number,
          b2b_sku: body.b2b_sku ?? existing.b2b_sku,
        });

        if (!stripeUpdateSuccess) {
          console.warn(
            '[Products] Warning: Failed to update Stripe product, continuing with D1 update'
          );
        }
      }

      // Replace Stripe price if price changed
      const priceChanged = body.price !== undefined && body.price !== existing.price;
      if (priceChanged && existing.stripe_price_id) {
        newStripePriceId = await replaceStripePrice(c.env, {
          product_id: productId,
          stripe_product_id: existing.stripe_product_id,
          stripe_price_id: existing.stripe_price_id,
          new_price: body.price,
        });

        if (!newStripePriceId) {
          return c.json(
            {
              error: 'Failed to update price in Stripe',
              code: 'stripe/price-update-failed',
              message: 'Price could not be updated in Stripe. Please try again.',
            },
            500
          );
        }
      }
    }

    // Update D1 product
    const updateData: any = { ...body };
    if (newStripePriceId) {
      updateData.stripe_price_id = newStripePriceId;
    }

    // Extract inventory-related fields
    const stockUpdate = body.stock;
    const shopifyProductId = body.shopify_product_id;
    const shopifyVariantId = body.shopify_variant_id;
    const shopifyInventoryItemId = body.shopify_inventory_item_id;
    const shopifyLocationId = body.shopify_location_id;
    const syncEnabled = body.sync_enabled;

    // Remove inventory fields from product update
    delete updateData.stock;
    delete updateData.in_stock;
    delete updateData.shopify_product_id;
    delete updateData.shopify_variant_id;
    delete updateData.shopify_inventory_item_id;
    delete updateData.shopify_location_id;
    delete updateData.sync_enabled;

    // Extract related data fields (they go to separate tables, not products table)
    const imagesToUpdate = body.images;
    const tagsToUpdate = body.tags;
    const specsToUpdate = body.specifications;
    const dimensionsToUpdate = body.dimensions;

    delete updateData.images;
    delete updateData.tags;
    delete updateData.specifications;
    delete updateData.dimensions;

    // If images are being updated, ensure image_url is set to the first image
    if (imagesToUpdate !== undefined && Array.isArray(imagesToUpdate)) {
      updateData.image_url = imagesToUpdate[0] || null;
    }

    const updated = await updateProduct(db, productId, updateData);

    // Update images if provided (only if frontend explicitly sent images)
    if (imagesToUpdate !== undefined && Array.isArray(imagesToUpdate)) {
      // Delete existing images first
      await deleteProductImages(db, productId);
      // Add new images
      for (let i = 0; i < imagesToUpdate.length; i++) {
        if (imagesToUpdate[i]) {
          await addProductImage(db, {
            id: crypto.randomUUID(),
            product_id: productId,
            image_url: imagesToUpdate[i],
            sort_order: i,
          });
        }
      }
      console.log(`[Products] Updated ${imagesToUpdate.length} images for product ${productId}`);
    }

    // Update tags if provided
    if (tagsToUpdate !== undefined && Array.isArray(tagsToUpdate)) {
      await setProductTags(db, productId, tagsToUpdate);
    }

    // Update specifications if provided
    if (specsToUpdate !== undefined && Array.isArray(specsToUpdate)) {
      await deleteProductSpecifications(db, productId);
      for (const spec of specsToUpdate) {
        if (spec.key && spec.value) {
          await addProductSpecification(db, {
            id: crypto.randomUUID(),
            product_id: productId,
            spec_key: spec.key,
            spec_value: spec.value,
          });
        }
      }
    }

    // Update dimensions if provided
    if (dimensionsToUpdate) {
      await setProductDimensions(db, {
        product_id: productId,
        length: dimensionsToUpdate.length || 0,
        width: dimensionsToUpdate.width || 0,
        height: dimensionsToUpdate.height || 0,
        unit: dimensionsToUpdate.unit || 'cm',
      });
    }

    // Update inventory record with Shopify linkage and/or stock
    const hasInventoryUpdate =
      stockUpdate !== undefined ||
      shopifyProductId ||
      shopifyVariantId ||
      shopifyInventoryItemId ||
      shopifyLocationId ||
      syncEnabled !== undefined;

    if (hasInventoryUpdate) {
      const inventoryData: any = {
        product_id: productId,
      };

      // Get existing inventory to preserve fields
      const existingInventory = await getInventoryByProductId(db, productId);

      // Determine if this product WAS ALREADY Shopify-linked (before this update)
      const wasAlreadyShopifyLinked =
        !!existingInventory?.shopify_variant_id &&
        !!existingInventory?.shopify_inventory_item_id &&
        !!existingInventory?.shopify_location_id;

      // Check if this REQUEST is providing complete Shopify linkage data
      // (user is linking/re-linking from Shopify search in frontend)
      const isProvidingShopifyLinkage =
        !!shopifyVariantId && !!shopifyInventoryItemId && !!shopifyLocationId;

      // Determine if this product WILL BE Shopify-linked (after this update)
      const willBeShopifyLinked =
        !!(shopifyVariantId || existingInventory?.shopify_variant_id) &&
        !!(shopifyInventoryItemId || existingInventory?.shopify_inventory_item_id) &&
        !!(shopifyLocationId || existingInventory?.shopify_location_id);

      // Stock update logic:
      // 1. If providing Shopify linkage + stock: ALWAYS accept (from Shopify search)
      // 2. Standalone product: accept stock updates
      // 3. Already Shopify-linked WITHOUT new linkage: ignore (webhook handles)
      if (stockUpdate !== undefined && isProvidingShopifyLinkage) {
        // User is linking/re-linking with stock from Shopify search - ALWAYS accept
        inventoryData.stock = stockUpdate;
        console.log(
          `[Products] ✅ Setting stock to ${stockUpdate} for Shopify-linked product ${productId} (from search)`
        );
      } else if (stockUpdate !== undefined && !willBeShopifyLinked) {
        // Standalone product - accept stock update
        inventoryData.stock = stockUpdate;
        console.log(
          `[Products] Setting stock to ${stockUpdate} for standalone product ${productId}`
        );
      } else if (stockUpdate !== undefined && wasAlreadyShopifyLinked) {
        // Already Shopify-linked and NOT re-linking - ignore manual stock updates
        console.log(
          `[Products] ⚠️ Ignoring stock update for already Shopify-linked product ${productId} - Shopify webhook is source of truth`
        );
        inventoryData.stock = existingInventory?.stock ?? 0;
      } else if (existingInventory) {
        inventoryData.stock = existingInventory.stock;
      } else {
        inventoryData.stock = 0;
      }

      if (shopifyProductId) inventoryData.shopify_product_id = shopifyProductId;
      else if (existingInventory?.shopify_product_id)
        inventoryData.shopify_product_id = existingInventory.shopify_product_id;

      if (shopifyVariantId) inventoryData.shopify_variant_id = shopifyVariantId;
      else if (existingInventory?.shopify_variant_id)
        inventoryData.shopify_variant_id = existingInventory.shopify_variant_id;

      if (shopifyInventoryItemId) inventoryData.shopify_inventory_item_id = shopifyInventoryItemId;
      else if (existingInventory?.shopify_inventory_item_id)
        inventoryData.shopify_inventory_item_id = existingInventory.shopify_inventory_item_id;

      if (shopifyLocationId) inventoryData.shopify_location_id = shopifyLocationId;
      else if (existingInventory?.shopify_location_id)
        inventoryData.shopify_location_id = existingInventory.shopify_location_id;

      // Auto-enable sync when Shopify linkage is complete
      if (syncEnabled !== undefined) inventoryData.sync_enabled = syncEnabled;
      else if (willBeShopifyLinked) inventoryData.sync_enabled = 1;
      else if (existingInventory?.sync_enabled !== undefined)
        inventoryData.sync_enabled = existingInventory.sync_enabled;

      await upsertInventory(db, inventoryData);
    }

    // Get final inventory
    const inventory = await getInventoryByProductId(db, productId);

    return c.json({
      ...updated,
      stock: inventory?.stock ?? 0,
      in_stock: (inventory?.stock ?? 0) > 0 ? 1 : 0,
      inventory: inventory || null,
    });
  } catch (error: any) {
    console.error('[Products] Error updating product:', error);
    return c.json(
      {
        error: 'Failed to update product',
        code: 'products/update-failed',
        message: error.message,
      },
      500
    );
  }
});

/**
 * DELETE /api/products/:id
 * Delete a product (admin only)
 *
 * Orchestration flow:
 * 1. Get existing product
 * 2. Archive Stripe product (soft delete)
 * 3. Delete from D1 (cascades to images, specs, tags, inventory)
 */
products.delete('/:id', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const productId = c.req.param('id');

    const existing = await getProductById(db, productId);
    if (!existing) {
      return c.json(
        {
          error: 'Product not found',
          code: 'products/not-found',
        },
        404
      );
    }

    // Archive in Stripe (soft delete - preserves for historical orders)
    if (existing.stripe_product_id) {
      const archiveSuccess = await archiveStripeProduct(
        c.env,
        existing.stripe_product_id,
        existing.stripe_price_id ?? undefined
      );

      if (!archiveSuccess) {
        console.warn(
          '[Products] Warning: Failed to archive Stripe product, continuing with D1 delete'
        );
      }
    }

    // Delete from D1 (cascades related data)
    await deleteProduct(db, productId);

    return c.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error('[Products] Error deleting product:', error);
    return c.json(
      {
        error: 'Failed to delete product',
        code: 'products/delete-failed',
        message: error.message,
      },
      500
    );
  }
});

export default products;
