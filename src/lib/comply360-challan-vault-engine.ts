/**
 * @file        src/lib/comply360-challan-vault-engine.ts
 * @sibling     NEW @ Sprint 79a · Comply360 Main Arc 1.11 · Pass A · Q24
 * @realizes    Challan Vault · stores executed challans · consumes S78a
 *              statutory-payments-engine's prepareChallan handoff payload
 *              (DP-S78-5 cascade). 15-module data model:
 *              challan record · OCR upload stub (DP-S79-7 · no actual text
 *              extraction) · reconciliation centre · statement-of-account
 *              reconciliation · late-fee/interest tracking · bulk CSV export.
 * @reads-from  comply360-statutory-payments-engine · comply360-statutory-memory
 * @sprint      Sprint 79a · T-Phase-5.A.1.11-PASS-A
 * [JWT] Phase 8: GET /api/comply360/challans · POST /api/comply360/challans/store · POST /api/comply360/challans/reconcile
 */
import { loadPayments } from './comply360-statutory-payments-engine';
import { loadObligations } from './comply360-statutory-memory';

export const READS_FROM = {
  engines: ['comply360-statutory-payments-engine', 'comply360-statutory-memory'],
  storage_keys: [],
} as const;

export type ChallanMode = 'net-banking' | 'neft-rtgs' | 'cheque' | 'cash' | 'over-the-counter';
export type ChallanStatus = 'pending-recon' | 'matched' | 'unmatched' | 'queried';
export type ChallanPaymentType =
  | 'gst' | 'tds' | 'esi' | 'pf' | 'income-tax-advance'
  | 'late-fee' | 'interest' | 'penalty';

export interface ChallanUploadStub {
  file_name: string;
  file_size_bytes: number;
  uploaded_at: string;
  ocr_extracted: false; // DP-S79-7 · OCR is stub only · no text extraction in S79
}

export interface Challan {
  id: string;
  entity_code: string;
  payment_id: string | null;
  payment_type: ChallanPaymentType;
  bsr_code: string;
  cin: string;
  deposit_date: string;
  amount_inr: number; // paise
  mode: ChallanMode;
  status: ChallanStatus;
  ocr_file_meta?: ChallanUploadStub;
  reconciliation_status?: 'matched' | 'unmatched' | 'partial';
  late_fee_inr?: number;
  interest_inr?: number;
}

export interface ReconciliationResult {
  challan_id: string;
  payment_id: string | null;
  obligation_id: string | null;
  status: 'matched' | 'unmatched' | 'partial';
  mismatch_reason?: string;
}

const storageKey = (entity_code: string): string =>
  `erp_comply360_challan_vault_${entity_code}`;

// [JWT] localStorage — replace with REST GET /api/comply360/challans in Phase 8
function read(entity_code: string): Challan[] {
  try {
    const raw = localStorage.getItem(storageKey(entity_code));
    return raw ? (JSON.parse(raw) as Challan[]) : [];
  } catch {
    return [];
  }
}

function write(entity_code: string, list: Challan[]): void {
  localStorage.setItem(storageKey(entity_code), JSON.stringify(list));
}

/** Store an executed challan in the vault. */
export function storeChallan(challan: Challan): Challan {
  const list = read(challan.entity_code);
  const next: Challan = { ...challan, status: challan.status ?? 'pending-recon' };
  list.push(next);
  write(challan.entity_code, list);
  return next;
}

/** List challans for an entity scoped to an FY-window (deposit_date YYYY-MM-DD). */
export function listChallans(entity_code: string, fy: string): Challan[] {
  const [y1Str] = fy.split('-');
  const y1 = Number.parseInt(y1Str, 10);
  if (!Number.isFinite(y1)) return read(entity_code);
  const fromDate = `${y1}-04-01`;
  const toDate = `${y1 + 1}-03-31`;
  return read(entity_code).filter(
    (c) => c.deposit_date >= fromDate && c.deposit_date <= toDate,
  );
}

/**
 * Reconcile a stored challan against the statutory-payments register and
 * statutory-memory obligations. Marks status accordingly.
 */
export function reconcileChallan(
  entity_code: string,
  challan_id: string,
  fy: string,
): ReconciliationResult {
  const list = read(entity_code);
  const challan = list.find((c) => c.id === challan_id);
  if (!challan) {
    return {
      challan_id, payment_id: null, obligation_id: null,
      status: 'unmatched', mismatch_reason: 'challan not found',
    };
  }
  const payments = loadPayments(entity_code, fy);
  const payment = payments.find((p) => p.id === challan.payment_id);
  const obligations = loadObligations();
  const obligation = obligations.find((o) => o.id === challan.payment_id);

  let result: ReconciliationResult;
  if (!payment) {
    result = {
      challan_id, payment_id: challan.payment_id, obligation_id: obligation?.id ?? null,
      status: 'unmatched', mismatch_reason: 'no matching payment in statutory register',
    };
  } else if (payment.amount_inr !== challan.amount_inr) {
    result = {
      challan_id, payment_id: payment.id, obligation_id: obligation?.id ?? null,
      status: 'partial',
      mismatch_reason: `amount mismatch · payment=${payment.amount_inr} challan=${challan.amount_inr}`,
    };
  } else {
    result = {
      challan_id, payment_id: payment.id, obligation_id: obligation?.id ?? null,
      status: 'matched',
    };
  }

  const updated = list.map((c) =>
    c.id === challan_id
      ? { ...c, status: result.status === 'matched' ? 'matched' as const : 'unmatched' as const,
          reconciliation_status: result.status }
      : c,
  );
  write(entity_code, updated);
  return result;
}

/**
 * Register an uploaded challan file. STUB · DP-S79-7. Stores filename + size
 * metadata only. No OCR text extraction runs in S79.
 */
export function uploadChallanStub(
  file_name: string,
  file_size_bytes: number,
): ChallanUploadStub {
  return {
    file_name,
    file_size_bytes,
    uploaded_at: new Date().toISOString(),
    ocr_extracted: false,
  };
}

/** Bulk CSV export · header + rows. Amounts in paise (FR-31 money discipline). */
export function exportChallansCsv(challans: Challan[]): string {
  const header = [
    'id', 'entity_code', 'payment_type', 'bsr_code', 'cin',
    'deposit_date', 'amount_paise', 'mode', 'status',
    'late_fee_paise', 'interest_paise',
  ].join(',');
  const rows = challans.map((c) => [
    c.id, c.entity_code, c.payment_type, c.bsr_code, c.cin,
    c.deposit_date, c.amount_inr, c.mode, c.status,
    c.late_fee_inr ?? 0, c.interest_inr ?? 0,
  ].join(','));
  return [header, ...rows].join('\n');
}

/** Sample challan factory for tests/demos · realistic BSR + CIN per S75 lesson (no PLACEHOLDER). */
export function buildSampleChallan(entity_code: string, payment_id: string): Challan {
  return {
    id: `CHL-${entity_code}-${payment_id}`,
    entity_code,
    payment_id,
    payment_type: 'gst',
    bsr_code: '0510308',
    cin: 'CIN0510308202604300048',
    deposit_date: '2026-04-30',
    amount_inr: 12_50_000_00, // ₹12.50 lakh in paise
    mode: 'net-banking',
    status: 'pending-recon',
  };
}
