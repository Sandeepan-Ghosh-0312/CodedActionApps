import type { Config } from '@react-router/dev/config';

export default {
  // SPA mode — no server rendering. The app is built as static client assets
  // and hosted on the UiPath CDN, then mounted at a runtime path inside the
  // Action Center iframe. See app/entry.client.tsx for how the runtime base
  // path (getAppBase()) is applied to the router.
  ssr: false,
  appDirectory: 'app',
  // React Router always emits client assets into <buildDirectory>/client. The
  // coded-app packer needs index.html at the ROOT of the packed folder, so the
  // `build` script flattens build/client -> dist afterwards (see package.json
  // and scripts/flatten-build.mjs). Pack with: uip codedapp pack dist
  buildDirectory: 'build',
} satisfies Config;
