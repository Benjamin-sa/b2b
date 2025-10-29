<template>
    <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-4xl font-bold text-gray-900 mb-2">{{ $t('privacy.title') }}</h1>
            <p class="text-sm text-gray-500">{{ $t('privacy.lastUpdated', { date: 'October 29, 2025' }) }}</p>
        </div>

        <!-- Introduction -->
        <section class="card mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('privacy.introduction.title') }}</h2>
            <p class="text-gray-700 leading-relaxed">{{ $t('privacy.introduction.content') }}</p>
        </section>

        <!-- Data Collection -->
        <section class="card mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('privacy.dataCollection.title') }}</h2>

            <div class="space-y-4">
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ $t('privacy.dataCollection.personal.title')
                        }}</h3>
                    <p class="text-gray-700 leading-relaxed">{{ $t('privacy.dataCollection.personal.content') }}</p>
                </div>

                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ $t('privacy.dataCollection.automatic.title')
                        }}</h3>
                    <p class="text-gray-700 leading-relaxed">{{ $t('privacy.dataCollection.automatic.content') }}</p>
                </div>

                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ $t('privacy.dataCollection.business.title')
                        }}</h3>
                    <p class="text-gray-700 leading-relaxed">{{ $t('privacy.dataCollection.business.content') }}</p>
                </div>
            </div>
        </section>

        <!-- How We Use Your Information -->
        <section class="card mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('privacy.dataUse.title') }}</h2>
            <p class="text-gray-700 font-medium mb-3">{{ $t('privacy.dataUse.purposes.title') }}</p>
            <ul class="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>{{ $t('privacy.dataUse.purposes.item1') }}</li>
                <li>{{ $t('privacy.dataUse.purposes.item2') }}</li>
                <li>{{ $t('privacy.dataUse.purposes.item3') }}</li>
                <li>{{ $t('privacy.dataUse.purposes.item4') }}</li>
                <li>{{ $t('privacy.dataUse.purposes.item5') }}</li>
                <li>{{ $t('privacy.dataUse.purposes.item6') }}</li>
            </ul>
        </section>

        <!-- Information Sharing -->
        <section class="card mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('privacy.dataSharing.title') }}</h2>
            <p class="text-gray-700 leading-relaxed mb-3">{{ $t('privacy.dataSharing.intro') }}</p>
            <ul class="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>{{ $t('privacy.dataSharing.service') }}</li>
                <li>{{ $t('privacy.dataSharing.legal') }}</li>
                <li>{{ $t('privacy.dataSharing.business') }}</li>
                <li>{{ $t('privacy.dataSharing.consent') }}</li>
            </ul>
        </section>

        <!-- GDPR Compliance -->
        <section class="card mb-6 bg-blue-50 border-blue-200">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('privacy.gdpr.title') }}</h2>
            <p class="text-gray-700 leading-relaxed mb-3">{{ $t('privacy.gdpr.intro') }}</p>
            <ul class="list-disc list-inside space-y-2 text-gray-700 ml-4 mb-4">
                <li>{{ $t('privacy.gdpr.access') }}</li>
                <li>{{ $t('privacy.gdpr.rectify') }}</li>
                <li>{{ $t('privacy.gdpr.erase') }}</li>
                <li>{{ $t('privacy.gdpr.restrict') }}</li>
                <li>{{ $t('privacy.gdpr.portability') }}</li>
                <li>{{ $t('privacy.gdpr.object') }}</li>
            </ul>
            <p class="text-gray-700 leading-relaxed">{{ $t('privacy.gdpr.contact') }}</p>
        </section>

        <!-- Cookies -->
        <section class="card mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('privacy.cookies.title') }}</h2>
            <p class="text-gray-700 leading-relaxed">{{ $t('privacy.cookies.content') }}</p>
        </section>

        <!-- Security -->
        <section class="card mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('privacy.security.title') }}</h2>
            <p class="text-gray-700 leading-relaxed">{{ $t('privacy.security.content') }}</p>
        </section>

        <!-- Data Retention -->
        <section class="card mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('privacy.retention.title') }}</h2>
            <p class="text-gray-700 leading-relaxed">{{ $t('privacy.retention.content') }}</p>
        </section>

        <!-- Contact -->
        <section class="card mb-6 bg-gray-50">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('privacy.contact.title') }}</h2>
            <p class="text-gray-700 leading-relaxed mb-3">{{ $t('privacy.contact.content') }}</p>
            <div class="space-y-2 text-gray-700">
                <p class="font-medium">{{ $t('privacy.contact.email') }}</p>
                <p class="font-medium">{{ $t('privacy.contact.phone') }}</p>
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
