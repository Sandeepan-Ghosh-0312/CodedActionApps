# templateWithMultiFileUpload

A **Coded Action App** whose action schema has a single output: an **array of `file`**. The reviewer
picks up to **15 files of 100 MB each** in the browser, each one is uploaded as an **Orchestrator job
attachment**, and the resulting array is handed to the next node of the automation when the action
completes.

The interesting part of this sample is not the form — it is that **1.5 GB of user-selected files
never touch JavaScript memory and never block the tab**. See
[How it stays responsive](#how-it-stays-responsive).

## Action schema

`action-schema.json` declares nothing on the way in and one array on the way out:

```json
{
  "inputs":  { "type": "object", "properties": {} },
  "outputs": {
    "type": "object",
    "properties": {
      "uploadedFiles": {
        "type": "array",
        "required": true,
        "items": { "type": "file" }
      }
    }
  },
  "inOuts":   { "type": "object", "properties": {} },
  "outcomes": { "type": "object", "properties": { "Submit": { "type": "string" } } }
}
```

Each element of `uploadedFiles` is emitted in the shape Action Center itself uses for a `file`
field — an object whose root member `ID` is the attachment id:

```json
{ "uploadedFiles": [
  { "ID": "8f1c…-…-…", "FullName": "statement-q3.pdf" },
  { "ID": "b207…-…-…", "FullName": "scan-batch.zip" }
] }
```

The downstream node receives that array as a collection of
`UiPath.Platform.ResourceHandling.IResource` and resolves each entry back into the file — iterate it
in a **For Each** and use each item wherever an `IResource` is accepted.

## How it works

| Step | What happens |
|------|--------------|
| Pick / drop files | `addFiles()` validates count and size **from the `File` handles only** — nothing is read |
| De-duplicate names | A name already in the list gets a `(2)`, `(3)`… suffix, so same-named files are all kept |
| Enqueue | Accepted rows go into a queue; the worker pool starts if it is not already running |
| Upload | `attachments.create(name, file, { folderId })` creates the attachment and uploads it |
| Publish | On each success `setTaskData({ uploadedFiles })` so Action Center can save the action in progress |
| Submit | `completeTask('Submit', { uploadedFiles })` hands the array over |

`attachments.create()` does two things in one call: it creates the Orchestrator attachment record and
PUTs the content to the storage URI that comes back with it. The attachment is created in the task's
own folder (`task.folderId`), which is where the job that consumes it runs.

> **Linking to a specific job.** `attachments.create()` also takes `jobKey` and `category`, which
> link the attachment to a job as part of the same call. This app does not pass them — the action's
> `file` output is what carries the files to the next node, and Action Center resolves them against
> the consuming job. Pass `jobKey` only if you have a job key in hand and want the attachment
> visible under that job immediately.

## How it stays responsive

15 × 100 MB is 1.5 GB. Every one of these rules matters — dropping any single one is enough to make
the tab stall or the renderer die:

1. **The bytes are never read.** The `File` handle goes straight into `attachments.create()`, which
   makes it the body of one `PUT`. The browser streams it off disk. There is no `FileReader`, no
   `await file.arrayBuffer()`, no base64, no `URL.createObjectURL()` — any of those materialises the
   whole file in the tab's heap, and a handful of them at 100 MB each is what actually crashes a tab.
2. **Parallel, but bounded.** A pull-based worker pool (`src/uploadPool.ts`) keeps
   `MAX_CONCURRENT_UPLOADS = 6` uploads in flight at once. Workers pull their next item, so files
   added mid-run join the same pool without restarting it. See
   [Why six at a time](#why-six-at-a-time) for the bound.
3. **`File` handles live outside React state** (`filesRef`), so no render path can reach the contents
   and nothing large can slip into `setTaskData()`, which serialises whatever it is handed.
4. **No previews or thumbnails.** The list renders name, size and status — all metadata that is
   already on the handle.
5. **Validation happens before anything is sent.** Files over 100 MB, empty files, and anything
   past the 15th are refused with a reason instead of being uploaded and rejected later.
6. **The only timer runs while an upload is in flight.** An idle form schedules no work.

Two consequences worth knowing:

- **There is no byte-level progress bar.** The SDK uploads with `fetch`, which reports no upload
  progress, so an in-flight row shows elapsed time and the overall bar advances per completed file.
  It is honest rather than animated.
- **An upload in flight cannot be cancelled.** `attachments.create()` takes no abort signal, so a
  row can only be removed once it settles. Queued and failed rows can be removed at any time.

Removing a row *after* it uploaded drops it from the action output; the attachment itself stays in
Orchestrator.

## Why six at a time

The uploads are parallel; the pool only sets how many run at once. Six is the number for two
reasons.

**It is what the platform's own control achieves.** The Multi File Uploader in Business Apps takes
the same two-step route as this app — create the attachment in Orchestrator, then `PUT` the bytes to
the storage URI it returns — and fires its whole batch concurrently
(`batch.map(uploadItem)` → `await Promise.allSettled(...)`, with `UPLOAD_BATCH_SIZE` equal to its
10-file limit, so there is only ever one batch). The browser runs six of those and queues the rest.
Six in flight *is* the parallel case.

The six comes from the protocol the bytes actually travel over, and the two calls do not use the
same one:

| Host | Call | Protocol |
|------|------|----------|
| `api.uipath.com` | `POST /odata/Attachments` — creates the record | HTTP/2 |
| `*.blob.core.windows.net` | `PUT` — carries the file | **HTTP/1.1** |

Azure Blob Storage does not offer HTTP/2; ALPN falls back to 1.1 even when the client asks for h2.
So the cheap create calls multiplex freely over one h2 connection, while the expensive transfers —
all to the one storage origin — hit the browser's **six connections per origin** limit for HTTP/1.1.
A seventh `PUT` does not start; it waits.

**Beyond that, a wider pool is not faster.** Bandwidth is shared, so the batch finishes when the
bytes are through either way. What bounding it buys with files this large is that files complete
*progressively* rather than all at the end — which is what makes per-file retry, a moving progress
bar, and a partial result after a failure worth anything. Fifteen 100 MB files sharing one pipe
finish at roughly the same moment, near the end, and a drop at minute nine costs all of it.

Raising `MAX_CONCURRENT_UPLOADS` in [`src/config.ts`](./templateWithMultiFileUpload/src/config.ts) above six therefore buys
nothing on UiPath Cloud — the extra workers would queue inside the browser rather than on ours.
It is worth revisiting only if your tenant's storage URI points somewhere that does negotiate
HTTP/2; check the Protocol column in the browser's network panel before changing it.

## Files that share a name

Two files picked from different folders can legitimately be called `scan.pdf`, and the reviewer
should not have to rename them on disk first. Both are accepted; the second is uploaded as
`scan (2).pdf`, the third as `scan (3).pdf`, and so on:

- The suffix is applied **when the file is added**, not when it is uploaded, so the name shown in
  the list is the name the attachment is created under and the name that lands in `FullName`.
- Matching is **case-insensitive** — `Scan.PDF` and `scan.pdf` collide, because they would collide
  again on a case-insensitive file system downstream.
- The suffix goes **before the extension** (`archive.tar.gz` → `archive.tar (2).gz`), so anything
  keying off the extension still works.
- The row shows *renamed from …* so the reviewer can see which file was adjusted.

This matters to the downstream node: a step that iterates the array and writes each file into one
directory would otherwise silently overwrite its own output. The logic is a single pure function in
[`src/fileName.ts`](./templateWithMultiFileUpload/src/fileName.ts).

## Prerequisites

- **Node.js** 20.x or later, **npm** 8.x or later
- A **UiPath Automation Cloud** tenant
- The [uip](https://github.com/UiPath/cli#installation) CLI: `npm i -g @uipath/cli`
- A non-confidential **External Application** (OAuth client) with these scopes:

| Scope | Needed for |
|-------|-----------|
| `OR.Folders.Write` | `attachments.create()` |
| `OR.Folders.Read` | reading the attachment back |

Put its client id in `uipath.json`:

```json
{
  "scope": "OR.Folders.Read OR.Folders.Write",
  "clientId": "<external-application-clientId>"
}
```

## Setup

```bash
cd templateWithMultiFileUpload
npm install
npm run build
```

Publish it as an **Action** app — the default is `Web`, and a Web app never binds to Action Center
tasks:

```bash
uip codedapp publish --type Action
```

Then add the app to a process as the UI of a **Wait for Action** / **Create Action** step, and wire
`uploadedFiles` into whatever consumes the files downstream.

## Testing with a 100 MB file

Make a sparse 100 MB test file — `mkfile -n` allocates no real disk, so it costs nothing:

```bash
mkfile -n 104857600 sample-100mb.bin          # macOS
# head -c 104857600 /dev/zero > sample-100mb.bin   # Linux
```

104,857,600 bytes is exactly 100 MB, so it also verifies the boundary: the limit is inclusive, and a
file one byte larger is refused.

One file is enough to fill the form: pick the same `sample-100mb.bin` 15 times and each copy is
accepted under its own name — `sample-100mb.bin`, `sample-100mb (2).bin`, and so on up to
`sample-100mb (15).bin`. That also exercises the full 1.5 GB path in one go.

`*.bin` is git-ignored, so a fixture this size cannot be committed by accident.

## Project layout

```
action-schema.json          single output: array of `file`
uipath.json                 scopes + OAuth client id, read by `uip codedapp`
src/
  main.tsx                  entry point
  App.tsx                   theme wiring and shell
  uipath.ts                 SDK + Action Center service instances
  config.ts                 MAX_FILES, MAX_FILE_BYTES, MAX_CONCURRENT_UPLOADS
  uploadPool.ts             pull-based bounded-concurrency worker pool
  fileName.ts               makes a colliding file name unique with a `(n)` suffix
  format.ts                 byte / duration formatting
  components/Upload.tsx     dropzone, upload queue, file list, submit
```

There is no router: the app is a single view, so `react-router-dom` and the `getAppBase()` basename
it needs are not part of it. Vite's `base: './'` already keeps the asset paths relative.

## Tuning the limits

Both limits live in `src/config.ts` and are enforced in one place (`addFiles`), so changing them
needs no other edit:

```ts
export const MAX_FILES = 15;
export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_CONCURRENT_UPLOADS = 6;
```

See [Why six at a time](#why-six-at-a-time) before raising the last one.
