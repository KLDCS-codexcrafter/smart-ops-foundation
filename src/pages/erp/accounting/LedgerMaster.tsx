import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Wallet, Lock, Plus, Landmark, Building2, CreditCard, Banknote,
  TrendingUp, TrendingDown, Receipt, Users, Truck, GitBranch,
  PiggyBank, HandCoins, Edit2, Ban, CheckCircle2, Loader2,
  BookOpen, FileText, AlertTriangle, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { loadEntities } from '@/data/mock-entities';
import {
  L3_FINANCIAL_GROUPS, L4_INDUSTRY_PACKS,
  deriveL3NumericCode, deriveLedgerNumericCode, L3_NUMERIC_MAP,
} from '@/data/finframe-seed-data';
import { onEnterNext, useCtrlS, amountInputProps } from '@/lib/keyboard';
import { SmartDateInput } from '@/components/ui/smart-date-input';

// ─── Custodian Types ──────────────────────────────────────────────

interface CashCustodian {
  name: string;
  designation: string;
  phone: string;
  assignedOn: string;
  assignedBy: string;
}

interface CustodianHistoryRecord {
  id: string;
  ledgerDefinitionId: string;
  entityId: string;
  custodianName: string;
  designation: string;
  phone: string;
  fromDate: string;
  toDate: string | null;
  handoverToName: string;
  handoverBy: string;
  cashBalanceAtHandover: number;
  notes: string;
  recordedAt: string;
}

// ─── Bank Sub-Entity Types ────────────────────────────────────────

interface BankSignatory {
  id: string;
  name: string;
  designation: string;
  phone: string;
  signingLimit: number;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
}

interface ChequeBook {
  id: string;
  bankLedgerDefinitionId: string;
  entityId: string;
  bookReference: string;
  fromLeaf: number;
  toLeaf: number;
  issuedDate: string;
  currentLeaf: number;
  status: 'active' | 'exhausted' | 'cancelled';
}

type ChequeStatus =
  | 'available' | 'issued' | 'post_dated' | 'presented'
  | 'cleared' | 'bounced' | 'stale' | 'stop_payment' | 'cancelled';

interface ChequeRecord {
  id: string;
  chequeBookId: string;
  chequeNumber: number;
  bankLedgerDefinitionId: string;
  entityId: string;
  payee: string;
  amount: number;
  date: string;
  postDatedDate: string | null;
  isPDC: boolean;
  crossingType: 'account_payee' | 'not_negotiable' | 'none';
  narration: string;
  voucherId: string | null;
  status: ChequeStatus;
  issuedDate: string | null;
  presentedDate: string | null;
  clearedDate: string | null;
  bounceDate: string | null;
  bounceReason: string;
  stopPaymentDate: string | null;
}

interface NachMandate {
  id: string;
  bankLedgerDefinitionId: string;
  entityId: string;
  mandateRef: string;
  beneficiary: string;
  amount: number;
  amountMin: number;
  amountMax: number;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'adhoc';
  debitDay: number;
  startDate: string;
  endDate: string | null;
  status: 'active' | 'suspended' | 'cancelled';
  notes: string;
}

// ─── Types (Two-Table Architecture) ───────────────────────────────────

interface CashLedgerDefinition {
  id: string;
  ledgerType: 'cash';
  name: string;
  numericCode: string;
  code: string;
  alias: string;
  parentGroupCode: string;
  parentGroupName: string;
  entityId: string | null;
  entityShortCode: string | null;
  location: string;
  cashLimit: number;
  alertThreshold: number;
  isMainCash: boolean;
  voucherSeries: string;
  status: 'active' | 'inactive';
}

type BankAccountType =
  | 'current' | 'savings' | 'fixed_deposit' | 'eefc'
  | 'cash_credit' | 'overdraft';

interface BankLedgerDefinition {
  id: string;
  ledgerType: 'bank';
  numericCode: string;
  code: string;
  name: string;
  alias: string;
  parentGroupCode: string;
  parentGroupName: string;
  entityId: string | null;
  entityShortCode: string | null;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: BankAccountType;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';
  odLimit: number;
  branchName: string;
  branchAddress: string;
  branchCity: string;
  branchState: string;
  branchPincode: string;
  micrCode: string;
  swiftCode: string;
  ifscAutoFilled: boolean;
  bankGstin: string;
  bankStateCode: string;
  gstOnCharges: boolean;
  chequeFormat: 'HDFC_CTS' | 'SBI_CTS' | 'ICICI_CTS' | 'AXIS_CTS' | 'GENERIC_CTS' | 'CUSTOM';
  chequeSize: 'A4' | 'LEAF';
  defaultCrossing: 'account_payee' | 'not_negotiable' | 'none';
  brsEnabled: boolean;
  clearingDays: number;
  cutoffTime: string;
  status: 'active' | 'inactive' | 'dormant' | 'closed';
}

type AnyLedgerDefinition = CashLedgerDefinition | BankLedgerDefinition;

interface EntityLedgerInstance {
  id: string;
  ledgerDefinitionId: string;
  entityId: string;
  entityName: string;
  entityShortCode: string;
  openingBalance: number;
  openingBalanceType: 'Dr' | 'Cr';
  displayCode: string;
  displayNumericCode: string;
  currentCustodian: CashCustodian | null;
  isActive: boolean;
  signatoryType: 'single' | 'any_one_of' | 'joint_all' | 'joint_any_two' | null;
  signatories: BankSignatory[];
  lastReconciledDate: string | null;
  lastReconciledBalance: number;
}

// ─── Constants ────────────────────────────────────────────────────────

const INDIAN_BANKS = [
  'State Bank of India (SBI)', 'HDFC Bank', 'ICICI Bank',
  'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank (PNB)',
  'Bank of Baroda', 'Union Bank of India', 'Canara Bank',
  'IndusInd Bank', 'IDFC FIRST Bank', 'Yes Bank',
  'Federal Bank', 'Karnataka Bank', 'South Indian Bank',
  'IDBI Bank', 'Bank of India', 'Central Bank of India',
  'RBL Bank', 'DCB Bank', 'Other',
] as const;

const ACCOUNT_TYPE_LABELS: Record<BankAccountType, string> = {
  current: 'Current',
  savings: 'Savings',
  fixed_deposit: 'Fixed Deposit',
  eefc: 'EEFC',
  cash_credit: 'Cash Credit',
  overdraft: 'Overdraft',
};

const ACCOUNT_TYPE_COLORS: Record<BankAccountType, string> = {
  current: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  savings: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  fixed_deposit: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  eefc: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  cash_credit: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  overdraft: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const CHEQUE_STATUS_LABELS: Record<ChequeStatus, string> = {
  available: 'Available',
  issued: 'Issued',
  post_dated: 'Post-Dated',
  presented: 'Presented',
  cleared: 'Cleared',
  bounced: 'Bounced',
  stale: 'Stale',
  stop_payment: 'Stop Payment',
  cancelled: 'Cancelled',
};

const CHEQUE_STATUS_COLORS: Record<ChequeStatus, string> = {
  available: 'bg-muted/50 text-muted-foreground border-border',
  issued: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  post_dated: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  presented: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  cleared: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  bounced: 'bg-red-500/10 text-red-500 border-red-500/20',
  stale: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  stop_payment: 'bg-red-500/10 text-red-500 border-red-500/20',
  cancelled: 'bg-muted/50 text-muted-foreground border-border',
};

// ─── Helpers ──────────────────────────────────────────────────────────

const validateIFSC = (code: string): boolean =>
  /^[A-Z]{4}0[A-Z0-9]{6}$/.test(code.toUpperCase());

const getDefaultNature = (type: BankAccountType): 'Dr' | 'Cr' =>
  ['cash_credit', 'overdraft'].includes(type) ? 'Cr' : 'Dr';

const getSuggestedParent = (type: BankAccountType) => {
  if (['cash_credit', 'overdraft'].includes(type))
    return { code: 'STBOR', name: 'Short-Term Borrowings' };
  return { code: 'BANK', name: 'Bank Balances' };
};

const maskAccountNo = (num: string): string => {
  if (num.length <= 4) return num;
  return '•'.repeat(num.length - 4) + num.slice(-4);
};

// ─── Amount to Words (Indian system) ──────────────────────────────

const amountToWords = (amount: number): string => {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
    'Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const toWords = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n/10)] + ' ' + ones[n%10] + ' ';
    if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred ' + toWords(n%100);
    if (n < 100000) return toWords(Math.floor(n/1000)) + 'Thousand ' + toWords(n%1000);
    if (n < 10000000) return toWords(Math.floor(n/100000)) + 'Lakh ' + toWords(n%100000);
    return toWords(Math.floor(n/10000000)) + 'Crore ' + toWords(n%10000000);
  };
  const [rupees, paiseStr] = amount.toFixed(2).split('.');
  const paise = parseInt(paiseStr);
  const rupeesWords = toWords(parseInt(rupees)).trim();
  const paiseWords = paise > 0 ? ` and ${toWords(paise).trim()} Paise` : '';
  return `Rupees ${rupeesWords}${paiseWords} Only`.replace(/ +/g,' ');
};

// ─── localStorage Helpers ─────────────────────────────────────────────

const loadAllDefinitions = (): AnyLedgerDefinition[] => {
  const raw = localStorage.getItem('erp_group_ledger_definitions');
  if (!raw) return [];
  const all = JSON.parse(raw);
  return all.map((d: any) => ({
    ...d,
    ledgerType: d.ledgerType ?? 'cash',
    numericCode: d.numericCode ?? '',
    location: d.location ?? '',
    cashLimit: d.cashLimit ?? 0,
    alertThreshold: d.alertThreshold ?? 0,
    isMainCash: d.isMainCash ?? false,
    voucherSeries: d.voucherSeries ?? 'CR',
    // Bank backward compat
    branchName: d.branchName ?? '',
    branchAddress: d.branchAddress ?? '',
    branchCity: d.branchCity ?? '',
    branchState: d.branchState ?? '',
    branchPincode: d.branchPincode ?? '',
    micrCode: d.micrCode ?? '',
    swiftCode: d.swiftCode ?? '',
    ifscAutoFilled: d.ifscAutoFilled ?? false,
    bankGstin: d.bankGstin ?? '',
    bankStateCode: d.bankStateCode ?? '',
    gstOnCharges: d.gstOnCharges ?? true,
    chequeFormat: d.chequeFormat ?? 'GENERIC_CTS',
    chequeSize: d.chequeSize ?? 'A4',
    defaultCrossing: d.defaultCrossing ?? 'account_payee',
    brsEnabled: d.brsEnabled ?? true,
    clearingDays: d.clearingDays ?? 2,
    cutoffTime: d.cutoffTime ?? '14:30',
    currency: d.currency ?? 'INR',
  }));
};

const loadCashDefs = (): CashLedgerDefinition[] =>
  loadAllDefinitions().filter(d => d.ledgerType === 'cash') as CashLedgerDefinition[];

const loadBankDefs = (): BankLedgerDefinition[] =>
  loadAllDefinitions().filter(d => d.ledgerType === 'bank') as BankLedgerDefinition[];

const saveDefinition = (def: AnyLedgerDefinition) => {
  const raw = localStorage.getItem('erp_group_ledger_definitions');
  const all: AnyLedgerDefinition[] = raw ? JSON.parse(raw).map((d: any) => ({ ...d, ledgerType: d.ledgerType ?? 'cash' })) : [];
  const idx = all.findIndex(d => d.id === def.id);
  if (idx >= 0) all[idx] = def; else all.push(def);
  localStorage.setItem('erp_group_ledger_definitions', JSON.stringify(all));
};

const loadInstances = (entityId: string): EntityLedgerInstance[] => {
  const raw = localStorage.getItem(`erp_entity_${entityId}_ledger_instances`);
  if (!raw) return [];
  return JSON.parse(raw).map((i: any) => ({
    ...i,
    openingBalanceType: i.openingBalanceType ?? 'Dr',
    displayNumericCode: i.displayNumericCode ?? '',
    currentCustodian: i.currentCustodian ?? null,
    signatoryType: i.signatoryType ?? null,
    signatories: i.signatories ?? [],
    lastReconciledDate: i.lastReconciledDate ?? null,
    lastReconciledBalance: i.lastReconciledBalance ?? 0,
  }));
};

const saveInstance = (inst: EntityLedgerInstance) => {
  const raw = localStorage.getItem(`erp_entity_${inst.entityId}_ledger_instances`);
  const all: EntityLedgerInstance[] = raw ? JSON.parse(raw).map((i: any) => ({
    ...i,
    openingBalanceType: i.openingBalanceType ?? 'Dr',
    displayNumericCode: i.displayNumericCode ?? '',
    currentCustodian: i.currentCustodian ?? null,
    signatoryType: i.signatoryType ?? null,
    signatories: i.signatories ?? [],
    lastReconciledDate: i.lastReconciledDate ?? null,
    lastReconciledBalance: i.lastReconciledBalance ?? 0,
  })) : [];
  const idx = all.findIndex(i => i.id === inst.id);
  if (idx >= 0) all[idx] = inst; else all.push(inst);
  localStorage.setItem(`erp_entity_${inst.entityId}_ledger_instances`, JSON.stringify(all));
};

// ── Custodian History ─────────────────────────────────────────────
const loadCustodianHistory = (entityId: string, defId: string): CustodianHistoryRecord[] => {
  const key = `erp_entity_${entityId}_custodian_history_${defId}`;
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
};

const appendCustodianHistory = (record: CustodianHistoryRecord) => {
  const key = `erp_entity_${record.entityId}_custodian_history_${record.ledgerDefinitionId}`;
  const existing = loadCustodianHistory(record.entityId, record.ledgerDefinitionId);
  localStorage.setItem(key, JSON.stringify([...existing, record]));
};

// ── Cheque Book helpers ───────────────────────────────────────────
const loadChequeBooks = (entityId: string, defId: string): ChequeBook[] => {
  const key = `erp_entity_${entityId}_cheque_books_${defId}`;
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; }
  catch { return []; }
};

const saveChequeBook = (book: ChequeBook): void => {
  const key = `erp_entity_${book.entityId}_cheque_books_${book.bankLedgerDefinitionId}`;
  const all = loadChequeBooks(book.entityId, book.bankLedgerDefinitionId);
  const idx = all.findIndex(b => b.id === book.id);
  if (idx >= 0) all[idx] = book; else all.push(book);
  localStorage.setItem(key, JSON.stringify(all));
};

// ── Cheque Record helpers ─────────────────────────────────────────
const loadChequeRecords = (entityId: string, bookId: string): ChequeRecord[] => {
  const key = `erp_entity_${entityId}_cheque_records_${bookId}`;
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; }
  catch { return []; }
};

const saveChequeRecord = (rec: ChequeRecord): void => {
  const key = `erp_entity_${rec.entityId}_cheque_records_${rec.chequeBookId}`;
  const all = loadChequeRecords(rec.entityId, rec.chequeBookId);
  const idx = all.findIndex(r => r.id === rec.id);
  if (idx >= 0) all[idx] = rec; else all.push(rec);
  localStorage.setItem(key, JSON.stringify(all));
};

// ── NACH Mandate helpers ──────────────────────────────────────────
const loadNachMandates = (entityId: string, defId: string): NachMandate[] => {
  const key = `erp_entity_${entityId}_nach_mandates_${defId}`;
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; }
  catch { return []; }
};

const saveNachMandate = (m: NachMandate): void => {
  const key = `erp_entity_${m.entityId}_nach_mandates_${m.bankLedgerDefinitionId}`;
  const all = loadNachMandates(m.entityId, m.bankLedgerDefinitionId);
  const idx = all.findIndex(n => n.id === m.id);
  if (idx >= 0) all[idx] = m; else all.push(m);
  localStorage.setItem(key, JSON.stringify(all));
};

// ─── Code Generation ──────────────────────────────────────────────────

const genCashGroupCode = (all: AnyLedgerDefinition[]) =>
  'CASH-' + String(all.filter(d => d.ledgerType === 'cash' && !d.entityId).length + 1).padStart(6, '0');

const genCashEntityCode = (all: AnyLedgerDefinition[], sc: string) =>
  `${sc}-CASH-${String(all.filter(d => d.ledgerType === 'cash' && d.entityShortCode === sc).length + 1).padStart(6, '0')}`;

const genCashNumericCode = (all: AnyLedgerDefinition[], parentGroupCode: string): string => {
  const seqCount = all.filter(d =>
    d.ledgerType === 'cash' && !d.entityId &&
    d.parentGroupCode === parentGroupCode
  ).length + 1;
  return deriveLedgerNumericCode(parentGroupCode, seqCount);
};

const genCashEntityNumericCode = (all: AnyLedgerDefinition[], parentGroupCode: string, sc: string): string => {
  const seqCount = all.filter(d =>
    d.ledgerType === 'cash' && d.entityShortCode === sc &&
    d.parentGroupCode === parentGroupCode
  ).length + 1;
  return deriveLedgerNumericCode(parentGroupCode, seqCount);
};

const genBankGroupCode = (all: AnyLedgerDefinition[]) =>
  'BANK-' + String(all.filter(d => d.ledgerType === 'bank' && !d.entityId).length + 1).padStart(6, '0');

const genBankEntityCode = (all: AnyLedgerDefinition[], sc: string) =>
  `${sc}-BANK-${String(all.filter(d => d.ledgerType === 'bank' && d.entityShortCode === sc).length + 1).padStart(6, '0')}`;

const genBankNumericCode = (all: AnyLedgerDefinition[], parentGroupCode: string): string => {
  const seqCount = all.filter(d =>
    d.ledgerType === 'bank' && !d.entityId && d.parentGroupCode === parentGroupCode
  ).length + 1;
  return deriveLedgerNumericCode(parentGroupCode, seqCount);
};

const genBankEntityNumericCode = (all: AnyLedgerDefinition[], parentGroupCode: string, sc: string): string => {
  const seqCount = all.filter(d =>
    d.ledgerType === 'bank' && d.entityShortCode === sc && d.parentGroupCode === parentGroupCode
  ).length + 1;
  return deriveLedgerNumericCode(parentGroupCode, seqCount);
};

// ─── Auto-Create Instances (Group Level Save) ─────────────────────────

const autoCreateInstances = (
  def: AnyLedgerDefinition,
  openingBalance: number,
  openingBalanceType: 'Dr' | 'Cr' = 'Dr',
) => {
  const allEntities = loadEntities();
  allEntities.forEach((entity, idx) => {
    saveInstance({
      id: crypto.randomUUID(),
      ledgerDefinitionId: def.id,
      entityId: entity.id,
      entityName: entity.name,
      entityShortCode: entity.shortCode,
      openingBalance: idx === 0 ? openingBalance : 0,
      openingBalanceType,
      isActive: true,
      displayCode: def.code,
      displayNumericCode: `${entity.shortCode}/${'numericCode' in def ? (def as any).numericCode || def.code : def.code}`,
      currentCustodian: null,
      signatoryType: null,
      signatories: [],
      lastReconciledDate: null,
      lastReconciledBalance: 0,
    });
  });
};

// ─── FinFrame L4 Groups Reader ────────────────────────────────────────

const getFinFrameL4Groups = (l3Codes: string[]): { code: string; name: string; parentL3Code: string }[] => {
  const raw = localStorage.getItem('erp_group_finframe_l4_groups');
  if (!raw) return [];
  try {
    const groups = JSON.parse(raw);
    return groups.filter((g: any) => l3Codes.includes(g.parentL3Code) && g.status === 'active');
  } catch { return []; }
};

// ─── Type Button Grid ─────────────────────────────────────────────────

const TYPE_BUTTONS = [
  { label: 'Cash', icon: Wallet, row: 'Balance Sheet', active: true },
  { label: 'Bank', icon: Landmark, row: 'Balance Sheet', active: true },
  { label: 'Asset', icon: Building2, row: 'Balance Sheet', active: false },
  { label: 'Liability', icon: CreditCard, row: 'Balance Sheet', active: false },
  { label: 'Capital/Equity', icon: PiggyBank, row: 'Balance Sheet', active: false },
  { label: 'Loan Given', icon: HandCoins, row: 'Balance Sheet', active: false },
  { label: 'Loan Taken', icon: Banknote, row: 'Balance Sheet', active: false },
  { label: 'Income', icon: TrendingUp, row: 'P&L', active: false },
  { label: 'Expense', icon: TrendingDown, row: 'P&L', active: false },
  { label: 'Duties & Taxes', icon: Receipt, row: 'P&L', active: false },
  { label: 'Customer', icon: Users, row: 'Masters', active: false },
  { label: 'Vendor', icon: Users, row: 'Masters', active: false },
  { label: 'Logistic', icon: Truck, row: 'Masters', active: false },
  { label: 'Branch & Division', icon: GitBranch, row: 'Masters', active: false },
];

// ─── Default Forms ────────────────────────────────────────────────────

const defaultBankForm = {
  parentGroupCode: 'BANK',
  parentGroupName: 'Bank Balances',
  name: '',
  alias: '',
  bankName: '',
  bankNameOther: '',
  accountNumber: '',
  ifscCode: '',
  accountType: '' as BankAccountType | '',
  currency: 'INR' as 'INR'|'USD'|'EUR'|'GBP'|'AED',
  odLimit: 0,
  openingBalance: 0,
  openingBalanceType: 'Dr' as 'Dr' | 'Cr',
  scope: 'group' as 'group' | 'entity',
  entityId: '',
  branchName: '',
  branchAddress: '',
  branchCity: '',
  branchState: '',
  branchPincode: '',
  micrCode: '',
  swiftCode: '',
  ifscAutoFilled: false,
  bankGstin: '',
  bankStateCode: '',
  gstOnCharges: true,
  chequeFormat: 'GENERIC_CTS' as 'HDFC_CTS'|'SBI_CTS'|'ICICI_CTS'|'AXIS_CTS'|'GENERIC_CTS'|'CUSTOM',
  chequeSize: 'A4' as 'A4'|'LEAF',
  defaultCrossing: 'account_payee' as 'account_payee'|'not_negotiable'|'none',
  brsEnabled: true,
  clearingDays: 2,
  cutoffTime: '14:30',
};

// ─── Component ────────────────────────────────────────────────────────

export function LedgerMasterPanel() {
  const [entities] = useState(() => loadEntities());
  const [cashDefs, setCashDefs] = useState<CashLedgerDefinition[]>(() => loadCashDefs());
  const [bankDefs, setBankDefs] = useState<BankLedgerDefinition[]>(() => loadBankDefs());
  const [activeTab, setActiveTab] = useState<'definitions' | 'opening_balances'>('definitions');
  const [defSubTab, setDefSubTab] = useState<'cash' | 'bank'>('cash');
  const [selEntityId, setSelEntityId] = useState(() => loadEntities()[0]?.id ?? '');
  const [instances, setInstances] = useState<EntityLedgerInstance[]>(
    () => loadInstances(loadEntities()[0]?.id ?? '')
  );

  // Cash dialog state
  const [cashCreateOpen, setCashCreateOpen] = useState(false);
  const [cashEditTarget, setCashEditTarget] = useState<CashLedgerDefinition | null>(null);
  const defaultCashForm = {
    parentGroupCode: 'CASH',
    parentGroupName: 'Cash & Cash Equivalents',
    name: '',
    alias: '',
    openingBalance: 0,
    scope: 'group' as 'group' | 'entity',
    entityId: '',
    location: '',
    cashLimit: 0,
    alertThreshold: 0,
    isMainCash: false,
    voucherSeries: 'CR',
    openingBalanceType: 'Dr' as 'Dr' | 'Cr',
  };
  const [cashForm, setCashForm] = useState(defaultCashForm);

  // Bank dialog state
  const [bankCreateOpen, setBankCreateOpen] = useState(false);
  const [bankEditTarget, setBankEditTarget] = useState<BankLedgerDefinition | null>(null);
  const [bankForm, setBankForm] = useState(defaultBankForm);
  const [ifscValid, setIfscValid] = useState<boolean | null>(null);
  const [showAccountPreview, setShowAccountPreview] = useState(false);

  // Cash dialog collapsed sections
  const [cashShowMore, setCashShowMore] = useState(false);
  const [cashShowAdvanced, setCashShowAdvanced] = useState(false);

  // Bank dialog collapsed sections
  const [ifscFetching, setIfscFetching] = useState(false);
  const [ifscFetchError, setIfscFetchError] = useState('');
  const [bankShowMore, setBankShowMore] = useState(false);
  const [bankShowBranch, setBankShowBranch] = useState(false);
  const [bankShowGst, setBankShowGst] = useState(false);
  const [bankShowCheque, setBankShowCheque] = useState(false);
  const [bankShowAdvanced, setBankShowAdvanced] = useState(false);

  // Bank management tabs
  const [expandedBankId, setExpandedBankId] = useState<string | null>(null);
  const [bankMgmtTab, setBankMgmtTab] = useState<'definition' | 'cheques' | 'pdc' | 'nach'>('definition');

  // Cheque book management
  const [chequeBooks, setChequeBooks] = useState<ChequeBook[]>([]);
  const [chequeBookOpen, setChequeBookOpen] = useState(false);
  const [chequeBookForm, setChequeBookForm] = useState({
    bookReference: '', fromLeaf: 0, toLeaf: 0, issuedDate: '', entityId: '', defId: '',
  });
  const [chequeRecords, setChequeRecords] = useState<ChequeRecord[]>([]);
  const [selectedChequeBook, setSelectedChequeBook] = useState<ChequeBook | null>(null);
  const [chequeIssueOpen, setChequeIssueOpen] = useState(false);
  const [chequeIssueForm, setChequeIssueForm] = useState({
    payee: '', amount: 0, date: '', isPDC: false, postDatedDate: '',
    crossingType: 'account_payee' as 'account_payee' | 'not_negotiable' | 'none',
    narration: '', chequeNumber: 0,
  });
  const [chequePrintPreview, setChequePrintPreview] = useState<ChequeRecord | null>(null);

  // NACH mandates
  const [nachMandates, setNachMandates] = useState<NachMandate[]>([]);
  const [nachOpen, setNachOpen] = useState(false);
  const [nachForm, setNachForm] = useState({
    mandateRef: '', beneficiary: '', amount: 0, amountMin: 0, amountMax: 0,
    frequency: 'monthly' as NachMandate['frequency'],
    debitDay: 1, startDate: '', endDate: '', notes: '', entityId: '', defId: '',
  });

  // Signatory management
  const [signatoryOpen, setSignatoryOpen] = useState(false);
  const [signatoryTargetInstanceId, setSignatoryTargetInstanceId] = useState<string | null>(null);
  const [signatoryForm, setSignatoryForm] = useState({
    name: '', designation: '', phone: '', signingLimit: 0, validFrom: '', isActive: true,
  });

  // Custodian dialog state
  const [custodianOpen, setCustodianOpen] = useState(false);
  const [custodianTargetInstanceId, setCustodianTargetInstanceId] = useState<string | null>(null);
  const [custodianHistory, setCustodianHistory] = useState<CustodianHistoryRecord[]>([]);
  const [custodianForm, setCustodianForm] = useState({
    name: '', designation: '', phone: '',
    handoverBy: '', cashBalanceAtHandover: 0, notes: '',
  });

  // Reload instances when entity changes
  useEffect(() => {
    setInstances(loadInstances(selEntityId));
  }, [selEntityId]);

  const refreshAll = () => {
    setCashDefs(loadCashDefs());
    setBankDefs(loadBankDefs());
    setInstances(loadInstances(selEntityId));
  };

  // Ctrl+S saves the active form
  useCtrlS(() => {
    if (cashCreateOpen) handleCashSave();
    if (bankCreateOpen) handleBankSave();
  });

  // ── Stats ──
  const allDefs = [...cashDefs, ...bankDefs];
  const totalDefined = allDefs.length;
  const groupLevel = allDefs.filter(d => !d.entityId).length;
  const entitySpecific = allDefs.filter(d => d.entityId).length;
  const activeLedgers = allDefs.filter(d => d.status === 'active').length;

  // ── IFSC Auto-Fill ──
  const fetchIfscDetails = async (ifsc: string) => {
    if (!validateIFSC(ifsc)) return;
    setIfscFetching(true);
    setIfscFetchError('');
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${ifsc.toUpperCase()}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      const bankFromIfsc = data.BANK ?? '';
      setBankForm(f => ({
        ...f,
        bankName: f.bankName || bankFromIfsc,
        branchName: data.BRANCH ?? '',
        branchAddress: data.ADDRESS ?? '',
        branchCity: (data.CITY ?? data.DISTRICT ?? ''),
        branchState: data.STATE ?? '',
        branchPincode: String(data.PINCODE ?? ''),
        micrCode: data.MICR ?? '',
        swiftCode: data.SWIFT ?? '',
        ifscAutoFilled: true,
      }));
      setIfscValid(true);
      setBankShowBranch(true);
      toast.success(`Branch details fetched: ${data.BRANCH}, ${data.CITY}`);
    } catch {
      setIfscFetchError('Branch details unavailable — please fill manually');
      setIfscValid(true);
    } finally {
      setIfscFetching(false);
    }
  };

  // ── Quick Starts ──
  const handleCashQuickStart = (name: string) => {
    setCashForm({ ...defaultCashForm, name });
    setCashEditTarget(null);
    setCashCreateOpen(true);
  };

  const handleBankQuickStart = (preset: Partial<typeof defaultBankForm>) => {
    setBankForm({ ...defaultBankForm, ...preset });
    setBankEditTarget(null);
    setBankCreateOpen(true);
  };

  const openCashCreate = () => { setCashForm(defaultCashForm); setCashEditTarget(null); setCashCreateOpen(true); };

  const openCashEdit = (def: CashLedgerDefinition) => {
    setCashEditTarget(def);
    setCashForm({
      parentGroupCode: def.parentGroupCode, parentGroupName: def.parentGroupName,
      name: def.name, alias: def.alias, openingBalance: 0,
      scope: def.entityId ? 'entity' : 'group', entityId: def.entityId ?? '',
      location: def.location ?? '', cashLimit: def.cashLimit ?? 0,
      alertThreshold: def.alertThreshold ?? 0, isMainCash: def.isMainCash ?? false,
      voucherSeries: def.voucherSeries ?? 'CR', openingBalanceType: 'Dr',
    });
    setCashCreateOpen(true);
  };

  const openBankCreate = () => {
    setBankForm(defaultBankForm);
    setBankEditTarget(null);
    setIfscValid(null); setShowAccountPreview(false);
    setIfscFetchError(''); setIfscFetching(false);
    setBankShowMore(false); setBankShowBranch(false);
    setBankShowGst(false); setBankShowCheque(false); setBankShowAdvanced(false);
    setBankCreateOpen(true);
  };

  const openBankEdit = (def: BankLedgerDefinition) => {
    setBankEditTarget(def);
    setBankForm({
      parentGroupCode: def.parentGroupCode, parentGroupName: def.parentGroupName,
      name: def.name, alias: def.alias,
      bankName: INDIAN_BANKS.includes(def.bankName as any) ? def.bankName : 'Other',
      bankNameOther: INDIAN_BANKS.includes(def.bankName as any) ? '' : def.bankName,
      accountNumber: def.accountNumber, ifscCode: def.ifscCode,
      accountType: def.accountType, odLimit: def.odLimit,
      openingBalance: 0, openingBalanceType: getDefaultNature(def.accountType),
      scope: def.entityId ? 'entity' : 'group', entityId: def.entityId ?? '',
      currency: def.currency ?? 'INR',
      branchName: def.branchName ?? '', branchAddress: def.branchAddress ?? '',
      branchCity: def.branchCity ?? '', branchState: def.branchState ?? '',
      branchPincode: def.branchPincode ?? '',
      micrCode: def.micrCode ?? '', swiftCode: def.swiftCode ?? '',
      ifscAutoFilled: def.ifscAutoFilled ?? false,
      bankGstin: def.bankGstin ?? '', bankStateCode: def.bankStateCode ?? '',
      gstOnCharges: def.gstOnCharges ?? true,
      chequeFormat: def.chequeFormat ?? 'GENERIC_CTS',
      chequeSize: def.chequeSize ?? 'A4',
      defaultCrossing: def.defaultCrossing ?? 'account_payee',
      brsEnabled: def.brsEnabled ?? true,
      clearingDays: def.clearingDays ?? 2,
      cutoffTime: def.cutoffTime ?? '14:30',
    });
    setIfscValid(validateIFSC(def.ifscCode));
    setShowAccountPreview(true);
    setBankCreateOpen(true);
  };

  // ── Save Cash ──
  const handleCashSave = () => {
    if (!cashForm.name.trim()) { toast.error('Ledger name is required'); return; }
    if (!cashForm.parentGroupCode) { toast.error('Select a parent group first'); return; }
    const all = loadAllDefinitions();
    if (cashEditTarget) {
      const updated: CashLedgerDefinition = {
        ...cashEditTarget,
        name: cashForm.name.trim(), alias: cashForm.alias.trim(),
        parentGroupCode: cashForm.parentGroupCode, parentGroupName: cashForm.parentGroupName,
        location: cashForm.location, cashLimit: cashForm.cashLimit,
        alertThreshold: cashForm.alertThreshold, isMainCash: cashForm.isMainCash,
        voucherSeries: cashForm.voucherSeries || 'CR',
      };
      saveDefinition(updated);
      toast.success(`${updated.name} updated`);
    } else if (cashForm.scope === 'group') {
      const code = genCashGroupCode(all);
      const numericCode = genCashNumericCode(all, cashForm.parentGroupCode);
      const def: CashLedgerDefinition = {
        id: crypto.randomUUID(), ledgerType: 'cash',
        name: cashForm.name.trim(), code, numericCode, alias: cashForm.alias.trim(),
        parentGroupCode: cashForm.parentGroupCode, parentGroupName: cashForm.parentGroupName,
        entityId: null, entityShortCode: null,
        location: cashForm.location, cashLimit: cashForm.cashLimit,
        alertThreshold: cashForm.alertThreshold, isMainCash: cashForm.isMainCash,
        voucherSeries: cashForm.voucherSeries || 'CR', status: 'active',
      };
      saveDefinition(def);
      autoCreateInstances(def, cashForm.openingBalance, 'Dr');
      toast.success(`${cashForm.name} created. Opening balances set for ${entities.length} entities.`);
    } else {
      const entity = entities.find(e => e.id === cashForm.entityId);
      if (!entity) { toast.error('Select an entity'); return; }
      const code = genCashEntityCode(all, entity.shortCode);
      const numericCode = genCashEntityNumericCode(all, cashForm.parentGroupCode, entity.shortCode);
      const def: CashLedgerDefinition = {
        id: crypto.randomUUID(), ledgerType: 'cash',
        name: cashForm.name.trim(), code, numericCode, alias: cashForm.alias.trim(),
        parentGroupCode: cashForm.parentGroupCode, parentGroupName: cashForm.parentGroupName,
        entityId: entity.id, entityShortCode: entity.shortCode,
        location: cashForm.location, cashLimit: cashForm.cashLimit,
        alertThreshold: cashForm.alertThreshold, isMainCash: cashForm.isMainCash,
        voucherSeries: cashForm.voucherSeries || 'CR', status: 'active',
      };
      saveDefinition(def);
      saveInstance({
        id: crypto.randomUUID(), ledgerDefinitionId: def.id,
        entityId: entity.id, entityName: entity.name, entityShortCode: entity.shortCode,
        openingBalance: cashForm.openingBalance, openingBalanceType: 'Dr',
        isActive: true, displayCode: def.code, displayNumericCode: `${entity.shortCode}/${numericCode}`,
        currentCustodian: null, signatoryType: null, signatories: [],
        lastReconciledDate: null, lastReconciledBalance: 0,
      });
      toast.success(`${code} created for ${entity.name}`);
    }
    setCashCreateOpen(false); setCashEditTarget(null); setCashForm(defaultCashForm); refreshAll();
  };

  // ── Save Bank ──
  const handleBankSave = () => {
    if (!bankForm.name.trim()) return toast.error('Ledger name is required');
    const resolvedBankName = bankForm.bankName === 'Other' ? bankForm.bankNameOther.trim() : bankForm.bankName;
    if (!resolvedBankName) return toast.error('Select a bank');
    if (!bankForm.accountType) return toast.error('Select account type');
    if (!validateIFSC(bankForm.ifscCode)) return toast.error('Invalid IFSC code');

    const all = loadAllDefinitions();
    const bankFields = {
      bankName: resolvedBankName,
      accountNumber: bankForm.accountNumber,
      ifscCode: bankForm.ifscCode.toUpperCase(),
      accountType: bankForm.accountType as BankAccountType,
      odLimit: bankForm.odLimit,
      currency: bankForm.currency,
      branchName: bankForm.branchName,
      branchAddress: bankForm.branchAddress,
      branchCity: bankForm.branchCity,
      branchState: bankForm.branchState,
      branchPincode: bankForm.branchPincode,
      micrCode: bankForm.micrCode,
      swiftCode: bankForm.swiftCode,
      ifscAutoFilled: bankForm.ifscAutoFilled,
      bankGstin: bankForm.bankGstin,
      bankStateCode: bankForm.bankStateCode,
      gstOnCharges: bankForm.gstOnCharges,
      chequeFormat: bankForm.chequeFormat,
      chequeSize: bankForm.chequeSize,
      defaultCrossing: bankForm.defaultCrossing,
      brsEnabled: bankForm.brsEnabled,
      clearingDays: bankForm.clearingDays,
      cutoffTime: bankForm.cutoffTime,
    };

    if (bankEditTarget) {
      const updated: BankLedgerDefinition = {
        ...bankEditTarget,
        name: bankForm.name.trim(), alias: bankForm.alias.trim(),
        parentGroupCode: bankForm.parentGroupCode, parentGroupName: bankForm.parentGroupName,
        ...bankFields,
      };
      saveDefinition(updated);
      toast.success(`${updated.name} updated`);
    } else if (bankForm.scope === 'group') {
      const code = genBankGroupCode(all);
      const numericCode = genBankNumericCode(all, bankForm.parentGroupCode);
      const def: BankLedgerDefinition = {
        id: crypto.randomUUID(), ledgerType: 'bank',
        name: bankForm.name.trim(), code, numericCode, alias: bankForm.alias.trim(),
        parentGroupCode: bankForm.parentGroupCode, parentGroupName: bankForm.parentGroupName,
        entityId: null, entityShortCode: null, status: 'active',
        ...bankFields,
      };
      saveDefinition(def);
      autoCreateInstances(def, bankForm.openingBalance, bankForm.openingBalanceType);
      toast.success(`${def.name} created. Opening balances set for ${entities.length} entities.`);
    } else {
      const entity = entities.find(e => e.id === bankForm.entityId);
      if (!entity) return toast.error('Select an entity');
      const code = genBankEntityCode(all, entity.shortCode);
      const numericCode = genBankEntityNumericCode(all, bankForm.parentGroupCode, entity.shortCode);
      const def: BankLedgerDefinition = {
        id: crypto.randomUUID(), ledgerType: 'bank',
        name: bankForm.name.trim(), code, numericCode, alias: bankForm.alias.trim(),
        parentGroupCode: bankForm.parentGroupCode, parentGroupName: bankForm.parentGroupName,
        entityId: entity.id, entityShortCode: entity.shortCode, status: 'active',
        ...bankFields,
      };
      saveDefinition(def);
      saveInstance({
        id: crypto.randomUUID(), ledgerDefinitionId: def.id,
        entityId: entity.id, entityName: entity.name, entityShortCode: entity.shortCode,
        openingBalance: bankForm.openingBalance, openingBalanceType: bankForm.openingBalanceType,
        isActive: true, displayCode: def.code, displayNumericCode: `${entity.shortCode}/${numericCode}`,
        currentCustodian: null, signatoryType: null, signatories: [],
        lastReconciledDate: null, lastReconciledBalance: 0,
      });
      toast.success(`${code} created for ${entity.name}`);
    }
    setBankCreateOpen(false); setBankEditTarget(null); setBankForm(defaultBankForm);
    setIfscValid(null); setShowAccountPreview(false); refreshAll();
  };

  // ── Deactivate ──
  const handleDeactivate = (def: AnyLedgerDefinition) => {
    const updated = { ...def, status: def.status === 'active' ? 'inactive' as const : 'active' as const };
    saveDefinition(updated);
    toast.success(`${def.name} ${updated.status === 'active' ? 'activated' : 'deactivated'}`);
    refreshAll();
  };

  // ── Save Opening Balances ──
  const handleSaveBalances = () => {
    instances.forEach(inst => saveInstance(inst));
    toast.success('Opening balances saved');
  };

  // ── Custodian Save ──
  const handleCustodianSave = () => {
    if (!custodianForm.name.trim()) { toast.error('Custodian name required'); return; }
    if (!custodianForm.designation.trim()) { toast.error('Designation required'); return; }
    if (!custodianForm.handoverBy.trim()) { toast.error('Authorised by is required'); return; }
    if (!custodianTargetInstanceId) return;
    const inst = instances.find(i => i.id === custodianTargetInstanceId);
    if (!inst) return;
    const now = new Date().toISOString();
    if (inst.currentCustodian) {
      const existing = loadCustodianHistory(inst.entityId, inst.ledgerDefinitionId);
      const updatedHistory = existing.map(h => h.toDate === null ? { ...h, toDate: now, handoverToName: custodianForm.name } : h);
      const key = `erp_entity_${inst.entityId}_custodian_history_${inst.ledgerDefinitionId}`;
      localStorage.setItem(key, JSON.stringify(updatedHistory));
    }
    const newRecord: CustodianHistoryRecord = {
      id: crypto.randomUUID(), ledgerDefinitionId: inst.ledgerDefinitionId,
      entityId: inst.entityId, custodianName: custodianForm.name,
      designation: custodianForm.designation, phone: custodianForm.phone,
      fromDate: now, toDate: null, handoverToName: '',
      handoverBy: custodianForm.handoverBy, cashBalanceAtHandover: custodianForm.cashBalanceAtHandover,
      notes: custodianForm.notes, recordedAt: now,
    };
    appendCustodianHistory(newRecord);
    const updatedInst: EntityLedgerInstance = {
      ...inst,
      currentCustodian: {
        name: custodianForm.name, designation: custodianForm.designation,
        phone: custodianForm.phone, assignedOn: now, assignedBy: custodianForm.handoverBy,
      },
    };
    saveInstance(updatedInst);
    setInstances(prev => prev.map(i => i.id === inst.id ? updatedInst : i));
    setCustodianHistory(loadCustodianHistory(inst.entityId, inst.ledgerDefinitionId));
    setCustodianForm({ name: '', designation: '', phone: '', handoverBy: '', cashBalanceAtHandover: 0, notes: '' });
    toast.success(`Custody transferred to ${custodianForm.name}`);
  };

  // ── Signatory Save ──
  const handleSignatorySave = () => {
    if (!signatoryForm.name.trim()) { toast.error('Signatory name required'); return; }
    if (!signatoryTargetInstanceId) return;
    const inst = instances.find(i => i.id === signatoryTargetInstanceId);
    if (!inst) return;
    const newSig: BankSignatory = {
      id: crypto.randomUUID(), name: signatoryForm.name.trim(),
      designation: signatoryForm.designation, phone: signatoryForm.phone,
      signingLimit: signatoryForm.signingLimit,
      validFrom: signatoryForm.validFrom || new Date().toISOString().split('T')[0],
      validTo: null, isActive: signatoryForm.isActive,
    };
    const updatedInst: EntityLedgerInstance = {
      ...inst, signatories: [...(inst.signatories || []), newSig],
    };
    saveInstance(updatedInst);
    setInstances(prev => prev.map(i => i.id === inst.id ? updatedInst : i));
    setSignatoryForm({ name: '', designation: '', phone: '', signingLimit: 0, validFrom: '', isActive: true });
    toast.success(`Signatory ${newSig.name} added`);
  };

  // ── Cheque Book Save ──
  const handleChequeBookSave = () => {
    if (!chequeBookForm.bookReference.trim()) { toast.error('Book reference is required'); return; }
    if (chequeBookForm.fromLeaf <= 0 || chequeBookForm.toLeaf <= 0) { toast.error('Leaf numbers must be positive'); return; }
    if (chequeBookForm.toLeaf <= chequeBookForm.fromLeaf) { toast.error('To leaf must be greater than from leaf'); return; }
    const book: ChequeBook = {
      id: crypto.randomUUID(),
      bankLedgerDefinitionId: chequeBookForm.defId,
      entityId: chequeBookForm.entityId,
      bookReference: chequeBookForm.bookReference.trim(),
      fromLeaf: chequeBookForm.fromLeaf,
      toLeaf: chequeBookForm.toLeaf,
      issuedDate: chequeBookForm.issuedDate || new Date().toISOString().split('T')[0],
      currentLeaf: chequeBookForm.fromLeaf,
      status: 'active',
    };
    saveChequeBook(book);
    setChequeBooks(loadChequeBooks(book.entityId, book.bankLedgerDefinitionId));
    setChequeBookOpen(false);
    setChequeBookForm({ bookReference: '', fromLeaf: 0, toLeaf: 0, issuedDate: '', entityId: '', defId: '' });
    toast.success(`Cheque book ${book.bookReference} added`);
  };

  // ── Issue Cheque ──
  const handleChequeIssue = () => {
    if (!selectedChequeBook) return;
    if (!chequeIssueForm.payee.trim()) { toast.error('Payee required'); return; }
    if (chequeIssueForm.amount <= 0) { toast.error('Amount must be positive'); return; }
    const rec: ChequeRecord = {
      id: crypto.randomUUID(),
      chequeBookId: selectedChequeBook.id,
      chequeNumber: chequeIssueForm.chequeNumber,
      bankLedgerDefinitionId: selectedChequeBook.bankLedgerDefinitionId,
      entityId: selectedChequeBook.entityId,
      payee: chequeIssueForm.payee.trim(),
      amount: chequeIssueForm.amount,
      date: chequeIssueForm.date || new Date().toISOString().split('T')[0],
      postDatedDate: chequeIssueForm.isPDC ? chequeIssueForm.postDatedDate : null,
      isPDC: chequeIssueForm.isPDC,
      crossingType: chequeIssueForm.crossingType,
      narration: chequeIssueForm.narration,
      voucherId: null,
      status: chequeIssueForm.isPDC ? 'post_dated' : 'issued',
      issuedDate: new Date().toISOString().split('T')[0],
      presentedDate: null, clearedDate: null, bounceDate: null,
      bounceReason: '', stopPaymentDate: null,
    };
    saveChequeRecord(rec);
    // Advance currentLeaf
    const updatedBook = { ...selectedChequeBook, currentLeaf: chequeIssueForm.chequeNumber + 1 };
    if (updatedBook.currentLeaf > updatedBook.toLeaf) updatedBook.status = 'exhausted';
    saveChequeBook(updatedBook);
    setChequeRecords(loadChequeRecords(selectedChequeBook.entityId, selectedChequeBook.id));
    setChequeBooks(loadChequeBooks(selectedChequeBook.entityId, selectedChequeBook.bankLedgerDefinitionId));
    setSelectedChequeBook(updatedBook.status === 'exhausted' ? null : updatedBook);
    setChequeIssueOpen(false);
    toast.success(`Cheque #${rec.chequeNumber} issued to ${rec.payee}`);
  };

  // ── NACH Save ──
  const handleNachSave = () => {
    if (!nachForm.mandateRef.trim()) { toast.error('Mandate reference required'); return; }
    if (!nachForm.beneficiary.trim()) { toast.error('Beneficiary required'); return; }
    const m: NachMandate = {
      id: crypto.randomUUID(),
      bankLedgerDefinitionId: nachForm.defId,
      entityId: nachForm.entityId,
      mandateRef: nachForm.mandateRef.trim(),
      beneficiary: nachForm.beneficiary.trim(),
      amount: nachForm.amount, amountMin: nachForm.amountMin, amountMax: nachForm.amountMax,
      frequency: nachForm.frequency, debitDay: nachForm.debitDay,
      startDate: nachForm.startDate || new Date().toISOString().split('T')[0],
      endDate: nachForm.endDate || null,
      status: 'active', notes: nachForm.notes,
    };
    saveNachMandate(m);
    setNachMandates(loadNachMandates(m.entityId, m.bankLedgerDefinitionId));
    setNachOpen(false);
    setNachForm({ mandateRef: '', beneficiary: '', amount: 0, amountMin: 0, amountMax: 0,
      frequency: 'monthly', debitDay: 1, startDate: '', endDate: '', notes: '', entityId: '', defId: '' });
    toast.success(`NACH mandate ${m.mandateRef} added`);
  };

  // ── Cheque status actions ──
  const updateChequeStatus = (rec: ChequeRecord, newStatus: ChequeStatus) => {
    const today = new Date().toISOString().split('T')[0];
    const updated: ChequeRecord = { ...rec, status: newStatus };
    if (newStatus === 'cleared') updated.clearedDate = today;
    if (newStatus === 'bounced') { updated.bounceDate = today; updated.bounceReason = 'Returned by bank'; }
    if (newStatus === 'stop_payment') updated.stopPaymentDate = today;
    saveChequeRecord(updated);
    setChequeRecords(loadChequeRecords(rec.entityId, rec.chequeBookId));
    toast.success(`Cheque #${rec.chequeNumber} marked as ${CHEQUE_STATUS_LABELS[newStatus]}`);
  };

  // ── Load bank management data ──
  const loadBankMgmtData = (def: BankLedgerDefinition, entityId: string) => {
    setChequeBooks(loadChequeBooks(entityId, def.id));
    setNachMandates(loadNachMandates(entityId, def.id));
    setSelectedChequeBook(null);
    setChequeRecords([]);
  };

  // ── FinFrame L4 groups for parent pickers ──
  const l4CashGroups = getFinFrameL4Groups(['CASH']);
  const l4BankGroups = getFinFrameL4Groups(['BANK', 'STBOR']);

  // Filter instances for Opening Balances tab
  const allDefIds = new Set([...cashDefs, ...bankDefs].filter(d => !d.entityId).map(d => d.id));
  const filteredInstances = instances.filter(i => allDefIds.has(i.ledgerDefinitionId));

  const getDefForInstance = (inst: EntityLedgerInstance): AnyLedgerDefinition | undefined =>
    [...cashDefs, ...bankDefs].find(d => d.id === inst.ledgerDefinitionId);

  const rows: Record<string, typeof TYPE_BUTTONS> = {};
  TYPE_BUTTONS.forEach(b => { if (!rows[b.row]) rows[b.row] = []; rows[b.row].push(b); });

  const suggestedParent = bankForm.accountType ? getSuggestedParent(bankForm.accountType as BankAccountType) : null;

  // PDC helper: get all post-dated cheques across all cheque books for a bank def
  const getAllPDCRecords = (defId: string, entityId: string): ChequeRecord[] => {
    const books = loadChequeBooks(entityId, defId);
    const allRecs: ChequeRecord[] = [];
    books.forEach(b => {
      const recs = loadChequeRecords(entityId, b.id);
      allRecs.push(...recs.filter(r => r.status === 'post_dated'));
    });
    return allRecs.sort((a, b) => (a.postDatedDate ?? '').localeCompare(b.postDatedDate ?? ''));
  };

  const getDaysUntil = (dateStr: string | null): number => {
    if (!dateStr) return 999;
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-foreground">Ledger Master</h1>
            <Badge className="text-[10px] bg-teal-500/10 text-teal-600 border-teal-500/20">Cash</Badge>
            <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">Bank</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Financial accounts for all entities</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Defined', value: totalDefined },
          { label: 'Group Level', value: groupLevel },
          { label: 'Entity Specific', value: entitySpecific },
          { label: 'Active', value: activeLedgers },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-card/60 backdrop-blur-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold text-foreground font-mono">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Start Templates */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => handleCashQuickStart('Main Cash')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 transition-colors text-sm font-medium text-teal-600">
          <Plus className="h-4 w-4" /> Main Cash
        </button>
        <button onClick={() => handleCashQuickStart('Petty Cash')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 transition-colors text-sm font-medium text-teal-600">
          <Plus className="h-4 w-4" /> Petty Cash
        </button>
        <button onClick={() => handleBankQuickStart({
          bankName: 'HDFC Bank', accountType: 'current', parentGroupCode: 'BANK',
          parentGroupName: 'Bank Balances', name: 'HDFC Bank — Current A/C',
          openingBalanceType: 'Dr',
        })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 transition-colors text-sm font-medium text-blue-600">
          <Plus className="h-4 w-4" /> HDFC Current A/C
        </button>
        <button onClick={() => handleBankQuickStart({
          bankName: 'State Bank of India (SBI)', accountType: 'savings', parentGroupCode: 'BANK',
          parentGroupName: 'Bank Balances', name: 'SBI — Savings A/C',
          openingBalanceType: 'Dr',
        })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 transition-colors text-sm font-medium text-blue-600">
          <Plus className="h-4 w-4" /> SBI Savings A/C
        </button>
        <button onClick={() => handleBankQuickStart({
          accountType: 'cash_credit', parentGroupCode: 'STBOR',
          parentGroupName: 'Short-Term Borrowings', name: '',
          openingBalanceType: 'Cr',
        })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-sm font-medium text-amber-600">
          <Plus className="h-4 w-4" /> Cash Credit A/C
        </button>
      </div>

      {/* Type Button Grid */}
      <div className="space-y-2">
        {Object.entries(rows).map(([rowLabel, buttons]) => (
          <div key={rowLabel}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{rowLabel}</p>
            <div className="flex flex-wrap gap-2">
              {buttons.map(btn => {
                const Icon = btn.icon;
                if (!btn.active) {
                  return (
                    <span key={btn.label}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium opacity-50 pointer-events-none bg-muted/50 text-muted-foreground border border-border">
                      <Lock className="h-3 w-3" /> {btn.label}
                    </span>
                  );
                }
                const isCash = btn.label === 'Cash';
                return (
                  <button key={btn.label}
                    onClick={() => { if (isCash) openCashCreate(); else openBankCreate(); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${isCash ? 'bg-teal-500/10 text-teal-600 border border-teal-500/20 hover:bg-teal-500/20' : 'bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20'} transition-colors`}>
                    <Icon className="h-3.5 w-3.5" /> {btn.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="definitions">Ledger Definitions</TabsTrigger>
          <TabsTrigger value="opening_balances">Opening Balances</TabsTrigger>
        </TabsList>

        {/* Tab 1 — Definitions */}
        <TabsContent value="definitions">
          <Tabs value={defSubTab} onValueChange={(v) => setDefSubTab(v as any)} className="mb-4">
            <TabsList className="h-9">
              <TabsTrigger value="cash" className="text-xs gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> Cash ({cashDefs.length})
              </TabsTrigger>
              <TabsTrigger value="bank" className="text-xs gap-1.5">
                <Landmark className="h-3.5 w-3.5" /> Bank ({bankDefs.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Cash List */}
          {defSubTab === 'cash' && (
            cashDefs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No cash ledgers yet. Click <span className="font-semibold text-teal-600">+ Cash</span> above or use a Quick Start template.
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Numeric Code</TableHead>
                      <TableHead>Parent Group</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashDefs.map(def => (
                      <TableRow key={def.id}>
                        <TableCell className="font-medium">{def.name}</TableCell>
                        <TableCell className="font-mono text-xs text-teal-600">{def.numericCode || '—'}</TableCell>
                        <TableCell className="text-xs">{def.parentGroupName}</TableCell>
                        <TableCell>
                          {def.entityId ? (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                              {entities.find(e => e.id === def.entityId)?.name ?? def.entityShortCode}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-teal-500/10 text-teal-600 border-teal-500/20">Group</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{def.location || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${def.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                            {def.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCashEdit(def)}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeactivate(def)}><Ban className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          )}

          {/* Bank List */}
          {defSubTab === 'bank' && (
            bankDefs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No bank ledgers yet. Click <span className="font-semibold text-blue-600">+ Bank</span> above or use a Quick Start template.
              </div>
            ) : (
              <div className="space-y-0">
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Numeric Code</TableHead>
                        <TableHead>Bank · Branch</TableHead>
                        <TableHead>Account Type</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankDefs.map(def => (
                        <>
                          <TableRow key={def.id} className="cursor-pointer" onClick={() => {
                            if (expandedBankId === def.id) { setExpandedBankId(null); }
                            else {
                              setExpandedBankId(def.id);
                              setBankMgmtTab('definition');
                              loadBankMgmtData(def, selEntityId || entities[0]?.id || '');
                            }
                          }}>
                            <TableCell className="font-medium">{def.name}</TableCell>
                            <TableCell className="font-mono text-xs text-teal-600">{def.numericCode || '—'}</TableCell>
                            <TableCell>
                              <div>
                                <p className="text-xs font-medium">{def.bankName}</p>
                                {def.branchCity && <p className="text-[10px] text-muted-foreground">{def.branchCity}</p>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${ACCOUNT_TYPE_COLORS[def.accountType]}`}>
                                {ACCOUNT_TYPE_LABELS[def.accountType]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono">{def.currency ?? 'INR'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${def.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                {def.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openBankEdit(def)}><Edit2 className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeactivate(def)}><Ban className="h-3.5 w-3.5" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {expandedBankId === def.id && (
                            <TableRow key={`${def.id}-expand`}>
                              <TableCell colSpan={7} className="p-0">
                                <div className="bg-muted/20 border-t border-border p-4">
                                  <Tabs value={bankMgmtTab} onValueChange={v => setBankMgmtTab(v as any)}>
                                    <TabsList className="h-8 mb-3">
                                      <TabsTrigger value="definition" className="text-xs gap-1"><FileText className="h-3 w-3" /> Definition</TabsTrigger>
                                      <TabsTrigger value="cheques" className="text-xs gap-1"><BookOpen className="h-3 w-3" /> Cheque Books</TabsTrigger>
                                      <TabsTrigger value="pdc" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" /> PDC Register</TabsTrigger>
                                      <TabsTrigger value="nach" className="text-xs gap-1"><Shield className="h-3 w-3" /> NACH Mandates</TabsTrigger>
                                    </TabsList>

                                    {/* Definition tab */}
                                    <TabsContent value="definition">
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                        <div><span className="text-muted-foreground">Bank:</span> <span className="font-medium">{def.bankName}</span></div>
                                        <div><span className="text-muted-foreground">IFSC:</span> <span className="font-mono">{def.ifscCode}</span></div>
                                        <div><span className="text-muted-foreground">Account:</span> <span className="font-mono">{maskAccountNo(def.accountNumber)}</span></div>
                                        <div><span className="text-muted-foreground">Branch:</span> {def.branchName || '—'}</div>
                                        <div><span className="text-muted-foreground">City:</span> {def.branchCity || '—'}</div>
                                        <div><span className="text-muted-foreground">State:</span> {def.branchState || '—'}</div>
                                        {def.bankGstin && <div><span className="text-muted-foreground">Bank GSTIN:</span> <span className="font-mono">{def.bankGstin}</span></div>}
                                        <div><span className="text-muted-foreground">BRS:</span> {def.brsEnabled ? `Enabled (${def.clearingDays} days)` : 'Disabled'}</div>
                                        <div><span className="text-muted-foreground">Crossing:</span> {def.defaultCrossing?.replace(/_/g, ' ') ?? 'A/c Payee'}</div>
                                      </div>
                                      <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => openBankEdit(def)}>Edit Details</Button>
                                    </TabsContent>

                                    {/* Cheque Books tab */}
                                    <TabsContent value="cheques">
                                      <div className="space-y-3">
                                        {chequeBooks.filter(b => b.status === 'active').map(b => {
                                          const remaining = b.toLeaf - b.currentLeaf + 1;
                                          return (
                                            <div key={b.id}>
                                              {remaining <= 5 && remaining > 0 && (
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 text-xs mb-2">
                                                  <AlertTriangle className="h-3.5 w-3.5" />
                                                  Cheque book {b.bookReference} running low — only {remaining} leaves remaining.
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                        {chequeBooks.length === 0 ? (
                                          <p className="text-xs text-muted-foreground py-4 text-center">No cheque books. Add one to start issuing cheques.</p>
                                        ) : (
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead className="text-xs">Book Ref</TableHead>
                                                <TableHead className="text-xs">Leaves</TableHead>
                                                <TableHead className="text-xs">Current</TableHead>
                                                <TableHead className="text-xs">Status</TableHead>
                                                <TableHead className="text-xs text-right">Actions</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {chequeBooks.map(b => (
                                                <TableRow key={b.id}>
                                                  <TableCell className="text-xs font-medium">{b.bookReference}</TableCell>
                                                  <TableCell className="text-xs font-mono">{b.fromLeaf}–{b.toLeaf}</TableCell>
                                                  <TableCell className="text-xs font-mono">{b.status === 'active' ? b.currentLeaf : '—'}</TableCell>
                                                  <TableCell>
                                                    <Badge variant="outline" className={`text-[9px] ${b.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : b.status === 'exhausted' ? 'bg-red-500/10 text-red-500' : 'bg-muted/50 text-muted-foreground'}`}>
                                                      {b.status}
                                                    </Badge>
                                                  </TableCell>
                                                  <TableCell className="text-right">
                                                    {b.status === 'active' && (
                                                      <Button variant="ghost" size="sm" className="h-6 text-[10px]"
                                                        onClick={() => {
                                                          setSelectedChequeBook(b);
                                                          setChequeRecords(loadChequeRecords(b.entityId, b.id));
                                                        }}>View</Button>
                                                    )}
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        )}
                                        <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                                          const eid = selEntityId || entities[0]?.id || '';
                                          setChequeBookForm({ bookReference: '', fromLeaf: 0, toLeaf: 0, issuedDate: '', entityId: eid, defId: def.id });
                                          setChequeBookOpen(true);
                                        }}>
                                          <Plus className="h-3 w-3 mr-1" /> Add Cheque Book
                                        </Button>

                                        {/* Selected cheque book's records */}
                                        {selectedChequeBook && (
                                          <div className="mt-4 border-t border-border pt-3">
                                            <div className="flex items-center justify-between mb-2">
                                              <p className="text-xs font-medium">Cheques in {selectedChequeBook.bookReference}</p>
                                              <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => {
                                                setChequeIssueForm({
                                                  payee: '', amount: 0, date: '', isPDC: false, postDatedDate: '',
                                                  crossingType: def.defaultCrossing ?? 'account_payee',
                                                  narration: '', chequeNumber: selectedChequeBook.currentLeaf,
                                                });
                                                setChequeIssueOpen(true);
                                              }}>
                                                <Plus className="h-3 w-3 mr-1" /> Issue Cheque
                                              </Button>
                                            </div>
                                            {chequeRecords.length === 0 ? (
                                              <p className="text-[10px] text-muted-foreground text-center py-3">No cheques issued from this book yet.</p>
                                            ) : (
                                              <Table>
                                                <TableHeader>
                                                  <TableRow>
                                                    <TableHead className="text-xs">Cheque #</TableHead>
                                                    <TableHead className="text-xs">Payee</TableHead>
                                                    <TableHead className="text-xs">Amount</TableHead>
                                                    <TableHead className="text-xs">Date</TableHead>
                                                    <TableHead className="text-xs">Status</TableHead>
                                                    <TableHead className="text-xs text-right">Actions</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {chequeRecords.map(r => (
                                                    <TableRow key={r.id}>
                                                      <TableCell className="text-xs font-mono">{r.chequeNumber}</TableCell>
                                                      <TableCell className="text-xs">{r.payee || '—'}</TableCell>
                                                      <TableCell className="text-xs font-mono">{r.amount ? `₹${r.amount.toLocaleString('en-IN')}` : '—'}</TableCell>
                                                      <TableCell className="text-xs">
                                                        {r.date}{r.isPDC && r.postDatedDate && <span className="text-amber-600 ml-1">(PDC: {r.postDatedDate})</span>}
                                                      </TableCell>
                                                      <TableCell>
                                                        <Badge variant="outline" className={`text-[9px] ${CHEQUE_STATUS_COLORS[r.status]}`}>
                                                          {CHEQUE_STATUS_LABELS[r.status]}
                                                        </Badge>
                                                      </TableCell>
                                                      <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                          {(r.status === 'issued' || r.status === 'post_dated' || r.status === 'presented') && (
                                                            <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => updateChequeStatus(r, 'cleared')}>Clear</Button>
                                                          )}
                                                          {(r.status === 'issued' || r.status === 'post_dated' || r.status === 'presented') && (
                                                            <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5 text-red-500" onClick={() => updateChequeStatus(r, 'bounced')}>Bounce</Button>
                                                          )}
                                                          {(r.status === 'issued' || r.status === 'post_dated') && (
                                                            <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => updateChequeStatus(r, 'stop_payment')}>Stop</Button>
                                                          )}
                                                          {(r.status === 'issued' || r.status === 'cleared') && (
                                                            <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => setChequePrintPreview(r)}>Print</Button>
                                                          )}
                                                        </div>
                                                      </TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </TabsContent>

                                    {/* PDC Register tab */}
                                    <TabsContent value="pdc">
                                      {(() => {
                                        const eid = selEntityId || entities[0]?.id || '';
                                        const pdcRecs = getAllPDCRecords(def.id, eid);
                                        return pdcRecs.length === 0 ? (
                                          <p className="text-xs text-muted-foreground py-4 text-center">No post-dated cheques.</p>
                                        ) : (
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead className="text-xs">Cheque #</TableHead>
                                                <TableHead className="text-xs">Payee</TableHead>
                                                <TableHead className="text-xs">Amount</TableHead>
                                                <TableHead className="text-xs">Issued Date</TableHead>
                                                <TableHead className="text-xs">Due Date</TableHead>
                                                <TableHead className="text-xs">Status</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {pdcRecs.map(r => {
                                                const days = getDaysUntil(r.postDatedDate);
                                                const isUrgent = days <= 7 && days >= 0;
                                                const isOverdue = days < 0;
                                                return (
                                                  <TableRow key={r.id} className={isOverdue ? 'bg-red-500/5' : isUrgent ? 'bg-amber-500/5' : ''}>
                                                    <TableCell className="text-xs font-mono">{r.chequeNumber}</TableCell>
                                                    <TableCell className="text-xs">{r.payee}</TableCell>
                                                    <TableCell className="text-xs font-mono">₹{r.amount.toLocaleString('en-IN')}</TableCell>
                                                    <TableCell className="text-xs">{r.issuedDate}</TableCell>
                                                    <TableCell className="text-xs font-medium">{r.postDatedDate}</TableCell>
                                                    <TableCell>
                                                      <Badge variant="outline" className={`text-[9px] ${isOverdue ? 'bg-red-500/10 text-red-500' : isUrgent ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'}`}>
                                                        {isOverdue ? 'Overdue' : isUrgent ? `Due in ${days} day${days !== 1 ? 's' : ''}` : 'Pending'}
                                                      </Badge>
                                                    </TableCell>
                                                  </TableRow>
                                                );
                                              })}
                                            </TableBody>
                                          </Table>
                                        );
                                      })()}
                                    </TabsContent>

                                    {/* NACH Mandates tab */}
                                    <TabsContent value="nach">
                                      <div className="space-y-3">
                                        {nachMandates.filter(m => m.status === 'active').map(m => {
                                          const today = new Date();
                                          const nextDebit = new Date(today.getFullYear(), today.getMonth(), m.debitDay);
                                          if (nextDebit < today) nextDebit.setMonth(nextDebit.getMonth() + 1);
                                          const daysUntilDebit = Math.ceil((nextDebit.getTime() - today.getTime()) / (1000*60*60*24));
                                          return daysUntilDebit <= 7 ? (
                                            <div key={`alert-${m.id}`} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 text-xs">
                                              <AlertTriangle className="h-3.5 w-3.5" />
                                              {m.beneficiary} debit on {nextDebit.toLocaleDateString('en-IN')} ({daysUntilDebit} day{daysUntilDebit !== 1 ? 's' : ''})
                                            </div>
                                          ) : null;
                                        })}
                                        {nachMandates.length === 0 ? (
                                          <p className="text-xs text-muted-foreground py-4 text-center">No NACH/ECS mandates.</p>
                                        ) : (
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead className="text-xs">Mandate Ref</TableHead>
                                                <TableHead className="text-xs">Beneficiary</TableHead>
                                                <TableHead className="text-xs">Amount</TableHead>
                                                <TableHead className="text-xs">Frequency</TableHead>
                                                <TableHead className="text-xs">Debit Day</TableHead>
                                                <TableHead className="text-xs">Status</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {nachMandates.map(m => (
                                                <TableRow key={m.id}>
                                                  <TableCell className="text-xs font-mono">{m.mandateRef}</TableCell>
                                                  <TableCell className="text-xs">{m.beneficiary}</TableCell>
                                                  <TableCell className="text-xs font-mono">{m.amount > 0 ? `₹${m.amount.toLocaleString('en-IN')}` : `₹${m.amountMin.toLocaleString('en-IN')}–${m.amountMax.toLocaleString('en-IN')}`}</TableCell>
                                                  <TableCell className="text-xs capitalize">{m.frequency}</TableCell>
                                                  <TableCell className="text-xs">{m.debitDay}</TableCell>
                                                  <TableCell>
                                                    <Badge variant="outline" className={`text-[9px] ${m.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : m.status === 'suspended' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-500'}`}>
                                                      {m.status}
                                                    </Badge>
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        )}
                                        <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                                          const eid = selEntityId || entities[0]?.id || '';
                                          setNachForm({ mandateRef: '', beneficiary: '', amount: 0, amountMin: 0, amountMax: 0,
                                            frequency: 'monthly', debitDay: 1, startDate: '', endDate: '', notes: '', entityId: eid, defId: def.id });
                                          setNachOpen(true);
                                        }}>
                                          <Plus className="h-3 w-3 mr-1" /> Add Mandate
                                        </Button>
                                      </div>
                                    </TabsContent>
                                  </Tabs>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )
          )}
        </TabsContent>

        {/* Tab 2 — Opening Balances */}
        <TabsContent value="opening_balances">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium whitespace-nowrap">Entity:</Label>
              <Select value={selEntityId} onValueChange={setSelEntityId}>
                <SelectTrigger className="w-[320px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {entities.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.shortCode})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {filteredInstances.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No ledger instances for this entity. Create a group-level ledger first.
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ledger Name</TableHead>
                        <TableHead>Display Code</TableHead>
                        <TableHead>Custodian</TableHead>
                        <TableHead>Signatories</TableHead>
                        <TableHead>Opening Balance (₹)</TableHead>
                        <TableHead>Dr/Cr</TableHead>
                        <TableHead>Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInstances.map(inst => {
                        const def = getDefForInstance(inst);
                        const isCash = def?.ledgerType === 'cash';
                        const isBank = def?.ledgerType === 'bank';
                        const displayCode = `${inst.entityShortCode}/${inst.displayCode}`;
                        return (
                          <TableRow key={inst.id}>
                            <TableCell className="font-medium">{def?.name ?? '—'}</TableCell>
                            <TableCell className="font-mono text-xs">{displayCode}</TableCell>
                            <TableCell>
                              {inst.currentCustodian ? (
                                <div className="space-y-0.5">
                                  <p className="text-xs font-medium">{inst.currentCustodian.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{inst.currentCustodian.designation}</p>
                                  {isCash && (
                                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-teal-600"
                                      onClick={() => {
                                        setCustodianTargetInstanceId(inst.id);
                                        setCustodianHistory(loadCustodianHistory(inst.entityId, inst.ledgerDefinitionId));
                                        setCustodianOpen(true);
                                      }}>Transfer</Button>
                                  )}
                                </div>
                              ) : (
                                isCash ? (
                                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-teal-600"
                                    onClick={() => {
                                      setCustodianTargetInstanceId(inst.id);
                                      setCustodianHistory(loadCustodianHistory(inst.entityId, inst.ledgerDefinitionId));
                                      setCustodianOpen(true);
                                    }}>Assign</Button>
                                ) : <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isBank ? (
                                <div className="space-y-0.5">
                                  <p className="text-xs">{inst.signatories?.length ?? 0} signator{(inst.signatories?.length ?? 0) !== 1 ? 'ies' : 'y'}</p>
                                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-blue-600"
                                    onClick={() => { setSignatoryTargetInstanceId(inst.id); setSignatoryOpen(true); }}>
                                    Manage
                                  </Button>
                                </div>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground text-sm">₹</span>
                                <Input {...amountInputProps} className="w-32 h-8 text-sm" value={inst.openingBalance || ''}
                                  placeholder="0" onKeyDown={onEnterNext}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                                    setInstances(prev => prev.map(i => i.id === inst.id ? { ...i, openingBalance: val } : i));
                                  }} />
                              </div>
                            </TableCell>
                            <TableCell>
                              {isCash ? (
                                <Badge variant="outline" className="text-[10px] bg-muted/50 text-muted-foreground border-border">Dr</Badge>
                              ) : (
                                <div className="flex rounded-md border border-input overflow-hidden text-xs font-medium">
                                  <button type="button" onClick={() => setInstances(prev => prev.map(i => i.id === inst.id ? { ...i, openingBalanceType: 'Dr' } : i))}
                                    className={`px-2 py-1 transition-colors ${inst.openingBalanceType === 'Dr' ? 'bg-blue-500/15 text-blue-700' : 'text-muted-foreground'}`}>Dr</button>
                                  <button type="button" onClick={() => setInstances(prev => prev.map(i => i.id === inst.id ? { ...i, openingBalanceType: 'Cr' } : i))}
                                    className={`px-2 py-1 transition-colors ${inst.openingBalanceType === 'Cr' ? 'bg-amber-500/15 text-amber-700' : 'text-muted-foreground'}`}>Cr</button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Switch checked={inst.isActive}
                                onCheckedChange={(checked) => setInstances(prev => prev.map(i => i.id === inst.id ? { ...i, isActive: checked } : i))} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveBalances}>Save Opening Balances</Button>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Cash Create / Edit Dialog ─── */}
      <Dialog open={cashCreateOpen} onOpenChange={(open) => { if (!open) { setCashCreateOpen(false); setCashEditTarget(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{cashEditTarget ? 'Edit Cash Ledger' : 'Create Cash Ledger'}</DialogTitle>
            <DialogDescription>
              {cashEditTarget ? 'Update ledger definition details.' : 'Define a new cash ledger for your group or a specific entity.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-keyboard-form>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Parent Group <span className="text-destructive">*</span></Label>
              <Select value={cashForm.parentGroupCode} onValueChange={(v) => {
                if (v === 'CASH') setCashForm(f => ({ ...f, parentGroupCode: 'CASH', parentGroupName: 'Cash & Cash Equivalents' }));
                else { const l4 = l4CashGroups.find(g => g.code === v); setCashForm(f => ({ ...f, parentGroupCode: v, parentGroupName: l4?.name ?? v })); }
              }}>
                <SelectTrigger><SelectValue placeholder="Select parent group" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH"><span className="flex items-center gap-1.5"><Lock className="h-3 w-3 text-muted-foreground" />Cash & Cash Equivalents</span></SelectItem>
                  {l4CashGroups.map(g => (<SelectItem key={g.code} value={g.code}>{g.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ledger Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., Main Cash, Petty Cash — Delhi" value={cashForm.name}
                onKeyDown={onEnterNext}
                onChange={(e) => setCashForm(f => ({ ...f, name: e.target.value }))} disabled={!cashForm.parentGroupCode} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Alias</Label>
              <Input placeholder="e.g., MCash, PettyCash-DEL" value={cashForm.alias}
                onKeyDown={onEnterNext}
                onChange={(e) => setCashForm(f => ({ ...f, alias: e.target.value }))} disabled={!cashForm.parentGroupCode} />
            </div>
            {!cashEditTarget && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Opening Balance</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">₹</span>
                  <Input {...amountInputProps} className="flex-1" value={cashForm.openingBalance || ''} placeholder="0"
                    onChange={(e) => setCashForm(f => ({ ...f, openingBalance: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))}
                    onKeyDown={onEnterNext} disabled={!cashForm.parentGroupCode} />
                  <div className="flex rounded-md border border-input overflow-hidden text-xs font-medium">
                    <button type="button" onClick={() => setCashForm(f => ({ ...f, openingBalanceType: 'Dr' }))}
                      className={`px-3 py-1.5 transition-colors ${cashForm.openingBalanceType === 'Dr' ? 'bg-teal-500/15 text-teal-700 border-r border-input' : 'text-muted-foreground hover:bg-muted/40 border-r border-input'}`}
                      disabled={!cashForm.parentGroupCode}>Dr</button>
                    <button type="button" onClick={() => setCashForm(f => ({ ...f, openingBalanceType: 'Cr' }))}
                      className={`px-3 py-1.5 transition-colors ${cashForm.openingBalanceType === 'Cr' ? 'bg-amber-500/15 text-amber-700' : 'text-muted-foreground hover:bg-muted/40'}`}
                      disabled={!cashForm.parentGroupCode}>Cr</button>
                  </div>
                </div>
              </div>
            )}
            <button type="button" onClick={() => setCashShowMore(v => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <span>{cashShowMore ? '−' : '+'}</span><span>{cashShowMore ? 'Hide details' : 'More Details'}</span>
            </button>
            {cashShowMore && (
              <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Location</Label>
                  <Input placeholder="e.g., HO Cashbox" value={cashForm.location} onKeyDown={onEnterNext}
                    onChange={(e) => setCashForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Cash Limit (₹)</Label>
                  <Input {...amountInputProps} value={cashForm.cashLimit || ''} placeholder="0" onKeyDown={onEnterNext}
                    onChange={(e) => setCashForm(f => ({ ...f, cashLimit: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Cash Receipt Series</Label>
                  <Input placeholder="CR" value={cashForm.voucherSeries} maxLength={4} onKeyDown={onEnterNext}
                    onChange={(e) => setCashForm(f => ({ ...f, voucherSeries: e.target.value.toUpperCase().slice(0, 4) }))} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={cashForm.isMainCash}
                    onChange={(e) => setCashForm(f => ({ ...f, isMainCash: e.target.checked }))} className="h-4 w-4" />
                  <Label className="text-sm">Set as primary cash account</Label>
                </div>
              </div>
            )}
            {!cashEditTarget && (
              <>
                <button type="button" onClick={() => setCashShowAdvanced(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  ⚙ <span>{cashShowAdvanced ? 'Hide advanced' : 'Advanced options'}</span>
                </button>
                {cashShowAdvanced && (
                  <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Entity Scope</Label>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setCashForm(f => ({ ...f, scope: 'group', entityId: '' }))}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${cashForm.scope === 'group' ? 'bg-teal-500/10 text-teal-600 border-teal-500/30' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'}`}>Group Level</button>
                        <button type="button" onClick={() => setCashForm(f => ({ ...f, scope: 'entity' }))}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${cashForm.scope === 'entity' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'}`}>Entity Specific</button>
                      </div>
                    </div>
                    {cashForm.scope === 'entity' && (
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Entity <span className="text-destructive">*</span></Label>
                        <Select value={cashForm.entityId} onValueChange={(v) => setCashForm(f => ({ ...f, entityId: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                          <SelectContent>{entities.map(e => (<SelectItem key={e.id} value={e.id}>{e.name} ({e.shortCode})</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCashCreateOpen(false); setCashEditTarget(null); }}>Cancel</Button>
            <Button data-primary onClick={handleCashSave} disabled={!cashForm.parentGroupCode}>{cashEditTarget ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Bank Create / Edit Dialog ─── */}
      <Dialog open={bankCreateOpen} onOpenChange={(open) => { if (!open) { setBankCreateOpen(false); setBankEditTarget(null); setIfscValid(null); setShowAccountPreview(false); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{bankEditTarget ? 'Edit Bank Ledger' : 'Create Bank Ledger'}</DialogTitle>
            <DialogDescription>
              {bankEditTarget ? 'Update bank ledger definition.' : 'Define a new bank account ledger.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-keyboard-form>
            {/* ESSENTIAL — Field 1: IFSC */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">IFSC Code <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input placeholder="e.g., HDFC0001234" value={bankForm.ifscCode} maxLength={11}
                  onKeyDown={onEnterNext}
                  className={ifscValid === false ? 'border-destructive' : ifscValid === true ? 'border-emerald-500' : ''}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setBankForm(f => ({ ...f, ifscCode: v, ifscAutoFilled: false }));
                    setIfscValid(null); setIfscFetchError('');
                    if (v.length === 11) fetchIfscDetails(v);
                  }} />
                {ifscFetching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                {ifscValid === true && !ifscFetching && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />}
              </div>
              {bankForm.ifscAutoFilled && (
                <p className="text-[10px] text-emerald-600">✓ {bankForm.branchName}, {bankForm.branchCity} — branch details auto-filled</p>
              )}
              {ifscFetchError && <p className="text-[10px] text-amber-600">{ifscFetchError}</p>}
            </div>

            {/* ESSENTIAL — Field 2: Ledger Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ledger Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., HDFC Bank — Current A/C" value={bankForm.name}
                onKeyDown={onEnterNext}
                onChange={(e) => setBankForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            {/* ESSENTIAL — Field 3: Account Type */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Account Type <span className="text-destructive">*</span></Label>
              <Select value={bankForm.accountType} onValueChange={(v: string) => {
                const at = v as BankAccountType;
                const nature = getDefaultNature(at);
                const parent = getSuggestedParent(at);
                setBankForm(f => ({ ...f, accountType: at, openingBalanceType: nature, parentGroupCode: parent.code, parentGroupName: parent.name }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select account type" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACCOUNT_TYPE_LABELS) as BankAccountType[]).map(k => (
                    <SelectItem key={k} value={k}>{ACCOUNT_TYPE_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ESSENTIAL — Field 4: Opening Balance */}
            {!bankEditTarget && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Opening Balance</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">₹</span>
                  <Input {...amountInputProps} className="flex-1" value={bankForm.openingBalance || ''} placeholder="0"
                    onKeyDown={onEnterNext}
                    onChange={(e) => setBankForm(f => ({ ...f, openingBalance: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))} />
                  <div className="flex rounded-md border border-input overflow-hidden text-xs font-medium">
                    <button type="button" onClick={() => setBankForm(f => ({ ...f, openingBalanceType: 'Dr' }))}
                      className={`px-3 py-1.5 transition-colors ${bankForm.openingBalanceType === 'Dr' ? 'bg-blue-500/15 text-blue-700' : 'text-muted-foreground'}`}>Dr</button>
                    <button type="button" onClick={() => setBankForm(f => ({ ...f, openingBalanceType: 'Cr' }))}
                      className={`px-3 py-1.5 transition-colors ${bankForm.openingBalanceType === 'Cr' ? 'bg-amber-500/15 text-amber-700' : 'text-muted-foreground'}`}>Cr</button>
                  </div>
                </div>
              </div>
            )}

            {/* + More Details */}
            <button type="button" onClick={() => setBankShowMore(v => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <span>{bankShowMore ? '−' : '+'}</span><span>{bankShowMore ? 'Hide details' : 'More Details'}</span>
            </button>
            {bankShowMore && (
              <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Account Number</Label>
                  <Input placeholder="Enter account number" onKeyDown={onEnterNext}
                    value={bankEditTarget ? maskAccountNo(bankForm.accountNumber) : bankForm.accountNumber}
                    onChange={(e) => { if (bankEditTarget) return; setBankForm(f => ({ ...f, accountNumber: e.target.value.replace(/\D/g, '') })); }}
                    readOnly={!!bankEditTarget} />
                  {bankForm.accountNumber && !bankEditTarget && <p className="text-[10px] text-muted-foreground">Displayed as: {maskAccountNo(bankForm.accountNumber)}</p>}
                </div>
                {(bankForm.accountType === 'cash_credit' || bankForm.accountType === 'overdraft') && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">OD / CC Limit</Label>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground text-sm">₹</span>
                      <Input {...amountInputProps} value={bankForm.odLimit || ''} onKeyDown={onEnterNext}
                        onChange={(e) => setBankForm(f => ({ ...f, odLimit: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))} />
                    </div>
                  </div>
                )}
                {bankForm.accountType === 'eefc' && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Currency</Label>
                    <Select value={bankForm.currency} onValueChange={(v: any) => setBankForm(f => ({ ...f, currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['INR','USD','EUR','GBP','AED'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Alias</Label>
                  <Input placeholder="e.g., HDFC-CC" value={bankForm.alias} onKeyDown={onEnterNext}
                    onChange={(e) => setBankForm(f => ({ ...f, alias: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Bank Name</Label>
                  <Select value={bankForm.bankName} onValueChange={(v) => setBankForm(f => ({ ...f, bankName: v, bankNameOther: v === 'Other' ? f.bankNameOther : '' }))}>
                    <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                    <SelectContent>{INDIAN_BANKS.map(b => (<SelectItem key={b} value={b}>{b}</SelectItem>))}</SelectContent>
                  </Select>
                  {bankForm.bankName === 'Other' && (
                    <Input placeholder="Enter bank name" value={bankForm.bankNameOther} className="mt-1.5" onKeyDown={onEnterNext}
                      onChange={(e) => setBankForm(f => ({ ...f, bankNameOther: e.target.value }))} />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Parent Group</Label>
                  <Select value={bankForm.parentGroupCode} onValueChange={(v) => {
                    if (v === 'BANK') setBankForm(f => ({ ...f, parentGroupCode: 'BANK', parentGroupName: 'Bank Balances' }));
                    else if (v === 'STBOR') setBankForm(f => ({ ...f, parentGroupCode: 'STBOR', parentGroupName: 'Short-Term Borrowings' }));
                    else { const l4 = l4BankGroups.find(g => g.code === v); setBankForm(f => ({ ...f, parentGroupCode: v, parentGroupName: l4?.name ?? v })); }
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK">Bank Balances {suggestedParent?.code === 'BANK' && '(Suggested)'}</SelectItem>
                      <SelectItem value="STBOR">Short-Term Borrowings {suggestedParent?.code === 'STBOR' && '(Suggested)'}</SelectItem>
                      {l4BankGroups.map(g => (<SelectItem key={g.code} value={g.code}>{g.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* + Branch Details */}
            <button type="button" onClick={() => setBankShowBranch(v => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <span>{bankShowBranch ? '−' : '+'}</span><span>{bankShowBranch ? 'Hide branch details' : 'Branch Details'}</span>
              {bankForm.ifscAutoFilled && <span className="text-emerald-600 text-[10px]">(auto-filled)</span>}
            </button>
            {bankShowBranch && (
              <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
                {bankForm.ifscAutoFilled && (
                  <p className="text-[10px] text-emerald-600 mb-1">✓ Auto-filled from IFSC lookup. Edit if needed.</p>
                )}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Branch Name</Label>
                  <Input value={bankForm.branchName} onKeyDown={onEnterNext}
                    onChange={(e) => setBankForm(f => ({ ...f, branchName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Branch Address</Label>
                  <textarea className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" rows={2}
                    value={bankForm.branchAddress} onChange={(e) => setBankForm(f => ({ ...f, branchAddress: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1"><Label className="text-xs">City</Label>
                    <Input value={bankForm.branchCity} className="h-8 text-xs" onKeyDown={onEnterNext}
                      onChange={(e) => setBankForm(f => ({ ...f, branchCity: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">State</Label>
                    <Input value={bankForm.branchState} className="h-8 text-xs" onKeyDown={onEnterNext}
                      onChange={(e) => setBankForm(f => ({ ...f, branchState: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Pincode</Label>
                    <Input value={bankForm.branchPincode} className="h-8 text-xs" maxLength={6} onKeyDown={onEnterNext}
                      onChange={(e) => setBankForm(f => ({ ...f, branchPincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))} /></div>
                </div>
              </div>
            )}

            {/* + GST Details */}
            <button type="button" onClick={() => setBankShowGst(v => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <span>{bankShowGst ? '−' : '+'}</span><span>{bankShowGst ? 'Hide GST details' : 'GST Details'}</span>
            </button>
            {bankShowGst && (
              <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Bank GSTIN</Label>
                  <Input placeholder="e.g., 33AAACH2222Q1Z5" value={bankForm.bankGstin} maxLength={15} onKeyDown={onEnterNext}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase();
                      const stateCode = v.length >= 2 ? v.slice(0, 2) : '';
                      setBankForm(f => ({ ...f, bankGstin: v, bankStateCode: stateCode }));
                    }} />
                  {bankForm.bankStateCode && (
                    <p className="text-[10px] text-muted-foreground">State code: {bankForm.bankStateCode} (auto from GSTIN)</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">GST on Bank Charges</Label>
                  <div className="flex rounded-md border border-input overflow-hidden text-xs font-medium">
                    <button type="button" onClick={() => setBankForm(f => ({ ...f, gstOnCharges: true }))}
                      className={`flex-1 px-3 py-1.5 transition-colors ${bankForm.gstOnCharges ? 'bg-emerald-500/15 text-emerald-700' : 'text-muted-foreground'}`}>Yes — ITC claimable</button>
                    <button type="button" onClick={() => setBankForm(f => ({ ...f, gstOnCharges: false }))}
                      className={`flex-1 px-3 py-1.5 transition-colors ${!bankForm.gstOnCharges ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}>No</button>
                  </div>
                </div>
              </div>
            )}

            {/* + Cheque & BRS Setup */}
            <button type="button" onClick={() => setBankShowCheque(v => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <span>{bankShowCheque ? '−' : '+'}</span><span>{bankShowCheque ? 'Hide cheque & BRS' : 'Cheque & BRS Setup'}</span>
            </button>
            {bankShowCheque && (
              <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Cheque Format</Label>
                  <Select value={bankForm.chequeFormat} onValueChange={(v: any) => setBankForm(f => ({ ...f, chequeFormat: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HDFC_CTS">HDFC CTS</SelectItem>
                      <SelectItem value="SBI_CTS">SBI CTS</SelectItem>
                      <SelectItem value="ICICI_CTS">ICICI CTS</SelectItem>
                      <SelectItem value="AXIS_CTS">Axis CTS</SelectItem>
                      <SelectItem value="GENERIC_CTS">Generic CTS</SelectItem>
                      <SelectItem value="CUSTOM">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Cheque Print Size</Label>
                  <div className="flex rounded-md border border-input overflow-hidden text-xs font-medium">
                    <button type="button" onClick={() => setBankForm(f => ({ ...f, chequeSize: 'A4' }))}
                      className={`flex-1 px-3 py-1.5 transition-colors ${bankForm.chequeSize === 'A4' ? 'bg-blue-500/15 text-blue-700' : 'text-muted-foreground'}`}>A4 (phantom)</button>
                    <button type="button" onClick={() => setBankForm(f => ({ ...f, chequeSize: 'LEAF' }))}
                      className={`flex-1 px-3 py-1.5 transition-colors ${bankForm.chequeSize === 'LEAF' ? 'bg-blue-500/15 text-blue-700' : 'text-muted-foreground'}`}>Actual Leaf</button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Default Crossing</Label>
                  <div className="flex rounded-md border border-input overflow-hidden text-xs font-medium">
                    <button type="button" onClick={() => setBankForm(f => ({ ...f, defaultCrossing: 'account_payee' }))}
                      className={`flex-1 px-2 py-1.5 transition-colors ${bankForm.defaultCrossing === 'account_payee' ? 'bg-blue-500/15 text-blue-700' : 'text-muted-foreground'}`}>A/c Payee</button>
                    <button type="button" onClick={() => setBankForm(f => ({ ...f, defaultCrossing: 'not_negotiable' }))}
                      className={`flex-1 px-2 py-1.5 transition-colors ${bankForm.defaultCrossing === 'not_negotiable' ? 'bg-blue-500/15 text-blue-700' : 'text-muted-foreground'}`}>Not Negotiable</button>
                    <button type="button" onClick={() => setBankForm(f => ({ ...f, defaultCrossing: 'none' }))}
                      className={`flex-1 px-2 py-1.5 transition-colors ${bankForm.defaultCrossing === 'none' ? 'bg-blue-500/15 text-blue-700' : 'text-muted-foreground'}`}>None</button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">BRS Enabled</Label>
                  <Switch checked={bankForm.brsEnabled} onCheckedChange={(v) => setBankForm(f => ({ ...f, brsEnabled: v }))} />
                </div>
                {bankForm.brsEnabled && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Clearing Days</Label>
                      <Input {...amountInputProps} value={bankForm.clearingDays} className="h-8 text-xs" onKeyDown={onEnterNext}
                        onChange={(e) => setBankForm(f => ({ ...f, clearingDays: parseInt(e.target.value) || 2 }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">NEFT Cutoff</Label>
                      <Input placeholder="14:30" value={bankForm.cutoffTime} className="h-8 text-xs" onKeyDown={onEnterNext}
                        onChange={(e) => setBankForm(f => ({ ...f, cutoffTime: e.target.value }))} /></div>
                  </div>
                )}
              </div>
            )}

            {/* ⚙ Advanced */}
            {!bankEditTarget && (
              <>
                <button type="button" onClick={() => setBankShowAdvanced(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  ⚙ <span>{bankShowAdvanced ? 'Hide advanced' : 'Advanced options'}</span>
                </button>
                {bankShowAdvanced && (
                  <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Entity Scope</Label>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setBankForm(f => ({ ...f, scope: 'group', entityId: '' }))}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${bankForm.scope === 'group' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'}`}>Group Level</button>
                        <button type="button" onClick={() => setBankForm(f => ({ ...f, scope: 'entity' }))}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${bankForm.scope === 'entity' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'}`}>Entity Specific</button>
                      </div>
                    </div>
                    {bankForm.scope === 'entity' && (
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Entity <span className="text-destructive">*</span></Label>
                        <Select value={bankForm.entityId} onValueChange={(v) => setBankForm(f => ({ ...f, entityId: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                          <SelectContent>{entities.map(e => (<SelectItem key={e.id} value={e.id}>{e.name} ({e.shortCode})</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBankCreateOpen(false); setBankEditTarget(null); }}>Cancel</Button>
            <Button data-primary onClick={handleBankSave}>{bankEditTarget ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Custodian Dialog ─── */}
      <Dialog open={custodianOpen} onOpenChange={(open) => { if (!open) setCustodianOpen(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cash Custodian Management</DialogTitle>
            <DialogDescription>Assign or transfer custody. Every change is recorded permanently.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-keyboard-form>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">New Custodian Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Enter custodian name" value={custodianForm.name} onKeyDown={onEnterNext}
                onChange={(e) => setCustodianForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Designation <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., Cashier" value={custodianForm.designation} onKeyDown={onEnterNext}
                onChange={(e) => setCustodianForm(f => ({ ...f, designation: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Phone</Label>
              <Input placeholder="Phone number" value={custodianForm.phone} onKeyDown={onEnterNext}
                onChange={(e) => setCustodianForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Authorised By <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., Ravi Kumar, Director" value={custodianForm.handoverBy} onKeyDown={onEnterNext}
                onChange={(e) => setCustodianForm(f => ({ ...f, handoverBy: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Cash Balance at Handover (₹)</Label>
              <Input {...amountInputProps} value={custodianForm.cashBalanceAtHandover || ''} placeholder="0" onKeyDown={onEnterNext}
                onChange={(e) => setCustodianForm(f => ({ ...f, cashBalanceAtHandover: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Notes</Label>
              <Input placeholder="Optional notes" value={custodianForm.notes} onKeyDown={onEnterNext}
                onChange={(e) => setCustodianForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {custodianHistory.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="text-xs font-medium mb-2">Custody History</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {custodianHistory.map(h => (
                    <div key={h.id} className="text-[10px] text-muted-foreground flex justify-between">
                      <span>{h.custodianName} ({h.designation})</span>
                      <span>{new Date(h.fromDate).toLocaleDateString('en-IN')}{h.toDate ? ` → ${new Date(h.toDate).toLocaleDateString('en-IN')}` : ' (current)'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustodianOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleCustodianSave}>Assign Custody</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Signatory Dialog ─── */}
      <Dialog open={signatoryOpen} onOpenChange={(open) => { if (!open) setSignatoryOpen(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bank Signatory Management</DialogTitle>
            <DialogDescription>Manage authorised signatories for this bank account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-keyboard-form>
            {/* Signatory Type */}
            {(() => {
              const inst = instances.find(i => i.id === signatoryTargetInstanceId);
              return inst ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Signatory Type</Label>
                    <Select value={inst.signatoryType || ''} onValueChange={(v: any) => {
                      const updated = { ...inst, signatoryType: v || null };
                      saveInstance(updated);
                      setInstances(prev => prev.map(i => i.id === inst.id ? updated : i));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="any_one_of">Any One Of</SelectItem>
                        <SelectItem value="joint_all">Joint — All Required</SelectItem>
                        <SelectItem value="joint_any_two">Joint — Any Two</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Existing signatories */}
                  {(inst.signatories?.length ?? 0) > 0 && (
                    <div className="border border-border rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium">Current Signatories</p>
                      {inst.signatories.map(s => (
                        <div key={s.id} className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-medium">{s.name}</span>
                            <span className="text-muted-foreground ml-2">{s.designation}</span>
                            {s.signingLimit > 0 && <span className="text-muted-foreground ml-2">Limit: ₹{s.signingLimit.toLocaleString('en-IN')}</span>}
                          </div>
                          <Badge variant="outline" className={`text-[9px] ${s.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                            {s.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Add signatory form */}
                  <div className="border-t border-border pt-3 space-y-3">
                    <p className="text-xs font-medium">Add Signatory</p>
                    <Input placeholder="Name" value={signatoryForm.name} onKeyDown={onEnterNext}
                      onChange={(e) => setSignatoryForm(f => ({ ...f, name: e.target.value }))} />
                    <Input placeholder="Designation" value={signatoryForm.designation} onKeyDown={onEnterNext}
                      onChange={(e) => setSignatoryForm(f => ({ ...f, designation: e.target.value }))} />
                    <Input placeholder="Phone" value={signatoryForm.phone} onKeyDown={onEnterNext}
                      onChange={(e) => setSignatoryForm(f => ({ ...f, phone: e.target.value }))} />
                    <div className="space-y-1">
                      <Label className="text-xs">Signing Limit (₹, 0 = unlimited)</Label>
                      <Input {...amountInputProps} value={signatoryForm.signingLimit || ''} placeholder="0" onKeyDown={onEnterNext}
                        onChange={(e) => setSignatoryForm(f => ({ ...f, signingLimit: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valid From</Label>
                      <SmartDateInput value={signatoryForm.validFrom} onChange={(v) => setSignatoryForm(f => ({ ...f, validFrom: v }))} />
                    </div>
                  </div>
                </>
              ) : null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignatoryOpen(false)}>Close</Button>
            <Button data-primary onClick={handleSignatorySave}>Add Signatory</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Cheque Book Dialog ─── */}
      <Dialog open={chequeBookOpen} onOpenChange={(open) => { if (!open) setChequeBookOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Cheque Book</DialogTitle>
            <DialogDescription>Register a new cheque book received from the bank.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-keyboard-form>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Book Reference <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., HDFC-CB-001" value={chequeBookForm.bookReference} onKeyDown={onEnterNext}
                onChange={(e) => setChequeBookForm(f => ({ ...f, bookReference: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">From Leaf <span className="text-destructive">*</span></Label>
                <Input {...amountInputProps} placeholder="100001" value={chequeBookForm.fromLeaf || ''} onKeyDown={onEnterNext}
                  onChange={(e) => setChequeBookForm(f => ({ ...f, fromLeaf: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">To Leaf <span className="text-destructive">*</span></Label>
                <Input {...amountInputProps} placeholder="100050" value={chequeBookForm.toLeaf || ''} onKeyDown={onEnterNext}
                  onChange={(e) => setChequeBookForm(f => ({ ...f, toLeaf: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Issued Date</Label>
              <SmartDateInput value={chequeBookForm.issuedDate} onChange={(v) => setChequeBookForm(f => ({ ...f, issuedDate: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChequeBookOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleChequeBookSave}>Add Book</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Issue Cheque Dialog ─── */}
      <Dialog open={chequeIssueOpen} onOpenChange={(open) => { if (!open) setChequeIssueOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Cheque #{chequeIssueForm.chequeNumber}</DialogTitle>
            <DialogDescription>Fill in the cheque details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-keyboard-form>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Payee <span className="text-destructive">*</span></Label>
              <Input placeholder="Payee name" value={chequeIssueForm.payee} onKeyDown={onEnterNext}
                onChange={(e) => setChequeIssueForm(f => ({ ...f, payee: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Amount <span className="text-destructive">*</span></Label>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-sm">₹</span>
                <Input {...amountInputProps} value={chequeIssueForm.amount || ''} onKeyDown={onEnterNext}
                  onChange={(e) => setChequeIssueForm(f => ({ ...f, amount: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))} />
              </div>
              {chequeIssueForm.amount > 0 && (
                <p className="text-[10px] text-muted-foreground italic">{amountToWords(chequeIssueForm.amount)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date</Label>
              <SmartDateInput value={chequeIssueForm.date} onChange={(v) => setChequeIssueForm(f => ({ ...f, date: v }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={chequeIssueForm.isPDC} className="h-4 w-4"
                onChange={(e) => setChequeIssueForm(f => ({ ...f, isPDC: e.target.checked }))} />
              <Label className="text-sm">Post-Dated Cheque (PDC)</Label>
            </div>
            {chequeIssueForm.isPDC && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Post-Dated Date</Label>
                <SmartDateInput value={chequeIssueForm.postDatedDate} onChange={(v) => setChequeIssueForm(f => ({ ...f, postDatedDate: v }))} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Crossing</Label>
              <div className="flex rounded-md border border-input overflow-hidden text-xs font-medium">
                <button type="button" onClick={() => setChequeIssueForm(f => ({ ...f, crossingType: 'account_payee' }))}
                  className={`flex-1 px-2 py-1.5 transition-colors ${chequeIssueForm.crossingType === 'account_payee' ? 'bg-blue-500/15 text-blue-700' : 'text-muted-foreground'}`}>A/c Payee</button>
                <button type="button" onClick={() => setChequeIssueForm(f => ({ ...f, crossingType: 'not_negotiable' }))}
                  className={`flex-1 px-2 py-1.5 transition-colors ${chequeIssueForm.crossingType === 'not_negotiable' ? 'bg-blue-500/15 text-blue-700' : 'text-muted-foreground'}`}>Not Negotiable</button>
                <button type="button" onClick={() => setChequeIssueForm(f => ({ ...f, crossingType: 'none' }))}
                  className={`flex-1 px-2 py-1.5 transition-colors ${chequeIssueForm.crossingType === 'none' ? 'bg-blue-500/15 text-blue-700' : 'text-muted-foreground'}`}>None</button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Narration</Label>
              <Input placeholder="Optional narration" value={chequeIssueForm.narration} onKeyDown={onEnterNext}
                onChange={(e) => setChequeIssueForm(f => ({ ...f, narration: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChequeIssueOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleChequeIssue}>Issue Cheque</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Cheque Print Preview Dialog ─── */}
      <Dialog open={!!chequePrintPreview} onOpenChange={(open) => { if (!open) setChequePrintPreview(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cheque Print Preview</DialogTitle>
            <DialogDescription>On-screen preview — PDF printing is Phase 2.</DialogDescription>
          </DialogHeader>
          {chequePrintPreview && (
            <div className="border-2 border-dashed border-border rounded-lg p-6 space-y-4 font-mono text-sm bg-background">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span>{chequePrintPreview.date}</span>
              </div>
              <div className="border-b border-border pb-2">
                <span className="text-muted-foreground">Pay: </span>
                <span className="font-bold">{chequePrintPreview.payee}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Amount: </span>
                <span className="font-bold">₹{chequePrintPreview.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-xs italic text-muted-foreground">
                {amountToWords(chequePrintPreview.amount)}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Cheque #{chequePrintPreview.chequeNumber}</span>
                <span>{chequePrintPreview.crossingType.replace(/_/g, ' ').toUpperCase()}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setChequePrintPreview(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── NACH Mandate Dialog ─── */}
      <Dialog open={nachOpen} onOpenChange={(open) => { if (!open) setNachOpen(false); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add NACH/ECS Mandate</DialogTitle>
            <DialogDescription>Register a standing debit instruction.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-keyboard-form>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Mandate Reference <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., HDFC/NACH/2025/00123" value={nachForm.mandateRef} onKeyDown={onEnterNext}
                onChange={(e) => setNachForm(f => ({ ...f, mandateRef: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Beneficiary <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., HDFC Home Loans Ltd" value={nachForm.beneficiary} onKeyDown={onEnterNext}
                onChange={(e) => setNachForm(f => ({ ...f, beneficiary: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Amount (₹, 0 = variable)</Label>
              <Input {...amountInputProps} value={nachForm.amount || ''} placeholder="0" onKeyDown={onEnterNext}
                onChange={(e) => setNachForm(f => ({ ...f, amount: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))} />
            </div>
            {nachForm.amount === 0 && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label className="text-xs">Min Amount</Label>
                  <Input {...amountInputProps} value={nachForm.amountMin || ''} className="h-8 text-xs" onKeyDown={onEnterNext}
                    onChange={(e) => setNachForm(f => ({ ...f, amountMin: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Max Amount</Label>
                  <Input {...amountInputProps} value={nachForm.amountMax || ''} className="h-8 text-xs" onKeyDown={onEnterNext}
                    onChange={(e) => setNachForm(f => ({ ...f, amountMax: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))} /></div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Frequency</Label>
              <Select value={nachForm.frequency} onValueChange={(v: any) => setNachForm(f => ({ ...f, frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="adhoc">Ad-hoc</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Debit Day (1–31)</Label>
              <Input {...amountInputProps} value={nachForm.debitDay} onKeyDown={onEnterNext}
                onChange={(e) => setNachForm(f => ({ ...f, debitDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Start Date</Label>
                <SmartDateInput value={nachForm.startDate} onChange={(v) => setNachForm(f => ({ ...f, startDate: v }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Date (optional)</Label>
                <SmartDateInput value={nachForm.endDate} onChange={(v) => setNachForm(f => ({ ...f, endDate: v }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Notes</Label>
              <Input placeholder="Optional notes" value={nachForm.notes} onKeyDown={onEnterNext}
                onChange={(e) => setNachForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNachOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleNachSave}>Add Mandate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Wrapped Export ───────────────────────────────────────────────────

export default function LedgerMaster() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <div className="flex-1 flex flex-col">
          <ERPHeader />
          <main className="flex-1 p-6 overflow-y-auto">
            <LedgerMasterPanel />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
