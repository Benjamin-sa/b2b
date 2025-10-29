<template>
    <form @submit.prevent="onSubmit" class="space-y-6">
        <div class="space-y-4">
            <!-- Name Fields -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="register-firstname" class="block text-sm font-semibold text-gray-700 mb-2">
                        {{ $t('auth.firstName') }}
                    </label>
                    <input id="register-firstname" v-model="form.firstName" type="text" required :disabled="loading"
                        :placeholder="$t('auth.firstNamePlaceholder')"
                        class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
                </div>
                <div>
                    <label for="register-lastname" class="block text-sm font-semibold text-gray-700 mb-2">
                        {{ $t('auth.lastName') }}
                    </label>
                    <input id="register-lastname" v-model="form.lastName" type="text" required :disabled="loading"
                        :placeholder="$t('auth.lastNamePlaceholder')"
                        class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
                </div>
            </div>

            <!-- Company Name -->
            <div>
                <label for="register-company" class="block text-sm font-semibold text-gray-700 mb-2">
                    {{ $t('auth.companyName') }}
                </label>
                <input id="register-company" v-model="form.companyName" type="text" required :disabled="loading"
                    :placeholder="$t('auth.companyNamePlaceholder')"
                    class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
            </div>

            <!-- BTW Number with enhanced styling -->
            <div>
                <label for="register-btw" class="block text-sm font-semibold text-gray-700 mb-2">
                    {{ $t('auth.vatNumber') }}
                </label>
                <input id="register-btw" v-model="form.btwNumber" type="text" required :disabled="loading"
                    :placeholder="$t('auth.vatPlaceholder')" :class="[
                        'w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-all duration-200',
                        !vatValidation.isValid && form.btwNumber ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500'
                    ]" @input="onVatInput" />
                <!-- BTW Validation Messages -->
                <div v-if="!vatValidation.isValid && form.btwNumber"
                    class="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div class="flex items-start">
                        <svg class="w-4 h-4 text-red-400 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p class="text-sm text-red-600 font-medium">{{ vatValidation.error ? $t(vatValidation.error, vatValidation.errorParams || {}) : '' }}</p>
                            <div v-if="vatValidation.format" class="text-xs text-red-500 mt-1">
                                {{ $t('auth.vatFormat', { format: vatValidation.format }) }}
                            </div>
                        </div>
                    </div>
                </div>
                <div v-else-if="vatValidation.isValid && vatValidation.countryName"
                    class="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div class="flex items-center">
                        <svg class="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <p class="text-sm text-green-600 font-medium">{{ $t('auth.validVat', { country: vatValidation.countryName }) }}
                        </p>
                    </div>
                </div>
                <p class="mt-2 text-xs text-gray-500">
                    {{ $t('auth.vatHint') }}
                </p>
            </div>

            <!-- Phone -->
            <div>
                <label for="register-phone" class="block text-sm font-semibold text-gray-700 mb-2">
                    {{ $t('auth.phone') }} <span class="text-gray-400 font-normal">{{ $t('auth.phoneOptional') }}</span>
                </label>
                <input id="register-phone" v-model="form.phone" type="tel" :disabled="loading"
                    :placeholder="$t('auth.phonePlaceholder')"
                    class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
            </div>

            <!-- Address Section -->
            <div class="bg-gray-50 rounded-xl p-6 space-y-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ $t('auth.address') }}</h3>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="sm:col-span-2">
                        <label for="register-street" class="block text-sm font-semibold text-gray-700 mb-2">
                            {{ $t('auth.street') }}
                        </label>
                        <input id="register-street" v-model="form.address.street" type="text" required
                            :disabled="loading" :placeholder="$t('auth.streetPlaceholder')"
                            class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors bg-white" />
                    </div>
                    <div>
                        <label for="register-house" class="block text-sm font-semibold text-gray-700 mb-2">
                            {{ $t('auth.houseNumber') }}
                        </label>
                        <input id="register-house" v-model="form.address.houseNumber" type="text" required
                            :disabled="loading" :placeholder="$t('auth.houseNumberPlaceholder')"
                            class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors bg-white" />
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label for="register-postal" class="block text-sm font-semibold text-gray-700 mb-2">
                            {{ $t('auth.postalCode') }}
                        </label>
                        <input id="register-postal" v-model="form.address.postalCode" type="text" required
                            :disabled="loading" :placeholder="$t('auth.postalCodePlaceholder')"
                            class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors bg-white" />
                    </div>
                    <div>
                        <label for="register-city" class="block text-sm font-semibold text-gray-700 mb-2">
                            {{ $t('auth.city') }}
                        </label>
                        <input id="register-city" v-model="form.address.city" type="text" required :disabled="loading"
                            :placeholder="$t('auth.cityPlaceholder')"
                            class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors bg-white" />
                    </div>
                </div>
                <div>
                    <label for="register-country" class="block text-sm font-semibold text-gray-700 mb-2">
                        {{ $t('auth.country') }}
                    </label>
                    <select id="register-country" v-model="form.address.country" required :disabled="loading"
                        class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors bg-white">
                        <option value="Belgium">Belgium</option>
                        <option value="Netherlands">Netherlands</option>
                        <option value="Germany">Germany</option>
                        <option value="France">France</option>
                        <option value="Italy">Italy</option>
                        <option value="Spain">Spain</option>
                        <option value="Portugal">Portugal</option>
                        <option value="Austria">Austria</option>
                        <option value="Luxembourg">Luxembourg</option>
                        <option value="Ireland">Ireland</option>
                        <option value="Denmark">Denmark</option>
                        <option value="Sweden">Sweden</option>
                        <option value="Finland">Finland</option>
                        <option value="Poland">Poland</option>
                        <option value="Czech Republic">Czech Republic</option>
                        <option value="Slovakia">Slovakia</option>
                        <option value="Hungary">Hungary</option>
                        <option value="Slovenia">Slovenia</option>
                        <option value="Croatia">Croatia</option>
                        <option value="Bulgaria">Bulgaria</option>
                        <option value="Romania">Romania</option>
                        <option value="Lithuania">Lithuania</option>
                        <option value="Latvia">Latvia</option>
                        <option value="Estonia">Estonia</option>
                        <option value="Malta">Malta</option>
                        <option value="Cyprus">Cyprus</option>
                        <option value="Greece">Greece</option>
                        <option value="Norway">Norway</option>
                        <option value="Iceland">Iceland</option>
                    </select>
                </div>
            </div>

            <!-- Email -->
            <div>
                <label for="register-email" class="block text-sm font-semibold text-gray-700 mb-2">
                    {{ $t('auth.businessEmail') }}
                </label>
                <input id="register-email" v-model="form.email" type="email" required :disabled="loading"
                    :placeholder="$t('auth.businessEmailPlaceholder')"
                    class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
            </div>

            <!-- Password Fields -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="register-password" class="block text-sm font-semibold text-gray-700 mb-2">
                        {{ $t('auth.password') }}
                    </label>
                    <input id="register-password" v-model="form.password" type="password" required minlength="6"
                        :disabled="loading" :placeholder="$t('auth.passwordMin')"
                        class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
                </div>
                <div>
                    <label for="register-confirm" class="block text-sm font-semibold text-gray-700 mb-2">
                        {{ $t('auth.confirmPassword') }}
                    </label>
                    <input id="register-confirm" v-model="form.confirmPassword" type="password" required
                        :disabled="loading" :placeholder="$t('auth.confirmPasswordPlaceholder')"
                        class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
                </div>
            </div>
        </div>

        <!-- Validation warnings -->
        <div v-if="!passwordsMatch && form.confirmPassword" class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div class="flex items-center">
                <svg class="w-4 h-4 text-amber-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-sm text-amber-600 font-medium">{{ $t('auth.passwordsDoNotMatch') }}</p>
            </div>
        </div>
        <div v-if="!vatValidation.isValid && form.btwNumber" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex items-center">
                <svg class="w-4 h-4 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-sm text-red-600 font-medium">{{ $t('auth.validVatRequired') }}</p>
            </div>
        </div>
        <button type="submit" :disabled="loading || !canSubmit"
            class="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl">
            <span v-if="loading" class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
                    viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                    </path>
                </svg>
                {{ $t('auth.creatingAccount') }}
            </span>
            <span v-else>{{ $t('auth.registerButton') }}</span>
        </button>
    </form>
</template>

<script setup lang="ts">
import type { VATValidationResult } from '../../utils/vatValidation'

defineProps<{
    loading: boolean,
    vatValidation: VATValidationResult,
    canSubmit: boolean,
    passwordsMatch: boolean,
    form: any
}>()

const emit = defineEmits(['update:form', 'vat-input', 'submit'])

const onVatInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    emit('vat-input', target.value)
}

const onSubmit = () => {
    emit('submit')
}
</script>
