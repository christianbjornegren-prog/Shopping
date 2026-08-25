import { defineConfig } from 'vitest/config';

// Dedicated config so Vitest doesn't load the app's Vite build config.
// jsdom is needed for the sync-hook integration test (it renders the hook and
// listens for window/document events); the pure-logic tests run fine under it.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
  },
});
