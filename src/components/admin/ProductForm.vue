<template>
    <div class="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 class="text-2xl font-bold mb-6">
            {{ isEditing ? 'Edit Product' : 'Add Product' }}
        </h2>

        <form @submit.prevent="submitForm" class="space-y-8">
            <!-- Images -->
            <div>
                <h3 class="text-lg font-semibold mb-4">Images</h3>
                <ImageUpload v-model="form.images" :max-images="8" :max-file-size="10" />
            </div>

            <!-- Basic Information -->
            <div>
                <h3 class="text-lg font-semibold mb-4">Basic Information</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Name -->
                    <div class="md:col-span-2">
                        <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
                            Product Name
                        </label>
                        <input id="name" v-model="form.name" type="text" required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter product name" />
                    </div>

                    <!-- Description -->
                    <div class="md:col-span-2">
                        <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>

                        <!-- Rich Text Editor Toolbar -->
                        <div class="border border-gray-300 rounded-md overflow-hidden">
                            <div class="bg-gray-50 px-3 py-2 border-b border-gray-300 flex gap-1">
                                <button type="button" @click="formatText('bold')"
                                    class="px-2 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-100"
                                    title="Bold">
                                    <strong>B</strong>
                                </button>
                                <button type="button" @click="formatText('italic')"
                                    class="px-2 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-100"
                                    title="Italic">
                                    <em>I</em>
                                </button>
                                <button type="button" @click="formatText('underline')"
                                    class="px-2 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-100"
                                    title="Underline">
                                    <u>U</u>
                                </button>
                            </div>
                            <div ref="descriptionEditor" contenteditable="true" @input="onDescriptionChange"
                                @blur="onDescriptionChange" @focus="onEditorFocus"
                                class="w-full px-3 py-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                placeholder="Enter product description"
                                style="white-space: pre-wrap;">
                            </div>
                        </div>
                    </div>

                    <!-- Category -->
                    <div>
                        <label for="categoryId" class="block text-sm font-medium text-gray-700 mb-2">
                            Category
                        </label>
                        <select id="category" v-model="form.category_id" required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select category</option>
                            <option v-for="category in availableCategories" :key="category.id" :value="category.id">
                                {{ getIndentedCategoryName(category) }}
                            </option>
                        </select>
                    </div>

                    <!-- Brand -->
                    <div>
                        <label for="brand" class="block text-sm font-medium text-gray-700 mb-2">
                            Brand
                        </label>
                        <input id="brand" v-model="form.brand" type="text"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter brand name" />
                    </div>
                    <!-- Shopify Product ID -->
                    <div>
                        <label for="shopifyProductId" class="block text-sm font-medium text-gray-700 mb-2">
                            Shopify Product ID
                        </label>
                        <input id="shopifyProductId" v-model="form.shopify_product_id" type="text"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Shopify Product ID" />
                    </div>

                    <!-- Shopify Product Search (Debug Tool) -->
                    <div class="md:col-span-2 border-2 border-blue-200 bg-blue-50 rounded-lg p-4">
                        <h4 class="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                            🔍 Shopify Product Search (Link Inventory)
                        </h4>
                        
                        <!-- Search Input -->
                        <div class="mb-3">
                            <input 
                                v-model="shopifySearchQuery" 
                                type="text"
                                placeholder="Search by product name, variant ID, or SKU..."
                                class="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                @keyup.enter="searchShopifyProducts"
                            />
                            <button 
                                type="button"
                                @click="searchShopifyProducts"
                                :disabled="shopifySearchLoading"
                                class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                            >
                                {{ shopifySearchLoading ? 'Searching...' : 'Search Shopify' }}
                            </button>
                        </div>

                        <!-- Search Results -->
                        <div v-if="shopifySearchResults.length > 0" class="max-h-60 overflow-y-auto space-y-2">
                            <div 
                                v-for="variant in shopifySearchResults" 
                                :key="variant.id"
                                @click="selectShopifyVariant(variant)"
                                class="p-3 bg-white border border-blue-200 rounded cursor-pointer hover:bg-blue-100 transition"
                            >
                                <div class="font-semibold text-sm text-gray-900">{{ variant.title }}</div>
                                <div class="text-xs text-gray-600 mt-1">
                                    <span class="font-mono">Variant ID:</span> {{ extractShopifyId(variant.id) }}
                                </div>
                                <div class="text-xs text-gray-600">
                                    <span class="font-mono">Inventory ID:</span> {{ extractShopifyId(variant.inventoryItemId) }}
                                </div>
                                <div class="text-xs text-gray-600">
                                    <span class="font-mono">SKU:</span> {{ variant.sku || 'N/A' }} | 
                                    <span class="font-mono">Stock:</span> {{ variant.inventoryQuantity }}
                                </div>
                            </div>
                        </div>

                        <!-- Selected Variant Info -->
                        <div v-if="form.shopify_variant_id" class="mt-3 p-2 bg-green-100 border border-green-300 rounded text-sm relative">
                            <button 
                                type="button"
                                @click="delinkShopifyProduct"
                                class="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                                title="Delink Shopify Product"
                            >
                                ✕
                            </button>
                            <div class="font-semibold text-green-900">✅ Linked to Shopify</div>
                            <div class="text-xs text-green-700 mt-1">
                                Variant ID: {{ form.shopify_variant_id }}
                            </div>
                            <div v-if="form.shopify_inventory_item_id" class="text-xs text-green-700">
                                Inventory ID: {{ form.shopify_inventory_item_id }}
                            </div>
                        </div>

                        <!-- Stock Allocation UI -->
                        <div v-if="form.shopify_variant_id" class="mt-3 p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
                            <h5 class="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                                📊 Stock Allocation (B2B / B2C Distribution)
                            </h5>
                            
                            <!-- Total Shopify Stock (Read-Only) -->
                            <div class="mb-4 p-3 bg-white border border-purple-200 rounded">
                                <div class="text-xs font-semibold text-gray-700 mb-1">Total Shopify Stock</div>
                                <div class="text-2xl font-bold text-purple-900">{{ shopifyTotalStock }}</div>
                                <div class="text-xs text-gray-500 mt-1">Available units from Shopify inventory</div>
                            </div>

                            <!-- Stock Allocation Inputs -->
                            <div class="grid grid-cols-2 gap-4 mb-3">
                                <!-- B2B Stock -->
                                <div>
                                    <label for="b2bStock" class="block text-xs font-semibold text-gray-700 mb-2">
                                        🏢 B2B Platform Stock
                                    </label>
                                    <input 
                                        id="b2bStock" 
                                        v-model.number="stockAllocation.b2b_stock" 
                                        type="number" 
                                        min="0" 
                                        :max="shopifyTotalStock"
                                        class="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-center font-semibold"
                                        :class="{ 'border-red-500': stockAllocationError }"
                                    />
                                    <div class="text-xs text-gray-600 mt-1 text-center">
                                        Reserved for B2B customers
                                    </div>
                                </div>

                                <!-- B2C Stock -->
                                <div>
                                    <label for="b2cStock" class="block text-xs font-semibold text-gray-700 mb-2">
                                        🛒 B2C (Shopify) Stock
                                    </label>
                                    <input 
                                        id="b2cStock" 
                                        v-model.number="stockAllocation.b2c_stock" 
                                        type="number" 
                                        min="0" 
                                        :max="shopifyTotalStock"
                                        class="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-center font-semibold"
                                        :class="{ 'border-red-500': stockAllocationError }"
                                    />
                                    <div class="text-xs text-gray-600 mt-1 text-center">
                                        Available on Shopify storefront
                                    </div>
                                </div>
                            </div>

                            <!-- Allocation Summary -->
                            <div class="p-3 bg-white border border-purple-200 rounded">
                                <div class="flex justify-between items-center text-xs mb-2">
                                    <span class="text-gray-700">Total Allocated:</span>
                                    <span class="font-bold" :class="stockAllocationError ? 'text-red-600' : 'text-purple-900'">
                                        {{ stockAllocation.b2b_stock + stockAllocation.b2c_stock }} / {{ shopifyTotalStock }}
                                    </span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                                    <div class="h-2 rounded-full transition-all" 
                                        :class="stockAllocationError ? 'bg-red-500' : 'bg-purple-600'"
                                        :style="{ width: `${Math.min(((stockAllocation.b2b_stock + stockAllocation.b2c_stock) / shopifyTotalStock) * 100, 100)}%` }">
                                    </div>
                                </div>
                                <div class="flex justify-between text-xs text-gray-600">
                                    <span>Unallocated: {{ Math.max(0, shopifyTotalStock - stockAllocation.b2b_stock - stockAllocation.b2c_stock) }}</span>
                                    <span v-if="stockAllocation.b2b_stock > 0">
                                        B2B: {{ Math.round((stockAllocation.b2b_stock / shopifyTotalStock) * 100) }}%
                                    </span>
                                </div>
                            </div>

                            <!-- Error Message -->
                            <div v-if="stockAllocationError" class="mt-3 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700">
                                ⚠️ {{ stockAllocationError }}
                            </div>

                            <!-- Quick Actions -->
                            <div class="mt-3 flex gap-2 text-xs">
                                <button 
                                    type="button"
                                    @click="stockAllocation.b2b_stock = shopifyTotalStock; stockAllocation.b2c_stock = 0"
                                    class="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                                >
                                    All to B2B
                                </button>
                                <button 
                                    type="button"
                                    @click="stockAllocation.b2b_stock = 0; stockAllocation.b2c_stock = shopifyTotalStock"
                                    class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                >
                                    All to B2C
                                </button>
                                <button 
                                    type="button"
                                    @click="stockAllocation.b2b_stock = Math.floor(shopifyTotalStock / 2); stockAllocation.b2c_stock = Math.ceil(shopifyTotalStock / 2)"
                                    class="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                                >
                                    Split 50/50
                                </button>
                            </div>
                        </div>

                        <!-- Error Display -->
                        <div v-if="shopifySearchError" class="mt-3 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                            ❌ {{ shopifySearchError }}
                        </div>
                    </div>

                    <!-- Standalone Stock Management (No Shopify Link) -->
                    <div v-if="!form.shopify_variant_id" class="md:col-span-2 border-2 border-green-200 bg-green-50 rounded-lg p-4">
                        <h4 class="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
                            📦 Standalone Stock Management
                        </h4>
                        <p class="text-xs text-gray-600 mb-4">
                            This product is not linked to Shopify. Set stock levels manually for B2B platform only.
                        </p>

                        <!-- Stock Inputs -->
                        <div class="grid grid-cols-2 gap-4 mb-3">
                            <!-- Total Stock -->
                            <div>
                                <label for="standaloneTotal" class="block text-xs font-semibold text-gray-700 mb-2">
                                    📊 Total Stock Available
                                </label>
                                <input 
                                    id="standaloneTotal" 
                                    v-model.number="standaloneStock.total_stock" 
                                    type="number" 
                                    min="0" 
                                    class="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-center font-semibold"
                                    :class="{ 'border-red-500': standaloneStockError }"
                                />
                                <div class="text-xs text-gray-600 mt-1 text-center">
                                    Total units in warehouse
                                </div>
                            </div>

                            <!-- B2B Stock -->
                            <div>
                                <label for="standaloneB2B" class="block text-xs font-semibold text-gray-700 mb-2">
                                    🏢 B2B Platform Stock
                                </label>
                                <input 
                                    id="standaloneB2B" 
                                    v-model.number="standaloneStock.b2b_stock" 
                                    type="number" 
                                    min="0" 
                                    :max="standaloneStock.total_stock"
                                    class="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-center font-semibold"
                                    :class="{ 'border-red-500': standaloneStockError }"
                                />
                                <div class="text-xs text-gray-600 mt-1 text-center">
                                    Available for B2B customers
                                </div>
                            </div>
                        </div>

                        <!-- Stock Summary -->
                        <div class="p-3 bg-white border border-green-200 rounded">
                            <div class="flex justify-between items-center text-xs mb-2">
                                <span class="text-gray-700">B2B Allocation:</span>
                                <span class="font-bold" :class="standaloneStockError ? 'text-red-600' : 'text-green-900'">
                                    {{ standaloneStock.b2b_stock }} / {{ standaloneStock.total_stock }}
                                </span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                                <div class="h-2 rounded-full transition-all" 
                                    :class="standaloneStockError ? 'bg-red-500' : 'bg-green-600'"
                                    :style="{ width: standaloneStock.total_stock > 0 ? `${Math.min((standaloneStock.b2b_stock / standaloneStock.total_stock) * 100, 100)}%` : '0%' }">
                                </div>
                            </div>
                            <div class="text-xs text-gray-600">
                                Reserved: {{ Math.max(0, standaloneStock.total_stock - standaloneStock.b2b_stock) }} units
                            </div>
                        </div>

                        <!-- Error Message -->
                        <div v-if="standaloneStockError" class="mt-3 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700">
                            ⚠️ {{ standaloneStockError }}
                        </div>

                        <!-- Quick Actions -->
                        <div class="mt-3 flex gap-2 text-xs">
                            <button 
                                type="button"
                                @click="standaloneStock.b2b_stock = standaloneStock.total_stock"
                                :disabled="standaloneStock.total_stock === 0"
                                class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
                            >
                                Make All B2B Available
                            </button>
                            <button 
                                type="button"
                                @click="standaloneStock.total_stock = 0; standaloneStock.b2b_stock = 0"
                                class="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                            >
                                Clear Stock
                            </button>
                        </div>

                        <!-- Info Note -->
                        <div class="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                            💡 <strong>Tip:</strong> Link this product to Shopify to enable automatic stock syncing between B2B and B2C channels.
                        </div>
                    </div>

                    <!-- Part Number -->
                    <div>
                        <label for="partNumber" class="block text-sm font-medium text-gray-700 mb-2">
                            Part Number
                        </label>
                        <input id="partNumber" v-model="form.part_number" type="text"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter part number" />
                    </div>
                </div>
            </div>

            <!-- Pricing -->
            <div>
                <h3 class="text-lg font-semibold mb-4">Pricing</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Price -->
                    <div>
                        <label for="price" class="block text-sm font-medium text-gray-700 mb-2">
                            Price
                        </label>
                        <input id="price" v-model.number="form.price" type="number" step="0.01" min="0" required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00" />
                    </div>

                    <!-- Original Price -->
                    <div>
                        <label for="originalPrice" class="block text-sm font-medium text-gray-700 mb-2">
                            Original Price
                        </label>
                        <input id="originalPrice" v-model.number="form.original_price" type="number" step="0.01" min="0"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00" />
                    </div>

                    <!-- Coming Soon Toggle -->
                    <div class="md:col-span-2">
                        <div class="border border-yellow-200 bg-yellow-50 rounded-lg p-4 flex flex-col gap-2">
                            <label class="flex items-center">
                                <input v-model="form.coming_soon" type="checkbox"
                                    class="mr-2 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded" />
                                <span class="text-sm font-medium text-gray-800">Coming Soon</span>
                            </label>
                            <p class="text-xs text-gray-600">
                                Mark this product as coming soon (not yet available for purchase)
                            </p>
                        </div>
                    </div>

                    <!-- Unit -->
                    <div>
                        <label for="unit" class="block text-sm font-medium text-gray-700 mb-2">
                            Unit
                        </label>
                        <input id="unit" v-model="form.unit" type="text"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., piece, kg, meter" />
                    </div>

                    <!-- Min Order Quantity -->
                    <div>
                        <label for="minOrderQuantity" class="block text-sm font-medium text-gray-700 mb-2">
                            Minimum Order Quantity
                        </label>
                        <input id="minOrderQuantity" v-model.number="form.min_order_quantity" type="number" min="1"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="1" />
                    </div>

                    <!-- Max Order Quantity -->
                    <div>
                        <label for="maxOrderQuantity" class="block text-sm font-medium text-gray-700 mb-2">
                            Maximum Order Quantity
                        </label>
                        <input id="maxOrderQuantity" v-model.number="form.max_order_quantity" type="number" min="1"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="No limit" />
                    </div>
                </div>
            </div>

            <!-- Physical Properties -->
            <div>
                <h3 class="text-lg font-semibold mb-4">Physical Properties</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <!-- Weight -->
                    <div>
                        <label for="weight" class="block text-sm font-medium text-gray-700 mb-2">
                            Weight (kg)
                        </label>
                        <input id="weight" v-model.number="form.weight" type="number" step="0.01" min="0"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00" />
                    </div>

                    <!-- Dimensions -->
                    <div>
                        <label for="length" class="block text-sm font-medium text-gray-700 mb-2">
                            Length (cm)
                        </label>
                        <input id="length" v-model.number="form.dimensions.length" type="number" step="0.01" min="0"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00" />
                    </div>

                    <div>
                        <label for="width" class="block text-sm font-medium text-gray-700 mb-2">
                            Width (cm)
                        </label>
                        <input id="width" v-model.number="form.dimensions.width" type="number" step="0.01" min="0"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00" />
                    </div>

                    <div>
                        <label for="height" class="block text-sm font-medium text-gray-700 mb-2">
                            Height (cm)
                        </label>
                        <input id="height" v-model.number="form.dimensions.height" type="number" step="0.01" min="0"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00" />
                    </div>
                </div>
            </div>

            <!-- Tags -->
            <div>
                <h3 class="text-lg font-semibold mb-4">Tags</h3>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Product Tags
                    </label>
                    <div class="space-y-2">
                        <div v-for="(_, index) in form.tags" :key="index" class="flex gap-2">
                            <input v-model="form.tags[index]" type="text" placeholder="Enter tag"
                                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <button type="button" @click="removeTag(index)"
                                class="px-3 py-2 text-red-600 hover:text-red-800">
                                Remove
                            </button>
                        </div>
                        <button type="button" @click="addTag" class="text-blue-600 hover:text-blue-800 text-sm">
                            + Add Tag
                        </button>
                    </div>
                </div>
            </div>

            <!-- Specifications -->
            <div>
                <h3 class="text-lg font-semibold mb-4">Specifications</h3>
                <div class="space-y-2">
                    <div v-for="(spec, index) in form.specifications" :key="index" class="flex gap-2">
                        <input v-model="spec.key" type="text"
                            placeholder="Property name"
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <input v-model="spec.value" type="text"
                            placeholder="Value"
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <button type="button" @click="removeSpecification(index)"
                            class="px-3 py-2 text-red-600 hover:text-red-800">
                            Remove
                        </button>
                    </div>
                    <button type="button" @click="addSpecification" class="text-blue-600 hover:text-blue-800 text-sm">
                        + Add Specification
                    </button>
                </div>
            </div>

            <!-- Submit Buttons -->
            <div class="flex justify-end space-x-4 pt-6 border-t">
                <button type="button" @click="$emit('cancel')"
                    class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                    Cancel
                </button>
                <button type="submit" :disabled="loading || !!stockAllocationError || !!standaloneStockError"
                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                    {{ loading ? 'Saving...' : (isEditing ? 'Update Product' : 'Add Product') }}
                </button>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useProductStore } from '../../stores/products'
import { useCategoryStore } from '../../stores/categories'
import type { Product } from '../../types'
import ImageUpload from './ImageUpload.vue'

interface Props {
    product?: Product | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
    cancel: []
    save: []
}>()

const productStore = useProductStore()
const categoryStore = useCategoryStore()
const loading = ref(false)

// Get available categories sorted by display order
const availableCategories = computed(() => {
    return categoryStore.categories
        .filter(cat => cat.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder)
})

// Helper to show indented category names for nested structure
const getIndentedCategoryName = (category: any) => {
    if (!category.parentId) return category.name
    return `└ ${category.name}`
}

// Inventory linking variables
const enableInventoryLinking = ref(false)
const selectedInventoryProduct = ref<any>(null)

// Shopify product search variables
const shopifySearchQuery = ref('')
const shopifySearchResults = ref<any[]>([])
const shopifySearchLoading = ref(false)
const shopifySearchError = ref('')

// Stock allocation variables
const shopifyTotalStock = ref(0)  // Total stock from Shopify (read-only)
const stockAllocation = reactive({
    b2b_stock: 0,
    b2c_stock: 0,
})

// Standalone stock management (for products without Shopify link)
const standaloneStock = reactive({
    total_stock: 0,
    b2b_stock: 0,
})

// Computed validation for stock allocation
const stockAllocationError = computed(() => {
    if (!form.shopify_variant_id) return ''
    if (stockAllocation.b2b_stock < 0 || stockAllocation.b2c_stock < 0) {
        return 'Stock values cannot be negative'
    }
    const total = stockAllocation.b2b_stock + stockAllocation.b2c_stock
    if (total > shopifyTotalStock.value) {
        return `Total allocation (${total}) exceeds available stock (${shopifyTotalStock.value})`
    }
    return ''
})

// Computed validation for standalone stock
const standaloneStockError = computed(() => {
    if (form.shopify_variant_id) return '' // Only validate when no Shopify link
    if (standaloneStock.total_stock < 0 || standaloneStock.b2b_stock < 0) {
        return 'Stock values cannot be negative'
    }
    if (standaloneStock.b2b_stock > standaloneStock.total_stock) {
        return `B2B stock (${standaloneStock.b2b_stock}) cannot exceed total stock (${standaloneStock.total_stock})`
    }
    return ''
})

// Form data structure - use snake_case to match backend
const form = reactive({
    id: '', // Will be set for editing, ignored for new products
    name: '',
    description: '',
    price: 0,
    original_price: 0,
    image_url: '',
    images: [] as string[],
    category_id: '',
    coming_soon: false,
    brand: '',
    part_number: '',
    specifications: [] as Array<{ key: string; value: string }>,
    unit: '',
    min_order_quantity: 1,
    max_order_quantity: null as number | null,
    tags: [] as string[],
    weight: null as number | null,
    dimensions: {
        length: 0,
        width: 0,
        height: 0,
        unit: 'cm'
    },
    // Shopify inventory linking fields - DEPRECATED, stored in product_inventory table
    shopify_product_id: '',
    shopify_variant_id: '',
    shopify_inventory_item_id: '', // ✅ CRITICAL: Required for inventory sync
})

const isEditing = computed(() => !!props.product)


// Initialize form data when editing
onMounted(async () => {
    // Load categories
    await categoryStore.fetchCategories()

    if (props.product) {
        Object.assign(form, {
            id: props.product.id,
            name: props.product.name,
            description: props.product.description || '',
            price: props.product.price,
            original_price: props.product.original_price || 0,
            image_url: props.product.image_url || '',
            category_id: props.product.category_id || '',
            coming_soon: props.product.coming_soon === 1,
            brand: props.product.brand || '',
            part_number: props.product.part_number || '',
            images: props.product.images || [],
            specifications: props.product.specifications || [],
            unit: props.product.unit || '',
            min_order_quantity: props.product.min_order_quantity || 1,
            max_order_quantity: props.product.max_order_quantity || null,
            tags: props.product.tags || [],
            weight: props.product.weight || null,
            dimensions: props.product.dimensions || { length: 0, width: 0, height: 0, unit: 'cm' },
            // Shopify inventory linking fields - from product_inventory table if available
            shopify_product_id: props.product.inventory?.shopify_product_id || '',
            shopify_variant_id: props.product.inventory?.shopify_variant_id || '',
            shopify_inventory_item_id: props.product.inventory?.shopify_inventory_item_id || '',
        })

        // Enable inventory linking if product has inventory data
        enableInventoryLinking.value = !!(props.product.inventory?.shopify_variant_id || props.product.inventory?.shopify_product_id)

        // Load existing stock allocation if available
        if (props.product.inventory) {
            shopifyTotalStock.value = props.product.inventory.total_stock || 0
            stockAllocation.b2b_stock = props.product.inventory.b2b_stock || 0
            stockAllocation.b2c_stock = props.product.inventory.b2c_stock || 0
            
            // Also load standalone stock values (for products without Shopify link)
            standaloneStock.total_stock = props.product.inventory.total_stock || 0
            standaloneStock.b2b_stock = props.product.inventory.b2b_stock || 0
        }

        // If editing and has inventory link, load inventory info
        if (props.product.inventory?.shopify_variant_id) {
            loadInventoryInfo(props.product.inventory.shopify_variant_id)
        }
    }

    // Initialize the rich text editor after Vue has rendered
    await nextTick()
    if (descriptionEditor.value) {
        if (form.description) {
            descriptionEditor.value.innerHTML = form.description
        } else {
            descriptionEditor.value.innerHTML = ''
        }
    }
})

const addTag = () => {
    form.tags.push('')
}

const removeTag = (index: number) => {
    form.tags.splice(index, 1)
}

const addSpecification = () => {
    form.specifications.push({ key: '', value: '' })
}

const removeSpecification = (index: number) => {
    form.specifications.splice(index, 1)
}

// Rich text editor methods
const descriptionEditor = ref<HTMLElement | null>(null)

const formatText = (command: string) => {
    document.execCommand(command, false, undefined)
    // Keep focus on the editor
    if (descriptionEditor.value) {
        descriptionEditor.value.focus()
    }
}

const onEditorFocus = () => {
    // Clear placeholder content when focused if empty
    if (descriptionEditor.value && descriptionEditor.value.textContent?.trim() === '') {
        descriptionEditor.value.innerHTML = ''
    }
}

const onDescriptionChange = () => {
    if (descriptionEditor.value) {
        // Get the HTML content and store it in the form
        let content = descriptionEditor.value.innerHTML

        // Clean up empty paragraphs and unnecessary HTML
        content = content
            .replace(/<p><br><\/p>/g, '<br>')
            .replace(/<p><\/p>/g, '')
            .replace(/^<br>/, '') // Remove leading breaks
            .replace(/<br>$/, '') // Remove trailing breaks
            .replace(/^<div><br><\/div>$/, '') // Remove empty div with br
            .replace(/^<div><\/div>$/, '') // Remove empty div

        // If content is just whitespace or empty tags, clear it
        if (content.replace(/<[^>]*>/g, '').trim() === '') {
            content = ''
        }

        form.description = content
    }
}


// Generate a random product SKU for standalone products
const generateRandomSKU = () => {
    const timestamp = Date.now().toString(36)
    const randomString = Math.random().toString(36).substring(2, 8)
    return `SKU-${timestamp}-${randomString}`.toUpperCase()
}

const loadInventoryInfo = async (shopifyVariantId: string) => {
    try {
        const inventoryInfo = await productStore.getInventoryInfo(shopifyVariantId)
        if (inventoryInfo) {
            selectedInventoryProduct.value = inventoryInfo

            // If we're editing an existing product, keep the current form stock value
            // (don't sync from inventory service as stock management is handled by Firebase functions)
        }
    } catch (error) {
        console.error('Error loading inventory info:', error)
    }
}

// ============================================================================
// SHOPIFY PRODUCT SEARCH FUNCTIONS
// ============================================================================

/**
 * Search Shopify products via API Gateway
 * Sends query to: API Gateway → Shopify Sync Service → Shopify GraphQL API
 */
const searchShopifyProducts = async () => {
    if (!shopifySearchQuery.value.trim()) {
        shopifySearchError.value = 'Please enter a search query'
        return
    }

    shopifySearchLoading.value = true
    shopifySearchError.value = ''
    shopifySearchResults.value = []

    try {
        const API_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8787'
        
        // Build query params
        const params = new URLSearchParams({ 
            query: shopifySearchQuery.value.trim(), 
            limit: '20' 
        })
        
        const response = await fetch(`${API_URL}/api/shopify/shopify/products?${params}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`Search failed: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()
        
        if (result.success && result.data) {
            shopifySearchResults.value = result.data
            
            if (result.data.length === 0) {
                shopifySearchError.value = 'No products found. Try a different search term.'
            }
        } else {
            shopifySearchError.value = result.error || 'Search failed'
        }
    } catch (error: any) {
        console.error('Shopify search error:', error)
        shopifySearchError.value = error.message || 'Failed to search Shopify products'
    } finally {
        shopifySearchLoading.value = false
    }
}

/**
 * Select a Shopify variant and populate form fields
 * Extracts numeric IDs from Shopify GID format
 */
const selectShopifyVariant = (variant: any) => {
    // Extract numeric IDs from Shopify GID format
    form.shopify_product_id = extractShopifyId(variant.productId)
    form.shopify_variant_id = extractShopifyId(variant.id)
    form.shopify_inventory_item_id = extractShopifyId(variant.inventoryItemId)
    
    // Capture total stock from Shopify
    shopifyTotalStock.value = variant.inventoryQuantity || 0
    
    // Initialize stock allocation
    // If editing existing product with inventory, preserve existing allocation
    if (props.product?.inventory) {
        stockAllocation.b2b_stock = props.product.inventory.b2b_stock || 0
        stockAllocation.b2c_stock = props.product.inventory.b2c_stock || 0
    } else {
        // For new products, allocate all stock to B2C by default
        stockAllocation.b2b_stock = 0
        stockAllocation.b2c_stock = shopifyTotalStock.value
    }
    
    // Enable inventory linking when Shopify product is linked
    enableInventoryLinking.value = true
    
    // Clear search results
    shopifySearchResults.value = []
    shopifySearchQuery.value = ''
    
    console.log('✅ Selected Shopify variant:', {
        productId: form.shopify_product_id,
        variantId: form.shopify_variant_id,
        inventoryItemId: form.shopify_inventory_item_id,
        totalStock: shopifyTotalStock.value,
        allocation: { ...stockAllocation }
    })
}

/**
 * Extract numeric ID from Shopify GID format
 * Examples:
 * - "gid://shopify/ProductVariant/123" → "123"
 * - "123" → "123"
 */
const extractShopifyId = (gid: string): string => {
    if (!gid) return ''
    if (gid.startsWith('gid://')) {
        return gid.split('/').pop() || gid
    }
    return gid
}

/**
 * Delink Shopify product - removes all Shopify variant/product IDs
 */
const delinkShopifyProduct = () => {
    form.shopify_product_id = ''
    form.shopify_variant_id = ''
    form.shopify_inventory_item_id = ''
    
    // Transfer current allocation to standalone stock
    standaloneStock.total_stock = shopifyTotalStock.value || 0
    standaloneStock.b2b_stock = stockAllocation.b2b_stock || 0
    
    // Reset Shopify stock allocation
    shopifyTotalStock.value = 0
    stockAllocation.b2b_stock = 0
    stockAllocation.b2c_stock = 0
    
    // Disable inventory linking when Shopify product is delinked
    enableInventoryLinking.value = false
    
    console.log('🔗 Shopify product delinked, transferred to standalone stock:', {
        total: standaloneStock.total_stock,
        b2b: standaloneStock.b2b_stock
    })
}

const submitForm = async () => {
    loading.value = true

    try {
        // Filter out empty specifications and tags
        const cleanedSpecs = form.specifications.filter(spec => spec.key.trim() && spec.value.trim())
        const cleanedTags = form.tags.filter(tag => tag.trim())

        // Build product data object using snake_case field names (backend format)
        const productData: any = {
            name: form.name,
            description: form.description,
            price: form.price,
            category_id: form.category_id,
            specifications: cleanedSpecs,
            tags: cleanedTags,
            image_url: form.images[0] || '',
            images: form.images,
            coming_soon: form.coming_soon
        }

        // Stock is now managed via product_inventory table in Stock Management page
        // Shopify fields are stored in product_inventory table
        if (enableInventoryLinking.value) {
            productData.shopify_product_id = form.shopify_product_id
            productData.shopify_variant_id = form.shopify_variant_id
            productData.shopify_inventory_item_id = form.shopify_inventory_item_id
            
            // Include stock allocation (absolute values for B2B and B2C)
            productData.b2b_stock = stockAllocation.b2b_stock
            productData.b2c_stock = stockAllocation.b2c_stock
            productData.total_stock = shopifyTotalStock.value
        } else {
            // For standalone products (no Shopify link), generate random IDs
            if (!props.product) {
                // Only generate for new products
                productData.shopify_variant_id = generateRandomSKU()
                productData.shopify_product_id = generateRandomSKU()
            } else {
                // Keep existing IDs when editing
                productData.shopify_variant_id = form.shopify_variant_id || generateRandomSKU()
                productData.shopify_product_id = form.shopify_product_id || generateRandomSKU()
            }
            
            // Include standalone stock values (no B2C stock for standalone products)
            productData.total_stock = standaloneStock.total_stock
            productData.b2b_stock = standaloneStock.b2b_stock
            productData.b2c_stock = 0 // No B2C for standalone products
        }

        // Only add optional fields if they have meaningful values
        if (form.original_price > 0) {
            productData.original_price = form.original_price
        }
        if (form.brand.trim()) productData.brand = form.brand
        if (form.part_number.trim()) productData.part_number = form.part_number
        if (form.unit.trim()) productData.unit = form.unit
        if (form.min_order_quantity > 1) productData.min_order_quantity = form.min_order_quantity
        if (form.max_order_quantity && form.max_order_quantity > 1) productData.max_order_quantity = form.max_order_quantity
        if (form.weight && form.weight > 0) productData.weight = form.weight

        // Clean up dimensions if any dimension is greater than 0
        if (form.dimensions.length > 0 || form.dimensions.width > 0 || form.dimensions.height > 0) {
            productData.dimensions = form.dimensions
        }

        if (props.product) {
            // Update existing product
            await productStore.updateProduct(props.product.id, productData)
        } else {
            // Add new product
            await productStore.addProduct(productData)
        }

        emit('save')
    } catch (error) {
        console.error('Error saving product:', error)
        alert('Failed to save product. Please try again.')
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
/* Rich text editor styles */
[contenteditable]:empty::before {
    content: attr(placeholder);
    color: #9ca3af;
}

[contenteditable]:focus::before {
    content: none;
}

/* Basic formatting styles for the rich text content */
[contenteditable] strong {
    font-weight: bold;
}

[contenteditable] em {
    font-style: italic;
}

[contenteditable] u {
    text-decoration: underline;
}

[contenteditable] ul {
    margin: 1rem 0;
    padding-left: 2rem;
}

[contenteditable] li {
    margin: 0.25rem 0;
}
</style>
