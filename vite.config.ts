import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
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
      'vue': 'vue3',
    },
  },
});
