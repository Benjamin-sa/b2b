import { fileURLToPath } from 'node:url';
import { mergeConfig, defineConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'happy-dom',
      include: ['src/**/*.{test,spec}.{js,ts}'],
      exclude: ['node_modules', 'workers/**', 'packages/**'],
      globals: true,
      setupFiles: ['./src/tests/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: ['src/**/*.{ts,vue}'],
        exclude: ['src/tests/**', 'src/**/*.d.ts', 'src/main.ts'],
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  })
);
