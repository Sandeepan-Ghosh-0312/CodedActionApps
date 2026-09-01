/**
 * A pull-based worker pool.
 *
 * `size` workers run concurrently; each one asks `next()` for its following unit of work and stops
 * when `next()` returns `null`. Because work is pulled rather than pushed, items added to the
 * backing queue while the pool is running are picked up by whichever worker frees up first - no
 * need to restart the pool or partition the list up front.
 *
 * `run` is expected to handle its own failures; a rejection from it stops that one worker only.
 */
export async function runPool<T>(
  size: number,
  next: () => T | null,
  run: (item: T) => Promise<void>,
): Promise<void> {
  const worker = async (): Promise<void> => {
    for (;;) {
      const item = next();
      if (item === null) return;
      await run(item);
    }
  };

  await Promise.all(Array.from({ length: size }, worker));
}
