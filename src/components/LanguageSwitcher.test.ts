/**
 * LanguageSwitcher Component Tests
 *
 * Tests the language switcher dropdown functionality and i18n integration
 */

import { describe, it, expect } from 'vitest';
import { mountWithPlugins, flushPromises } from '@/tests/helpers';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';

describe('LanguageSwitcher', () => {
  it('renders with current language name', () => {
    const wrapper = mountWithPlugins(LanguageSwitcher, { locale: 'en' });

    expect(wrapper.text()).toContain('English');
  });

  it('shows Nederlands when locale is nl', () => {
    const wrapper = mountWithPlugins(LanguageSwitcher, { locale: 'nl' });

    expect(wrapper.text()).toContain('Nederlands');
  });

  it('opens dropdown when button is clicked', async () => {
    const wrapper = mountWithPlugins(LanguageSwitcher);

    // Dropdown should be closed initially
    expect(wrapper.findAll('button').length).toBe(1);

    // Click the main button
    await wrapper.find('button').trigger('click');

    // Should now show all language options (4 languages + main button)
    expect(wrapper.findAll('button').length).toBeGreaterThan(1);
  });

  it('displays all available languages in dropdown', async () => {
    const wrapper = mountWithPlugins(LanguageSwitcher);

    await wrapper.find('button').trigger('click');

    const text = wrapper.text();
    expect(text).toContain('Nederlands');
    expect(text).toContain('English');
    expect(text).toContain('Français');
    expect(text).toContain('Deutsch');
  });

  it('highlights current language in dropdown', async () => {
    const wrapper = mountWithPlugins(LanguageSwitcher, { locale: 'nl' });

    await wrapper.find('button').trigger('click');

    // Find the dropdown container and look for the highlighted option
    // The active language button should have bg-blue-50 class
    const dropdownHtml = wrapper.html();
    expect(dropdownHtml).toContain('bg-blue-50');
    expect(dropdownHtml).toContain('Nederlands');
  });

  it('changes language when option is clicked', async () => {
    const wrapper = mountWithPlugins(LanguageSwitcher, { locale: 'en' });

    // Open dropdown
    await wrapper.find('button').trigger('click');

    // Find and click Nederlands option
    const buttons = wrapper.findAll('button');
    const nlButton = buttons.find((btn) => btn.text().includes('Nederlands'));
    await nlButton?.trigger('click');

    // After clicking, localStorage should be updated (mocked in setup)
    expect(localStorage.setItem).toHaveBeenCalledWith('language', 'nl');
  });

  it('closes dropdown after selection', async () => {
    const wrapper = mountWithPlugins(LanguageSwitcher);

    // Open dropdown
    await wrapper.find('button').trigger('click');
    expect(wrapper.findAll('button').length).toBeGreaterThan(1);

    // Click a language option
    const buttons = wrapper.findAll('button');
    const frButton = buttons.find((btn) => btn.text().includes('Français'));
    await frButton?.trigger('click');
    await flushPromises();

    // Dropdown should be closed (only main button visible)
    expect(wrapper.findAll('button').length).toBe(1);
  });
});
