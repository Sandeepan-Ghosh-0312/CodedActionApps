/// <reference types="vite/client" />

// React Router serializes its hydration context and asset manifest onto window
// at build time. We rewrite both at runtime in entry.client.tsx so the router
// basename and the (build-time-relative) asset URLs match the path the platform
// actually mounts the app at — see the note there.
declare global {
  interface Window {
    __reactRouterContext?: {
      basename?: string;
      [key: string]: unknown;
    };
    __reactRouterManifest?: Record<string, unknown>;
  }
}

export {};
