import { fileURLToPath } from 'node:url';
import { defineConfig } from 'electron-vite';

// The renderer bundles the TypeScript sources of `shared` directly, no build needed.
const sharedAlias = {
  '@remora/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
};

export default defineConfig({
  main: {},
  preload: {
    build: {
      rolldownOptions: {
        // Sandboxed preload scripts must be CommonJS.
        output: { format: 'cjs', entryFileNames: '[name].cjs' },
      },
    },
  },
  renderer: {
    resolve: { alias: sharedAlias },
  },
});
