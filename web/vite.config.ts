import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { fileURLToPath, URL } from 'node:url';

/**
 * The site builds into Django's static files: Django serves every page's HTML (with
 * the title, description and share image filled in, and the page's data inlined),
 * and that HTML loads this bundle. See web/README.md.
 *
 * In development Vite serves index.html itself and passes /api and /media on to a
 * backend: a local one by default, or any other with YASANTE_API.
 */
const api = process.env.YASANTE_API ?? 'http://localhost:8000';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/static/site/' : '/',
  // Styles are TypeScript (`.css.ts`, the web's makeStyles), compiled to plain CSS at build time.
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), vanillaExtractPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: '../backend/apps/web/static/site',
    emptyOutDir: true,
    manifest: true,
    // Fonts stay as their own files: inlined, every page would carry all four weights.
    assetsInlineLimit: 0,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: api, changeOrigin: true },
      '/media': { target: api, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
}));
