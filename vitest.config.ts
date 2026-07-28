import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'lib/chrome/restore-session.ts',
        'lib/sessions/**/*.ts',
        'lib/storage/**/*.ts',
        'lib/validation/**/*.ts',
      ],
      exclude: ['**/*.test.ts', '**/*.test.tsx'],
      thresholds: {
        statements: 45,
        branches: 40,
        functions: 45,
        lines: 50,
      },
    },
    environment: 'node',
  },
});
