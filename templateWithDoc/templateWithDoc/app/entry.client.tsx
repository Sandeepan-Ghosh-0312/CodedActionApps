import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';
import { getAppBase } from '@uipath/uipath-typescript';

// --- Why this file is custom ---------------------------------------------
// A deployed coded action app is mounted at a path that is only known at
// runtime (the platform injects it as the `uipath:app-base` meta tag, read via
// getAppBase()). React Router framework mode, however, bakes both the router
// basename and the asset URLs into the build, so out of the box neither matches
// the deployed path. We reconcile both here, before hydration:
//
//   1. basename — HydratedRouter reads it from window.__reactRouterContext, so
//      we overwrite it so route matching / <Link> navigation use the real path.
//
//   2. asset manifest — RR loads route chunks via `import(route.module)` using
//      the relative paths in window.__reactRouterManifest (e.g. ./assets/x.js).
//      A dynamic import() resolves relative to the importing chunk's URL, NOT
//      the document's <base href>, so those relative paths 404 once the app is
//      served under a prefix. We rewrite every "./…" URL in the manifest to an
//      absolute path under the runtime base so the imports resolve correctly.
// -------------------------------------------------------------------------

// Recursively rewrite build-time-relative URLs ("./…") to absolute paths under
// `base`. Only manifest URL fields start with "./", so non-URL strings (the
// version hash, ids, etc.) are left untouched.
function rebaseUrls(value: unknown, base: string): unknown {
  if (typeof value === 'string') {
    return value.startsWith('./') ? base + value.slice(1) : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => rebaseUrls(item, base));
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      record[key] = rebaseUrls(record[key], base);
    }
    return record;
  }
  return value;
}

const appBase = getAppBase();
if (appBase && appBase !== '/') {
  if (window.__reactRouterContext) {
    window.__reactRouterContext.basename = appBase;
  }
  if (window.__reactRouterManifest) {
    // Strip any trailing slash so `base + "/assets/x"` doesn't double up.
    const base = appBase.replace(/\/+$/, '');
    window.__reactRouterManifest = rebaseUrls(
      window.__reactRouterManifest,
      base,
    ) as Window['__reactRouterManifest'];
  }
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
