import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Where the site will be served from.
 *
 * On a custom domain this is '/', which is the default. GitHub Pages project
 * sites live under /<repo>/ instead, so the deploy workflow sets VITE_BASE.
 * When the custom domain goes live, drop that line from the workflow and add a
 * public/CNAME file — nothing else has to change.
 */
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    // Root-relative, so this needs no Node types and works in Vite and Vitest.
    alias: { '@': '/src' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
