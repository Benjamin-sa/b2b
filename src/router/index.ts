import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// Import components
import home from '../views/Home.vue'
import Products from '../views/Products.vue'
import ProductDetail from '../views/ProductDetail.vue'
import AdminPanel from '../views/Admin.vue'
import Checkout from '../views/Checkout.vue'
import Orders from '../views/Orders.vue'
import Profile from '../views/Profile.vue'
import Auth from '../views/Auth.vue'
import VerificationPending from '../views/VerificationPending.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: home,
    meta: { 
      requiresAuth: true,
      requiresVerified: true,
      transition: 'slide-right',
      title: 'Home'
    }
  },
  {
    path: '/auth',
    name: 'Auth',
    component: Auth,
    meta: { 
      requiresAuth: false,
      transition: 'fade',
      title: 'Login / Register'
    }
  },
  {
    path: '/verification-pending',
    name: 'VerificationPending',
    component: VerificationPending,
    meta: { 
      requiresAuth: true,
      requiresVerified: false,
      transition: 'fade',
      title: 'Verification Pending'
    }
  },
  {
    path: '/products',
    name: 'Products',
    component: Products,
    meta: { 
      requiresAuth: true,
      requiresVerified: true,
      transition: 'slide-left',
      title: 'Products'
    }
  },
  {
    path: '/products/:id',
    name: 'ProductDetail',
    component: ProductDetail,
    meta: { 
      requiresAuth: true,
      requiresVerified: true,
      transition: 'fade',
      title: 'Product Details'
    }
  },
  {
    path: '/orders',
    name: 'Orders',
    component: Orders,
    meta: { 
      requiresAuth: true,
      requiresVerified: true,
      transition: 'fade',
      title: 'Orders'
    }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { 
      requiresAuth: true,
      requiresVerified: true,
      transition: 'fade',
      title: 'My Profile'
    }
  },
  {
    path: '/checkout',
    name: 'Checkout',
    component: Checkout,
    meta: { 
      requiresAuth: true,
      requiresVerified: true,
      transition: 'slide-left',
      title: 'Checkout'
    }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminPanel,
    meta: { 
      requiresAuth: true, 
      requiresAdmin: true,
      transition: 'fade',
      title: 'Admin Panel'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guards
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  
  // Wait for auth to initialize if it hasn't yet
  if (authStore.initializing) {
    await new Promise(resolve => {
      const unwatch = authStore.$subscribe((_mutation, state) => {
        if (!state.initializing) {
          unwatch()
          resolve(undefined)
        }
      })
    })
  }

  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Redirect to auth page if user is not authenticated
    if (to.path !== '/auth') {
      next('/auth')
      return
    }
  }

  // If authenticated but not verified, redirect to verification pending page
  if (authStore.isAuthenticated && !authStore.isVerified && !authStore.isAdmin) {
    if (to.path !== '/verification-pending' && to.path !== '/auth') {
      next('/verification-pending')
      return
    }
  }

  // If verified user tries to access verification pending page, redirect to home
  if (to.path === '/verification-pending' && authStore.isAuthenticated && (authStore.isVerified || authStore.isAdmin)) {
    next('/')
    return
  }

  // Check if route requires admin access
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next('/auth')
    return
  }

  // Check if route requires verified user
  if (to.meta.requiresVerified && !authStore.isVerified && !authStore.isAdmin) {
    next('/verification-pending')
    return
  }

  next()
})

export { router }
export default router
