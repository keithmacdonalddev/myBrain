import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    // Use UTC timezone for consistent date/time tests across all environments
    env: {
      TZ: 'UTC',
    },
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    // Reduce worker memory pressure in large test runs.
    // Run tests sequentially to reduce memory pressure, but each file in its own fork for isolation
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        // Use multiple forks but run files sequentially (fileParallelism: false)
        // This ensures test isolation while managing memory via sharding
        singleFork: false,
        minForks: 1,
        maxForks: 2,
        // Isolate per test file to prevent state pollution between files.
        isolate: true,
        execArgv: ['--max-old-space-size=4096'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
