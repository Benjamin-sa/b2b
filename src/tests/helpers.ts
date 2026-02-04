/**
 * Test Helpers for Vue Component Testing
 *
 * Provides utilities for mounting components with proper plugins,
 * mocking stores, and testing common patterns.
 */

import { mount, shallowMount, type MountingOptions } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { createPinia, setActivePinia, type Store } from 'pinia';
import type { Component } from 'vue';

import en from '@/i18n/locales/en.json';
import nl from '@/i18n/locales/nl.json';
import fr from '@/i18n/locales/fr.json';
import de from '@/i18n/locales/de.json';

type Locale = 'en' | 'nl' | 'fr' | 'de';

interface MountOptions extends Omit<MountingOptions<any>, 'global'> {
  locale?: Locale;
  initialState?: Record<string, any>;
  stubs?: Record<string, any>;
  mocks?: Record<string, any>;
}

/**
 * Mount a component with all necessary plugins (i18n, Pinia, router stubs)
 */
export function mountWithPlugins<T extends Component>(component: T, options: MountOptions = {}) {
  const { locale = 'en', initialState = {}, stubs = {}, mocks = {}, ...mountOptions } = options;

  // Create fresh Pinia for each mount
  const pinia = createPinia();
  setActivePinia(pinia);

  // Create i18n with specified locale
  const i18n = createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: { en, nl, fr, de },
    missingWarn: false,
    fallbackWarn: false,
  });

  return mount(component, {
    ...mountOptions,
    global: {
      plugins: [pinia, i18n],
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        RouterView: { template: '<div><slot /></div>' },
        Transition: { template: '<div><slot /></div>' },
        ...stubs,
      },
      mocks: {
        $route: { path: '/', params: {}, query: {} },
        $router: { push: vi.fn(), replace: vi.fn() },
        ...mocks,
      },
    },
  });
}

/**
 * Shallow mount a component (stubs child components)
 */
export function shallowMountWithPlugins<T extends Component>(
  component: T,
  options: MountOptions = {}
) {
  const { locale = 'en', initialState = {}, stubs = {}, mocks = {}, ...mountOptions } = options;

  const pinia = createPinia();
  setActivePinia(pinia);

  const i18n = createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: { en, nl, fr, de },
    missingWarn: false,
    fallbackWarn: false,
  });

  return shallowMount(component, {
    ...mountOptions,
    global: {
      plugins: [pinia, i18n],
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        RouterView: { template: '<div><slot /></div>' },
        Transition: { template: '<div><slot /></div>' },
        ...stubs,
      },
      mocks: {
        $route: { path: '/', params: {}, query: {} },
        $router: { push: vi.fn(), replace: vi.fn() },
        ...mocks,
      },
    },
  });
}

/**
 * Create a mock for authenticated API fetch
 */
export function mockAuthenticatedFetch(responses: Record<string, any> = {}) {
  return vi.fn().mockImplementation(async (url: string) => {
    const matchingUrl = Object.keys(responses).find((pattern) => url.includes(pattern));

    if (matchingUrl) {
      return {
        ok: true,
        json: async () => responses[matchingUrl],
      };
    }

    return {
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    };
  });
}

/**
 * Wait for all pending promises to resolve
 */
export async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Find element by test id attribute
 */
export function findByTestId(wrapper: ReturnType<typeof mount>, testId: string) {
  return wrapper.find(`[data-testid="${testId}"]`);
}

/**
 * Assert that a translation key is rendered correctly
 */
export function expectTranslation(
  wrapper: ReturnType<typeof mount>,
  selector: string,
  expectedText: string
) {
  const element = wrapper.find(selector);
  expect(element.exists()).toBe(true);
  expect(element.text()).toContain(expectedText);
}
