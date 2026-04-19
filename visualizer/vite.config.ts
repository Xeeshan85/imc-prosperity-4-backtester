import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Use VITE_BASE_PATH env var when deploying to GitHub Pages,
  // default to '/' for local dev and static file serving.
  base: process.env.VITE_BASE_PATH ?? '/',
  build: {
    minify: false,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
    },
  },
});
