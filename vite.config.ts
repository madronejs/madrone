import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import babel from '@rolldown/plugin-babel';

// Oxc (Vite 8) can't lower TC39 decorators, so lower them with Babel.
// transform-typescript runs first to strip `declare` fields, which Oxc otherwise rejects.
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
