/** Splits on the last dot, so `archive.tar.gz` keeps `.gz` and a dotfile keeps its leading dot. */
const splitExtension = (name: string): { base: string; extension: string } => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? { base: name.slice(0, dot), extension: name.slice(dot) } : { base: name, extension: '' };
};

/**
 * Returns `name`, or the first `name (n)` variant that is not in `taken`.
 *
 * Two files picked from different folders can legitimately share a name, and the reviewer should
 * not have to rename them on disk first. Making the name unique before upload keeps every
 * attachment distinguishable in Orchestrator, and keeps a downstream step that writes the array
 * out to one directory from overwriting its own files.
 *
 * `taken` is compared case-insensitively - a name that only differs in case still collides once the
 * files land on a case-insensitive file system.
 */
export const uniqueFileName = (name: string, taken: Set<string>): string => {
  if (!taken.has(name.toLowerCase())) return name;

  const { base, extension } = splitExtension(name);
  for (let n = 2; ; n += 1) {
    const candidate = `${base} (${n})${extension}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
};
