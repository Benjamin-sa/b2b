/**
 * Vitest Global Test Setup
 *
 * This file runs before each test file and provides:
 * - Vue Test Utils configuration
 * - i18n plugin setup
 * - Pinia store setup
 * - Common test utilities
 */

import { config } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, vi } from 'vitest';

// Global setup before each test
beforeEach(() => {
  // Reset Pinia state between tests
  setActivePinia(createPinia());

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  vi.stubGlobal('localStorage', localStorageMock);

  // Mock fetch for API calls
  vi.stubGlobal('fetch', vi.fn());
});

// Add common stubs for router-link and router-view
config.global.stubs = {
  RouterLink: {
    template: '<a><slot /></a>',
  },
  RouterView: {
    template: '<div><slot /></div>',
  },
};
