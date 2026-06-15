import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
    ],
    optimizeDeps: {
      include: ['@uipath/uipath-typescript'],
    },
    base: './', // Use relative paths for assets, base is dynamically injected using getAppBase()
  };
});
