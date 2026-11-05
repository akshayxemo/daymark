import path from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = {
  '@': path.resolve(import.meta.dirname, 'src'),
  // Server-only modules are imported by node tests; the marker is a no-op there.
  'server-only': path.resolve(import.meta.dirname, 'tests/stubs/server-only.ts'),
};

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        },
        resolve: { alias },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          globalSetup: ['tests/integration/global-setup.ts'],
          setupFiles: ['tests/integration/setup.ts'],
          // Integration tests share one database; run files sequentially.
          fileParallelism: false,
          testTimeout: 30000,
          hookTimeout: 60000,
        },
        resolve: { alias },
      },
    ],
  },
});
