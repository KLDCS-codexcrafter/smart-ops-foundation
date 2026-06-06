/**
 * @file        src/lib/demo-seed-manifest.ts
 * @sprint      P8.1 · Block 1 · Demo-flag foundation (purge-safety first)
 * @purpose     Track every record written by demo seeders so purgeDemoData
 *              can remove ONLY demo data and never touch user-created records.
 *
 * Two tracking modes (per founder Block 1 spec):
 *   1. Key-level: orchestrator-written keys whose ENTIRE contents are demo
 *      (legacy retrofit path · no type changes required to closed types).
 *   2. Record-level: id-scoped tracking for engine-export-written records
 *      that coexist with real user data inside the same key.
 *
 * Manifest shape (per entity):
 *   { keys: string[]; records: { key: string; id: string }[]; sentinel: '1' }
 *
 * [JWT] persistence shim · all reads/writes go through localStorage today;
 * server-side equivalent will be /api/demo/manifest/:entityCode.
 */

export interface DemoSeedManifest {
  /** Storage keys whose entire array is demo (retrofit path · whole-key purge). */
  keys: string[];
  /** Individual records inside shared keys (engine-export records). */
  records: { key: string; id: string }[];
  /** Sentinel set after any successful seeder run · enables idempotency check. */
  sentinel: '1';
}

export const demoSeedManifestKey = (entityCode: string): string =>
  `demo_seed_manifest_${entityCode}`;

const EMPTY: DemoSeedManifest = { keys: [], records: [], sentinel: '1' };

function loadManifest(entityCode: string): DemoSeedManifest {
  try {
    // [JWT] GET /api/demo/manifest/:entityCode
    const raw = localStorage.getItem(demoSeedManifestKey(entityCode));
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<DemoSeedManifest>;
    return {
      keys: Array.isArray(parsed.keys) ? parsed.keys : [],
      records: Array.isArray(parsed.records) ? parsed.records : [],
      sentinel: '1',
    };
  } catch {
    return { ...EMPTY };
  }
}

function saveManifest(entityCode: string, m: DemoSeedManifest): void {
  try {
    // [JWT] POST /api/demo/manifest/:entityCode
    localStorage.setItem(demoSeedManifestKey(entityCode), JSON.stringify(m));
  } catch { /* quota ignored */ }
}

/** Record one storage key as fully demo-owned (whole-key purge target). */
export function recordDemoKey(entityCode: string, key: string): void {
  const m = loadManifest(entityCode);
  if (!m.keys.includes(key)) m.keys.push(key);
  saveManifest(entityCode, m);
}

/** Bulk variant · used by legacy orchestrator retrofit (Block 1). */
export function recordDemoKeys(entityCode: string, keys: string[]): void {
  if (keys.length === 0) return;
  const m = loadManifest(entityCode);
  const set = new Set(m.keys);
  for (const k of keys) set.add(k);
  m.keys = Array.from(set);
  saveManifest(entityCode, m);
}

/** Record one record-id inside a shared key (engine-export records). */
export function recordDemoEntity(entityCode: string, key: string, id: string): void {
  const m = loadManifest(entityCode);
  if (!m.records.some((r) => r.key === key && r.id === id)) {
    m.records.push({ key, id });
  }
  saveManifest(entityCode, m);
}

/** Bulk variant for engines that return multiple records in one call. */
export function recordDemoEntities(
  entityCode: string,
  key: string,
  ids: string[],
): void {
  if (ids.length === 0) return;
  const m = loadManifest(entityCode);
  const seen = new Set(m.records.filter((r) => r.key === key).map((r) => r.id));
  for (const id of ids) {
    if (!seen.has(id)) { m.records.push({ key, id }); seen.add(id); }
  }
  saveManifest(entityCode, m);
}

/** Idempotency probe · seeders skip themselves when their token is present. */
export function hasSeederRun(entityCode: string, token: string): boolean {
  try {
    return localStorage.getItem(`demo_seed_token_${entityCode}_${token}`) === '1';
  } catch { return false; }
}

export function markSeederRun(entityCode: string, token: string): void {
  try {
    // [JWT] POST /api/demo/seeder-token/:entityCode/:token
    localStorage.setItem(`demo_seed_token_${entityCode}_${token}`, '1');
  } catch { /* ignore */ }
}

function clearSeederTokens(entityCode: string): void {
  try {
    const prefix = `demo_seed_token_${entityCode}_`;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) localStorage.removeItem(k);
    }
  } catch { /* ignore */ }
}

/** Read-only inspector · used by tests and UI to show what would purge. */
export function getDemoManifest(entityCode: string): DemoSeedManifest {
  return loadManifest(entityCode);
}

/**
 * Remove EVERY record this entity's demo seeders ever wrote — and ONLY those.
 * Returns counts so callers can toast a real number.
 *
 * Two sweeps:
 *   1. KEY sweep · removeItem on every key in manifest.keys (whole-key demo).
 *   2. RECORD sweep · per record-tracking entry, load array, drop matching id, save.
 *
 * Survivor guarantee · any record NOT recorded in the manifest is preserved.
 * This is the assertion the Block 7 purge-survivor test pins down.
 */
export interface PurgeResult {
  keysRemoved: number;
  recordsRemoved: number;
  recordsSkippedMissing: number;
}

export function purgeDemoData(entityCode: string): PurgeResult {
  const m = loadManifest(entityCode);
  let keysRemoved = 0;
  let recordsRemoved = 0;
  let recordsSkippedMissing = 0;

  // 1 · Whole-key sweep
  for (const key of m.keys) {
    try {
      // [JWT] DELETE /api/entity/storage/:key
      if (localStorage.getItem(key) != null) {
        localStorage.removeItem(key);
        keysRemoved += 1;
      }
    } catch { /* ignore */ }
  }

  // 2 · Record-id sweep (groups by key for one read/write per key)
  const byKey = new Map<string, Set<string>>();
  for (const r of m.records) {
    let s = byKey.get(r.key);
    if (!s) { s = new Set(); byKey.set(r.key, s); }
    s.add(r.id);
  }
  for (const [key, ids] of byKey) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) { recordsSkippedMissing += ids.size; continue; }
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) continue;
      const before = arr.length;
      const filtered = arr.filter((row: unknown) => {
        if (!row || typeof row !== 'object') return true;
        const id = (row as { id?: unknown }).id;
        return !(typeof id === 'string' && ids.has(id));
      });
      recordsRemoved += before - filtered.length;
      // [JWT] PATCH /api/entity/storage/:key
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch { /* ignore parse */ }
  }

  // 3 · Clear the manifest itself and all seeder tokens
  try { localStorage.removeItem(demoSeedManifestKey(entityCode)); } catch { /* ignore */ }
  clearSeederTokens(entityCode);

  return { keysRemoved, recordsRemoved, recordsSkippedMissing };
}
