import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

// Links go through @/shared/ui/Link, which prefetches the page under the pointer.
const LINK = {
  name: 'react-router',
  importNames: ['Link', 'NavLink'],
  message: 'Use Link from @/shared/ui/Link, which starts loading the page before the click.',
};

// Module boundaries — the same three rules as the app. See web/README.md.
export default tseslint.config(
  { ignores: ['node_modules/', 'src/shared/lib/api/schema.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  prettier,
  {
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['src/shared/**'],
    ignores: ['src/shared/ui/Link.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [LINK],
          patterns: [
            {
              group: [
                '@/features/*',
                '**/features/*',
                '@/routes/*',
                '**/routes/*',
                '@/staff/*',
                '**/staff/*',
              ],
              message:
                'shared/ must not depend on a feature. If it needs to, it belongs in that feature.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**', 'src/routes/**', 'src/staff/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [LINK],
          patterns: [
            {
              group: ['@/features/*/*'],
              message:
                'Import a feature through its index (@/features/looks), not its internals. Inside a feature, use relative imports.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  }
);
