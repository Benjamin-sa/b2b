<template>
    <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-6 sm:mb-8 pb-4 sm:pb-6 border-b-2 border-primary-200">
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-2 sm:mb-3 flex items-center">
                <span class="w-1.5 sm:w-2 h-10 sm:h-12 bg-gradient-to-b from-primary-600 to-primary-700 rounded-full mr-3 sm:mr-4"></span>
                {{ $t('privacy.title') }}
            </h1>
            <p class="text-xs sm:text-sm text-gray-600 font-medium ml-5 sm:ml-6">{{ $t('privacy.lastUpdated', { date: 'October 29, 2025' }) }}</p>
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
        <section class="card mb-6 bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-300 shadow-md">
            <h2 class="text-xl sm:text-2xl font-bold text-primary-900 mb-3 sm:mb-4 flex items-center">
                <svg class="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                {{ $t('privacy.gdpr.title') }}
            </h2>
            <p class="text-gray-700 leading-relaxed mb-3 font-medium">{{ $t('privacy.gdpr.intro') }}</p>
            <ul class="list-disc list-inside space-y-2 text-gray-700 ml-4 mb-4">
                <li>{{ $t('privacy.gdpr.access') }}</li>
                <li>{{ $t('privacy.gdpr.rectify') }}</li>
                <li>{{ $t('privacy.gdpr.erase') }}</li>
                <li>{{ $t('privacy.gdpr.restrict') }}</li>
                <li>{{ $t('privacy.gdpr.portability') }}</li>
                <li>{{ $t('privacy.gdpr.object') }}</li>
            </ul>
            <p class="text-gray-700 leading-relaxed font-medium">{{ $t('privacy.gdpr.contact') }}</p>
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
        <section class="card mb-6 bg-gradient-to-br from-secondary-50 to-secondary-100 border-2 border-secondary-200">
            <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <svg class="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-secondary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {{ $t('privacy.contact.title') }}
            </h2>
            <p class="text-gray-700 leading-relaxed mb-4">{{ $t('privacy.contact.content') }}</p>
            <div class="space-y-2 text-gray-700">
                <p class="font-bold">{{ $t('privacy.contact.email') }}</p>
                <p class="font-bold">{{ $t('privacy.contact.phone') }}</p>
            </div>
        </section>

        <!-- Back to Home Button -->
        <div class="text-center mt-8 sm:mt-10">
            <router-link to="/"
                class="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-200 transform hover:scale-105 shadow-lg">
                <svg class="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
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
