import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MessageSeverity, Theme } from '@uipath/coded-action-app';
import { attachments, codedActionApps } from '../uipath';
import { MAX_CONCURRENT_UPLOADS, MAX_FILE_BYTES, MAX_FILES } from '../config';
import { runPool } from '../uploadPool';
import { formatBytes, formatDuration } from '../format';
import { uniqueFileName } from '../fileName';
import './Upload.css';

/**
 * Shape Action Center uses for a `file` field: the root `ID` member is the attachment id, which is
 * what the downstream node resolves back into a file. Emitting the same shape the platform hands
 * *in* for a file input is what makes the array round-trip through a saved draft.
 */
interface TaskFileRef {
  ID: string;
  FullName: string;
}

/** The action's only output: an array of `file`. */
interface FormData {
  uploadedFiles: TaskFileRef[];
}

type ItemStatus = 'queued' | 'uploading' | 'uploaded' | 'failed';

interface UploadItem {
  /** Row identity, local to this session - not the attachment id. */
  id: string;
  /** The name the attachment is created under - already made unique within this action. */
  name: string;
  /** Only set when `name` had to be suffixed, so the reviewer can see what was renamed. */
  originalName?: string;
  size: number;
  status: ItemStatus;
  /** Set once the attachment exists in Orchestrator. */
  attachmentId?: string;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
}

interface Rejection {
  name: string;
  reason: string;
}

/** One unit of work for the upload pool. */
interface QueuedUpload {
  id: string;
  file: File;
  name: string;
}

interface UploadProps {
  onInitTheme: (isDark: boolean) => void;
}

const isDarkTheme = (theme: Theme): boolean =>
  theme === Theme.Dark || theme === Theme.DarkHighContrast;

const toFileRefs = (items: UploadItem[]): TaskFileRef[] =>
  items.reduce<TaskFileRef[]>((refs, item) => {
    if (item.status === 'uploaded' && item.attachmentId) {
      refs.push({ ID: item.attachmentId, FullName: item.name });
    }
    return refs;
  }, []);

const errorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message ? err.message : fallback;

const Upload = ({ onInitTheme }: UploadProps) => {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tick, setTick] = useState(() => performance.now());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  /**
   * The `File` handles live outside React state on purpose. A handle is only a reference to bytes
   * on disk, and keeping it out of state guarantees no render path can ever touch the contents -
   * and that nothing large can leak into `setTaskData`, which serialises whatever it is given.
   */
  const filesRef = useRef(new Map<string, File>());

  /** Row ids waiting for a worker. Workers pull from here, so late arrivals join the same run. */
  const queueRef = useRef<string[]>([]);
  const poolRunningRef = useRef(false);
  const pumpRef = useRef<() => void>(() => {});
  const folderIdRef = useRef<number | undefined>(undefined);

  /**
   * Mirror of `items` that the async upload workers read. State updates are queued by React, so a
   * worker resolving between renders cannot trust a captured `items`; every read and write goes
   * through this ref, and `setItems` only exists to trigger the re-render.
   */
  const itemsRef = useRef<UploadItem[]>([]);

  const updateItems = useCallback((mutate: (current: UploadItem[]) => UploadItem[]): void => {
    const next = mutate(itemsRef.current);
    itemsRef.current = next;
    setItems(next);
  }, []);

  const patchItem = useCallback(
    (id: string, patch: Partial<UploadItem>) => {
      updateItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
    [updateItems],
  );

  /** Publishes the current output so Action Center can save the action in progress. */
  const publishOutputs = useCallback(() => {
    const data: FormData = { uploadedFiles: toFileRefs(itemsRef.current) };
    codedActionApps.setTaskData(data);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const task = await codedActionApps.getTask();
        folderIdRef.current = task.folderId;

        // A saved draft comes back with the attachments already uploaded, so restore those rows as
        // finished. They have no `File` handle behind them, which is why retry is upload-only.
        const saved = (task.data as Partial<FormData> | undefined)?.uploadedFiles;
        if (Array.isArray(saved) && saved.length > 0) {
          // Merged rather than assigned: `getTask()` is a round trip to the host, and the dropzone
          // is live before it answers, so anything the user already added has to survive. Keying
          // off the attachment id also keeps a repeated call from duplicating the restored rows.
          updateItems((current) => {
            const known = new Set(current.map((item) => item.attachmentId).filter(Boolean));
            const restored = saved
              .filter((ref): ref is TaskFileRef => Boolean(ref?.ID) && !known.has(ref.ID))
              .map((ref) => ({
                id: crypto.randomUUID(),
                name: ref.FullName || ref.ID,
                size: 0,
                status: 'uploaded' as const,
                attachmentId: ref.ID,
              }));
            return [...restored, ...current];
          });
        }

        setIsReadOnly(task.isReadOnly);
        onInitTheme(isDarkTheme(task.theme));
      } catch (err: unknown) {
        codedActionApps.showMessage(
          errorMessage(err, 'Failed to load the task.'),
          MessageSeverity.Error,
        );
      }
    };

    init();
  }, [onInitTheme, updateItems]);

  /** Hands out the next queued row, skipping ids whose row was removed while it waited. */
  const takeNext = useCallback((): QueuedUpload | null => {
    for (;;) {
      const id = queueRef.current.shift();
      if (id === undefined) return null;
      const file = filesRef.current.get(id);
      const item = itemsRef.current.find((candidate) => candidate.id === id);
      // The name travels with the work: `file.name` is the raw one off disk, which may collide
      // with another row, while the row's `name` is the one that was made unique when it was added.
      if (file && item) return { id, file, name: item.name };
    }
  }, []);

  const uploadOne = useCallback(
    async ({ id, file, name }: QueuedUpload): Promise<void> => {
      patchItem(id, { status: 'uploading', startedAt: performance.now(), error: undefined });
      try {
        /**
         * The `File` is handed to the SDK as-is. Under the hood this becomes the body of a single
         * PUT, which the browser streams from disk - the bytes never pass through JavaScript, so a
         * 100 MB file costs the tab no memory and blocks the main thread for no measurable time.
         * Reading it first (`arrayBuffer()`, `FileReader`, base64) is what freezes a tab.
         */
        const attachment = await attachments.create(name, file, {
          folderId: folderIdRef.current,
        });
        patchItem(id, {
          status: 'uploaded',
          attachmentId: attachment.id,
          finishedAt: performance.now(),
        });
        // The handle has served its purpose; drop it so the browser can release the file lock.
        filesRef.current.delete(id);
        publishOutputs();
      } catch (err: unknown) {
        patchItem(id, {
          status: 'failed',
          error: errorMessage(err, 'The upload failed.'),
          finishedAt: performance.now(),
        });
      }
    },
    [patchItem, publishOutputs],
  );

  const pump = useCallback(() => {
    if (poolRunningRef.current) return;
    poolRunningRef.current = true;

    void runPool(MAX_CONCURRENT_UPLOADS, takeNext, uploadOne)
      .catch(() => {
        // `uploadOne` records its own failures; nothing is left to report here.
      })
      .finally(() => {
        poolRunningRef.current = false;
        // Files added in the instant between the last worker draining the queue and this line
        // would otherwise sit as 'queued' forever, so re-check before standing down.
        if (queueRef.current.length > 0) pumpRef.current();
      });
  }, [takeNext, uploadOne]);

  useEffect(() => {
    pumpRef.current = pump;
  }, [pump]);

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (isReadOnly || !incoming || incoming.length === 0) return;

      const current = itemsRef.current;
      const accepted: UploadItem[] = [];
      const refused: Rejection[] = [];
      // Names already spoken for, including any accepted earlier in this same batch, so a set of
      // files that all share one name each get their own suffix rather than all landing on `(2)`.
      const taken = new Set(current.map((item) => item.name.toLowerCase()));

      // Iterating a `FileList` only walks handles - it never touches the files themselves, so this
      // stays cheap even when someone drops a folder with hundreds of entries in it.
      for (const file of Array.from(incoming)) {
        if (current.length + accepted.length >= MAX_FILES) {
          refused.push({ name: file.name, reason: `This action accepts ${MAX_FILES} files at most.` });
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          refused.push({
            name: file.name,
            reason: `${formatBytes(file.size)} exceeds the ${formatBytes(MAX_FILE_BYTES)} limit.`,
          });
          continue;
        }
        if (file.size === 0) {
          refused.push({ name: file.name, reason: 'The file is empty.' });
          continue;
        }

        // Same-named files are accepted; the copy is suffixed instead of being turned away. The
        // suffixed name is what the attachment is created under, so it is the row's real name -
        // `originalName` is kept only to tell the reviewer what was renamed.
        const name = uniqueFileName(file.name, taken);
        taken.add(name.toLowerCase());

        const id = crypto.randomUUID();
        filesRef.current.set(id, file);
        accepted.push({
          id,
          name,
          originalName: name === file.name ? undefined : file.name,
          size: file.size,
          status: 'queued',
        });
      }

      setRejections(refused);

      if (accepted.length > 0) {
        queueRef.current.push(...accepted.map((item) => item.id));
        updateItems((list) => [...list, ...accepted]);
        pump();
      }
    },
    [isReadOnly, pump, updateItems],
  );

  const handlePick = (e: ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    // Reset so picking the same file again still raises a change event.
    e.target.value = '';
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isReadOnly) return;
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Counted rather than toggled: dragging over a child fires leave on the parent.
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removeItem = (id: string) => {
    const item = itemsRef.current.find((candidate) => candidate.id === id);
    // An in-flight PUT cannot be called back, so the row stays until it settles.
    if (!item || item.status === 'uploading') return;

    filesRef.current.delete(id);
    updateItems((current) => current.filter((candidate) => candidate.id !== id));
    if (item.status === 'uploaded') publishOutputs();
  };

  const retryItem = (id: string) => {
    const item = itemsRef.current.find((candidate) => candidate.id === id);
    if (!item || item.status !== 'failed' || !filesRef.current.has(id)) return;

    patchItem(id, { status: 'queued', error: undefined, startedAt: undefined, finishedAt: undefined });
    queueRef.current.push(id);
    pump();
  };

  const retryAll = () => {
    itemsRef.current
      .filter((item) => item.status === 'failed')
      .forEach((item) => retryItem(item.id));
  };

  const uploadedFiles = useMemo(() => toFileRefs(items), [items]);
  const pending = items.filter((item) => item.status === 'queued' || item.status === 'uploading');
  const failed = items.filter((item) => item.status === 'failed');
  const isUploading = items.some((item) => item.status === 'uploading');
  const isBusy = pending.length > 0;

  const totalBytes = items.reduce((sum, item) => sum + item.size, 0);
  const doneBytes = items.reduce((sum, item) => (item.status === 'uploaded' ? sum + item.size : sum), 0);
  const donePct = totalBytes > 0 ? Math.round((doneBytes / totalBytes) * 100) : 0;

  // The SDK uploads with `fetch`, which reports no byte-level progress, so an in-flight row shows
  // elapsed time instead of a fake percentage. The interval only exists while something is
  // actually uploading - an idle form schedules no work at all.
  useEffect(() => {
    if (!isUploading) return;
    const timer = window.setInterval(() => setTick(performance.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isUploading]);

  const submit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const data: FormData = { uploadedFiles: toFileRefs(itemsRef.current) };
      const result = await codedActionApps.completeTask('Submit', data);
      if (!result.success) {
        codedActionApps.showMessage(
          result.errorMessage ?? 'Could not complete the action.',
          MessageSeverity.Error,
        );
      }
    } catch (err: unknown) {
      codedActionApps.showMessage(
        errorMessage(err, 'Could not complete the action.'),
        MessageSeverity.Error,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = !isReadOnly && !isSubmitting && !isBusy && uploadedFiles.length > 0;
  const remaining = MAX_FILES - items.length;

  return (
    <div className="upload">
      <header className="upload__header">
        <div>
          <h1 className="upload__title">Attach supporting files</h1>
          <p className="upload__subtitle">
            Up to {MAX_FILES} files, {formatBytes(MAX_FILE_BYTES)} each. Every file is stored as a job
            attachment and handed to the next step of the automation.
          </p>
        </div>
        <div className={`counter ${remaining === 0 ? 'counter--full' : ''}`}>
          <span className="counter__value">{items.length}</span>
          <span className="counter__of">/ {MAX_FILES}</span>
        </div>
      </header>

      {!isReadOnly && (
        <div
          className={`dropzone ${isDragging ? 'dropzone--active' : ''} ${remaining === 0 ? 'dropzone--disabled' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            className="dropzone__input"
            type="file"
            multiple
            onChange={handlePick}
            disabled={remaining === 0}
          />
          <p className="dropzone__lead">
            {remaining === 0 ? 'All slots are full' : 'Drop files here'}
          </p>
          <p className="dropzone__hint">
            {remaining === 0
              ? 'Remove a file to make room for another.'
              : `${remaining} ${remaining === 1 ? 'slot' : 'slots'} left · any file type`}
          </p>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={remaining === 0}
          >
            Browse files
          </button>
        </div>
      )}

      {rejections.length > 0 && (
        <section className="notice notice--warn">
          <div className="notice__head">
            <p className="notice__title">
              {rejections.length} {rejections.length === 1 ? 'file was' : 'files were'} not added
            </p>
            <button type="button" className="btn btn--link" onClick={() => setRejections([])}>
              Dismiss
            </button>
          </div>
          <ul className="notice__list">
            {rejections.map((rejection, index) => (
              <li key={`${rejection.name}-${index}`}>
                <span className="notice__name">{rejection.name}</span>
                <span className="notice__reason">{rejection.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {items.length > 0 && (
        <section className="files">
          <div className="files__head">
            <h2 className="files__title">Files</h2>
            <span className="files__summary">
              {uploadedFiles.length} of {items.length} uploaded
              {totalBytes > 0 && ` · ${formatBytes(doneBytes)} of ${formatBytes(totalBytes)}`}
            </span>
          </div>

          <div className="bar" role="progressbar" aria-valuenow={donePct} aria-valuemin={0} aria-valuemax={100}>
            <span className="bar__fill" style={{ width: `${donePct}%` }} />
          </div>

          <ul className="files__list">
            {items.map((item) => (
              <li key={item.id} className={`file file--${item.status}`}>
                <span className="file__dot" aria-hidden="true" />
                <div className="file__body">
                  <p className="file__name" title={item.name}>{item.name}</p>
                  <p className="file__meta">
                    {item.size > 0 && <span>{formatBytes(item.size)}</span>}
                    {item.originalName && (
                      <span className="file__renamed" title={`Uploaded as ${item.name}`}>
                        renamed from {item.originalName}
                      </span>
                    )}
                    {item.status === 'queued' && <span>Waiting</span>}
                    {item.status === 'uploading' && (
                      <span>
                        Uploading · {formatDuration(tick - (item.startedAt ?? tick))}
                      </span>
                    )}
                    {item.status === 'uploaded' && (
                      <span className="file__ok">
                        Attached
                        {item.startedAt !== undefined && item.finishedAt !== undefined &&
                          ` in ${formatDuration(item.finishedAt - item.startedAt)}`}
                      </span>
                    )}
                    {item.status === 'failed' && <span className="file__bad">{item.error}</span>}
                  </p>
                  {item.status === 'uploading' && (
                    <span className="shimmer" aria-hidden="true">
                      <span className="shimmer__fill" />
                    </span>
                  )}
                </div>
                <div className="file__actions">
                  {item.status === 'failed' && !isReadOnly && (
                    <button type="button" className="btn btn--link" onClick={() => retryItem(item.id)}>
                      Retry
                    </button>
                  )}
                  {!isReadOnly && item.status !== 'uploading' && (
                    <button
                      type="button"
                      className="btn btn--icon"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove ${item.name}`}
                      title="Remove"
                    >
                      ×
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {failed.length > 1 && !isReadOnly && (
            <button type="button" className="btn btn--ghost" onClick={retryAll}>
              Retry {failed.length} failed uploads
            </button>
          )}
        </section>
      )}

      <footer className="upload__actions">
        <span className="upload__status">
          {isReadOnly
            ? 'This action is read-only.'
            : isBusy
              ? `${pending.length} ${pending.length === 1 ? 'file' : 'files'} still uploading — you can leave this tab open.`
              : uploadedFiles.length === 0
                ? 'Attach at least one file to submit.'
                : `${uploadedFiles.length} ${uploadedFiles.length === 1 ? 'file' : 'files'} ready to hand over.`}
        </span>
        <button type="button" className="btn btn--primary" onClick={submit} disabled={!canSubmit}>
          {isSubmitting ? 'Submitting…' : 'Submit'}
        </button>
      </footer>
    </div>
  );
};

export default Upload;
