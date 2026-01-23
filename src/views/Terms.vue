<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="mb-6 sm:mb-8 pb-4 sm:pb-6 border-b-2 border-primary-200">
      <h1
        class="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-2 sm:mb-3 flex items-center"
      >
        <span
          class="w-1.5 sm:w-2 h-10 sm:h-12 bg-gradient-to-b from-primary-600 to-primary-700 rounded-full mr-3 sm:mr-4"
        ></span>
        {{ $t('terms.title') }}
      </h1>
      <p class="text-xs sm:text-sm text-gray-600 font-medium ml-5 sm:ml-6">
        {{ $t('terms.lastUpdated', { date: 'October 29, 2025' }) }}
      </p>
    </div>

    <!-- Introduction -->
    <section class="card mb-6">
      <h2 class="text-2xl font-semibold text-gray-900 mb-4">
        {{ $t('terms.introduction.title') }}
      </h2>
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
          <h3 class="text-lg font-semibold text-gray-800 mb-2">
            {{ $t('terms.account.verification.title') }}
          </h3>
          <p class="text-gray-700 leading-relaxed">
            {{ $t('terms.account.verification.content') }}
          </p>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">
            {{ $t('terms.account.responsibility.title') }}
          </h3>
          <p class="text-gray-700 leading-relaxed">
            {{ $t('terms.account.responsibility.content') }}
          </p>
        </div>
      </div>
    </section>

    <!-- Orders and Pricing -->
    <section class="card mb-6">
      <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('terms.orders.title') }}</h2>

      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">
            {{ $t('terms.orders.placement.title') }}
          </h3>
          <p class="text-gray-700 leading-relaxed">{{ $t('terms.orders.placement.content') }}</p>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">
            {{ $t('terms.orders.pricing.title') }}
          </h3>
          <p class="text-gray-700 leading-relaxed">{{ $t('terms.orders.pricing.content') }}</p>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">
            {{ $t('terms.orders.minimum.title') }}
          </h3>
          <p class="text-gray-700 leading-relaxed">{{ $t('terms.orders.minimum.content') }}</p>
        </div>
      </div>
    </section>

    <!-- Payment Terms -->
    <section
      class="card mb-6 bg-gradient-to-br from-warning-50 to-warning-100 border-2 border-warning-300 shadow-md"
    >
      <h2 class="text-xl sm:text-2xl font-bold text-warning-900 mb-3 sm:mb-4 flex items-center">
        <svg
          class="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-warning-600 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {{ $t('terms.payment.title') }}
      </h2>

      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-bold text-gray-800 mb-2">
            {{ $t('terms.payment.invoice.title') }}
          </h3>
          <p class="text-gray-700 leading-relaxed">{{ $t('terms.payment.invoice.content') }}</p>
        </div>

        <div>
          <h3 class="text-lg font-bold text-gray-800 mb-2">{{ $t('terms.payment.vat.title') }}</h3>
          <p class="text-gray-700 leading-relaxed">{{ $t('terms.payment.vat.content') }}</p>
        </div>
      </div>
    </section>

    <!-- Shipping and Delivery -->
    <section class="card mb-6">
      <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('terms.shipping.title') }}</h2>

      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">
            {{ $t('terms.shipping.policy.title') }}
          </h3>
          <p class="text-gray-700 leading-relaxed">{{ $t('terms.shipping.policy.content') }}</p>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">
            {{ $t('terms.shipping.delay.title') }}
          </h3>
          <p class="text-gray-700 leading-relaxed">{{ $t('terms.shipping.delay.content') }}</p>
        </div>
      </div>
    </section>

    <!-- Returns and Refunds -->
    <section class="card mb-6">
      <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('terms.returns.title') }}</h2>

      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">
            {{ $t('terms.returns.policy.title') }}
          </h3>
          <p class="text-gray-700 leading-relaxed">{{ $t('terms.returns.policy.content') }}</p>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">
            {{ $t('terms.returns.process.title') }}
          </h3>
          <p class="text-gray-700 leading-relaxed">{{ $t('terms.returns.process.content') }}</p>
        </div>
      </div>
    </section>

    <!-- Warranties and Disclaimers -->
    <section class="card mb-6">
      <h2 class="text-2xl font-semibold text-gray-900 mb-4">{{ $t('terms.warranty.title') }}</h2>

      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">
            {{ $t('terms.warranty.limited.title') }}
          </h3>
          <p class="text-gray-700 leading-relaxed">{{ $t('terms.warranty.limited.content') }}</p>
        </div>

        <div
          class="bg-gradient-to-br from-warning-100 to-warning-200 p-4 sm:p-5 rounded-lg sm:rounded-xl border-2 border-warning-300 shadow-sm"
        >
          <h3 class="text-base sm:text-lg font-bold text-warning-900 mb-2 flex items-center">
            <svg
              class="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            {{ $t('terms.warranty.disclaimer.title') }}
          </h3>
          <p class="text-gray-800 leading-relaxed font-bold">
            {{ $t('terms.warranty.disclaimer.content') }}
          </p>
        </div>
      </div>
    </section>

    <!-- Limitation of Liability -->
    <section
      class="card mb-6 bg-gradient-to-br from-danger-50 to-danger-100 border-2 border-danger-300 shadow-md"
    >
      <h2 class="text-xl sm:text-2xl font-bold text-danger-900 mb-3 sm:mb-4 flex items-center">
        <svg
          class="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-danger-600 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        {{ $t('terms.liability.title') }}
      </h2>
      <p class="text-gray-800 leading-relaxed font-bold">{{ $t('terms.liability.content') }}</p>
    </section>

    <!-- Intellectual Property -->
    <section class="card mb-6">
      <h2 class="text-2xl font-semibold text-gray-900 mb-4">
        {{ $t('terms.intellectual.title') }}
      </h2>
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
    <section
      class="card mb-6 bg-gradient-to-br from-secondary-50 to-secondary-100 border-2 border-secondary-200"
    >
      <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
        <svg
          class="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-secondary-600 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        {{ $t('terms.contact.title') }}
      </h2>
      <p class="text-gray-700 leading-relaxed mb-4">{{ $t('terms.contact.content') }}</p>
      <div class="space-y-2 text-gray-700">
        <p class="font-bold">{{ $t('terms.contact.email') }}</p>
        <p class="font-bold">{{ $t('terms.contact.phone') }}</p>
      </div>
    </section>

    <!-- Back to Home Button -->
    <div class="text-center mt-8 sm:mt-10">
      <router-link
        to="/"
        class="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-200 transform hover:scale-105 shadow-lg"
      >
        <svg
          class="w-4 h-4 sm:w-5 sm:h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
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
