/**
 * chunk-reload-helper.ts — S152.T4 · Block 4
 *
 * Auto-reload-once helper for dynamic-import / chunk-load failures caused by
 * stale module graphs (typically post-deploy or post-SW-update). The flag
 * lives in sessionStorage so a single tab gets exactly one auto-reload before
 * the user-facing error screen is shown — preventing reload loops.
 */

export const CHUNK_RELOAD_FLAG = 'opx:chunk-reload-once';

/** Matches Vite / webpack dynamic-import / chunk-load runtime errors. */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  if (!msg) return false;
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Loading chunk \S+ failed/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
}

/**
 * If the error looks like a chunk-load failure and we have not already
 * auto-reloaded in this tab session, set the flag and return true. Callers
 * should then invoke window.location.reload(). Returns false when the error
 * is unrelated OR a reload has already been attempted (avoids reload loops).
 */
export function shouldAutoReloadOnce(
  error: unknown,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
): boolean {
  if (!isChunkLoadError(error)) return false;
  try {
    if (storage.getItem(CHUNK_RELOAD_FLAG)) return false;
    storage.setItem(CHUNK_RELOAD_FLAG, String(Date.now()));
  } catch {
    return false;
  }
  return true;
}
