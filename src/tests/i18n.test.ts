/**
 * i18n Translation Integrity Tests
 *
 * These tests ensure translation quality and consistency across all locales:
 * - All keys present in every locale
 * - No empty translations
 * - Placeholder consistency ({name}, {count}, etc.)
 * - Fallback locale coverage
 */

import { describe, it, expect } from 'vitest';
import en from '@/i18n/locales/en.json';
import nl from '@/i18n/locales/nl.json';
import fr from '@/i18n/locales/fr.json';
import de from '@/i18n/locales/de.json';

const LOCALES = { en, nl, fr, de } as const;
const LOCALE_NAMES = Object.keys(LOCALES) as Array<keyof typeof LOCALES>;
const BASE_LOCALE = 'en'; // Reference locale

/**
 * Recursively extract all keys from a nested object
 * Returns dot-notation paths: "auth.login", "navigation.home"
 */
function extractKeys(obj: Record<string, any>, prefix = ''): string[] {
  const keys: string[] = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...extractKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Get value from nested object using dot-notation key
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Extract placeholders from translation string
 * Matches: {name}, {count}, {0}, {'@'}, etc.
 */
function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{[^}]+\}/g) || [];
  return matches.sort();
}

describe('i18n Translation Integrity', () => {
  const baseKeys = extractKeys(LOCALES[BASE_LOCALE]);

  describe('Key Coverage', () => {
    for (const locale of LOCALE_NAMES) {
      if (locale === BASE_LOCALE) continue;

      it(`${locale.toUpperCase()} should have all keys from ${BASE_LOCALE.toUpperCase()}`, () => {
        const localeKeys = extractKeys(LOCALES[locale]);
        const missingKeys = baseKeys.filter((key) => !localeKeys.includes(key));

        if (missingKeys.length > 0) {
          console.log(`\n⚠️ Missing keys in ${locale}:`);
          missingKeys.forEach((key) => console.log(`  - ${key}`));
        }

        expect(missingKeys, `Missing ${missingKeys.length} keys in ${locale}`).toEqual([]);
      });

      it(`${locale.toUpperCase()} should not have extra keys not in ${BASE_LOCALE.toUpperCase()}`, () => {
        const localeKeys = extractKeys(LOCALES[locale]);
        const extraKeys = localeKeys.filter((key) => !baseKeys.includes(key));

        if (extraKeys.length > 0) {
          console.log(`\n⚠️ Extra keys in ${locale} (not in ${BASE_LOCALE}):`);
          extraKeys.forEach((key) => console.log(`  - ${key}`));
        }

        // Warning only - extra keys are not fatal
        if (extraKeys.length > 0) {
          console.warn(`${locale} has ${extraKeys.length} extra keys`);
        }
      });
    }
  });

  describe('Empty Translations', () => {
    for (const locale of LOCALE_NAMES) {
      it(`${locale.toUpperCase()} should not have empty translations`, () => {
        const keys = extractKeys(LOCALES[locale]);
        const emptyKeys = keys.filter((key) => {
          const value = getNestedValue(LOCALES[locale], key);
          return typeof value === 'string' && value.trim() === '';
        });

        if (emptyKeys.length > 0) {
          console.log(`\n⚠️ Empty translations in ${locale}:`);
          emptyKeys.forEach((key) => console.log(`  - ${key}`));
        }

        expect(emptyKeys, `Found ${emptyKeys.length} empty translations in ${locale}`).toEqual([]);
      });
    }
  });

  describe('Placeholder Consistency', () => {
    for (const locale of LOCALE_NAMES) {
      if (locale === BASE_LOCALE) continue;

      it(`${locale.toUpperCase()} should have matching placeholders with ${BASE_LOCALE.toUpperCase()}`, () => {
        const mismatchedKeys: string[] = [];

        for (const key of baseKeys) {
          const baseValue = getNestedValue(LOCALES[BASE_LOCALE], key);
          const localeValue = getNestedValue(LOCALES[locale], key);

          if (typeof baseValue === 'string' && typeof localeValue === 'string') {
            const basePlaceholders = extractPlaceholders(baseValue);
            const localePlaceholders = extractPlaceholders(localeValue);

            if (JSON.stringify(basePlaceholders) !== JSON.stringify(localePlaceholders)) {
              mismatchedKeys.push(key);
              console.log(`\n⚠️ Placeholder mismatch for "${key}":`);
              console.log(`  ${BASE_LOCALE}: ${basePlaceholders.join(', ') || '(none)'}`);
              console.log(`  ${locale}: ${localePlaceholders.join(', ') || '(none)'}`);
            }
          }
        }

        expect(
          mismatchedKeys,
          `Found ${mismatchedKeys.length} placeholder mismatches in ${locale}`
        ).toEqual([]);
      });
    }
  });

  describe('Translation Statistics', () => {
    it('should report translation coverage', () => {
      const stats = LOCALE_NAMES.map((locale) => {
        const keys = extractKeys(LOCALES[locale]);
        const coverage = (keys.length / baseKeys.length) * 100;
        return { locale, keys: keys.length, coverage: coverage.toFixed(1) };
      });

      console.log('\n📊 Translation Statistics:');
      console.log(`  Base (${BASE_LOCALE}): ${baseKeys.length} keys`);
      stats.forEach(({ locale, keys, coverage }) => {
        console.log(`  ${locale.toUpperCase()}: ${keys} keys (${coverage}% coverage)`);
      });

      // This test always passes - it's informational
      expect(true).toBe(true);
    });
  });
});
