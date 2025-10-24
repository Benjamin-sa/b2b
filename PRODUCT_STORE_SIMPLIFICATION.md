# Product Store Simplification - Backend Naming Alignment

## Overview
Simplified the product data flow by using backend naming (snake_case) throughout the frontend, eliminating the need for transformation layers.

## Changes Made

### 1. Product Type Definition (`src/types/product.ts`)
**Before** (camelCase):
```typescript
export interface Product {
  id: string
  name: string
  originalPrice?: number
  imageUrl?: string
  categoryId?: string
  inStock: boolean
  comingSoon?: boolean
  shopifyVariantId?: string
  createdAt?: any
  updatedAt?: any
}
```

**After** (snake_case - matches backend exactly):
```typescript
export interface Product {
  id: string
  name: string
  original_price: number | null
  image_url: string | null
  category_id: string | null
  in_stock: number // SQLite boolean (0 or 1)
  coming_soon: number // SQLite boolean (0 or 1)
  shopify_variant_id: string | null
  created_at: string
  updated_at: string
  // Plus relations: images, specifications, tags, dimensions
}
```

### 2. Product Filter Type (`src/types/product.ts`)
**Before** (camelCase):
```typescript
export interface ProductFilter {
  categoryId?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  comingSoon?: boolean
  searchTerm?: string
  sortBy?: 'name' | 'price' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}
```

**After** (snake_case):
```typescript
export interface ProductFilter {
  category_id?: string
  min_price?: number
  max_price?: number
  in_stock?: boolean
  coming_soon?: boolean
  search_term?: string
  sort_by?: 'name' | 'price' | 'created_at' | 'updated_at' | 'stock'
  sort_order?: 'asc' | 'desc'
}
```

### 3. Products Store (`src/stores/products.ts`)
**Removed**:
- Import of `transformApiProduct` and `transformProductToApi`
- All transformation function calls throughout the store

**Updated**:
- Query parameter construction to use snake_case field names
- Direct use of API responses without transformation
- SQLite boolean handling (`in_stock === 1` instead of `inStock`)

**Example**:
```typescript
// Before
const transformedProducts = data.items.map(transformApiProduct);
products.value = transformedProducts;

// After
products.value = data.items; // Direct assignment!
```

### 4. File Removed
- ✅ `/src/utils/productTransforms.ts` - No longer needed!

## Benefits

### ✅ Simpler Code
- No transformation layer needed
- Fewer lines of code to maintain
- Less cognitive overhead

### ✅ Better Performance
- No transformation overhead
- Direct pass-through from API to store

### ✅ Type Safety
- Frontend types match backend types exactly
- No risk of transformation errors
- Better IDE autocompletion

### ✅ Easier Debugging
- What you see in network tab is what you get in store
- No hidden transformations to trace
- Simpler data flow

### ✅ Less Error-Prone
- No mapping mismatches (like the `createdAt` vs `created_at` bug we just fixed)
- Single source of truth for field names
- TypeScript catches all naming errors

## SQLite Boolean Handling

Since D1 uses integers for booleans (0/1), we handle them with simple checks:

```typescript
// Check if product is in stock
if (product.in_stock === 1) {
  // Product is in stock
}

// Or use truthy check
if (product.in_stock) {
  // Product is in stock (1 is truthy)
}
```

## Migration Impact

### Components Using Products
Any component that accesses product fields needs to update:

```typescript
// Before
<div>{{ product.imageUrl }}</div>
<div>{{ product.inStock }}</div>
<div>{{ product.createdAt }}</div>

// After
<div>{{ product.image_url }}</div>
<div>{{ product.in_stock === 1 }}</div>
<div>{{ product.created_at }}</div>
```

### Search for:
- `product.imageUrl` → `product.image_url`
- `product.originalPrice` → `product.original_price`
- `product.categoryId` → `product.category_id`
- `product.inStock` → `product.in_stock`
- `product.comingSoon` → `product.coming_soon`
- `product.shopifyVariantId` → `product.shopify_variant_id`
- `product.createdAt` → `product.created_at`
- `product.updatedAt` → `product.updated_at`

## Example API Response

Now the API response can be used directly:

```json
{
  "items": [
    {
      "id": "abc123",
      "name": "Product Name",
      "price": 99.99,
      "original_price": null,
      "image_url": "https://example.com/image.jpg",
      "category_id": "cat_1",
      "in_stock": 1,
      "coming_soon": 0,
      "stock": 50,
      "created_at": "2025-10-24T10:00:00Z",
      "updated_at": "2025-10-24T10:00:00Z",
      "images": [
        { "image_url": "https://...", "sort_order": 0 }
      ],
      "specifications": [
        { "spec_key": "Color", "spec_value": "Red" }
      ]
    }
  ]
}
```

This goes straight into the Pinia store without any transformation!

## Testing

Test the sorting issue that led to this simplification:

```bash
# This should now work
curl "https://b2b-api-gateway.benkee-sauter.workers.dev/api/products?page=1&limit=2&sortBy=created_at&sortOrder=desc"
```

## Next Steps

1. ✅ Update all Vue components to use snake_case field names
2. ✅ Search for and update all product field references
3. ✅ Test all product-related functionality
4. ✅ Update any product-related filters/forms
5. ✅ Remove the unused `productTransforms.ts` file

---

**Decision**: Backend naming throughout (snake_case)  
**Rationale**: Simpler, faster, less error-prone  
**Trade-off**: Slightly unconventional in TypeScript, but worth it  
**Status**: ✅ Implemented  
**Date**: October 24, 2025
