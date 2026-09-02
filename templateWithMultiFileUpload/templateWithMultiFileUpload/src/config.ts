/** Upload limits for this action. Both are enforced in the browser before anything is sent. */
export const MAX_FILES = 15;
export const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB

/**
 * How many files upload at the same time.
 *
 * Uploads are already parallel - this is the width of the pool, not a switch, and the pool is what
 * makes parallelism safe rather than something to work around.
 *
 * Six matches what the platform's own Multi File Uploader control achieves in practice: it fires
 * its whole batch at once and the browser runs six of them. The limit is the browser's six
 * connections per origin for HTTP/1.1, and it binds here because the bytes go to Azure Blob
 * Storage, which does not offer HTTP/2 - only the cheap `POST` that creates the attachment gets to
 * multiplex over h2 to the Orchestrator host. Firing all 15 would not start 15 transfers; it would
 * park nine in the browser's queue, moving no bytes while their clock runs.
 *
 * Bandwidth is shared either way, so a wider pool does not finish the batch sooner; what bounding
 * it buys with files this large is that files complete progressively instead of all at the end,
 * which is what makes per-file retry and visible progress worth anything.
 */
export const MAX_CONCURRENT_UPLOADS = 6;
