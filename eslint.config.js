import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.worker,
      },
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
  },
  {
    rules: {
      'no-console': 'warn',
      'no-debugger': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'max-depth': ['warn', 4], // limit nested blocks
      'max-lines-per-function': ['warn', { max: 120, skipComments: true, skipBlankLines: true }],
      'max-statements': ['warn', 30], // limit statements per function
      complexity: ['warn', 8], // cyclomatic complexity
      'max-params': ['warn', 4], // limit function params
      'max-nested-callbacks': ['warn', 3],
      'max-lines': ['warn', { max: 400, skipComments: true, skipBlankLines: true }],
      '@typescript-eslint/no-unused-function': 'warn',
      'vue/no-mutating-props': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-useless-catch': 'warn',
      '@typescript-eslint/ban-ts-comment': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/max-attributes-per-line': 'off',
    },
  },
  {
    files: [
      'workers/**/*.{ts,js}',
      'workers/**/tests/**/*.{ts,js}',
      'server/**/*.{ts,js}',
      'scripts/**/*.{ts,js}',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  prettierConfig,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      'prettier/prettier': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/max-attributes-per-line': 'off',
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.wrangler/**',
      '**/migrations/**',
      '**/*.d.ts',
      '**/drizzle.config.ts',
    ],
  }
);
