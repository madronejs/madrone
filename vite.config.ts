import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import babel from '@rolldown/plugin-babel';

// Vite 8 swapped esbuild for Oxc, which does not yet lower TC39 standard
// decorators (oxc-project/oxc#15373). madrone is a decorator framework, so we
// run a targeted Babel pass to transpile them to runtime calls. transform-typescript
// runs first (allowDeclareFields) to strip `declare` ambient class fields - otherwise
// the decorator transform injects initializers into them and Oxc rejects the result.
// The `code: '@'` filter limits Babel to files that actually contain `@` (decorators).
const decoratorLoweringBabelConfig = () => ({
  plugins: [
    ['@babel/plugin-transform-typescript', { allowDeclareFields: true }],
    ['@babel/plugin-proposal-decorators', { version: '2023-11' }],
  ],
});

const decoratorLowering = babel({
  exclude: /[\\/]node_modules[\\/]/,
  presets: [{
    preset: decoratorLoweringBabelConfig,
    rolldown: { filter: { code: '@' } },
  }],
});

export default defineConfig({
  plugins: [decoratorLowering],
  build: {
    lib: {
      entry: {
        core: resolve(__dirname, 'src/index.ts'),
        vue: resolve(__dirname, 'src/integrations/vue.ts'),
      },
      name: 'madrone',
    },
    rollupOptions: {
      // Mark vue as external - users must have it installed
      external: ['vue'],
      output: {
        // Provide global variable name for UMD builds
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Alias 'vue' to 'vue3' package for testing (users will have 'vue' installed)
      vue: 'vue3',
    },
  },
});
