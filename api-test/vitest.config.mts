import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 10000,
    hookTimeout: 10000,
    globalSetup: './src/setup/test-setup.ts',
    setupFiles: './src/setup/vitest-setup.ts',
    // Run test files sequentially to avoid race conditions with shared test user
    fileParallelism: false,
  },
});
