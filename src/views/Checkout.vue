<template>
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50/20">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <!-- Header -->
            <div class="text-center mb-6 sm:mb-8">
                <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">{{ $t('checkout.title') }}</h1>
                <p class="text-gray-600 mt-2 text-sm sm:text-base">{{ $t('checkout.subtitle') }}</p>
            </div>

            <!-- Empty Cart State -->
            <div v-if="cartStore.itemCount === 0" class="bg-white rounded-lg sm:rounded-xl shadow-lg p-6 sm:p-8 text-center">
                <svg class="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9m0 0l1.5-6M7 13h10" />
                </svg>
                <h3 class="text-base sm:text-lg font-medium text-gray-900 mb-2">{{ $t('checkout.emptyCart.title') }}</h3>
                <p class="text-sm sm:text-base text-gray-500 mb-6">{{ $t('checkout.emptyCart.message') }}</p>
                <router-link to="/products"
                    class="inline-block bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 text-sm sm:text-base font-medium">
                    {{ $t('checkout.emptyCart.browseProducts') }}
                </router-link>
            </div>

            <!-- Checkout Form -->
            <div v-else class="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
                <!-- Left Column - Forms -->
                <div class="lg:col-span-3 space-y-4 sm:space-y-6">
                    <!-- Shipping Address -->
                    <div class="bg-white rounded-lg sm:rounded-xl shadow-xl p-4 sm:p-6 border-2 border-gray-100">
                        <!-- Form Header with Progress -->
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 pb-4 border-b-2 border-primary-200 gap-2">
                            <div>
                                <h2 class="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
                                    <svg class="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                    {{ $t('checkout.shipping.title') }}
                                </h2>
                                <p class="text-xs text-gray-600 mt-1 ml-7">Fill in your shipping details</p>
                            </div>
                            <div v-if="isAutoFilled" class="flex items-center px-3 py-1.5 bg-gradient-to-r from-success-100 to-success-200 rounded-lg border border-success-300">
                                <svg class="w-4 h-4 mr-1.5 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clip-rule="evenodd" />
                                </svg>
                                <span class="text-xs font-bold text-success-700">{{ $t('checkout.shipping.prefilled') }}</span>
                            </div>
                        </div>

                        <!-- Auto-fill Actions -->
                        <div v-if="authStore.userProfile" class="mb-4 p-3 bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-lg sm:rounded-xl">
                            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div class="flex items-start sm:items-center">
                                    <svg class="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 text-primary-500 mt-0.5 sm:mt-0" fill="currentColor"
                                        viewBox="0 0 20 20">
                                        <path fill-rule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                            clip-rule="evenodd" />
                                    </svg>
                                    <div class="ml-2 sm:ml-3">
                                        <p class="text-xs sm:text-sm text-primary-800">
                                            {{ $t('checkout.shipping.prefilledMessage') }}
                                        </p>
                                    </div>
                                </div>
                                <button @click="resetToProfileData"
                                    class="text-xs sm:text-sm text-primary-600 hover:text-primary-800 font-medium whitespace-nowrap">
                                    {{ $t('checkout.shipping.resetToProfile') }}
                                </button>
                            </div>
                        </div>

                        <form @submit.prevent="handleSubmit" class="space-y-4 sm:space-y-5">
                            <!-- Section 1: Company Information -->
                            <div class="space-y-3 sm:space-y-4">
                                <div class="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wide">Company Information</h3>
                                </div>
                                
                                <!-- Company -->
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                                        {{ $t('checkout.shipping.companyName') }}
                                        <span class="text-danger-500 ml-1">*</span>
                                    </label>
                                    <input 
                                        v-model="form.shippingAddress.company" 
                                        type="text" 
                                        required 
                                        :class="[
                                            'w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base transition-all',
                                            !form.shippingAddress.company?.trim() ? 'border-danger-300 bg-danger-50/30' : 
                                            isAutoFilled && form.shippingAddress.company ? 'border-success-300 bg-success-50/30' : 'border-gray-300 bg-white'
                                        ]" 
                                        :placeholder="$t('checkout.shipping.companyPlaceholder')" 
                                    />
                                </div>

                                <!-- Contact Person -->
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                                        {{ $t('checkout.shipping.contactPerson') }}
                                        <span class="text-danger-500 ml-1">*</span>
                                    </label>
                                    <input 
                                        v-model="form.shippingAddress.contactPerson" 
                                        type="text" 
                                        required 
                                        :class="[
                                            'w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base transition-all',
                                            !form.shippingAddress.contactPerson?.trim() ? 'border-danger-300 bg-danger-50/30' : 
                                            isAutoFilled && form.shippingAddress.contactPerson ? 'border-success-300 bg-success-50/30' : 'border-gray-300 bg-white'
                                        ]" 
                                        :placeholder="$t('checkout.shipping.contactPlaceholder')" 
                                    />
                                </div>
                            </div>

                            <!-- Section 2: Delivery Address -->
                            <div class="space-y-3 sm:space-y-4">
                                <div class="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wide">Delivery Address</h3>
                                </div>

                                <!-- Street Address -->
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                                        {{ $t('checkout.shipping.streetAddress') }}
                                        <span class="text-danger-500 ml-1">*</span>
                                    </label>
                                    <input 
                                        v-model="form.shippingAddress.street" 
                                        type="text" 
                                        required 
                                        :class="[
                                            'w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base transition-all',
                                            !form.shippingAddress.street.trim() ? 'border-danger-300 bg-danger-50/30' : 
                                            isAutoFilled && form.shippingAddress.street ? 'border-success-300 bg-success-50/30' : 'border-gray-300 bg-white'
                                        ]" 
                                        :placeholder="$t('checkout.shipping.streetPlaceholder')" 
                                    />
                                </div>

                                <!-- City, State, Zip -->
                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                    <div class="sm:col-span-2">
                                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                                            {{ $t('checkout.shipping.city') }}
                                            <span class="text-danger-500 ml-1">*</span>
                                        </label>
                                        <input 
                                            v-model="form.shippingAddress.city" 
                                            type="text" 
                                            required 
                                            :class="[
                                                'w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base transition-all',
                                                !form.shippingAddress.city.trim() ? 'border-danger-300 bg-danger-50/30' : 
                                                isAutoFilled && form.shippingAddress.city ? 'border-success-300 bg-success-50/30' : 'border-gray-300 bg-white'
                                            ]" 
                                            :placeholder="$t('checkout.shipping.cityPlaceholder')" 
                                        />
                                    </div>
                                    <div>
                                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                                            {{ $t('checkout.shipping.zip') }}
                                            <span class="text-danger-500 ml-1">*</span>
                                        </label>
                                        <input 
                                            v-model="form.shippingAddress.zipCode" 
                                            type="text" 
                                            required 
                                            :class="[
                                                'w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base transition-all',
                                                !form.shippingAddress.zipCode.trim() ? 'border-danger-300 bg-danger-50/30' : 
                                                isAutoFilled && form.shippingAddress.zipCode ? 'border-success-300 bg-success-50/30' : 'border-gray-300 bg-white'
                                            ]" 
                                            :placeholder="$t('checkout.shipping.zipPlaceholder')" 
                                        />
                                    </div>
                                </div>

                                <!-- Country -->
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                                        {{ $t('checkout.shipping.country') }}
                                        <span class="text-danger-500 ml-1">*</span>
                                    </label>
                                    <select 
                                        v-model="form.shippingAddress.country" 
                                        required 
                                        :class="[
                                            'w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base transition-all',
                                            !form.shippingAddress.country ? 'border-danger-300 bg-danger-50/30' : 
                                            isAutoFilled && form.shippingAddress.country ? 'border-success-300 bg-success-50/30' : 'border-gray-300 bg-white'
                                        ]"
                                    >
                                        <option value="">{{ $t('checkout.shipping.selectCountry') }}</option>
                                        <option value="NL">{{ $t('checkout.countries.NL') }}</option>
                                        <option value="BE">{{ $t('checkout.countries.BE') }}</option>
                                        <option value="DE">{{ $t('checkout.countries.DE') }}</option>
                                        <option value="FR">{{ $t('checkout.countries.FR') }}</option>
                                        <option value="GB">{{ $t('checkout.countries.GB') }}</option>
                                        <option value="ES">{{ $t('checkout.countries.ES') }}</option>
                                        <option value="IT">{{ $t('checkout.countries.IT') }}</option>
                                        <option value="AT">{{ $t('checkout.countries.AT') }}</option>
                                        <option value="CH">{{ $t('checkout.countries.CH') }}</option>
                                        <option value="US">{{ $t('checkout.countries.US') }}</option>
                                    </select>
                                </div>

                                <!-- Phone -->
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                                        {{ $t('checkout.shipping.phone') }}
                                        <span class="text-gray-400 text-xs font-normal ml-1">(Optional)</span>
                                    </label>
                                    <input 
                                        v-model="form.shippingAddress.phone" 
                                        type="tel" 
                                        :class="[
                                            'w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base transition-all',
                                            isAutoFilled && form.shippingAddress.phone ? 'border-success-300 bg-success-50/30' : 'border-gray-300 bg-white'
                                        ]" 
                                        :placeholder="$t('checkout.shipping.phonePlaceholder')" 
                                    />
                                </div>
                            </div>

                            <!-- Section 3: Additional Information -->
                            <div class="space-y-3 sm:space-y-4">
                                <div class="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                    <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wide">Additional Information</h3>
                                </div>

                                <!-- Order Notes -->
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                                        {{ $t('checkout.shipping.notes') }}
                                        <span class="text-gray-400 text-xs font-normal ml-1">(Optional)</span>
                                    </label>
                                    <textarea 
                                        v-model="form.notes" 
                                        rows="4"
                                        class="w-full px-4 py-3 border-2 border-gray-300 bg-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base transition-all resize-none"
                                        :placeholder="$t('checkout.shipping.notesPlaceholder')"
                                    ></textarea>
                                    <p class="mt-1 text-xs text-gray-500">Add any special delivery instructions or requirements</p>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Right Column - Order Summary (Wider) -->
                <div class="lg:col-span-2">
                    <div class="bg-white rounded-lg sm:rounded-xl shadow-xl p-5 sm:p-7 sticky top-4 sm:top-6 border-2 border-primary-100">
                        <!-- Summary Header with Stats -->
                        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 pb-5 border-b-2 border-primary-200 gap-3">
                            <h2 class="text-xl sm:text-2xl font-bold text-gray-900">{{ $t('checkout.summary.title') }}</h2>
                            <div class="flex items-center gap-2 sm:gap-3">
                                
                                <!-- Toggle Button -->
                                <button 
                                    @click="toggleCartItems"
                                    class="inline-flex items-center px-3 py-2 text-primary-700 bg-white border-2 border-primary-300 rounded-lg hover:bg-primary-50 transition-colors"
                                    :title="showCartItems ? 'Hide items' : 'Show items'"
                                >
                                    <svg 
                                        :class="['w-4 h-4 mr-1.5 transition-transform', showCartItems ? 'rotate-180' : '']" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                    <span class="text-sm font-medium">{{ showCartItems ? 'Hide' : 'Show' }}</span>
                                </button>
                            </div>
                        </div>

                        <!-- Collapsible Order Items -->
                        <Transition name="expand-cart">
                            <div v-if="showCartItems" class="mb-5">
                                <div class="max-h-[400px] sm:max-h-[600px] overflow-y-auto space-y-2 sm:space-y-3 pr-1 sm:pr-2 cart-items-scroll">
                                    <div v-for="item in cartStore.items" :key="item.productId"
                                        class="flex items-start gap-2 sm:gap-4 p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-primary-50/30 rounded-lg sm:rounded-xl border-2 border-gray-200 hover:border-primary-300 hover:shadow-md transition-all">
                                        <div class="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-lg sm:rounded-xl overflow-hidden border-2 border-gray-300">
                                            <img v-if="item.product.image_url" :src="item.product.image_url"
                                                :alt="item.product.name" class="w-full h-full object-cover" />
                                            <div v-else class="w-full h-full flex items-center justify-center">
                                                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-sm sm:text-base font-bold text-gray-900 mb-1.5 sm:mb-2 leading-snug line-clamp-2">
                                                {{ item.product.name }}
                                            </p>
                                            <div class="flex flex-col gap-2 sm:gap-2.5">
                                                <div class="flex items-center gap-1.5 sm:gap-2.5">
                                                    <!-- Inline Quantity Editor -->
                                                    <div class="flex items-center border-2 border-primary-200 rounded-lg bg-white shadow-sm">
                                                        <button 
                                                            @click="decreaseQuantity(item.productId, item.quantity)"
                                                            :disabled="item.quantity <= (item.product.min_order_quantity || 1)"
                                                            class="px-2 sm:px-3 py-1 sm:py-1.5 text-primary-600 hover:bg-primary-50 disabled:opacity-30 transition-colors text-sm font-bold"
                                                        >
                                                            −
                                                        </button>
                                                        <input 
                                                            :value="item.quantity"
                                                            @change="updateQuantity(item.productId, $event)"
                                                            type="number" 
                                                            :min="item.product.min_order_quantity || 1"
                                                            class="w-10 sm:w-14 px-1 sm:px-2 py-1 sm:py-1.5 text-center border-0 text-xs sm:text-sm font-bold focus:ring-0"
                                                        />
                                                        <button 
                                                            @click="increaseQuantity(item.productId, item.quantity)"
                                                            :disabled="item.quantity >= (item.product.max_order_quantity || 999)"
                                                            class="px-2 sm:px-3 py-1 sm:py-1.5 text-primary-600 hover:bg-primary-50 disabled:opacity-30 transition-colors text-sm font-bold"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <span class="text-xs sm:text-sm text-gray-500 font-medium">×</span>
                                                    <span class="text-xs sm:text-sm font-semibold text-gray-700">€{{ formatPrice(item.price) }}</span>
                                                </div>
                                                <div class="flex items-center justify-between gap-2 sm:gap-3">
                                                    <span class="text-sm sm:text-base font-bold text-primary-700">€{{ formatPrice(item.price * item.quantity) }}</span>
                                                    <button 
                                                        @click="removeItem(item.productId)"
                                                        class="p-1 sm:p-1.5 text-danger-500 hover:text-danger-700 hover:bg-danger-50 rounded-lg transition-colors"
                                                        :title="'Remove ' + item.product.name"
                                                    >
                                                        <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                            <p v-if="item.product.inventory?.shopify_variant_id" class="text-xs text-gray-500 mt-1 sm:mt-2 font-mono bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded inline-block">
                                                SKU: {{ item.product.inventory.shopify_variant_id }}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Transition>

                        <!-- Price Breakdown -->
                        <div class="space-y-3 mb-6 bg-gradient-to-br from-gray-50 to-primary-50/30 p-4 rounded-xl border-2 border-gray-200">
                            <div class="flex justify-between text-base">
                                <span class="text-gray-700 font-medium">{{ $t('checkout.summary.subtotal', {
                                    count:
                                    cartStore.itemCount }) }}</span>
                                <span class="text-gray-900 font-semibold">€{{ formatPrice(cartStore.subtotal) }}</span>
                            </div>
                            <div class="flex justify-between text-base">
                                <span class="text-gray-700 font-medium">{{ $t('checkout.summary.shipping', {
                                    weight:
                                    cartStore.totalWeight.toFixed(2) }) }}</span>
                                <span class="text-gray-900 font-semibold">€{{ formatPrice(cartStore.shippingCost) }}</span>
                            </div>
                            <div v-if="cartStore.shouldShowVAT" class="flex justify-between text-base">
                                <span class="text-gray-700 font-medium">{{ $t('checkout.summary.vat') }}</span>
                                <span class="text-gray-900 font-semibold">€{{ formatPrice(cartStore.tax) }}</span>
                            </div>
                            <hr class="border-gray-300 border-t-2">
                            <div class="flex justify-between text-xl font-bold pt-1">
                                <span class="text-gray-900">{{ $t('checkout.summary.total') }}</span>
                                <span class="bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">€{{ formatPrice(cartStore.grandTotal) }}</span>
                            </div>
                        </div>

                        <!-- Payment Info -->
                        <div class="bg-blue-50 p-4 rounded-md mb-6">
                            <div class="flex">
                                <svg class="flex-shrink-0 w-5 h-5 text-blue-400" fill="currentColor"
                                    viewBox="0 0 20 20">
                                    <path fill-rule="evenodd"
                                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                        clip-rule="evenodd" />
                                </svg>
                                <div class="ml-3">
                                    <h4 class="text-sm font-medium text-blue-800">
                                        {{ $t('checkout.summary.invoicePayment') }}
                                    </h4>
                                    <p class="text-sm text-blue-700 mt-1">
                                        {{ $t('checkout.summary.invoiceMessage') }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Submit Button -->
                        <button 
                            @click="handleSubmit" 
                            :disabled="!isFormValid || orderStore.isLoading || cartStore.itemCount === 0"
                            :class="[
                                'w-full py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center font-medium',
                                isFormValid && !orderStore.isLoading && cartStore.itemCount > 0
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            ]"
                        >
                            <svg v-if="orderStore.isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                </path>
                            </svg>
                            <span v-if="orderStore.isLoading">{{ $t('checkout.summary.creatingInvoice') }}</span>
                            <span v-else>{{ $t('checkout.summary.placeOrder') }}</span>
                        </button>

                        <!-- Validation Message -->
                        <div v-if="!isFormValid && !orderStore.isLoading" class="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                            <div class="flex">
                                <svg class="flex-shrink-0 w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                </svg>
                                <div class="ml-3">
                                    <p class="text-sm text-orange-800">
                                        {{ $t('checkout.validation.fillRequired') }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Error Message -->
                        <div v-if="orderStore.error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p class="text-sm text-red-600">{{ orderStore.error }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Success Modal -->
        <div v-if="showSuccessModal" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
            <!-- Backdrop -->
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

            <!-- Modal Panel -->
            <div
                class="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-10">
                <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div class="sm:flex sm:items-start">
                        <div
                            class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                            <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3 class="text-lg leading-6 font-medium text-gray-900">
                                {{ $t('checkout.success.title') }}
                            </h3>
                            <div class="mt-2">
                                <p class="text-sm text-gray-500">
                                    {{ $t('checkout.success.message') }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <a v-if="invoiceUrl" :href="invoiceUrl" target="_blank"
                        class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm">
                        {{ $t('checkout.success.viewInvoice') }}
                    </a>
                    <button @click="closeSuccessModal"
                        class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                        {{ $t('checkout.success.continueShopping') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../stores/cart'
import { useOrderStore } from '../stores/orders'
import { useAuthStore } from '../stores/auth'
import type { ShippingAddress } from '../types'

const router = useRouter()
const cartStore = useCartStore()
const orderStore = useOrderStore()
const authStore = useAuthStore()

const showSuccessModal = ref(false)
const invoiceUrl = ref('')
const isAutoFilled = ref(false)
const showCartItems = ref(true) // Show cart items by default

// Form data
const form = ref({
    shippingAddress: {
        company: '',
        contactPerson: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        phone: ''
    } as ShippingAddress,
    notes: ''
})

// Country name to code mapping for dropdown compatibility
const countryNameToCode: Record<string, string> = {
    'belgium': 'BE',
    'nederland': 'NL',
    'netherlands': 'NL',
    'germany': 'DE',
    'deutschland': 'DE',
    'france': 'FR',
    'frankrijk': 'FR',
    'united kingdom': 'GB',
    'uk': 'GB',
    'spain': 'ES',
    'spanje': 'ES',
    'españa': 'ES',
    'italy': 'IT',
    'italië': 'IT',
    'italia': 'IT',
    'austria': 'AT',
    'österreich': 'AT',
    'oostenrijk': 'AT',
    'switzerland': 'CH',
    'zwitserland': 'CH',
    'schweiz': 'CH',
    'suisse': 'CH',
    'united states': 'US',
    'usa': 'US',
}

// Convert country name to code (handles both full names and codes)
const normalizeCountryCode = (country: string | undefined): string => {
    if (!country) return ''
    const upper = country.toUpperCase()
    // If already a valid 2-letter code, return it
    if (upper.length === 2 && ['BE', 'NL', 'DE', 'FR', 'GB', 'ES', 'IT', 'AT', 'CH', 'US'].includes(upper)) {
        return upper
    }
    // Try to map from full name
    return countryNameToCode[country.toLowerCase()] || ''
}

// Function to fill form with user profile data
const fillFromProfile = () => {
    if (authStore.userProfile) {
        const profile = authStore.userProfile
        const addr = profile.address

        // Pre-fill shipping address from user profile
        form.value.shippingAddress = {
            company: profile.companyName || '',
            contactPerson: `${profile.firstName} ${profile.lastName}`.trim() || '',
            street: addr?.street && addr?.houseNumber ? `${addr.street} ${addr.houseNumber}` : addr?.street || '',
            city: addr?.city || '',
            state: '', // Not stored in profile, leave empty
            zipCode: addr?.postalCode || '',
            country: normalizeCountryCode(addr?.country),
            phone: profile.phone || ''
        }

        isAutoFilled.value = true
    }
}

// Function to reset form to profile data
const resetToProfileData = () => {
    fillFromProfile()
}

// Cart management functions
const toggleCartItems = () => {
    showCartItems.value = !showCartItems.value
}

const updateQuantity = (productId: string, event: Event) => {
    const target = event.target as HTMLInputElement
    const newQuantity = parseInt(target.value)
    if (newQuantity > 0) {
        cartStore.updateQuantity(productId, newQuantity)
    }
}

const increaseQuantity = (productId: string, currentQuantity: number) => {
    cartStore.updateQuantity(productId, currentQuantity + 1)
}

const decreaseQuantity = (productId: string, currentQuantity: number) => {
    if (currentQuantity > 1) {
        cartStore.updateQuantity(productId, currentQuantity - 1)
    }
}

const removeItem = (productId: string) => {
    if (confirm('Remove this item from your cart?')) {
        cartStore.removeItem(productId)
    }
}

// Auto-fill form with user profile data on component mount
onMounted(() => {
    fillFromProfile()
})

// Enhanced form validation
const isFormValid = computed(() => {
    const addr = form.value.shippingAddress
    return addr.company?.trim() &&
        addr.contactPerson?.trim() &&
        addr.street?.trim() &&
        addr.city?.trim() &&
        addr.zipCode?.trim() &&
        addr.country &&
        cartStore.itemCount > 0
})

const formatPrice = (price: number) => {
    return price.toFixed(2)
}

const handleSubmit = async () => {
    // Prevent submission if form is invalid
    if (!isFormValid.value || orderStore.isLoading) {
        return
    }

    orderStore.clearError()

    // Tax is already calculated correctly in cart store based on user's country
    const result = await orderStore.createOrder(
        cartStore.items,
        form.value.shippingAddress,
        cartStore.subtotal,
        cartStore.tax, // Already 0 for non-Belgian customers
        cartStore.shippingCost,
        form.value.notes
    )

    if (result.success) {
        invoiceUrl.value = result.invoiceUrl || ''
        showSuccessModal.value = true
        // Clear the cart after successful order
        cartStore.clearCart()
    }
}

const closeSuccessModal = () => {
    showSuccessModal.value = false
    router.push('/products')
}
</script>

<style scoped>
/* Expand/Collapse Animation for Cart Items */
.expand-cart-enter-active,
.expand-cart-leave-active {
    transition: all 0.3s ease-in-out;
    overflow: hidden;
}

.expand-cart-enter-from,
.expand-cart-leave-to {
    max-height: 0;
    opacity: 0;
}

.expand-cart-enter-to,
.expand-cart-leave-from {
    max-height: 800px;
    opacity: 1;
}

/* Custom scrollbar for cart items - Desktop */
.cart-items-scroll::-webkit-scrollbar {
    width: 6px;
}

.cart-items-scroll::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
}

/* Mobile scrollbar - Thinner and less obtrusive */
@media (max-width: 640px) {
    .cart-items-scroll::-webkit-scrollbar {
        width: 3px;
    }
    
    .cart-items-scroll {
        scrollbar-width: thin;
        scrollbar-color: #3b82f6 #f1f5f9;
    }
}

.cart-items-scroll::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #3b82f6, #2563eb);
    border-radius: 3px;
}

.cart-items-scroll::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(to bottom, #2563eb, #1d4ed8);
}

/* Mobile touch-friendly scrolling */
@media (max-width: 640px) {
    .cart-items-scroll {
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
    }
}

/* Smooth transitions for form inputs */
input:focus,
select:focus,
textarea:focus {
    transition: all 0.2s ease-in-out;
}

/* Improve button hover states */
button:not(:disabled):hover {
    transform: translateY(-1px);
    transition: all 0.2s ease-in-out;
}

button:not(:disabled):active {
    transform: translateY(0);
}
</style>
