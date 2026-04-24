/**
 * @file     ledger-resolver.ts
 * @purpose  Resolves the Expense / Liability / Asset ledgers required for
 *           D2-D4 postings:
 *             D2 — Interest Expense, Penal Interest Expense, Bank Charges
 *             D4 — Processing Fee Expense, TDS Payable u/s 194A,
 *                   Input CGST, Input SGST, Input IGST
 *           If a ledger doesn't exist, creates it with correct L2/L3 tagging
 *           so Trial Balance / P&L / Balance Sheet groupings remain correct.
 *           Storage key and ExpenseLedgerDefinition shape mirror LedgerMaster.tsx.
 *
 *           NOTE on the type name: `ExpenseLedgerKind` was introduced in D2
 *           when only Expense ledgers were resolved. D4 widens the resolver
 *           to cover Liability (TDS Payable) and Asset (Input GSTs). The name
 *           is preserved to avoid touching D2 callers; semantically read it as
 *           "any ledger the D-engines might need to resolve".
 * @sprint   T-H1.5-D-D2 (extended in T-H1.5-D-D4)
 * @finding  CC-063 (D2) · CC-065 (D4)
 */

const STORAGE_KEY = 'erp_group_ledger_definitions';

export type ExpenseLedgerKind =
  | 'interest_expense'
  | 'penal_interest_expense'
  | 'bank_charges'
  // ── T-H1.5-D-D4 additions ──
  | 'processing_fee_expense'
  | 'tds_payable'
  | 'input_cgst'
  | 'input_sgst'
  | 'input_igst'
  // ── T-H1.5-D-D5 additions (notional interest on aged advances) ──
  | 'interest_receivable_advances'
  | 'notional_interest_income';

type ResolverLedgerType = 'expense' | 'liability' | 'asset' | 'income';

interface ResolverMeta {
  searchName: RegExp;
  canonName: string;
  codePrefix: string;
  parentGroupCode: string;
  parentGroupName: string;
  ledgerType: ResolverLedgerType;
}

/**
 * Internal full ledger shape — mirrors ExpenseLedgerDefinition in
 * LedgerMaster.tsx (lines 316-349). Auto-creation defaults all unfamiliar
 * fields to safe zero-values so downstream consumers never trip on undefined.
 *
 * Note: `ledgerType` may be 'expense' | 'liability' | 'asset' depending on
 * the resolver kind (TDS Payable is a liability, Input GSTs are assets).
 */
interface AutoLedger {
  id: string;
  ledgerType: ResolverLedgerType;
  name: string;
  mailingName: string;
  numericCode: string;
  code: string;
  alias: string;
  parentGroupCode: string;
  parentGroupName: string;
  entityId: string | null;
  entityShortCode: string | null;
  openingBalance: number;
  openingBalanceType: 'Dr' | 'Cr';
  isGstApplicable: boolean;
  hsnSacCode: string;
  hsnSacType: 'hsn' | 'sac' | '';
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
  gstType: 'taxable' | 'exempt' | 'nil_rated' | 'non_gst' | 'zero_rated';
  isItcEligible: boolean;
  isRcmApplicable: boolean;
  rcmSection: 'section_9_3' | 'section_9_4' | null;
  isTdsApplicable: boolean;
  tdsSection: string;
  allow_commission_base: boolean;
  usePurchaseAdditionalExpense: boolean;
  costCentreApplicable: boolean;
  isBudgetHead: boolean;
  expenseNature: 'revenue' | 'capital_expense';
  clause44Category: 'auto' | 'regular_taxable' | 'regular_exempted' | 'composition' | 'unregistered' | 'exclude';
  forceIncludeClause44: boolean;
  status: 'active' | 'suspended';
  description: string;
  notes: string;
  suspendedBy: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  reinstatedBy: string | null;
  reinstatedAt: string | null;
  reinstatedReason: string | null;
}

interface MinimalLedgerRow {
  id: string;
  ledgerType?: string;
  name?: string;
  status?: string;
  code?: string;
  parentGroupCode?: string;
}

const RESOLVER_META: Record<ExpenseLedgerKind, ResolverMeta> = {
  // ── D2 entries (UNCHANGED behaviour; group fields added for uniformity) ──
  interest_expense: {
    searchName: /^interest (paid|expense)$/i,
    canonName: 'Interest Expense',
    codePrefix: 'EXP-INTEXP',
    parentGroupCode: 'E-FC',
    parentGroupName: 'Finance Costs',
    ledgerType: 'expense',
  },
  penal_interest_expense: {
    searchName: /^penal interest( expense)?$/i,
    canonName: 'Penal Interest Expense',
    codePrefix: 'EXP-PENINT',
    parentGroupCode: 'E-FC',
    parentGroupName: 'Finance Costs',
    ledgerType: 'expense',
  },
  bank_charges: {
    searchName: /^bank charges( & commission)?$/i,
    canonName: 'Bank Charges & Commission',
    codePrefix: 'EXP-BKCHG',
    parentGroupCode: 'E-FC',
    parentGroupName: 'Finance Costs',
    ledgerType: 'expense',
  },
  // ── T-H1.5-D-D4 additions ──
  processing_fee_expense: {
    searchName: /^(loan )?processing fees?( expense)?$/i,
    canonName: 'Loan Processing Fees',
    codePrefix: 'EXP-LPF',
    parentGroupCode: 'E-FC',
    parentGroupName: 'Finance Costs',
    ledgerType: 'expense',
  },
  tds_payable: {
    searchName: /^tds payable(.*194a)?$/i,
    canonName: 'TDS Payable u/s 194A',
    codePrefix: 'LIA-TDS194A',
    parentGroupCode: 'TDSP',
    parentGroupName: 'TDS Payable',
    ledgerType: 'liability',
  },
  input_cgst: {
    searchName: /^input cgst$/i,
    canonName: 'Input CGST',
    codePrefix: 'AST-ICGST',
    parentGroupCode: 'ADTAX',
    parentGroupName: 'Advance Tax & Duties',
    ledgerType: 'asset',
  },
  input_sgst: {
    searchName: /^input sgst$/i,
    canonName: 'Input SGST',
    codePrefix: 'AST-ISGST',
    parentGroupCode: 'ADTAX',
    parentGroupName: 'Advance Tax & Duties',
    ledgerType: 'asset',
  },
  input_igst: {
    searchName: /^input igst$/i,
    canonName: 'Input IGST',
    codePrefix: 'AST-IIGST',
    parentGroupCode: 'ADTAX',
    parentGroupName: 'Advance Tax & Duties',
    ledgerType: 'asset',
  },
  // ── T-H1.5-D-D5 additions ──
  // Asset side: parked under STLA (Short-Term Loans & Advances) — same L3
  // bucket as the underlying advances themselves, so the notional receivable
  // sits naturally beside the principal it accrues on.
  interest_receivable_advances: {
    searchName: /^interest receivable( on advances)?$/i,
    canonName: 'Interest Receivable on Advances',
    codePrefix: 'AST-INTRCV',
    parentGroupCode: 'STLA',
    parentGroupName: 'Short-Term Loans & Advances',
    ledgerType: 'asset',
  },
  // Income side: parked under INTINC (Interest Income L3 leaf under I-OI L2
  // 'Other Income'). Chosen over MISC because the entry is semantically
  // interest, even though notionally imputed. Verified `INTINC` exists in
  // src/data/finframe-seed-data.ts (line 135).
  notional_interest_income: {
    searchName: /^notional interest income$/i,
    canonName: 'Notional Interest Income',
    codePrefix: 'INC-NOTINT',
    parentGroupCode: 'INTINC',
    parentGroupName: 'Interest Income',
    ledgerType: 'income',
  },
};

/**
 * Resolves a ledger by kind. If found, returns its id.
 * If missing, creates a new ledger with standard tagging and returns the new id.
 * All postings flow through this — never hardcode.
 */
export function resolveExpenseLedger(kind: ExpenseLedgerKind): string {
  const meta = RESOLVER_META[kind];
  // [JWT] GET /api/accounting/ledger-definitions?type=<meta.ledgerType>
  const raw = localStorage.getItem(STORAGE_KEY);
  const all: MinimalLedgerRow[] = raw ? (JSON.parse(raw) as MinimalLedgerRow[]) : [];

  const existing = all.find(l =>
    l.ledgerType === meta.ledgerType
    && typeof l.name === 'string'
    && meta.searchName.test(l.name)
    && l.status !== 'suspended',
  );
  if (existing) return existing.id;

  const nowIso = new Date().toISOString();
  const newId = `lr-${kind}-${Date.now()}`;
  const openingBalanceType: 'Dr' | 'Cr' =
    meta.ledgerType === 'liability' || meta.ledgerType === 'income' ? 'Cr' : 'Dr';
  const newLedger: AutoLedger = {
    id: newId,
    ledgerType: meta.ledgerType,
    name: meta.canonName,
    mailingName: meta.canonName,
    numericCode: '',
    code: `${meta.codePrefix}-${Date.now().toString().slice(-6)}`,
    alias: '',
    parentGroupCode: meta.parentGroupCode,
    parentGroupName: meta.parentGroupName,
    entityId: null,
    entityShortCode: null,
    openingBalance: 0,
    openingBalanceType,
    isGstApplicable: false,
    hsnSacCode: '',
    hsnSacType: '',
    gstRate: 0,
    cgstRate: 0,
    sgstRate: 0,
    igstRate: 0,
    cessRate: 0,
    gstType: 'non_gst',
    isItcEligible: false,
    isRcmApplicable: false,
    rcmSection: null,
    isTdsApplicable: false,
    tdsSection: '',
    allow_commission_base: false,
    usePurchaseAdditionalExpense: false,
    costCentreApplicable: false,
    isBudgetHead: false,
    expenseNature: 'revenue',
    clause44Category: 'auto',
    forceIncludeClause44: false,
    status: 'active',
    description: `Auto-created by D2/D4 engine — ${meta.canonName}`,
    notes: `[Keyed] T-H1.5-D-D2/D4 auto-creation at ${nowIso}`,
    suspendedBy: null,
    suspendedAt: null,
    suspendedReason: null,
    reinstatedBy: null,
    reinstatedAt: null,
    reinstatedReason: null,
  };

  // [JWT] POST /api/accounting/ledger-definitions
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...all, newLedger]));
  return newId;
}

/** Convenience: resolves all 10 at engine run-start. */
export function resolveAllExpenseLedgers(): Record<ExpenseLedgerKind, string> {
  return {
    interest_expense:              resolveExpenseLedger('interest_expense'),
    penal_interest_expense:        resolveExpenseLedger('penal_interest_expense'),
    bank_charges:                  resolveExpenseLedger('bank_charges'),
    processing_fee_expense:        resolveExpenseLedger('processing_fee_expense'),
    tds_payable:                   resolveExpenseLedger('tds_payable'),
    input_cgst:                    resolveExpenseLedger('input_cgst'),
    input_sgst:                    resolveExpenseLedger('input_sgst'),
    input_igst:                    resolveExpenseLedger('input_igst'),
    interest_receivable_advances:  resolveExpenseLedger('interest_receivable_advances'),
    notional_interest_income:      resolveExpenseLedger('notional_interest_income'),
  };
}

/** Reads the canonical name of an already-resolved ledger (for narration/log). */
export function getLedgerName(ledgerId: string): string {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return '';
  const all: MinimalLedgerRow[] = JSON.parse(raw) as MinimalLedgerRow[];
  return all.find(l => l.id === ledgerId)?.name ?? '';
}

/** Reads the code of an already-resolved ledger (for voucher line ledger_code). */
export function getLedgerCode(ledgerId: string): string {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return '';
  const all: MinimalLedgerRow[] = JSON.parse(raw) as MinimalLedgerRow[];
  return all.find(l => l.id === ledgerId)?.code ?? '';
}

/** Reads the parentGroupCode of an already-resolved ledger (for voucher line). */
export function getLedgerGroupCode(ledgerId: string): string {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return '';
  const all: MinimalLedgerRow[] = JSON.parse(raw) as MinimalLedgerRow[];
  return all.find(l => l.id === ledgerId)?.parentGroupCode ?? '';
}
