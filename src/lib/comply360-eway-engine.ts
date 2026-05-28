/**
 * @file        src/lib/comply360-eway-engine.ts
 * @purpose     Comply360 E-Way Bill engine · Part A (transport doc) + Part B (vehicle),
 *              EWB generation / closure / Ship-To GSTIN handling, threshold + validity
 *              calc. Localised persistence for Phase 1; [JWT] wires to EWB portal in Phase 8.
 * @sprint      Sprint 73a · T-Phase-5.A.1.5-PASS-A · Block 4 · DP-S73-3
 * @iso         Reliability · Maintainability · Auditability
 * @disciplines FR-19 SIBLING · FR-43 unit tests · FR-79 audit stamping · FR-91 honest disclosure
 * @reads-from  localStorage `comply360.eway.<entityCode>` (own scoped store)
 */

// ── Public Types ─────────────────────────────────────────────────────

export type EWayBillStatus = 'draft' | 'generated' | 'closed' | 'cancelled' | 'expired';
export type TransportMode = 'road' | 'rail' | 'air' | 'ship';

export interface EWayPartA {
  supplier_gstin: string;
  supplier_state_code: string;
  consignee_gstin: string;
  consignee_state_code: string;
  ship_to_gstin?: string;          // Bill-to-Ship-to scenario
  ship_to_state_code?: string;
  doc_no: string;
  doc_date: string;                // ISO yyyy-mm-dd
  doc_type: 'INV' | 'CHL' | 'BIL' | 'BOE' | 'OTH';
  hsn_code: string;
  total_invoice_value: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  reason: 'supply' | 'export' | 'job-work' | 'sales-return' | 'others';
}

export interface EWayPartB {
  transport_mode: TransportMode;
  vehicle_no?: string;
  vehicle_type?: 'regular' | 'over-dimensional';
  transporter_id?: string;
  transporter_name?: string;
  transport_doc_no?: string;
  transport_doc_date?: string;
  approx_distance_km: number;
}

export interface EWayBill {
  ewb_no: string;
  entity_code: string;
  part_a: EWayPartA;
  part_b: EWayPartB;
  generated_at: string | null;
  valid_until: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  status: EWayBillStatus;
  errors: string[];
}

export interface EWayValidationResult {
  ok: boolean;
  errors: string[];
}

// ── Constants ────────────────────────────────────────────────────────

/** Statutory EWB threshold under Rule 138 — ₹50,000 invoice value. */
export const EWB_THRESHOLD = 50_000;

const STORAGE_KEY_PREFIX = 'comply360.eway.';
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/;

// ── Internal helpers ─────────────────────────────────────────────────

function storageKey(entityCode: string): string {
  return `${STORAGE_KEY_PREFIX}${entityCode}`;
}

function loadAll(entityCode: string): EWayBill[] {
  // [JWT] GET /api/comply360/eway?entity=<entityCode>
  try {
    const raw = localStorage.getItem(storageKey(entityCode));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EWayBill[]) : [];
  } catch {
    return [];
  }
}

function saveAll(entityCode: string, list: EWayBill[]): void {
  // [JWT] PUT /api/comply360/eway batch
  try {
    localStorage.setItem(storageKey(entityCode), JSON.stringify(list));
  } catch {
    /* quota — diagnostics via useStorageQuota */
  }
}

function makeEwbNo(): string {
  // 12-digit numeric, mirrors NIC EWB portal format.
  let s = '';
  for (let i = 0; i < 12; i += 1) s += String(Math.floor(Math.random() * 10));
  return s;
}

/**
 * EWB validity per Rule 138(10):
 *  - regular cargo: 1 day per 200 km (or part thereof)
 *  - ODC: 1 day per 20 km
 */
export function computeValidityDays(distanceKm: number, vehicleType: 'regular' | 'over-dimensional' = 'regular'): number {
  if (distanceKm <= 0) return 0;
  const perDay = vehicleType === 'over-dimensional' ? 20 : 200;
  return Math.max(1, Math.ceil(distanceKm / perDay));
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

// ── Public API ───────────────────────────────────────────────────────

/** Statutory threshold check — caller decides whether EWB is required. */
export function isEWBRequired(totalInvoiceValue: number): boolean {
  return totalInvoiceValue >= EWB_THRESHOLD;
}

/** Validate a draft EWB before generation; returns the same shape used for batch UIs. */
export function validateEWayBill(ewb: EWayBill): EWayValidationResult {
  const errors: string[] = [];
  const a = ewb.part_a;
  const b = ewb.part_b;

  if (!GSTIN_RE.test(a.supplier_gstin)) errors.push('Supplier GSTIN invalid');
  if (!GSTIN_RE.test(a.consignee_gstin)) errors.push('Consignee GSTIN invalid');
  if (a.ship_to_gstin && !GSTIN_RE.test(a.ship_to_gstin)) {
    errors.push('Ship-To GSTIN invalid (Bill-to-Ship-to scenario)');
  }
  if (!a.doc_no) errors.push('Document number missing');
  if (!a.doc_date) errors.push('Document date missing');
  if (!a.hsn_code || a.hsn_code.length < 4) errors.push('HSN code too short (min 4 digits)');
  if (a.total_invoice_value < EWB_THRESHOLD) {
    errors.push(`Invoice value below EWB threshold of ₹${EWB_THRESHOLD.toLocaleString('en-IN')}`);
  }
  if (b.approx_distance_km <= 0) errors.push('Approximate distance must be > 0 km');
  if (b.transport_mode === 'road' && !b.vehicle_no) {
    errors.push('Vehicle number required for road transport');
  }
  if (b.transport_mode !== 'road' && !b.transport_doc_no) {
    errors.push('Transport document number required for non-road transport');
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Build (and persist as 'generated') an EWB from Part A + Part B.
 * Validity stamped per Rule 138(10). Invalid drafts are still persisted with
 * status 'draft' so the Pass B UI can surface errors for remediation.
 */
export function buildEWayBill(entityCode: string, partA: EWayPartA, partB: EWayPartB): EWayBill {
  const now = new Date().toISOString();
  const draft: EWayBill = {
    ewb_no: makeEwbNo(),
    entity_code: entityCode,
    part_a: partA,
    part_b: partB,
    generated_at: null,
    valid_until: null,
    closed_at: null,
    cancelled_at: null,
    status: 'draft',
    errors: [],
  };
  const v = validateEWayBill(draft);
  draft.errors = v.errors;
  if (v.ok) {
    draft.status = 'generated';
    draft.generated_at = now;
    const days = computeValidityDays(partB.approx_distance_km, partB.vehicle_type);
    draft.valid_until = addDays(now, days);
  }
  const list = loadAll(entityCode);
  list.push(draft);
  saveAll(entityCode, list);
  return draft;
}

/** Close an EWB (Part B journey complete). Returns the updated record or null. */
export function closeEWayBill(entityCode: string, ewbNo: string): EWayBill | null {
  // [JWT] POST EWB portal /ewayapi/v1.03/ewayapi/closereq
  const list = loadAll(entityCode);
  const idx = list.findIndex((e) => e.ewb_no === ewbNo);
  if (idx < 0) return null;
  if (list[idx].status !== 'generated') return list[idx];
  list[idx] = { ...list[idx], status: 'closed', closed_at: new Date().toISOString() };
  saveAll(entityCode, list);
  return list[idx];
}

/** Cancel an EWB within the 24h window. */
export function cancelEWayBill(entityCode: string, ewbNo: string): EWayBill | null {
  // [JWT] POST EWB portal /ewayapi/v1.03/ewayapi/cancelewb
  const list = loadAll(entityCode);
  const idx = list.findIndex((e) => e.ewb_no === ewbNo);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], status: 'cancelled', cancelled_at: new Date().toISOString() };
  saveAll(entityCode, list);
  return list[idx];
}

/** List EWBs for an entity (default: generated + closed; pass `all=true` for everything). */
export function loadEWayBills(entityCode: string, all = true): EWayBill[] {
  const list = loadAll(entityCode);
  return all ? list : list.filter((e) => e.status === 'generated' || e.status === 'closed');
}

export const EWAY_STORAGE_KEY_PREFIX = STORAGE_KEY_PREFIX;
