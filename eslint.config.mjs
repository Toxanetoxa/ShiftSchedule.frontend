import antfu from '@antfu/eslint-config'
import prettier from 'eslint-config-prettier/flat'

export default antfu(
  {
    typescript: true,
    vue: {
      overrides: {
        // UiButton uses ariaLabel as a typed prop, distinct from the native aria-label attribute.
        'vue/attribute-hyphenation': ['error', 'always', { ignore: ['ariaLabel'] }],
      },
    },
    // Prettier handles formatting; ESLint checks code quality and import order.
    stylistic: false,
    formatters: false,
    yaml: {
      overrides: {
        // Prettier keeps short YAML sequences inline.
        'yaml/block-sequence': 'off',
      },
    },
    ignores: [
      'node_modules/**',
      'dist/**',
      'storybook-static/**',
      'coverage/**',
      '.vite/**',
      'frontend-documentation.md',
      'frontend-token-map.json',
      'frontend-tokens.css',
      'trash.md',
    ],
  },
  {
    files: ['**/*.stories.ts'],
    rules: {
      // Story templates contain interpolation evaluated by Vue.
      'no-template-curly-in-string': 'off',
    },
  },
  prettier,
)
