import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
    ],
    optimizeDeps: {
      include: ['@uipath/uipath-typescript/core', '@uipath/uipath-typescript/attachments'],
    },
    base: './', // Relative asset paths - the app is served from a path the host decides.
  };
});
