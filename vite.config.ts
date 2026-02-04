import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Explicitly exclude workers directory from build
    rollupOptions: {
      external: (id) =>
        id.includes('workers/') ||
        id.includes('workers\\') ||
        id.includes('server/') ||
        id.includes('server\\'),
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'vue-vendor': ['vue', 'vue-router', 'pinia', 'vue-i18n'],
          'aws-sdk': ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
          'ui-vendor': ['@heroicons/vue', '@vueuse/core'],
        },
      },
    },
    // Increase chunk size warning limit (default is 500KB)
    chunkSizeWarningLimit: 600,
  },
  // Explicitly set root to only include frontend source
  root: './',
  publicDir: 'public',
  server: {
    port: 5173,
    // Enable SPA fallback for client-side routing
    strictPort: false,
    // Fallback to index.html for client-side routing
    fs: {
      strict: false,
      // Deny access to server and workers directories
      deny: ['**/server/**', '**/workers/**', '**/.git/**'],
    },
  },
  // Ensure preview server also uses SPA fallback
  preview: {
    port: 4173,
  },
});
