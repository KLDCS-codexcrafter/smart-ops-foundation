/**
 * @file        src/lib/cross-company-reports-engine.ts
 * @sibling     NEW @ Sprint 100 · T-Phase-6.A.0.5 · Arc 0 Master Data Foundation Block 2
 * @realizes    9 cross-company reports — Tally TDL Mechanism A native (SmartPower / Bengal TDL spec · Q3=A).
 *              Walks loadEntities() and reads each entity's vouchers store; tags every row with
 *              owner_company ($OwnerCompany pattern) so drill-downs resolve back to the source entity.
 * @reads-from  mock-entities (loadEntities · USE-SITE) · fincore-engine (vouchersKey · USE-SITE) ·
 *              voucher-org-tag-engine (VOUCHER_ORG_TAGS_KEY · type-only) · decimal-helpers (FR-31)
 * @audit       NONE — read-only aggregation engine (Q-LOCK S100-2).
 * @sprint      T-Phase-6.A.0.5 · Block 2
 * [JWT] Phase 8: GET /api/cross-company-reports/run?report=:report&from=:from&to=:to
 */
import { loadEntities } from '@/data/mock-entities';
import { vouchersKey } from '@/lib/fincore-engine';
import type { Voucher } from '@/types/voucher';
import { VOUCHER_ORG_TAGS_KEY } from '@/types/voucher-org-tag';
import type { VoucherOrgTag } from '@/types/voucher-org-tag';
import { dAdd, round2 } from '@/lib/decimal-helpers';

export const READS_FROM = {
  engines: ['mock-entities', 'fincore-engine', 'voucher-org-tag-engine'],
  storage_keys: ['erp_group_vouchers_*', 'erp_voucher_org_tags'],
} as const;

export type CrossCoReportType =
  | 'multi_company_cash_book'
  | 'multi_company_bank_book'
  | 'group_sales_register'
  | 'group_purchase_register'
  | 'multi_company_bill_payable_outstanding'
  | 'multi_company_bill_receivable_outstanding'
  | 'multi_company_graph'
  | 'multi_company_group_comparison'
  | 'multi_company_ledger_voucher';

export const ALL_CROSS_CO_REPORTS: readonly CrossCoReportType[] = [
  'multi_company_cash_book',
  'multi_company_bank_book',
  'group_sales_register',
  'group_purchase_register',
  'multi_company_bill_payable_outstanding',
  'multi_company_bill_receivable_outstanding',
  'multi_company_graph',
  'multi_company_group_comparison',
  'multi_company_ledger_voucher',
] as const;

export interface CrossCoReportRow extends Record<string, unknown> {
  owner_company: string;
}

export interface CrossCoReportResult {
  report: CrossCoReportType;
  rows: CrossCoReportRow[];
  totals: Record<string, number>;
}

// ─── Internal helpers (USE-SITE READS · §H 0-DIFF on every consumed engine) ───

function readVouchers(entityCode: string): Voucher[] {
  try {
    // [JWT] GET /api/accounting/vouchers?entityCode=:entityCode
    const raw = localStorage.getItem(vouchersKey(entityCode));
    return raw ? (JSON.parse(raw) as Voucher[]) : [];
  } catch {
    return [];
  }
}

function readOrgTags(): VoucherOrgTag[] {
  try {
    // [JWT] GET /api/accounting/voucher-org-tags
    const raw = localStorage.getItem(VOUCHER_ORG_TAGS_KEY);
    return raw ? (JSON.parse(raw) as VoucherOrgTag[]) : [];
  } catch {
    return [];
  }
}

function inRange(dateISO: string, from?: string, to?: string): boolean {
  if (from && dateISO < from) return false;
  if (to && dateISO > to) return false;
  return true;
}

function voucherAmount(v: Voucher): number {
  // Sum debit side of journal (= net voucher value for cash/bank/sales/purchase).
  const j = (v as unknown as { journal?: Array<{ dr_amount?: number }> }).journal ?? [];
  let total = 0;
  for (const line of j) total = dAdd(total, Number(line.dr_amount ?? 0));
  if (total > 0) return round2(total);
  // Fallback: voucher.amount or gross_amount
  const direct = (v as unknown as { amount?: number; gross_amount?: number });
  return round2(Number(direct.amount ?? direct.gross_amount ?? 0));
}

function voucherBaseType(v: Voucher): string {
  return String((v as unknown as { base_voucher_type?: string }).base_voucher_type ?? '');
}

interface IteratedVoucher {
  v: Voucher;
  owner_company: string;
  amount: number;
  date: string;
  base_voucher_type: string;
  tag?: VoucherOrgTag;
}

function iterateAllEntities(from?: string, to?: string): IteratedVoucher[] {
  const tags = readOrgTags();
  const tagByVoucher = new Map<string, VoucherOrgTag>();
  for (const t of tags) tagByVoucher.set(t.voucher_id, t);

  const out: IteratedVoucher[] = [];
  for (const e of loadEntities()) {
    const owner = e.shortCode || e.id;
    for (const v of readVouchers(e.shortCode)) {
      const date = String((v as unknown as { date?: string }).date ?? '');
      if (!inRange(date, from, to)) continue;
      out.push({
        v,
        owner_company: owner,
        amount: voucherAmount(v),
        date,
        base_voucher_type: voucherBaseType(v),
        tag: tagByVoucher.get(String((v as unknown as { id?: string }).id ?? '')),
      });
    }
  }
  return out;
}

// ─── Per-report builders ──────────────────────────────────────────────

function bookByMode(
  rows: IteratedVoucher[],
  mode: 'cash' | 'bank',
): { rows: CrossCoReportRow[]; totals: Record<string, number> } {
  const filtered = rows.filter((r) => {
    const t = r.base_voucher_type.toLowerCase();
    if (mode === 'cash') return t.includes('receipt') || t.includes('payment') || t.includes('contra') || t.includes('cash');
    return t.includes('bank') || t.includes('contra') || t.includes('payment') || t.includes('receipt');
  });
  const outRows: CrossCoReportRow[] = filtered.map((r) => ({
    owner_company: r.owner_company,
    voucher_id: String((r.v as unknown as { id?: string }).id ?? ''),
    voucher_no: String((r.v as unknown as { voucher_no?: string }).voucher_no ?? ''),
    date: r.date,
    base_voucher_type: r.base_voucher_type,
    amount: r.amount,
  }));
  let grand = 0;
  for (const r of filtered) grand = dAdd(grand, r.amount);
  return { rows: outRows, totals: { grand_total: round2(grand), row_count: outRows.length } };
}

function registerByType(
  rows: IteratedVoucher[],
  mode: 'sales' | 'purchase',
): { rows: CrossCoReportRow[]; totals: Record<string, number> } {
  const filtered = rows.filter((r) => {
    const t = r.base_voucher_type.toLowerCase();
    return mode === 'sales'
      ? t.includes('sale') || t.includes('invoice')
      : t.includes('purchase') || t.includes('bill');
  });
  const outRows: CrossCoReportRow[] = filtered.map((r) => ({
    owner_company: r.owner_company,
    voucher_id: String((r.v as unknown as { id?: string }).id ?? ''),
    voucher_no: String((r.v as unknown as { voucher_no?: string }).voucher_no ?? ''),
    date: r.date,
    party_id: String((r.v as unknown as { party_id?: string }).party_id ?? ''),
    base_voucher_type: r.base_voucher_type,
    amount: r.amount,
  }));
  let grand = 0;
  for (const r of filtered) grand = dAdd(grand, r.amount);
  return { rows: outRows, totals: { grand_total: round2(grand), row_count: outRows.length } };
}

function outstandingByMode(
  mode: 'payable' | 'receivable',
  from?: string,
  to?: string,
): { rows: CrossCoReportRow[]; totals: Record<string, number> } {
  const outRows: CrossCoReportRow[] = [];
  let grand = 0;
  for (const e of loadEntities()) {
    const owner = e.shortCode || e.id;
    try {
      // [JWT] GET /api/outstanding?entityCode=:entityCode
      const raw = localStorage.getItem(`erp_outstanding_${e.shortCode}`);
      const list: Array<Record<string, unknown>> = raw ? JSON.parse(raw) : [];
      for (const row of list) {
        const kind = String(row.kind ?? row.type ?? '');
        const isPayable = kind.toLowerCase().includes('payable') || kind.toLowerCase().includes('vendor');
        if (mode === 'payable' ? !isPayable : isPayable) continue;
        const date = String(row.bill_date ?? row.voucher_date ?? row.date ?? '');
        if (!inRange(date, from, to)) continue;
        const amt = round2(Number(row.balance ?? row.amount ?? 0));
        outRows.push({ ...row, owner_company: owner, amount: amt });
        grand = dAdd(grand, amt);
      }
    } catch { /* ignore entity-level read failures */ }
  }
  return { rows: outRows, totals: { grand_total: round2(grand), row_count: outRows.length } };
}

function graphByCompany(rows: IteratedVoucher[]): { rows: CrossCoReportRow[]; totals: Record<string, number> } {
  const buckets = new Map<string, number>();
  for (const r of rows) {
    buckets.set(r.owner_company, dAdd(buckets.get(r.owner_company) ?? 0, r.amount));
  }
  const outRows: CrossCoReportRow[] = [];
  let grand = 0;
  for (const [owner_company, total] of buckets) {
    outRows.push({ owner_company, total: round2(total) });
    grand = dAdd(grand, total);
  }
  return { rows: outRows, totals: { grand_total: round2(grand), row_count: outRows.length } };
}

function groupComparison(rows: IteratedVoucher[]): { rows: CrossCoReportRow[]; totals: Record<string, number> } {
  const buckets = new Map<string, { sales: number; purchase: number; cash: number; bank: number }>();
  for (const r of rows) {
    const b = buckets.get(r.owner_company) ?? { sales: 0, purchase: 0, cash: 0, bank: 0 };
    const t = r.base_voucher_type.toLowerCase();
    if (t.includes('sale') || t.includes('invoice')) b.sales = dAdd(b.sales, r.amount);
    else if (t.includes('purchase') || t.includes('bill')) b.purchase = dAdd(b.purchase, r.amount);
    else if (t.includes('cash')) b.cash = dAdd(b.cash, r.amount);
    else if (t.includes('bank')) b.bank = dAdd(b.bank, r.amount);
    buckets.set(r.owner_company, b);
  }
  const outRows: CrossCoReportRow[] = [];
  let sumSales = 0, sumPurchase = 0;
  for (const [owner_company, b] of buckets) {
    outRows.push({
      owner_company,
      sales: round2(b.sales),
      purchase: round2(b.purchase),
      cash: round2(b.cash),
      bank: round2(b.bank),
    });
    sumSales = dAdd(sumSales, b.sales);
    sumPurchase = dAdd(sumPurchase, b.purchase);
  }
  return {
    rows: outRows,
    totals: { sales_total: round2(sumSales), purchase_total: round2(sumPurchase), row_count: outRows.length },
  };
}

function ledgerVoucher(rows: IteratedVoucher[]): { rows: CrossCoReportRow[]; totals: Record<string, number> } {
  const outRows: CrossCoReportRow[] = [];
  let grand = 0;
  for (const r of rows) {
    const journal = (r.v as unknown as { journal?: Array<{ ledger_id?: string; dr_amount?: number; cr_amount?: number; narration?: string }> }).journal ?? [];
    for (const j of journal) {
      const amt = round2(Number(j.dr_amount ?? 0) - Number(j.cr_amount ?? 0));
      outRows.push({
        owner_company: r.owner_company,
        voucher_id: String((r.v as unknown as { id?: string }).id ?? ''),
        voucher_no: String((r.v as unknown as { voucher_no?: string }).voucher_no ?? ''),
        date: r.date,
        ledger_id: String(j.ledger_id ?? ''),
        dr_amount: round2(Number(j.dr_amount ?? 0)),
        cr_amount: round2(Number(j.cr_amount ?? 0)),
        narration: String(j.narration ?? ''),
        // owner_company on the row enables drill-back to source entity (Q3=A)
        drill_entity: r.owner_company,
      });
      grand = dAdd(grand, Math.abs(amt));
    }
  }
  return { rows: outRows, totals: { grand_total: round2(grand), row_count: outRows.length } };
}

// ─── Public API ──────────────────────────────────────────────────────

export function runCrossCoReport(input: {
  report: CrossCoReportType;
  from_date?: string;
  to_date?: string;
}): CrossCoReportResult {
  const universe = iterateAllEntities(input.from_date, input.to_date);
  let built: { rows: CrossCoReportRow[]; totals: Record<string, number> };
  switch (input.report) {
    case 'multi_company_cash_book':       built = bookByMode(universe, 'cash'); break;
    case 'multi_company_bank_book':       built = bookByMode(universe, 'bank'); break;
    case 'group_sales_register':          built = registerByType(universe, 'sales'); break;
    case 'group_purchase_register':       built = registerByType(universe, 'purchase'); break;
    case 'multi_company_bill_payable_outstanding':    built = outstandingByMode('payable', input.from_date, input.to_date); break;
    case 'multi_company_bill_receivable_outstanding': built = outstandingByMode('receivable', input.from_date, input.to_date); break;
    case 'multi_company_graph':           built = graphByCompany(universe); break;
    case 'multi_company_group_comparison': built = groupComparison(universe); break;
    case 'multi_company_ledger_voucher':  built = ledgerVoucher(universe); break;
  }
  return { report: input.report, rows: built.rows, totals: built.totals };
}

export function runAllReports(input?: { from_date?: string; to_date?: string }): CrossCoReportResult[] {
  return ALL_CROSS_CO_REPORTS.map((r) =>
    runCrossCoReport({ report: r, from_date: input?.from_date, to_date: input?.to_date }),
  );
}
