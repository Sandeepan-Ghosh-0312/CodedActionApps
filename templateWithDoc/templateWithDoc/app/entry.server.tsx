import { PassThrough } from 'node:stream';
import type { EntryContext } from 'react-router';
import { ServerRouter } from 'react-router';
import { createReadableStreamFromReadable } from '@react-router/node';
import { renderToPipeableStream } from 'react-dom/server';

// Build-time only. With ssr: false this runs solely to prerender the static
// SPA shell (index.html) — it never executes in the deployed app, which is
// served as static client assets from the UiPath CDN. Providing this entry
// also lets us keep @react-router/node a devDependency instead of a runtime one.
const ABORT_DELAY = 10_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        onAllReady() {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set('Content-Type', 'text/html');
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
      },
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
