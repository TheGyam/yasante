import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { fileURLToPath, URL } from 'node:url';
import { readFile } from 'node:fs/promises';

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
  plugins: [
    {
      name: 'staff-host-shell',
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          const pathname = (request.url ?? '/').split('?')[0];
          if (
            request.headers.host?.startsWith('admin.') &&
            !pathname.startsWith('/data') &&
            !pathname.startsWith('/django-admin') &&
            !pathname.startsWith('/static') &&
            !pathname.startsWith('/src/') &&
            !pathname.startsWith('/@') &&
            !pathname.startsWith('/node_modules/') &&
            !/\.[a-z0-9]+$/i.test(pathname)
          ) {
            try {
              const html = await readFile(
                fileURLToPath(new URL('./staff.html', import.meta.url)),
                'utf8'
              );
              response.setHeader('Content-Type', 'text/html');
              response.end(await server.transformIndexHtml(pathname, html));
            } catch (error) {
              next(error);
            }
          } else next();
        });
      },
    },
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    vanillaExtractPlugin(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: '../backend/apps/web/static/site',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        site: fileURLToPath(new URL('./index.html', import.meta.url)),
        staff: fileURLToPath(new URL('./staff.html', import.meta.url)),
      },
    },
    // Fonts stay as their own files: inlined, every page would carry all four weights.
    assetsInlineLimit: 0,
  },
  server: {
    port: 5173,
    allowedHosts: ['admin.localhost'],
    proxy: {
      // Preserve the browser's Host: Django validates staff POST origins against it.
      '/data': { target: api, changeOrigin: false },
      '/django-admin': { target: api, changeOrigin: false },
      '/static/admin': { target: api, changeOrigin: true },
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
