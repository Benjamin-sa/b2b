<template>
    <div class="min-h-screen bg-gray-50">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-900">{{ $t('checkout.title') }}</h1>
                <p class="text-gray-600 mt-2">{{ $t('checkout.subtitle') }}</p>
            </div>

            <!-- Empty Cart State -->
            <div v-if="cartStore.itemCount === 0" class="bg-white rounded-lg shadow-lg p-8 text-center">
                <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9m0 0l1.5-6M7 13h10" />
                </svg>
                <h3 class="text-lg font-medium text-gray-900 mb-2">{{ $t('checkout.emptyCart.title') }}</h3>
                <p class="text-gray-500 mb-6">{{ $t('checkout.emptyCart.message') }}</p>
                <router-link to="/products"
                    class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200">
                    {{ $t('checkout.emptyCart.browseProducts') }}
                </router-link>
            </div>

            <!-- Checkout Form -->
            <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Left Column - Forms -->
                <div class="lg:col-span-2 space-y-6">
                    <!-- Shipping Address -->
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="text-xl font-semibold text-gray-900">{{ $t('checkout.shipping.title') }}</h2>
                            <div v-if="isAutoFilled" class="flex items-center text-sm text-green-600">
                                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clip-rule="evenodd" />
                                </svg>
                                {{ $t('checkout.shipping.prefilled') }}
                            </div>
                        </div>

                        <!-- Auto-fill Actions -->
                        <div v-if="authStore.userProfile" class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center">
                                    <svg class="flex-shrink-0 w-5 h-5 text-blue-400" fill="currentColor"
                                        viewBox="0 0 20 20">
                                        <path fill-rule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                            clip-rule="evenodd" />
                                    </svg>
                                    <div class="ml-3">
                                        <p class="text-sm text-blue-800">
                                            {{ $t('checkout.shipping.prefilledMessage') }}
                                        </p>
                                    </div>
                                </div>
                                <button @click="resetToProfileData"
                                    class="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                    {{ $t('checkout.shipping.resetToProfile') }}
                                </button>
                            </div>
                        </div>

                        <form @submit.prevent="handleSubmit" class="space-y-4">
                            <!-- Company -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    {{ $t('checkout.shipping.companyName') }}
                                </label>
                                <input v-model="form.shippingAddress.company" type="text" required :class="[
                                    'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                                    isAutoFilled && form.shippingAddress.company ? 'border-green-300 bg-green-50' : 'border-gray-300'
                                ]" :placeholder="$t('checkout.shipping.companyPlaceholder')" />
                            </div>

                            <!-- Contact Person -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    {{ $t('checkout.shipping.contactPerson') }}
                                </label>
                                <input v-model="form.shippingAddress.contactPerson" type="text" required :class="[
                                    'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                                    isAutoFilled && form.shippingAddress.contactPerson ? 'border-green-300 bg-green-50' : 'border-gray-300'
                                ]" :placeholder="$t('checkout.shipping.contactPlaceholder')" />
                            </div>

                            <!-- Street Address -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    {{ $t('checkout.shipping.streetAddress') }}
                                </label>
                                <input v-model="form.shippingAddress.street" type="text" required :class="[
                                    'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                                    isAutoFilled && form.shippingAddress.street ? 'border-green-300 bg-green-50' : 'border-gray-300'
                                ]" :placeholder="$t('checkout.shipping.streetPlaceholder')" />
                            </div>

                            <!-- City, State, Zip -->
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">
                                        {{ $t('checkout.shipping.city') }}
                                    </label>
                                    <input v-model="form.shippingAddress.city" type="text" required :class="[
                                        'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                                        isAutoFilled && form.shippingAddress.city ? 'border-green-300 bg-green-50' : 'border-gray-300'
                                    ]" :placeholder="$t('checkout.shipping.cityPlaceholder')" />
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">
                                        {{ $t('checkout.shipping.state') }}
                                    </label>
                                    <input v-model="form.shippingAddress.state" type="text"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        :placeholder="$t('checkout.shipping.statePlaceholder')" />
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">
                                        {{ $t('checkout.shipping.zip') }}
                                    </label>
                                    <input v-model="form.shippingAddress.zipCode" type="text" required :class="[
                                        'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                                        isAutoFilled && form.shippingAddress.zipCode ? 'border-green-300 bg-green-50' : 'border-gray-300'
                                    ]" :placeholder="$t('checkout.shipping.zipPlaceholder')" />
                                </div>
                            </div>

                            <!-- Country -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    {{ $t('checkout.shipping.country') }}
                                </label>
                                <select v-model="form.shippingAddress.country" required :class="[
                                    'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                                    isAutoFilled && form.shippingAddress.country ? 'border-green-300 bg-green-50' : 'border-gray-300'
                                ]">
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
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    {{ $t('checkout.shipping.phone') }}
                                </label>
                                <input v-model="form.shippingAddress.phone" type="tel" :class="[
                                    'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                                    isAutoFilled && form.shippingAddress.phone ? 'border-green-300 bg-green-50' : 'border-gray-300'
                                ]" :placeholder="$t('checkout.shipping.phonePlaceholder')" />
                            </div>

                            <!-- Order Notes -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    {{ $t('checkout.shipping.notes') }}
                                </label>
                                <textarea v-model="form.notes" rows="3"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    :placeholder="$t('checkout.shipping.notesPlaceholder')"></textarea>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Right Column - Order Summary -->
                <div class="lg:col-span-1">
                    <div class="bg-white rounded-lg shadow-lg p-6 sticky top-6">
                        <h2 class="text-xl font-semibold text-gray-900 mb-4">{{ $t('checkout.summary.title') }}</h2>

                        <!-- Order Items -->
                        <div class="space-y-3 mb-6 max-h-64 overflow-y-auto">
                            <div v-for="item in cartStore.items" :key="item.productId"
                                class="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                                <div class="flex-shrink-0 w-12 h-12 bg-gray-200 rounded-md overflow-hidden">
                                    <img v-if="item.product.imageUrl" :src="item.product.imageUrl"
                                        :alt="item.product.name" class="w-full h-full object-cover" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-gray-900 truncate">
                                        {{ item.product.name }}
                                    </p>
                                    <p class="text-xs text-gray-500">
                                        {{ $t('products.card.quantity') }}: {{ item.quantity }} × €{{
                                        formatPrice(item.price) }}
                                    </p>
                                </div>
                                <div class="text-sm font-medium text-gray-900">
                                    €{{ formatPrice(item.price * item.quantity) }}
                                </div>
                            </div>
                        </div>

                        <!-- Price Breakdown -->
                        <div class="space-y-2 mb-6">
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">{{ $t('checkout.summary.subtotal', {
                                    count:
                                    cartStore.itemCount }) }}</span>
                                <span class="text-gray-900">€{{ formatPrice(cartStore.subtotal) }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">{{ $t('checkout.summary.shipping', {
                                    weight:
                                    cartStore.totalWeight.toFixed(2) }) }}</span>
                                <span class="text-gray-900">€{{ formatPrice(cartStore.shippingCost) }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">{{ $t('checkout.summary.vat') }}</span>
                                <span class="text-gray-900">€{{ formatPrice(cartStore.tax) }}</span>
                            </div>
                            <hr class="border-gray-200">
                            <div class="flex justify-between text-lg font-semibold">
                                <span class="text-gray-900">{{ $t('checkout.summary.total') }}</span>
                                <span class="text-gray-900">€{{ formatPrice(cartStore.grandTotal) }}</span>
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
                        <button @click="handleSubmit" :disabled="!isFormValid || orderStore.isLoading"
                            class="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center">
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

// Function to fill form with user profile data
const fillFromProfile = () => {
    if (authStore.userProfile) {
        const profile = authStore.userProfile
        const addr = profile.address

        // Pre-fill shipping address from user profile
        form.value.shippingAddress = {
            company: profile.companyName || '',
            contactPerson: `${profile.firstName} ${profile.lastName}`.trim() || '',
            street: addr.street && addr.houseNumber ? `${addr.street} ${addr.houseNumber}` : addr.street || '',
            city: addr.city || '',
            state: '', // Not stored in profile, leave empty
            zipCode: addr.postalCode || '',
            country: addr.country || '',
            phone: profile.phone || ''
        }

        isAutoFilled.value = true
    }
}

// Function to reset form to profile data
const resetToProfileData = () => {
    fillFromProfile()
}

// Auto-fill form with user profile data on component mount
onMounted(() => {
    fillFromProfile()
})

// Form validation
const isFormValid = computed(() => {
    const addr = form.value.shippingAddress
    return addr.company &&
        addr.contactPerson &&
        addr.street &&
        addr.city &&
        addr.zipCode &&
        addr.country
})

const formatPrice = (price: number) => {
    return price.toFixed(2)
}

const handleSubmit = async () => {
    if (!isFormValid.value || cartStore.itemCount === 0) return

    orderStore.clearError()

    const result = await orderStore.createOrder(
        cartStore.items,
        form.value.shippingAddress,
        cartStore.subtotal,
        cartStore.tax,
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
