module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo already adds the worklets plugin for Reanimated, and the React
    // Compiler when experiments.reactCompiler is on. Adding either here runs it twice.
    // import.meta: zustand's ESM build uses it, and web bundles aren't modules.
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    plugins: [['module-resolver', { root: ['./'], alias: { '@': './src' } }]],
  };
};
