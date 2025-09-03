<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import AuthModal from './components/auth/AuthModal.vue'
import Navigation from './components/Navigation.vue'
// ...existing code...

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const showAuthModal = ref(false)

// Initialize auth
onMounted(async () => {
  await authStore.initAuth()
  if (!authStore.isAuthenticated) {
    showAuthModal.value = true
  }
})

const closeAuthModal = () => {
  if (authStore.isAuthenticated) {
    showAuthModal.value = false
  }
}

const handleLogout = async () => {
  try {
    await authStore.logout()
    showAuthModal.value = true
    // After logout, ensure we go back to main view
    router.push('/')
  } catch (error) {
    console.error('Logout error:', error)
  }
}

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
    <AuthModal :is-open="(!authStore.isAuthenticated && !authStore.initializing) || showAuthModal"
      @close="closeAuthModal" />

    <div v-if="authStore.initializing" class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="text-center">
        <svg class="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none"
          viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
          </path>
        </svg>
        <h2 class="text-xl font-semibold text-gray-700">Initializing...</h2>
        <p class="text-gray-500 mt-2">Please wait while we load your account</p>
      </div>
    </div>

    <div v-else-if="authStore.isAuthenticated && !authStore.initializing" class="min-h-screen">
      <Navigation :showAdminPanel="showAdminPanel" @toggle-admin="toggleAdminPanel" />

      <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div class="px-4 py-6 sm:px-0">
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
  </div>
</template>

<style scoped>
/* Any custom styles if needed - Tailwind handles most styling */
</style>