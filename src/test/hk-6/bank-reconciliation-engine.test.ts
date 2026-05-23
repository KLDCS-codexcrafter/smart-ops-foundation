/**
 * HK-6 Pass 1+2 · 26th SIBLING tests · bank-reconciliation-engine
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseBankStatementCSV,
  listBankStatements,
  autoMatchStatement,
  applyMatch,
  unmatchLine,
  ignoreLine,
  getReconciliationSummary,
  bankStatementsKey,
  insertStatement,
  type BankStatement,
} from '@/lib/bank-reconciliation-engine';
import { vouchersKey } from '@/lib/fincore-engine';
import type { Voucher } from '@/types/voucher';

const ENTITY = 'ENT002';
const BANK_ACC = 'BA-HDFC-001';

function seedVouchers(list: Partial<Voucher>[]) {
  const vouchers = list.map((v, i) => ({
    id: v.id ?? `vch-${i}`,
    voucher_no: v.voucher_no ?? `PV/${i}`,
    voucher_type_id: 'vt-payment',
    voucher_type_name: 'Payment',
    base_voucher_type: v.base_voucher_type ?? 'Payment',
    entity_id: ENTITY,
    date: v.date ?? '2025-08-15',
    ledger_lines: [],
    gross_amount: v.net_amount ?? 10000,
    total_discount: 0,
    total_taxable: v.net_amount ?? 10000,
    total_cgst: 0,
    total_sgst: 0,
    total_igst: 0,
    total_cess: 0,
    total_tax: 0,
    round_off: 0,
    net_amount: v.net_amount ?? 10000,
    tds_applicable: false,
    narration: '',
    terms_conditions: '',
    payment_enforcement: '',
    payment_instrument: '',
    status: 'posted',
    ...v,
  } as Voucher));
  localStorage.setItem(vouchersKey(ENTITY), JSON.stringify(vouchers));
}

beforeEach(() => localStorage.clear());

describe('bank-reconciliation-engine · CSV parsing', () => {
  it('parses ICICI-style CSV with named columns', () => {
    const csv = [
      'Date,Description,Cheque,Withdrawal,Deposit,Balance',
      '15-08-2025,Salary,SAL-001,0,50000,150000',
      '16-08-2025,Vendor pmt,CHQ-1001,10000,0,140000',
    ].join('\n');
    const st = parseBankStatementCSV(ENTITY, csv, BANK_ACC, 'ICICI', '000111222', 'tester');
    expect(st.lines.length).toBe(2);
    expect(st.lines[0].credit_amount).toBe(50000);
    expect(st.lines[1].debit_amount).toBe(10000);
    expect(st.lines[1].reference).toBe('CHQ-1001');
    expect(listBankStatements(ENTITY)).toHaveLength(1);
  });

  it('normalises DD-MMM-YYYY dates', () => {
    const csv = 'Date,Description,Withdrawal,Deposit\n01-Apr-2025,Op,0,1000';
    const st = parseBankStatementCSV(ENTITY, csv, BANK_ACC, 'X', 'A', 'u');
    expect(st.lines[0].date).toBe('2025-04-01');
  });

  it('rejects empty CSV', () => {
    expect(() => parseBankStatementCSV(ENTITY, '', BANK_ACC, 'X', 'A', 'u')).toThrow();
  });

  it('throws on missing required columns', () => {
    expect(() => parseBankStatementCSV(ENTITY, 'foo,bar\n1,2', BANK_ACC, 'X', 'A', 'u')).toThrow();
  });
});

describe('bank-reconciliation-engine · auto-match scoring', () => {
  it('exact amount + same date + ref match scores 100', () => {
    seedVouchers([{ id: 'v1', voucher_no: 'PV/001', net_amount: 12500, date: '2025-08-15' }]);
    const stmt: BankStatement = {
      id: 'stmt-1', entity_id: ENTITY, bank_account_id: BANK_ACC, bank_name: 'HDFC',
      account_number: '000', statement_period_from: '2025-08-15', statement_period_to: '2025-08-15',
      opening_balance: 0, closing_balance: 0, source_format: 'manual',
      uploaded_at: '', uploaded_by: '',
      lines: [{
        id: 'bl-1', statement_id: 'stmt-1', date: '2025-08-15',
        description: 'PV/001', reference: 'PV/001',
        debit_amount: 12500, credit_amount: 0, balance_after: 0,
        matched_voucher_id: null, match_status: 'unmatched', match_confidence: 0,
        matched_at: null, matched_by: null,
      }],
    };
    insertStatement(ENTITY, stmt);
    const sug = autoMatchStatement(ENTITY, 'stmt-1');
    expect(sug.length).toBeGreaterThan(0);
    expect(sug[0].match_score).toBe(100); // 50 amount_exact + 20 date_within_3d + 30 ref_match
    expect(sug[0].voucher_id).toBe('v1');
    expect(sug[0].match_reasons).toContain('amount_exact');
    expect(sug[0].match_reasons).toContain('ref_match');
  });

  it('skips opposite direction (Payment vs Receipt)', () => {
    seedVouchers([{ id: 'r1', voucher_no: 'RV/001', net_amount: 5000, date: '2025-08-15', base_voucher_type: 'Receipt' }]);
    insertStatement(ENTITY, {
      id: 'stmt-2', entity_id: ENTITY, bank_account_id: BANK_ACC, bank_name: 'X',
      account_number: '', statement_period_from: '2025-08-15', statement_period_to: '2025-08-15',
      opening_balance: 0, closing_balance: 0, source_format: 'manual',
      uploaded_at: '', uploaded_by: '',
      lines: [{
        id: 'bl-2', statement_id: 'stmt-2', date: '2025-08-15', description: '', reference: '',
        debit_amount: 5000, credit_amount: 0, balance_after: 0,
        matched_voucher_id: null, match_status: 'unmatched', match_confidence: 0,
        matched_at: null, matched_by: null,
      }],
    });
    // Receipt (incoming) shouldn't match a debit (outgoing) bank line.
    const sug = autoMatchStatement(ENTITY, 'stmt-2');
    expect(sug.length).toBe(0);
  });

  it('skips amount differences > 1%', () => {
    seedVouchers([{ id: 'v1', voucher_no: 'PV/099', net_amount: 10000, date: '2025-08-15' }]);
    insertStatement(ENTITY, {
      id: 'stmt-3', entity_id: ENTITY, bank_account_id: BANK_ACC, bank_name: 'X',
      account_number: '', statement_period_from: '2025-08-15', statement_period_to: '2025-08-15',
      opening_balance: 0, closing_balance: 0, source_format: 'manual',
      uploaded_at: '', uploaded_by: '',
      lines: [{
        id: 'bl-3', statement_id: 'stmt-3', date: '2025-08-15', description: '', reference: '',
        debit_amount: 11000, credit_amount: 0, balance_after: 0,
        matched_voucher_id: null, match_status: 'unmatched', match_confidence: 0,
        matched_at: null, matched_by: null,
      }],
    });
    expect(autoMatchStatement(ENTITY, 'stmt-3')).toHaveLength(0);
  });
});

describe('bank-reconciliation-engine · apply/unmatch/ignore', () => {
  function makeBl(over: Partial<BankStatement['lines'][number]> = {}) {
    return {
      id: 'bl-x', statement_id: 'stmt-x', date: '2025-08-15',
      description: '', reference: '', debit_amount: 1000, credit_amount: 0,
      balance_after: 0, matched_voucher_id: null,
      match_status: 'unmatched' as const, match_confidence: 0,
      matched_at: null, matched_by: null,
      ...over,
    };
  }
  beforeEach(() => {
    insertStatement(ENTITY, {
      id: 'stmt-x', entity_id: ENTITY, bank_account_id: BANK_ACC, bank_name: 'X',
      account_number: '', statement_period_from: '2025-08-15', statement_period_to: '2025-08-15',
      opening_balance: 0, closing_balance: 0, source_format: 'manual',
      uploaded_at: '', uploaded_by: '', lines: [makeBl()],
    });
  });

  it('applies a manual match and records reconciliation', () => {
    const rec = applyMatch(ENTITY, 'bl-x', 'v-99', 'manual', 'eyeballed', 'admin');
    expect(rec.match_type).toBe('manual');
    const summary = getReconciliationSummary(ENTITY, BANK_ACC);
    expect(summary.matched_count).toBe(1);
    expect(summary.match_rate_pct).toBe(100);
  });

  it('unmatch flips status back to unmatched', () => {
    applyMatch(ENTITY, 'bl-x', 'v-99', 'auto', '');
    unmatchLine(ENTITY, 'bl-x');
    const s = getReconciliationSummary(ENTITY, BANK_ACC);
    expect(s.unmatched_count).toBe(1);
    expect(s.matched_count).toBe(0);
  });

  it('ignoreLine marks status as ignored', () => {
    ignoreLine(ENTITY, 'bl-x', 'admin');
    const s = getReconciliationSummary(ENTITY, BANK_ACC);
    expect(s.ignored_count).toBe(1);
    expect(s.matched_count).toBe(0);
  });

  it('applyMatch throws on unknown bank line', () => {
    expect(() => applyMatch(ENTITY, 'bl-missing', 'v', 'auto', '')).toThrow();
  });
});

describe('bank-reconciliation-engine · entity scoping (FR-26)', () => {
  it('writes to entity-scoped key only', () => {
    parseBankStatementCSV(ENTITY, 'Date,Description,Withdrawal,Deposit\n15-08-2025,X,100,0', BANK_ACC, 'X', '', 'u');
    expect(localStorage.getItem(bankStatementsKey(ENTITY))).toBeTruthy();
    expect(localStorage.getItem(bankStatementsKey('OTHER'))).toBeNull();
  });

  it('insertStatement is idempotent on id', () => {
    const st: BankStatement = {
      id: 'stmt-idem', entity_id: ENTITY, bank_account_id: BANK_ACC, bank_name: 'X',
      account_number: '', statement_period_from: '2025-08-15', statement_period_to: '2025-08-15',
      opening_balance: 0, closing_balance: 0, source_format: 'manual',
      uploaded_at: '', uploaded_by: '', lines: [],
    };
    insertStatement(ENTITY, st);
    insertStatement(ENTITY, st);
    expect(listBankStatements(ENTITY)).toHaveLength(1);
  });
});
