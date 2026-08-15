import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built game works from a subdirectory (GitHub Pages,
  // itch.io zip upload, or just opening it off a USB stick).
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0, // never inline sprites as base64 - they must stay swappable files
  },
  server: {
    host: true,
    port: 5173,
  },
});
