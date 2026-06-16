// Flattens the React Router SPA build into a static `dist/` directory.
//
// React Router (framework mode) always writes client assets to
// `build/client/`, but `uip codedapp pack` requires index.html at the ROOT of
// the directory it packs. This copies build/client/* -> dist/* so the app can
// be packed with `uip codedapp pack dist`.
import { rm, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientDir = path.join(root, 'build', 'client');
const distDir = path.join(root, 'dist');

if (!existsSync(clientDir)) {
  console.error(`flatten-build: ${clientDir} not found. Did "react-router build" run first?`);
  process.exit(1);
}

await rm(distDir, { recursive: true, force: true });
await cp(clientDir, distDir, { recursive: true });

console.log('flatten-build: build/client -> dist (pack with: uip codedapp pack dist)');
