import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    host: '0.0.0.0', // Expose to local network
    port: 3000, // Optional: Choose a port, defaults to 5173
  },
  build: {
    // Optimize for Cloudflare Pages
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code for better caching
          vendor: ['vue', 'vue-router', 'pinia'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          stripe: ['@stripe/stripe-js']
        }
      }
    },
    // Generate source maps for debugging
    sourcemap: process.env.NODE_ENV !== 'production'
  }
})