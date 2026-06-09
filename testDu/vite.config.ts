import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { cp } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);

// The Validation Station web component loads runtime assets (PDF.js worker,
// cmaps, wasm, i18n) from a sibling `du-assets/` folder resolved via
// `import.meta.url`. Copy it next to the emitted JS after each build, or PDF
// rendering and translations silently 404 in production.
function copyDuValidationStationAssets(): Plugin {
  let destDir = '';
  return {
    name: 'copy-du-validation-station-assets',
    apply: 'build',
    configResolved(config) {
      destDir = resolve(config.root, config.build.outDir, config.build.assetsDir, 'du-assets');
    },
    async closeBundle() {
      const wcRoot = dirname(require.resolve('@uipath/du-validation-station-wc/package.json'));
      await cp(resolve(wcRoot, 'du-assets'), destDir, { recursive: true });
    },
  };
}

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
      copyDuValidationStationAssets(),
    ],
    define: {
      'import.meta.env.UIPATH_BASE_URL': JSON.stringify(env.UIPATH_BASE_URL || 'https://alpha.uipath.com'),
      'import.meta.env.UIPATH_ORG_NAME': JSON.stringify(env.UIPATH_ORG_NAME || ''),
      'import.meta.env.UIPATH_TENANT_NAME': JSON.stringify(env.UIPATH_TENANT_NAME || ''),
      'import.meta.env.UIPATH_BEARER_TOKEN': JSON.stringify(env.UIPATH_BEARER_TOKEN || ''),
    },
    // Vite's pre-bundler rewrites `import.meta.url`, which breaks the WC's
    // runtime asset resolution — exclude it from dep optimization.
    optimizeDeps: {
      exclude: ['@uipath/du-validation-station-wc'],
    },
    base: "./", // Use relative paths for assets, base is dynamically injected using getAppBase()
  };
});
