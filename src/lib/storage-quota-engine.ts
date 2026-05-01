/**
 * storage-quota-engine.ts — Browser localStorage quota monitoring + tiered enforcement
 *
 * Sprint T-Phase-1.2.5h-b2 · Card #2.5 sub-sprint 3 of 4
 *
 * Tiered thresholds (Q1-c lock):
 *   < 70%   →  green (no action)
 *   70-89%  →  amber warning (Command Center banner)
 *   90-94%  →  red warning (Command Center modal · suggest archive)
 *   95-98%  →  block NEW voucher creation · allow read/edit/print/cancel
 *   99%+    →  block ALL writes
 *
 * EXCEPTION: audit_trail writes are ALWAYS allowed at any threshold —
 *   the MCA Rule 3(1) "cannot be disabled" guarantee takes priority over
 *   storage limits. If the audit log itself fills the quota, the user must
 *   export & archive it before adding any other data.
 *
 * [JWT] Phase 2 backend takes over storage; this engine becomes a no-op.
 */

export interface StorageUsage {
  used_bytes: number;
  /** Browser-reported quota when available; otherwise conservative estimate */
  quota_bytes: number;
  pct: number;
  tier: 'green' | 'amber' | 'red' | 'block_create' | 'block_all';
  top_keys: Array<{ key: string; bytes: number }>;
}

export type WriteIntent = 'audit_trail' | 'voucher_create' | 'edit' | 'master_crud';

const SAFARI_QUOTA_BYTES = 5 * 1024 * 1024;       // 5 MB · safari conservative
const STANDARD_QUOTA_BYTES = 10 * 1024 * 1024;    // 10 MB · chrome/firefox
const BLOCK_CREATE_PCT = 95;
const BLOCK_ALL_PCT = 99;

/** Returns total bytes used across all localStorage keys. */
function computeUsedBytes(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const value = localStorage.getItem(key) ?? '';
    // Each char ≈ 2 bytes in UTF-16 (browser localStorage spec)
    total += (key.length + value.length) * 2;
  }
  return total;
}

/** Returns top N largest keys by byte size, descending. */
function topKeysByBytes(n = 10): Array<{ key: string; bytes: number }> {
  const all: Array<{ key: string; bytes: number }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const v = localStorage.getItem(key) ?? '';
    all.push({ key, bytes: (key.length + v.length) * 2 });
  }
  return all.sort((a, b) => b.bytes - a.bytes).slice(0, n);
}

/** Public · returns current storage usage snapshot. */
export function getStorageUsage(): StorageUsage {
  const used = computeUsedBytes();
  // Detect Safari (5MB) vs others (10MB) — heuristic since browsers don't reliably expose quota
  const isSafari = typeof navigator !== 'undefined'
    && /Safari/.test(navigator.userAgent)
    && !/Chrome|Chromium/.test(navigator.userAgent);
  const quota = isSafari ? SAFARI_QUOTA_BYTES : STANDARD_QUOTA_BYTES;
  const pct = (used / quota) * 100;

  let tier: StorageUsage['tier'] = 'green';
  if (pct >= BLOCK_ALL_PCT) tier = 'block_all';
  else if (pct >= BLOCK_CREATE_PCT) tier = 'block_create';
  else if (pct >= 90) tier = 'red';
  else if (pct >= 70) tier = 'amber';

  return { used_bytes: used, quota_bytes: quota, pct, tier, top_keys: topKeysByBytes(10) };
}

/**
 * Public · check if a write of the given size+intent should proceed.
 *
 * @param intent  'audit_trail'  → ALWAYS allowed (MCA Rule 3(1) priority)
 *                'voucher_create' → blocked at >= 95%
 *                'edit'           → blocked at >= 99%
 *                'master_crud'    → blocked at >= 99%
 */
export function checkWriteAllowed(intent: WriteIntent): {
  allowed: boolean;
  reason?: string;
  tier: StorageUsage['tier'];
} {
  const usage = getStorageUsage();
  // MCA Rule 3(1) priority: audit trail ALWAYS allowed
  if (intent === 'audit_trail') {
    return { allowed: true, tier: usage.tier };
  }
  if (usage.tier === 'block_all') {
    return {
      allowed: false,
      reason: `Storage at ${usage.pct.toFixed(1)}% — all writes blocked. Export & archive old data to continue.`,
      tier: usage.tier,
    };
  }
  if (usage.tier === 'block_create' && intent === 'voucher_create') {
    return {
      allowed: false,
      reason: `Storage at ${usage.pct.toFixed(1)}% — new voucher creation blocked. Edits and views still allowed. Archive old data to resume creation.`,
      tier: usage.tier,
    };
  }
  return { allowed: true, tier: usage.tier };
}

/**
 * Archive a single key: download its value as JSON file, then truncate to last N entries
 * (or clear entirely if not an array). Returns the bytes freed.
 */
export function archiveKey(key: string, keepLastN = 100): { freedBytes: number; archivedItems: number } {
  const raw = localStorage.getItem(key);
  if (!raw) return { freedBytes: 0, archivedItems: 0 };

  // Trigger download
  try {
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${key}_archive_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    /* download failed — proceed with truncation regardless */
  }

  const beforeBytes = (key.length + raw.length) * 2;
  let archivedItems = 0;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > keepLastN) {
      const trimmed = parsed.slice(-keepLastN);
      archivedItems = parsed.length - keepLastN;
      localStorage.setItem(key, JSON.stringify(trimmed));
    }
  } catch {
    // Non-array · leave as-is (user must clear manually)
  }

  const after = localStorage.getItem(key) ?? '';
  const afterBytes = (key.length + after.length) * 2;
  return { freedBytes: beforeBytes - afterBytes, archivedItems };
}

/** Format bytes into a short human label (e.g., "1.4 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
