/**
 * @file        src/lib/comply360-section393-engine.ts
 * @purpose     Comply360 Companies Act §393 (formerly §391-394 of 1956 Act)
 *              arrangements / compromises / amalgamations register.
 *              Greenfield engine — no upstream consumer; Pass B surfaces it
 *              in the ROC mega-menu (Sprint 73b).
 * @sprint      Sprint 73a · T-Phase-5.A.1.5-PASS-A · Block 6 · DP-S73-5
 * @iso         Reliability · Maintainability · Auditability
 * @disciplines FR-19 SIBLING · FR-43 unit tests · FR-79 audit stamping · FR-91 honest disclosure
 * @reads-from  localStorage `comply360.section393.<entityCode>` (own scoped store)
 */

// ── Public Types ─────────────────────────────────────────────────────

export type ArrangementScheme =
  | 'amalgamation'
  | 'merger'
  | 'demerger'
  | 'compromise-with-creditors'
  | 'compromise-with-members'
  | 'reconstruction'
  | 'reduction-of-capital'
  | 'cross-border-merger';

export type NCLTStatus =
  | 'draft'
  | 'first-motion-filed'
  | 'meetings-convened'
  | 'second-motion-filed'
  | 'sanctioned'
  | 'rejected'
  | 'withdrawn';

export interface ArrangementParty {
  party_id: string;
  party_name: string;
  cin?: string;
  role: 'transferor' | 'transferee' | 'creditor-class' | 'shareholder-class';
}

export interface Arrangement {
  id: string;
  entity_code: string;
  scheme: ArrangementScheme;
  short_title: string;
  appointed_date: string;          // ISO — accounting cut-over date
  effective_date?: string;         // ISO — once sanctioned & filed with RoC
  parties: ArrangementParty[];
  nclt_status: NCLTStatus;
  nclt_bench?: string;
  ca_no?: string;                  // Company Application number
  consideration_value?: number;    // ₹
  swap_ratio?: string;             // e.g. "5:1"
  created_at: string;
  updated_at: string;
}

export interface Section393Disclosure {
  entity_code: string;
  arrangement_id: string;
  scheme: ArrangementScheme;
  short_title: string;
  parties_summary: string;
  status: NCLTStatus;
  appointed_date: string;
  effective_date: string | null;
  disclosure_notes: string[];
}

// ── Constants ────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'comply360.section393.';

// ── Internal helpers ─────────────────────────────────────────────────

function storageKey(entityCode: string): string {
  return `${STORAGE_KEY_PREFIX}${entityCode}`;
}

function makeId(): string {
  return `arr-${Date.now()}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

// ── Public API ───────────────────────────────────────────────────────

/** Load all arrangements for an entity. */
export function loadArrangements(entityCode: string): Arrangement[] {
  // [JWT] GET /api/comply360/section393?entity=<entityCode>
  try {
    const raw = localStorage.getItem(storageKey(entityCode));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Arrangement[]) : [];
  } catch {
    return [];
  }
}

/** Persist a new arrangement (or upsert if `arr.id` already exists). */
export function recordArrangement(
  arr: Omit<Arrangement, 'id' | 'created_at' | 'updated_at'> & { id?: string },
): Arrangement {
  // [JWT] POST /api/comply360/section393
  const now = new Date().toISOString();
  const list = loadArrangements(arr.entity_code);
  const id = arr.id ?? makeId();
  const existing = list.findIndex((a) => a.id === id);
  const record: Arrangement = {
    id,
    entity_code: arr.entity_code,
    scheme: arr.scheme,
    short_title: arr.short_title,
    appointed_date: arr.appointed_date,
    effective_date: arr.effective_date,
    parties: arr.parties,
    nclt_status: arr.nclt_status,
    nclt_bench: arr.nclt_bench,
    ca_no: arr.ca_no,
    consideration_value: arr.consideration_value,
    swap_ratio: arr.swap_ratio,
    created_at: existing >= 0 ? list[existing].created_at : now,
    updated_at: now,
  };
  if (existing >= 0) list[existing] = record;
  else list.push(record);
  try {
    localStorage.setItem(storageKey(arr.entity_code), JSON.stringify(list));
  } catch {
    /* quota — diagnostics via useStorageQuota */
  }
  return record;
}

/**
 * Build the §393 disclosure block consumed by Pass B (ROC notes-to-accounts surface).
 * Highlights scheme, parties, NCLT status, and any tracked notes (swap ratio, consideration).
 */
export function buildSection393Disclosure(arr: Arrangement): Section393Disclosure {
  const notes: string[] = [];
  if (arr.swap_ratio) notes.push(`Swap ratio: ${arr.swap_ratio}`);
  if (arr.consideration_value != null) {
    notes.push(`Consideration: ₹${arr.consideration_value.toLocaleString('en-IN')}`);
  }
  if (arr.nclt_bench) notes.push(`NCLT bench: ${arr.nclt_bench}`);
  if (arr.ca_no) notes.push(`Company Application: ${arr.ca_no}`);
  if (arr.nclt_status === 'sanctioned' && !arr.effective_date) {
    notes.push('Sanctioned by NCLT but effective date not yet recorded.');
  }
  const transferors = arr.parties.filter((p) => p.role === 'transferor').map((p) => p.party_name);
  const transferees = arr.parties.filter((p) => p.role === 'transferee').map((p) => p.party_name);
  const partiesSummary = `${transferors.join(', ') || '—'} → ${transferees.join(', ') || '—'}`;
  return {
    entity_code: arr.entity_code,
    arrangement_id: arr.id,
    scheme: arr.scheme,
    short_title: arr.short_title,
    parties_summary: partiesSummary,
    status: arr.nclt_status,
    appointed_date: arr.appointed_date,
    effective_date: arr.effective_date ?? null,
    disclosure_notes: notes,
  };
}

/** Delete an arrangement (used by ROC corrections). */
export function deleteArrangement(entityCode: string, arrangementId: string): boolean {
  // [JWT] DELETE /api/comply360/section393/<id>
  const list = loadArrangements(entityCode);
  const next = list.filter((a) => a.id !== arrangementId);
  if (next.length === list.length) return false;
  try {
    localStorage.setItem(storageKey(entityCode), JSON.stringify(next));
  } catch {
    /* quota */
  }
  return true;
}

export const SECTION393_STORAGE_KEY_PREFIX = STORAGE_KEY_PREFIX;
