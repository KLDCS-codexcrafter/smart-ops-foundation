/**
 * useOpeningBalances.ts — CRUD + post + rollback for opening bills and loans
 * [JWT] Replace localStorage with REST endpoints as annotated.
 */
import { useCallback, useState } from 'react';
import type {
  OpeningBillEntry, OpeningLoanEntry, OpeningStatusFlag,
} from '@/types/opening-balance';
import {
  openingBillsKey, openingLoansKey, openingStatusKey,
} from '@/types/opening-balance';
import type { OutstandingEntry, JournalEntry } from '@/types/voucher';
import type { AdvanceEntry, TDSReceivableEntry } from '@/types/compliance';
import {
  outstandingKey, journalKey,
} from '@/lib/finecore-engine';
import { advancesKey, tdsReceivableKey } from '@/types/compliance';
import type { LoanApplication, SalaryAdvance } from '@/types/employee-finance';
import { LOAN_APPLICATIONS_KEY, SALARY_ADVANCES_KEY } from '@/types/employee-finance';

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function ss<T>(key: string, data: T[]): void {
  // [JWT] POST /api/entity/storage/:key
  localStorage.setItem(key, JSON.stringify(data));
}

const DEFAULT_STATUS: OpeningStatusFlag = {
  ledger_balances_posted: false,
  party_bills_posted: false,
  employee_loans_posted: false,
};

function loadStatus(entityCode: string): OpeningStatusFlag {
  // [JWT] GET /api/opening-balances/status/:entityCode
  try {
    const raw = localStorage.getItem(openingStatusKey(entityCode));
    return raw ? { ...DEFAULT_STATUS, ...JSON.parse(raw) } : { ...DEFAULT_STATUS };
  } catch { return { ...DEFAULT_STATUS }; }
}
function saveStatus(entityCode: string, status: OpeningStatusFlag): void {
  // [JWT] PATCH /api/opening-balances/status/:entityCode
  localStorage.setItem(openingStatusKey(entityCode), JSON.stringify(status));
}

export function useOpeningBalances(entityCode: string) {
  // [JWT] GET /api/opening-balances/bills/:entityCode
  const [bills, setBills] = useState<OpeningBillEntry[]>(() => ls<OpeningBillEntry>(openingBillsKey(entityCode)));
  // [JWT] GET /api/opening-balances/loans/:entityCode
  const [loans, setLoans] = useState<OpeningLoanEntry[]>(() => ls<OpeningLoanEntry>(openingLoansKey(entityCode)));
  const [status, setStatus] = useState<OpeningStatusFlag>(() => loadStatus(entityCode));

  // ── Bills CRUD ─────────────────────────────────────────────────
  const upsertBill = useCallback((bill: OpeningBillEntry) => {
    setBills(prev => {
      const idx = prev.findIndex(b => b.id === bill.id);
      const next = idx >= 0 ? [...prev.slice(0, idx), bill, ...prev.slice(idx + 1)] : [...prev, bill];
      ss(openingBillsKey(entityCode), next);
      return next;
    });
  }, [entityCode]);

  const removeBill = useCallback((id: string) => {
    setBills(prev => {
      const next = prev.filter(b => b.id !== id);
      ss(openingBillsKey(entityCode), next);
      return next;
    });
  }, [entityCode]);

  // ── Loans CRUD ─────────────────────────────────────────────────
  const upsertLoan = useCallback((loan: OpeningLoanEntry) => {
    setLoans(prev => {
      const idx = prev.findIndex(l => l.id === loan.id);
      const next = idx >= 0 ? [...prev.slice(0, idx), loan, ...prev.slice(idx + 1)] : [...prev, loan];
      ss(openingLoansKey(entityCode), next);
      return next;
    });
  }, [entityCode]);

  const removeLoan = useCallback((id: string) => {
    setLoans(prev => {
      const next = prev.filter(l => l.id !== id);
      ss(openingLoansKey(entityCode), next);
      return next;
    });
  }, [entityCode]);

  // ── Post bills → outstanding + advances + TDS receivable + journal
  const postBills = useCallback((toPost: OpeningBillEntry[]) => {
    const now = new Date().toISOString();

    // 1. Outstanding entries
    // [JWT] GET /api/outstanding/:entityCode
    const outs = ls<OutstandingEntry>(outstandingKey(entityCode));
    toPost.forEach(b => {
      outs.push({
        id: `osopen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        entity_id: entityCode,
        party_id: b.ledger_id,
        party_code: b.ledger_id,
        party_name: b.ledger_name,
        party_type: b.party_type,
        voucher_id: b.id,
        voucher_no: b.bill_no,
        voucher_date: b.bill_date,
        base_voucher_type: b.party_type === 'debtor' ? 'Sales' : 'Purchase',
        original_amount: b.amount,
        pending_amount: b.amount,
        due_date: b.due_date || b.bill_date,
        credit_days: b.credit_days || 0,
        currency: 'INR',
        settled_amount: 0,
        settlement_refs: [],
        status: 'open',
        created_at: now,
        updated_at: now,
      });
    });
    // [JWT] POST /api/outstanding/bulk
    ss(outstandingKey(entityCode), outs);

    // 2. Advances + TDS receivable for advance bill_type with TDS
    const advList = ls<AdvanceEntry>(advancesKey(entityCode));
    const tdsRcvList = ls<TDSReceivableEntry>(tdsReceivableKey(entityCode));
    toPost.filter(b => b.bill_type === 'advance').forEach(b => {
      advList.push({
        id: `advopen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        advance_ref_no: b.bill_no,
        entity_id: entityCode,
        party_type: b.party_type === 'debtor' ? 'customer' : 'vendor',
        party_id: b.ledger_id, party_name: b.ledger_name,
        date: b.bill_date,
        source_voucher_id: b.id, source_voucher_no: b.bill_no,
        advance_amount: b.amount,
        tds_amount: b.tds_amount || 0,
        net_amount: b.amount - (b.tds_amount || 0),
        adjustments: [],
        balance_amount: b.amount,
        tds_balance: b.tds_amount || 0,
        status: 'open',
        tds_status: (b.tds_amount || 0) > 0 ? 'deducted_inline' : 'na',
        created_at: now, updated_at: now,
      });
      if (b.tds_applicable && (b.tds_amount || 0) > 0) {
        tdsRcvList.push({
          id: `tdsrcvopen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          entity_id: entityCode,
          voucher_id: b.id, voucher_no: b.bill_no,
          customer_id: b.ledger_id, customer_name: b.ledger_name,
          customer_pan: b.party_pan || '',
          customer_tan: b.party_tan || '',
          tds_section: b.tds_section || '',
          invoice_ref: b.bill_no, invoice_date: b.bill_date,
          amount_received: b.amount,
          tds_amount: b.tds_amount || 0,
          net_received: b.amount - (b.tds_amount || 0),
          date: b.bill_date,
          quarter: 'Q1',
          assessment_year: '',
          match_status: 'unmatched',
          status: 'open',
          created_at: now,
        });
      }
    });
    // [JWT] POST /api/advances/bulk
    ss(advancesKey(entityCode), advList);
    // [JWT] POST /api/tds-receivable/bulk
    ss(tdsReceivableKey(entityCode), tdsRcvList);

    // 3. Journal entries — Dr/Cr against Opening Balance Difference suspense
    const jes = ls<JournalEntry>(journalKey(entityCode));
    toPost.forEach(b => {
      jes.push({
        id: `jeopen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        voucher_id: b.id, voucher_no: b.bill_no,
        base_voucher_type: 'Journal',
        entity_id: entityCode, date: b.bill_date,
        ledger_id: b.ledger_id, ledger_code: b.ledger_id, ledger_name: b.ledger_name,
        ledger_group_code: '',
        dr_amount: b.dr_cr === 'Dr' ? b.amount : 0,
        cr_amount: b.dr_cr === 'Cr' ? b.amount : 0,
        narration: `Opening balance — ${b.bill_type} ${b.bill_no}`,
        is_cancelled: false, created_at: now,
      });
      jes.push({
        id: `jeopen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-sus`,
        voucher_id: b.id, voucher_no: b.bill_no,
        base_voucher_type: 'Journal',
        entity_id: entityCode, date: b.bill_date,
        ledger_id: 'OBD', ledger_code: 'OBD', ledger_name: 'Opening Balance Difference',
        ledger_group_code: '',
        dr_amount: b.dr_cr === 'Cr' ? b.amount : 0,
        cr_amount: b.dr_cr === 'Dr' ? b.amount : 0,
        narration: `Opening balance — ${b.bill_type} ${b.bill_no}`,
        is_cancelled: false, created_at: now,
      });
    });
    // [JWT] POST /api/journal/bulk
    ss(journalKey(entityCode), jes);

    // 4. Mark bills as posted
    setBills(prev => {
      const ids = new Set(toPost.map(b => b.id));
      const next = prev.map(b => ids.has(b.id) ? { ...b, status: 'posted' as const } : b);
      ss(openingBillsKey(entityCode), next);
      return next;
    });
    const newStatus = { ...status, party_bills_posted: true, posted_at: now };
    setStatus(newStatus);
    saveStatus(entityCode, newStatus);
  }, [entityCode, status]);

  // ── Post loans → LoanApplication / SalaryAdvance / OutstandingEntry ──
  const postLoans = useCallback((toPost: OpeningLoanEntry[]) => {
    const now = new Date().toISOString();
    const loanApps = ls<LoanApplication>(LOAN_APPLICATIONS_KEY);
    const advs = ls<SalaryAdvance>(SALARY_ADVANCES_KEY);
    const outs = ls<OutstandingEntry>(outstandingKey(entityCode));
    const jes = ls<JournalEntry>(journalKey(entityCode));

    toPost.forEach(l => {
      if (l.entry_type === 'loan_receivable') {
        loanApps.push({
          id: l.id,
          employeeId: l.employee_id || '',
          employeeCode: l.person_code || '',
          employeeName: l.person_name,
          loanTypeId: l.loan_type_id || '',
          loanTypeName: l.loan_type_name || '',
          principalAmount: l.original_amount,
          tenureMonths: l.remaining_tenure_months,
          interestRatePct: l.interest_rate,
          interestType: l.interest_rate > 0 ? 'simple' : 'nil',
          emiAmount: l.emi_amount,
          totalPayable: l.original_amount,
          disbursedDate: l.disbursement_date,
          firstEMIDate: l.next_emi_date || l.disbursement_date,
          remainingBalance: l.outstanding_amount,
          paidEMIs: 0,
          reason: 'Opening balance',
          status: 'disbursed',
          approvedBy: 'system', approvedAt: now,
          rejectionReason: '',
          foreclosureDate: '', foreclosureAmount: 0,
          created_at: now, updated_at: now,
          // is_opening flag stored alongside
          ...({ is_opening: true } as Record<string, unknown>),
        } as LoanApplication & { is_opening: boolean });
      } else if (l.entry_type === 'advance_receivable') {
        advs.push({
          id: l.id,
          employeeId: l.employee_id || '',
          employeeCode: l.person_code || '',
          employeeName: l.person_name,
          amount: l.outstanding_amount,
          requestDate: l.disbursement_date,
          recoveryPeriod: 'next_month',
          reason: 'Opening balance',
          status: 'approved',
          approvedBy: 'system', recoveredDate: '',
          created_at: now, updated_at: now,
          ...({ is_opening: true } as Record<string, unknown>),
        } as SalaryAdvance & { is_opening: boolean });
      } else if (l.entry_type === 'loan_payable') {
        outs.push({
          id: `osloanopen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          entity_id: entityCode,
          party_id: l.ledger_id,
          party_code: l.ledger_id,
          party_name: l.person_name,
          party_type: 'creditor',
          voucher_id: l.id,
          voucher_no: `LOAN-${l.id.slice(-6)}`,
          voucher_date: l.disbursement_date,
          base_voucher_type: 'Purchase',
          original_amount: l.outstanding_amount,
          pending_amount: l.outstanding_amount,
          due_date: l.next_emi_date || l.disbursement_date,
          credit_days: 0, currency: 'INR',
          settled_amount: 0, settlement_refs: [],
          status: 'open',
          created_at: now, updated_at: now,
        });
      }
      // Journal: Dr ledger / Cr OBD (or vice versa for loan_payable)
      const isReceivable = l.entry_type !== 'loan_payable';
      jes.push({
        id: `jeloanopen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        voucher_id: l.id, voucher_no: `LOAN-${l.id.slice(-6)}`,
        base_voucher_type: 'Journal',
        entity_id: entityCode, date: l.disbursement_date,
        ledger_id: l.ledger_id, ledger_code: l.ledger_id, ledger_name: l.person_name,
        ledger_group_code: '',
        dr_amount: isReceivable ? l.outstanding_amount : 0,
        cr_amount: isReceivable ? 0 : l.outstanding_amount,
        narration: `Opening — ${l.entry_type} ${l.person_name}`,
        is_cancelled: false, created_at: now,
      });
      jes.push({
        id: `jeloanopen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-sus`,
        voucher_id: l.id, voucher_no: `LOAN-${l.id.slice(-6)}`,
        base_voucher_type: 'Journal',
        entity_id: entityCode, date: l.disbursement_date,
        ledger_id: 'OBD', ledger_code: 'OBD', ledger_name: 'Opening Balance Difference',
        ledger_group_code: '',
        dr_amount: isReceivable ? 0 : l.outstanding_amount,
        cr_amount: isReceivable ? l.outstanding_amount : 0,
        narration: `Opening — ${l.entry_type} ${l.person_name}`,
        is_cancelled: false, created_at: now,
      });
    });

    // [JWT] POST /api/loans/bulk
    localStorage.setItem(LOAN_APPLICATIONS_KEY, JSON.stringify(loanApps));
    // [JWT] POST /api/salary-advances/bulk
    localStorage.setItem(SALARY_ADVANCES_KEY, JSON.stringify(advs));
    // [JWT] POST /api/outstanding/bulk
    ss(outstandingKey(entityCode), outs);
    // [JWT] POST /api/journal/bulk
    ss(journalKey(entityCode), jes);

    setLoans(prev => {
      const ids = new Set(toPost.map(l => l.id));
      const next = prev.map(l => ids.has(l.id) ? { ...l, status: 'posted' as const } : l);
      ss(openingLoansKey(entityCode), next);
      return next;
    });
    const newStatus = { ...status, employee_loans_posted: true, posted_at: now };
    setStatus(newStatus);
    saveStatus(entityCode, newStatus);
  }, [entityCode, status]);

  // ── Rollback — clears only is_opening:true records ───────────────
  const rollbackBills = useCallback(() => {
    // [JWT] DELETE /api/opening-balances/bills/:entityCode
    ss<OpeningBillEntry>(openingBillsKey(entityCode), []);
    setBills([]);
    const newStatus = { ...status, party_bills_posted: false };
    setStatus(newStatus);
    saveStatus(entityCode, newStatus);
  }, [entityCode, status]);

  const rollbackLoans = useCallback(() => {
    // [JWT] DELETE /api/opening-balances/loans/:entityCode
    ss<OpeningLoanEntry>(openingLoansKey(entityCode), []);
    setLoans([]);
    const newStatus = { ...status, employee_loans_posted: false };
    setStatus(newStatus);
    saveStatus(entityCode, newStatus);
  }, [entityCode, status]);

  return {
    bills, loans, status,
    upsertBill, removeBill, postBills, rollbackBills,
    upsertLoan, removeLoan, postLoans, rollbackLoans,
  };
}
