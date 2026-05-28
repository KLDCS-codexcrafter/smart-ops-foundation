/**
 * @file        src/lib/comply360-ewb02-consolidation-engine.ts
 * @purpose     Comply360 EWB-02 (consolidated e-way bill) · groups multiple EWBs travelling
 *              on one conveyance/route/transporter into a single CEWB envelope.
 *              Reads the S73a eway-engine (0-DIFF) · never mutates source EWBs.
 * @sprint      Sprint 76a · T-Phase-5.A.1.8-PASS-A · Block 4 · DP-S76-3
 * @decisions   D-S69-1 (100% native) · DP-S76-3 (EWB-02 reads eway-engine)
 * @iso         Reliability · Maintainability · Auditability
 * @disciplines FR-19 SIBLING · FR-43 unit tests · FR-91 honest disclosure · Lesson 23 contract
 * @reads-from  src/lib/comply360-eway-engine.ts (EWayBill shape + validateEWayBill · 0-DIFF)
 * @lesson-23   Block 8 tests grep export signatures before asserting return shapes.
 */
import { type EWayBill, validateEWayBill } from './comply360-eway-engine';
import { dSum, round2 } from './decimal-helpers';

// ── Public Types ─────────────────────────────────────────────────────

export interface ConveyanceMeta {
  vehicle_no: string;
  transporter_id?: string;
  transporter_name?: string;
  from_place: string;
  from_state_code: string;
  to_place: string;
  to_state_code: string;
}

export interface ConsolidatedEWB {
  cewb_no: string;
  generated_at: string;
  conveyance: ConveyanceMeta;
  ewb_count: number;
  ewb_numbers: string[];
  total_invoice_value: number;
  total_taxable_value: number;
  warnings: string[];
  errors: string[];
  valid: boolean;
}

export interface EWB02ValidationResult {
  ok: boolean;
  errors: string[];
}

// ── READS_FROM contract (Lesson 23) ──────────────────────────────────

export const READS_FROM = {
  ewayEngine: 'src/lib/comply360-eway-engine.ts',
} as const;

// ── Internal helpers ─────────────────────────────────────────────────

function makeCewbNo(): string {
  // 10-digit numeric CEWB id (NIC EWB portal format · separate from 12-digit EWB).
  let s = '';
  for (let i = 0; i < 10; i += 1) s += String(Math.floor(Math.random() * 10));
  return s;
}

function isActive(ewb: EWayBill): boolean {
  return ewb.status === 'generated' || ewb.status === 'closed';
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Build a Consolidated EWB (EWB-02) from a list of source EWBs.
 * - Source EWBs are NEVER mutated (eway-engine remains 0-DIFF).
 * - Conveyance vehicle_no must match Part B vehicle_no on every active source EWB.
 * - Cancelled / draft EWBs are filtered with a warning rather than failing the build.
 */
export function buildEWB02(ewbs: EWayBill[], conveyance: ConveyanceMeta): ConsolidatedEWB {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!conveyance.vehicle_no) {
    errors.push('Conveyance vehicle_no required');
  }
  if (!conveyance.from_state_code || !conveyance.to_state_code) {
    errors.push('Conveyance from_state_code and to_state_code required');
  }
  if (ewbs.length === 0) {
    errors.push('At least one source EWB required for EWB-02 consolidation');
  }

  const inactive = ewbs.filter((e) => !isActive(e));
  if (inactive.length > 0) {
    warnings.push(`${inactive.length} EWBs skipped (draft/cancelled/expired)`);
  }
  const active = ewbs.filter(isActive);

  // Vehicle-match check (only when vehicle_no provided on source EWB · road mode).
  const mismatched = active.filter((e) => {
    const v = e.part_b.vehicle_no;
    return v && conveyance.vehicle_no && v !== conveyance.vehicle_no;
  });
  if (mismatched.length > 0) {
    errors.push(`${mismatched.length} EWBs have vehicle_no different from conveyance.vehicle_no`);
  }

  // Source-EWB self-validity check — if any source is internally invalid, surface as warning.
  const invalidSources = active.filter((e) => !validateEWayBill(e).ok);
  if (invalidSources.length > 0) {
    warnings.push(`${invalidSources.length} source EWBs fail validateEWayBill — review before filing`);
  }

  const total_invoice_value = round2(dSum(active, (e) => e.part_a.total_invoice_value));
  const total_taxable_value = round2(dSum(active, (e) => e.part_a.taxable_value));

  return {
    cewb_no: errors.length === 0 ? makeCewbNo() : '',
    generated_at: errors.length === 0 ? new Date().toISOString() : '',
    conveyance,
    ewb_count: active.length,
    ewb_numbers: active.map((e) => e.ewb_no),
    total_invoice_value,
    total_taxable_value,
    warnings,
    errors,
    valid: errors.length === 0,
  };
}

/** Re-validate a previously built ConsolidatedEWB (e.g. before portal submit). */
export function validateEWB02(cewb: ConsolidatedEWB): EWB02ValidationResult {
  const errors: string[] = [];
  if (!cewb.cewb_no) errors.push('CEWB number missing');
  if (cewb.ewb_count === 0) errors.push('CEWB has no active EWBs');
  if (!cewb.conveyance.vehicle_no) errors.push('Conveyance vehicle_no missing');
  if (cewb.errors.length > 0) errors.push(...cewb.errors);
  return { ok: errors.length === 0, errors };
}

/** Group a flat EWB list by vehicle_no → useful for batch CEWB generation. */
export function groupEWBsByVehicle(ewbs: EWayBill[]): Map<string, EWayBill[]> {
  const map = new Map<string, EWayBill[]>();
  for (const e of ewbs) {
    if (!isActive(e)) continue;
    const v = e.part_b.vehicle_no ?? '';
    if (!v) continue;
    const cur = map.get(v) ?? [];
    cur.push(e);
    map.set(v, cur);
  }
  return map;
}
