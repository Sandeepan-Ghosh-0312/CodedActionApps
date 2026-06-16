import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(() => {
  return {
    plugins: [
      // The React Router plugin already wires in the React/JSX transform —
      // do not also add @vitejs/plugin-react or React will be processed twice.
      reactRouter(),
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
