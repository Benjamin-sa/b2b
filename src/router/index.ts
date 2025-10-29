import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// Eagerly load only critical routes (Home and Auth)
import Home from '../views/Home.vue'
import Auth from '../views/Auth.vue'

// Lazy load all other routes for better code splitting
const Products = () => import('../views/Products.vue')
const ProductDetail = () => import('../views/ProductDetail.vue')
const AdminPanel = () => import('../views/Admin.vue')
const Checkout = () => import('../views/Checkout.vue')
const Orders = () => import('../views/Orders.vue')
const Profile = () => import('../views/Profile.vue')
const VerificationPending = () => import('../views/VerificationPending.vue')
const Categories = () => import('../views/Categories.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
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
    path: '/products/category/:categoryId',
    name: 'CategoryProducts',
    component: Products,
    meta: { 
      requiresAuth: true,
      requiresVerified: true,
      transition: 'slide-left',
      title: 'Products by Category'
    }
  },
  {
    path: '/categories',
    name: 'Categories',
    component: Categories,
    meta: { 
      requiresAuth: true,
      requiresVerified: true,
      transition: 'slide-left',
      title: 'Categories'
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
