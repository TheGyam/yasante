module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@/api': './src/api',
            '@/components': './src/components',
            '@/theme': './src/theme',
            '@/hooks': './src/hooks',
            '@/utils': './src/utils',
            '@/constants': './src/constants',
            '@/types': './src/types',
            '@/state': './src/state',
            '@/screens': './src/screens',
            '@/services': './src/services',
            '@/navigation': './src/navigation',
            '@/assets': './src/assets',
          },
        },
      ],
      'react-native-reanimated/plugin', // Must be last
    ],
  };
};

