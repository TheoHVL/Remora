import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Tests use the TypeScript sources of `shared` directly, no build needed.
    alias: {
      '@remora/shared': fileURLToPath(new URL('packages/shared/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['{apps,packages}/*/src/**/*.test.ts'],
  },
});
