import { defineConfig } from 'vitest/config';

// Dedicated config so Vitest doesn't load the app's Vite build config.
// The logic under test is plain JS, so the Node environment is enough.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
