<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import Navigation from './components/Navigation.vue'
import NotificationContainer from './components/NotificationContainer.vue'
import Footer from './components/Footer.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Initialize auth
onMounted(async () => {
  await authStore.initAuth()

  // If not authenticated and not on auth page, redirect to auth
  if (!authStore.isAuthenticated && route.path !== '/auth') {
    router.push('/auth')
  }

  // If authenticated and on auth page, redirect based on verification status
  if (authStore.isAuthenticated && route.path === '/auth') {
    if (authStore.isVerified || authStore.isAdmin) {
      router.push('/')
    } else {
      router.push('/verification-pending')
    }
  }

  // If authenticated but not verifbooleanied (and not admin), redirect to verification page
  if (authStore.isAuthenticated && !authStore.isVerified && !authStore.isAdmin &&
    route.path !== '/verification-pending' && route.path !== '/auth') {
    router.push('/verification-pending')
  }
})

// Toggle admin: navigate to /admin or back to /
const toggleAdminPanel = () => {
  if (!authStore.isAdmin) return
  const currentPath = route?.path ?? window.location.pathname
  if (currentPath === '/admin') {
    router.push('/')
  } else {
    router.push('/admin')
  }
}

// Keep compatibility with previous prop expected by Navigation
const showAdminPanel = computed(() => {
  return (route?.path === '/admin') || window.location.pathname === '/admin'
})

// Transition methods
const onBeforeEnter = () => {
  // Optional: Add page loading logic here
  console.log('Page transition starting...')
}

const onAfterEnter = () => {
  // Optional: Add page loaded logic here
  console.log('Page transition completed')

  // Update document title based on route
  if (route?.meta?.title) {
    document.title = `${route.meta.title} - B2B Platform`
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Notification Container - Global -->
    <NotificationContainer />

    <!-- Loading state -->
    <div v-if="authStore.initializing" class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="text-center">
        <svg class="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none"
          viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
          </path>
        </svg>
        <h2 class="text-xl font-semibold text-gray-700">{{ $t('common.actions.initializing') }}</h2>
        <p class="text-gray-500 mt-2">{{ $t('common.actions.pleaseWait') }}</p>
      </div>
    </div>

    <!-- Authenticated and verified users: show navigation and main content -->
    <div v-else-if="authStore.isAuthenticated && (authStore.isVerified || authStore.isAdmin)" class="min-h-screen">
      <Navigation :showAdminPanel="showAdminPanel" @toggle-admin="toggleAdminPanel" />

      <main class="max-w-screen-2xl mx-auto py-10 sm:px-8 lg:px-14">
        <div class="px-4 py-8 sm:px-0">
          <!-- Render routed views with dynamic transitions -->
          <router-view v-slot="{ Component, route }">
            <Transition :name="(route.meta?.transition as string) || 'page'" mode="out-in" @before-enter="onBeforeEnter"
              @after-enter="onAfterEnter">
              <component :is="Component" :key="route.path" />
            </Transition>
          </router-view>
        </div>
      </main>
    </div>

    <!-- Authenticated but unverified users: show verification pending or auth only -->
    <div v-else-if="authStore.isAuthenticated && !authStore.isVerified" class="min-h-screen">
      <router-view v-slot="{ Component, route }">
        <Transition :name="(route.meta?.transition as string) || 'fade'" mode="out-in" @before-enter="onBeforeEnter"
          @after-enter="onAfterEnter">
          <component :is="Component" :key="route.path" />
        </Transition>
      </router-view>
    </div>

    <!-- Unauthenticated users: show full-screen auth view -->
    <div v-else class="min-h-screen">
      <router-view v-slot="{ Component, route }">
        <Transition :name="(route.meta?.transition as string) || 'fade'" mode="out-in" @before-enter="onBeforeEnter"
          @after-enter="onAfterEnter">
          <component :is="Component" :key="route.path" />
        </Transition>
      </router-view>
    </div>
  </div>
  <Footer />

</template>

<style scoped>
/* Any custom styles if needed - Tailwind handles most styling */
</style>