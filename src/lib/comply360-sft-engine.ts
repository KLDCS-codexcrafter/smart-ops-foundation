/**
 * @file        src/lib/comply360-sft-engine.ts
 * @purpose     SFT (Statement of Financial Transactions · Form 61A) high-value
 *              transaction detection + statement builder
 * @sprint      Sprint 72 · T-Phase-5.A.1.4 · Block 5 · DP-S72-4
 * @decisions   DP-S72-4 (SFT engine)
 * @iso         Reliability · Auditability
 * @disciplines FR-19 SIBLING · FR-43 · FR-91 honest disclosure
 * @reads-from  src/lib/comply360-tds-aggregator-engine.ts (loadVouchers shape compatible) ·
 *              localStorage `erp_group_vouchers_<entityCode>`
 */
import { dAdd, dSum, round2 } from './decimal-helpers';

// ── Public Types ─────────────────────────────────────────────────────

export type SFTCode =
  | 'SFT-001'   // Cash payment > ₹10L for credit card
  | 'SFT-004'   // Cash deposit > ₹10L in savings
  | 'SFT-005'   // Term deposit > ₹10L
  | 'SFT-013'   // Cash receipt > ₹2L against sale
  | 'SFT-014'   // Receipt > ₹10L in any FY from any person
  | 'SFT-CUSTOM';

export interface SFTThresholdSpec {
  code: SFTCode;
  label: string;
  threshold: number;
  basis: 'per_transaction' | 'aggregate_per_person_fy';
  voucher_type_filter?: string[];
  payment_mode_filter?: 'cash' | 'all';
}

/** Default Indian SFT thresholds applicable for SME audit-class entities (FY 25-26). */
export const DEFAULT_SFT_SPECS: SFTThresholdSpec[] = [
  { code: 'SFT-013', label: 'Cash receipt > ₹2L against sale', threshold: 200000,  basis: 'per_transaction',         payment_mode_filter: 'cash' },
  { code: 'SFT-014', label: 'Receipts > ₹10L per person in FY', threshold: 1000000, basis: 'aggregate_per_person_fy', payment_mode_filter: 'all'  },
  { code: 'SFT-004', label: 'Cash deposit > ₹10L (savings)',    threshold: 1000000, basis: 'aggregate_per_person_fy', payment_mode_filter: 'cash' },
];

export interface SFTTransaction {
  voucher_id: string;
  voucher_date: string;
  party_id: string;
  party_name: string;
  pan?: string;
  amount: number;
  payment_mode: 'cash' | 'cheque' | 'rtgs' | 'neft' | 'upi' | 'other';
  sft_code: SFTCode;
  triggered_by: 'per_transaction' | 'aggregate_per_person_fy';
  spec_label: string;
}

export interface SFTFilter {
  entity_code: string;
  fy: string;
  specs?: SFTThresholdSpec[];
}

export interface SFTStatementRow {
  sft_code: SFTCode;
  party_id: string;
  party_name: string;
  pan?: string;
  transaction_count: number;
  total_amount: number;
}

export interface SFTStatement {
  entity_code: string;
  fy: string;
  generated_at: string;
  rows: SFTStatementRow[];
  totals: {
    transaction_count: number;
    total_amount: number;
  };
}

interface RawVoucher {
  id?: string;
  voucher_no?: string;
  date?: string;
  voucher_date?: string;
  party_id?: string;
  party_name?: string;
  pan?: string;
  amount?: number;
  gross_amount?: number;
  payment_mode?: SFTTransaction['payment_mode'];
  status?: string;
  voucher_type?: string;
}

function loadVouchers(entityCode: string): RawVoucher[] {
  // [JWT] GET /api/accounting/vouchers?entity=<entityCode>&fy=...
  try {
    const raw = localStorage.getItem(`erp_group_vouchers_${entityCode}`);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RawVoucher[]) : [];
  } catch {
    return [];
  }
}

function inFY(voucherDate: string, fy: string): boolean {
  const m = /^FY(\d{2})-(\d{2})$/.exec(fy);
  if (!m || !voucherDate) return false;
  const startYear = 2000 + Number(m[1]);
  const d = new Date(voucherDate);
  if (Number.isNaN(d.getTime())) return false;
  const fyStart = new Date(`${startYear}-04-01T00:00:00Z`);
  const fyEnd = new Date(`${startYear + 1}-03-31T23:59:59Z`);
  return d >= fyStart && d <= fyEnd;
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Detect SFT-reportable transactions for the entity + FY against the supplied
 * (or default) threshold specs.
 */
export function detectSFTTransactions(filter: SFTFilter): SFTTransaction[] {
  const specs = filter.specs ?? DEFAULT_SFT_SPECS;
  const vouchers = loadVouchers(filter.entity_code)
    .filter((v) => (v.status ?? 'posted') === 'posted')
    .filter((v) => inFY((v.voucher_date ?? v.date ?? ''), filter.fy));

  const out: SFTTransaction[] = [];

  for (const spec of specs) {
    const filtered = vouchers.filter((v) => {
      if (spec.payment_mode_filter === 'cash' && v.payment_mode !== 'cash') return false;
      return true;
    });

    if (spec.basis === 'per_transaction') {
      for (const v of filtered) {
        const amt = round2(v.amount ?? v.gross_amount ?? 0);
        if (amt > spec.threshold) {
          out.push({
            voucher_id: v.id ?? v.voucher_no ?? '',
            voucher_date: (v.voucher_date ?? v.date ?? '').slice(0, 10),
            party_id: v.party_id ?? '',
            party_name: v.party_name ?? v.party_id ?? '',
            pan: v.pan,
            amount: amt,
            payment_mode: v.payment_mode ?? 'other',
            sft_code: spec.code,
            triggered_by: 'per_transaction',
            spec_label: spec.label,
          });
        }
      }
    } else {
      // aggregate_per_person_fy
      const byParty = new Map<string, { name: string; pan?: string; total: number; txns: RawVoucher[] }>();
      for (const v of filtered) {
        const id = v.party_id ?? '';
        if (!id) continue;
        const cur = byParty.get(id) ?? { name: v.party_name ?? id, pan: v.pan, total: 0, txns: [] };
        cur.total = dAdd(cur.total, v.amount ?? v.gross_amount ?? 0);
        cur.txns.push(v);
        byParty.set(id, cur);
      }
      for (const [partyId, agg] of byParty) {
        if (agg.total > spec.threshold) {
          for (const v of agg.txns) {
            out.push({
              voucher_id: v.id ?? v.voucher_no ?? '',
              voucher_date: (v.voucher_date ?? v.date ?? '').slice(0, 10),
              party_id: partyId,
              party_name: agg.name,
              pan: agg.pan,
              amount: round2(v.amount ?? v.gross_amount ?? 0),
              payment_mode: v.payment_mode ?? 'other',
              sft_code: spec.code,
              triggered_by: 'aggregate_per_person_fy',
              spec_label: spec.label,
            });
          }
        }
      }
    }
  }

  return out;
}

/**
 * Build the SFT statement (Form 61A-shaped) by grouping detected transactions
 * by SFT code and party.
 */
export function buildSFTStatement(transactions: SFTTransaction[], entityCode: string, fy: string): SFTStatement {
  const map = new Map<string, SFTStatementRow>();
  for (const t of transactions) {
    const key = `${t.sft_code}::${t.party_id}`;
    const cur = map.get(key) ?? {
      sft_code: t.sft_code,
      party_id: t.party_id,
      party_name: t.party_name,
      pan: t.pan,
      transaction_count: 0,
      total_amount: 0,
    };
    cur.transaction_count += 1;
    cur.total_amount = round2(dAdd(cur.total_amount, t.amount));
    map.set(key, cur);
  }
  const rows = Array.from(map.values()).sort((a, b) =>
    a.sft_code.localeCompare(b.sft_code) || a.party_name.localeCompare(b.party_name),
  );
  return {
    entity_code: entityCode,
    fy,
    generated_at: new Date().toISOString(),
    rows,
    totals: {
      transaction_count: transactions.length,
      total_amount: round2(dSum(transactions, (t) => t.amount)),
    },
  };
}

/** Threshold helper used by Block 7 UI and tests. */
export function exceedsSFTThreshold(amount: number, spec: SFTThresholdSpec): boolean {
  return amount > spec.threshold;
}
