/**
 * @file        src/lib/comply360-form26as-reco-engine.ts
 * @purpose     Form 26AS (TRACES) reconciliation — match claimed TDS (from our
 *              books / aggregator) against reflected TDS (uploaded 26AS data)
 * @sprint      Sprint 72 · T-Phase-5.A.1.4 · Block 6 · DP-S72-5
 * @decisions   DP-S72-5 (Form 26AS reco engine · greenfield)
 * @iso         Reliability · Auditability
 * @disciplines FR-19 SIBLING · FR-43 · FR-91 honest disclosure
 * @reads-from  src/lib/comply360-tds-aggregator-engine.ts (claimed deductions) ·
 *              localStorage `comply360.form26as.<entity>.<fy>` (reflected entries)
 */
import type { TDSDeduction } from './comply360-tds-aggregator-engine';
import { dAdd, dSub, round2 } from './decimal-helpers';

// ── Public Types ─────────────────────────────────────────────────────

export interface Form26ASEntry {
  tan_deductor: string;
  deductor_name: string;
  section: string;
  amount_paid: number;        // gross
  tds_deducted: number;
  tds_deposited: number;
  date_of_payment: string;    // ISO yyyy-mm-dd
  date_of_booking: string;    // ISO yyyy-mm-dd
  status: 'F' | 'O' | 'P' | 'U'; // Final · Overbooked · Provisional · Unmatched
  challan_ref?: string;
}

export interface Form26ASMatch {
  claimed: TDSDeduction;
  reflected: Form26ASEntry;
  variance: number;           // claimed.tds_amount - reflected.tds_deposited
  match_quality: 'exact' | 'tolerant' | 'amount-mismatch';
}

export interface Form26ASMismatch {
  side: 'claimed-only' | 'reflected-only' | 'amount-mismatch';
  claimed?: TDSDeduction;
  reflected?: Form26ASEntry;
  variance: number;
  reason: string;
}

export interface Form26ASRecoResult {
  entity_code: string;
  fy: string;
  generated_at: string;
  matched: Form26ASMatch[];
  mismatched: Form26ASMismatch[];
  totals: {
    claimed_count: number;
    reflected_count: number;
    matched_count: number;
    mismatched_count: number;
    claimed_total: number;
    reflected_total: number;
    net_variance: number;
  };
}

const STORAGE_KEY = (entityCode: string, fy: string) =>
  `comply360.form26as.${entityCode}.${fy}`;

/** Default tolerance for amount matching — ₹1 rounding leeway per entry. */
export const DEFAULT_26AS_TOLERANCE = 1;

// ── Storage ──────────────────────────────────────────────────────────

/** Load reflected 26AS entries for the entity + FY. */
// [JWT] TRACES integration — GET /api/comply360/form26as?entity=<>&fy=<> (Phase 2)
export function loadForm26AS(entityCode: string, fy: string): Form26ASEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(entityCode, fy));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Form26ASEntry[]) : [];
  } catch {
    return [];
  }
}

/** Persist a 26AS upload (e.g. CSV/JSON parse output) into local storage. */
// [JWT] TRACES integration — POST /api/comply360/form26as/upload (Phase 2)
export function saveForm26AS(entityCode: string, fy: string, entries: Form26ASEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY(entityCode, fy), JSON.stringify(entries));
  } catch {
    /* quota — handled by useStorageQuota */
  }
}

// ── Matching ─────────────────────────────────────────────────────────

function matchKey(section: string, partyOrTan: string): string {
  return `${section}::${partyOrTan}`.toLowerCase();
}

/**
 * Reconcile claimed (book-side) TDS deductions against reflected 26AS entries.
 * Matching strategy: group both sides by (section + party/deductor key); within
 * each bucket, pair by date proximity and amount within tolerance.
 */
export function reconcile26AS(
  claimed: TDSDeduction[],
  reflected: Form26ASEntry[],
  options?: { tolerance?: number; entityCode?: string; fy?: string },
): Form26ASRecoResult {
  const tolerance = options?.tolerance ?? DEFAULT_26AS_TOLERANCE;
  const matched: Form26ASMatch[] = [];
  const mismatched: Form26ASMismatch[] = [];

  // Build buckets — claimed keys on party_id; reflected keys on tan_deductor.
  // We bridge them by section + (party_id ≈ tan_deductor) — in real TRACES,
  // the integration layer maps TAN → vendor; here we assume the bookkeeper
  // pre-mapped TAN === party_id for the demo dataset.
  const claimedByKey = new Map<string, TDSDeduction[]>();
  for (const c of claimed) {
    const k = matchKey(c.section, c.party_id);
    const arr = claimedByKey.get(k) ?? [];
    arr.push(c);
    claimedByKey.set(k, arr);
  }
  const reflectedByKey = new Map<string, Form26ASEntry[]>();
  for (const r of reflected) {
    const k = matchKey(r.section, r.tan_deductor);
    const arr = reflectedByKey.get(k) ?? [];
    arr.push(r);
    reflectedByKey.set(k, arr);
  }

  const allKeys = new Set([...claimedByKey.keys(), ...reflectedByKey.keys()]);
  for (const k of allKeys) {
    const cs = (claimedByKey.get(k) ?? []).slice();
    const rs = (reflectedByKey.get(k) ?? []).slice();

    // Sort both by date for deterministic pairing
    cs.sort((a, b) => a.voucher_date.localeCompare(b.voucher_date));
    rs.sort((a, b) => a.date_of_booking.localeCompare(b.date_of_booking));

    while (cs.length && rs.length) {
      const c = cs.shift()!;
      const r = rs.shift()!;
      const variance = round2(dSub(c.tds_amount, r.tds_deposited));
      if (Math.abs(variance) <= tolerance) {
        matched.push({
          claimed: c,
          reflected: r,
          variance,
          match_quality: variance === 0 ? 'exact' : 'tolerant',
        });
      } else {
        mismatched.push({
          side: 'amount-mismatch',
          claimed: c,
          reflected: r,
          variance,
          reason: `Variance ₹${variance} exceeds tolerance ₹${tolerance}`,
        });
      }
    }
    for (const c of cs) {
      mismatched.push({
        side: 'claimed-only',
        claimed: c,
        variance: c.tds_amount,
        reason: 'Claimed in books but not reflected in Form 26AS',
      });
    }
    for (const r of rs) {
      mismatched.push({
        side: 'reflected-only',
        reflected: r,
        variance: -r.tds_deposited,
        reason: 'Reflected in 26AS but no matching book entry',
      });
    }
  }

  const claimedTotal = round2(claimed.reduce((s, c) => dAdd(s, c.tds_amount), 0));
  const reflectedTotal = round2(reflected.reduce((s, r) => dAdd(s, r.tds_deposited), 0));

  return {
    entity_code: options?.entityCode ?? '',
    fy: options?.fy ?? '',
    generated_at: new Date().toISOString(),
    matched,
    mismatched,
    totals: {
      claimed_count: claimed.length,
      reflected_count: reflected.length,
      matched_count: matched.length,
      mismatched_count: mismatched.length,
      claimed_total: claimedTotal,
      reflected_total: reflectedTotal,
      net_variance: round2(dSub(claimedTotal, reflectedTotal)),
    },
  };
}

export const FORM26AS_STORAGE_KEY = STORAGE_KEY;
