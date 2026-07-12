import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  test: {
    // Default node environment; client component tests opt into jsdom via
    // a `// @vitest-environment jsdom` file comment.
    environment: 'node',
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'server/**/*.test.ts',
      'client/**/*.test.tsx',
    ],
    exclude: ['e2e/**', 'node_modules/**'],
    setupFiles: ['tests/setup.ts'],
  },
});
