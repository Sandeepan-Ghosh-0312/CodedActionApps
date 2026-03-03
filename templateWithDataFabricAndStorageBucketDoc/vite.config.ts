import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

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
    define: {
      'import.meta.env.UIPATH_BASE_URL': JSON.stringify(env.UIPATH_BASE_URL || 'https://alpha.uipath.com'),
      'import.meta.env.UIPATH_ORG_NAME': JSON.stringify(env.UIPATH_ORG_NAME || ''),
      'import.meta.env.UIPATH_TENANT_NAME': JSON.stringify(env.UIPATH_TENANT_NAME || ''),
      'import.meta.env.UIPATH_BEARER_TOKEN': JSON.stringify(env.UIPATH_BEARER_TOKEN || ''),
    },
    base: "/templatewithsdk2" // replace with your app routing name
  };
});