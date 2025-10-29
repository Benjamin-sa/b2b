<template>
    <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-4xl font-bold text-gray-900 mb-2">{{ $t('terms.title') }}</h1>
            <p class="text-sm text-gray-500">{{ $t('terms.lastUpdated', { date: 'October 29, 2025' }) }}</p>
        </div>

        <!-- Introduction -->
        <section class="card mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('terms.introduction.title') }}</h2>
            <p class="text-gray-700 leading-relaxed">{{ $t('terms.introduction.content') }}</p>
        </section>

        <!-- Eligibility -->
        <section class="card mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('terms.eligibility.title') }}</h2>
            <p class="text-gray-700 leading-relaxed">{{ $t('terms.eligibility.content') }}</p>
        </section>

        <!-- Account Registration -->
        <section class="card mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('terms.account.title') }}</h2>

            <div class="space-y-4">
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ $t('terms.account.verification.title') }}</h3>
                    <p class="text-gray-700 leading-relaxed">{{ $t('terms.account.verification.content') }}</p>
                </div>

                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ $t('terms.account.responsibility.title') }}
                    </h3>
                    <p class="text-gray-700 leading-relaxed">{{ $t('terms.account.responsibility.content') }}</p>
                </div>
            </div>
        </section>

        <!-- Orders and Pricing -->
        <section class="card mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('terms.orders.title') }}</h2>

            <div class="space-y-4">
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ $t('terms.orders.placement.title') }}</h3>
                    <p class="text-gray-700 leading-relaxed">{{ $t('terms.orders.placement.content') }}</p>
                </div>

                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ $t('terms.orders.pricing.title') }}</h3>
                    <p class="text-gray-700 leading-relaxed">{{ $t('terms.orders.pricing.content') }}</p>
                </div>

                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ $t('terms.orders.minimum.title') }}</h3>
                    <p class="text-gray-700 leading-relaxed">{{ $t('terms.orders.minimum.content') }}</p>
                </div>
            </div>
        </section>

        <!-- Payment Terms -->
        <section class="card mb-6 bg-amber-50 border-amber-200">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('terms.payment.title') }}</h2>

            <div class="space-y-4">
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ $t('terms.payment.invoice.title') }}</h3>
                    <p class="text-gray-700 leading-relaxed">{{ $t('terms.payment.invoice.content') }}</p>
                </div>

                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ $t('terms.payment.vat.title') }}</h3>
                    <p class="text-gray-700 leading-relaxed">{{ $t('terms.payment.vat.content') }}</p>
                </div>
            </div>
        </section>

        <!-- Shipping and Delivery -->
        <section class="card mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('terms.shipping.title') }}</h2>

            <div class="space-y-4">
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ $t('terms.shipping.policy.title') }}</h3>
                    <p class="text-gray-700 leading-relaxed">{{ $t('terms.shipping.policy.content') }}</p>
                </div>

                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ $t('terms.shipping.delay.title') }}</h3>
                    <p class="text-gray-700 leading-relaxed">{{ $t('terms.shipping.delay.content') }}</p>
                </div>
            </div>
        </section>

        <!-- Returns and Refunds -->
        <section class="card mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('terms.returns.title') }}</h2>

            <div class="space-y-4">
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ $t('terms.returns.policy.title') }}</h3>
                    <p class="text-gray-700 leading-relaxed">{{ $t('terms.returns.policy.content') }}</p>
                </div>

                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ $t('terms.returns.process.title') }}</h3>
                    <p class="text-gray-700 leading-relaxed">{{ $t('terms.returns.process.content') }}</p>
                </div>
            </div>
        </section>

        <!-- Warranties and Disclaimers -->
        <section class="card mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('terms.warranty.title') }}</h2>

            <div class="space-y-4">
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ $t('terms.warranty.limited.title') }}</h3>
                    <p class="text-gray-700 leading-relaxed">{{ $t('terms.warranty.limited.content') }}</p>
                </div>

                <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ $t('terms.warranty.disclaimer.title') }}</h3>
                    <p class="text-gray-700 leading-relaxed font-medium">{{ $t('terms.warranty.disclaimer.content') }}</p>
                </div>
            </div>
        </section>

        <!-- Limitation of Liability -->
        <section class="card mb-6 bg-red-50 border-red-200">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('terms.liability.title') }}</h2>
            <p class="text-gray-700 leading-relaxed font-medium">{{ $t('terms.liability.content') }}</p>
        </section>

        <!-- Intellectual Property -->
        <section class="card mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('terms.intellectual.title') }}</h2>
            <p class="text-gray-700 leading-relaxed">{{ $t('terms.intellectual.content') }}</p>
        </section>

        <!-- Termination -->
        <section class="card mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('terms.termination.title') }}</h2>
            <p class="text-gray-700 leading-relaxed">{{ $t('terms.termination.content') }}</p>
        </section>

        <!-- Governing Law -->
        <section class="card mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('terms.governing.title') }}</h2>
            <p class="text-gray-700 leading-relaxed">{{ $t('terms.governing.content') }}</p>
        </section>

        <!-- Changes to Terms -->
        <section class="card mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('terms.changes.title') }}</h2>
            <p class="text-gray-700 leading-relaxed">{{ $t('terms.changes.content') }}</p>
        </section>

        <!-- Contact Information -->
        <section class="card mb-6 bg-gray-50">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('terms.contact.title') }}</h2>
            <p class="text-gray-700 leading-relaxed mb-3">{{ $t('terms.contact.content') }}</p>
            <div class="space-y-2 text-gray-700">
                <p class="font-medium">{{ $t('terms.contact.email') }}</p>
                <p class="font-medium">{{ $t('terms.contact.phone') }}</p>
            </div>
        </section>

        <!-- Back to Home Button -->
        <div class="text-center mt-8">
            <router-link to="/"
                class="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {{ $t('navigation.home') }}
            </router-link>
        </div>
    </div>
</template>

<script setup lang="ts">
// No additional logic needed for a static content page
</script>

<style scoped>
/* Additional custom styles if needed */
</style>
