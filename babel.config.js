module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo already adds the worklets plugin for Reanimated, and the React
    // Compiler when experiments.reactCompiler is on. Adding either here runs it twice.
    presets: ['babel-preset-expo'],
    plugins: [['module-resolver', { root: ['./'], alias: { '@': './src' } }]],
  };
};
