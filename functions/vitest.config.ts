import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // Functions imports shared via relative paths in TS (rootDirs), but
      // some files use the workspace package name. Map both to source so we
      // don't need a separate shared build for tests.
      '@home-helper/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'lib'],
  },
});
