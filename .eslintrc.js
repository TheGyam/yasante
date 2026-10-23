// Every screen navigates through @/shared/lib/navigation, which ignores the second
// of two taps that would otherwise open the same screen twice.
const ROUTER = {
  name: 'expo-router',
  importNames: ['useRouter'],
  message: 'Use useRouter from @/shared/lib/navigation, which ignores double taps.',
};

module.exports = {
  extends: ['expo', 'prettier', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'warn',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  // React Native globals come from eslint-config-expo; the react-native/react-native
  // env key needs eslint-plugin-react-native, which is not installed.
  ignorePatterns: ['src/shared/lib/api/schema.d.ts', 'node_modules/', 'android/', '.expo/', 'web/'],
  // Module boundaries — see ARCHITECTURE.md.
  overrides: [
    {
      files: ['src/shared/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [ROUTER],
            patterns: [
              {
                group: ['@/features/*', '**/features/*'],
                message:
                  'shared/ must not depend on a feature. If it needs to, it belongs in that feature.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/features/**', 'app/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [ROUTER],
            patterns: [
              {
                group: ['@/features/*/*'],
                message:
                  'Import a feature through its index (@/features/booking), not its internals. Inside a feature, use relative imports.',
              },
            ],
          },
        ],
      },
    },
  ],
};
