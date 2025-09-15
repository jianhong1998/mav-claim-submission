import { defineConfig } from 'vitest/config';
import path from 'path';
// import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    // swc.vite({
    //   module: { type: 'es6' },
    // }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '.next/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
