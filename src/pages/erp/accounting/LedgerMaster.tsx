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
  Building, Scale, ArrowUpRight, ArrowDownLeft,
  Calendar, ChevronDown, ChevronUp, DollarSign, Percent, Hash, Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { loadEntities } from '@/data/mock-entities';
import {
  L3_FINANCIAL_GROUPS, L4_INDUSTRY_PACKS,
  deriveL3NumericCode, deriveLedgerNumericCode, L3_NUMERIC_MAP,
} from '@/data/finframe-seed-data';
import { HSN_CODES, SAC_CODES, type HSNSACCode } from '@/data/hsn-sac-seed-data';
import { TDS_SECTIONS, type TDSSection } from '@/data/compliance-seed-data';
import { onEnterNext, useCtrlS, amountInputProps } from '@/lib/keyboard';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { CustomerMasterPanel } from '@/pages/erp/masters/CustomerMaster';
import { VendorMasterPanel } from '@/pages/erp/masters/VendorMaster';
import { LogisticMasterPanel } from '@/pages/erp/masters/LogisticMaster';
import { ModeOfPaymentMasterPanel } from '@/pages/erp/masters/supporting/ModeOfPaymentMaster';
import { TermsOfPaymentMasterPanel } from '@/pages/erp/masters/supporting/TermsOfPaymentMaster';
import { TermsOfDeliveryMasterPanel } from '@/pages/erp/masters/supporting/TermsOfDeliveryMaster';

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

// ─── 6 New Ledger Type Interfaces ─────────────────────────────────

interface LiabilityLedgerDefinition {
  id: string;
  ledgerType: 'liability';
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
  status: 'active' | 'inactive';
}

type CapitalType =
  | 'share_capital_equity' | 'share_capital_preference'
  | 'partners_capital' | 'proprietor_capital'
  | 'general_reserve' | 'retained_earnings' | 'other_reserve';

interface CapitalLedgerDefinition {
  id: string;
  ledgerType: 'capital';
  name: string; mailingName: string; numericCode: string; code: string; alias: string;
  parentGroupCode: string; parentGroupName: string;
  entityId: string | null; entityShortCode: string | null;
  openingBalance: number; openingBalanceType: 'Dr' | 'Cr';
  capitalType: CapitalType;
  authorisedCapital: number; issuedCapital: number; paidUpCapital: number;
  faceValuePerShare: number; numberOfShares: number;
  partnerName: string; partnerPAN: string;
  profitSharingRatio: number; capitalContribution: number;
  proprietorName: string; proprietorPAN: string;
  status: 'active' | 'inactive';
}

interface LoanReceivableLedgerDefinition {
  id: string;
  ledgerType: 'loan_receivable';
  name: string; mailingName: string; numericCode: string; code: string; alias: string;
  parentGroupCode: string; parentGroupName: string;
  entityId: string | null; entityShortCode: string | null;
  openingBalance: number; openingBalanceType: 'Dr' | 'Cr';
  borrowerName: string; borrowerPhone: string; borrowerEmail: string;
  borrowerAddress: string; borrowerState: string; borrowerPincode: string;
  borrowerPAN: string;
  loanAmount: number; interestRate: number;
  interestType: 'simple' | 'compound';
  tenureMonths: number;
  disbursementDate: string; firstRepaymentDate: string;
  collateral: string; purpose: string;
  isTdsApplicable: boolean;
  tdsSection: string;
  status: 'active' | 'inactive';
}

interface BorrowingLedgerDefinition {
  id: string;
  ledgerType: 'borrowing';
  name: string; mailingName: string; numericCode: string; code: string; alias: string;
  parentGroupCode: string; parentGroupName: string;
  entityId: string | null; entityShortCode: string | null;
  openingBalance: number; openingBalanceType: 'Dr' | 'Cr';
  lenderName: string;
  lenderType: 'bank' | 'nbfc' | 'director' | 'group_company' | 'individual' | 'other';
  lenderPhone: string; lenderEmail: string; lenderAddress: string;
  loanAmount: number; interestRate: number;
  loanType: 'term_loan' | 'od' | 'cc' | 'demand_loan' | 'vehicle_loan';
  tenureMonths: number; firstEmiDate: string;
  loanAccountNo: string; collateralPledged: string;
  emiAmount: number;
  repaymentScheduleGenerated: boolean;
  status: 'active' | 'inactive';
}

interface IncomeLedgerDefinition {
  id: string;
  ledgerType: 'income';
  name: string; mailingName: string; numericCode: string; code: string; alias: string;
  parentGroupCode: string; parentGroupName: string;
  entityId: string | null; entityShortCode: string | null;
  openingBalance: number; openingBalanceType: 'Dr' | 'Cr';
  isGstApplicable: boolean;
  hsnSacCode: string; hsnSacType: 'hsn' | 'sac' | '';
  gstRate: number; cgstRate: number; sgstRate: number; igstRate: number; cessRate: number;
  gstType: 'taxable' | 'exempt' | 'nil_rated' | 'non_gst' | 'zero_rated';
  includeInGstTurnover: boolean;
  isTdsApplicable: boolean;
  tdsSection: string;
  costCentreApplicable: boolean;
  status: 'active' | 'inactive';
}

interface ExpenseLedgerDefinition {
  id: string;
  ledgerType: 'expense';
  name: string; mailingName: string; numericCode: string; code: string; alias: string;
  parentGroupCode: string; parentGroupName: string;
  entityId: string | null; entityShortCode: string | null;
  openingBalance: number; openingBalanceType: 'Dr' | 'Cr';
  isGstApplicable: boolean;
  hsnSacCode: string; hsnSacType: 'hsn' | 'sac' | '';
  gstRate: number; cgstRate: number; sgstRate: number; igstRate: number; cessRate: number;
  gstType: 'taxable' | 'exempt' | 'nil_rated' | 'non_gst' | 'zero_rated';
  isItcEligible: boolean;
  isRcmApplicable: boolean;
  rcmSection: 'section_9_3' | 'section_9_4' | null;
  isTdsApplicable: boolean;
  tdsSection: string;
  usePurchaseAdditionalExpense: boolean;
  costCentreApplicable: boolean;
  isBudgetHead: boolean;
  expenseNature: 'revenue' | 'capital_expense';
  status: 'active' | 'inactive';
}

// ─── Duties & Tax + Payroll Statutory Types ───────────────────────────

type TaxType = 'gst' | 'tds' | 'tcs' | 'other';
type GstSubType = 'cgst' | 'sgst' | 'igst' | 'cess' | null;
type CalcBasis = 'item_rate' | 'ledger_value' | null;

interface DutiesTaxLedgerDefinition {
  id: string;
  ledgerType: 'duties_tax';
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
  status: 'active' | 'inactive';
  taxType: TaxType;
  gstSubType: GstSubType;
  calculationBasis: CalcBasis;
  rate: number;
}

type PayrollCategory = 'employee_deduction' | 'employer_contribution';

type PayrollComponent =
  | 'pf_employee' | 'esi_employee' | 'pt_employee' | 'tds_salary'
  | 'pf_employer_epf' | 'pf_employer_eps' | 'pf_edli'
  | 'esi_employer' | 'lwf_employer' | 'gratuity_provision';

interface PayrollStatutoryLedgerDefinition {
  id: string;
  ledgerType: 'payroll_statutory';
  name: string;
  mailingName: string;
  numericCode: string;
  code: string;
  alias: string;
  parentGroupCode: 'EMPL';
  parentGroupName: string;
  entityId: string | null;
  entityShortCode: string | null;
  openingBalance: number;
  openingBalanceType: 'Cr';
  status: 'active' | 'inactive';
  payrollCategory: PayrollCategory;
  payrollComponent: PayrollComponent;
  statutoryRate: number;
  calculationBase: string;
  wageCeiling: number | null;
  maxAmount: number | null;
}

interface LoanRepaymentRecord {
  id: string;
  borrowingLedgerDefinitionId: string;
  entityId: string;
  month: number;
  openingBalance: number;
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
  closingBalance: number;
  dueDate: string;
  paidDate: string | null;
  paidAmount: number;
  status: 'pending' | 'paid' | 'overdue' | 'partially_paid' | 'skipped';
  paymentReference: string;
  narration: string;
}

// ─── Types (Two-Table Architecture) ───────────────────────────────────

interface CashLedgerDefinition {
  id: string;
  ledgerType: 'cash';
  name: string;
  numericCode: string;
  code: string;
  alias: string;
  mailingName: string;
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
  mailingName: string;
  acHolderName: string;
  bankPhone: string;
  neftEnabled: boolean;
  rtgsEnabled: boolean;
  impsEnabled: boolean;
  upiEnabled: boolean;
  bankManagerName: string;
  bankManagerPhone: string;
  bankManagerEmail: string;
}

type AnyLedgerDefinition =
  | CashLedgerDefinition
  | BankLedgerDefinition
  | LiabilityLedgerDefinition
  | CapitalLedgerDefinition
  | LoanReceivableLedgerDefinition
  | BorrowingLedgerDefinition
  | IncomeLedgerDefinition
  | ExpenseLedgerDefinition
  | DutiesTaxLedgerDefinition
  | PayrollStatutoryLedgerDefinition;

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
  current: 'Current', savings: 'Savings', fixed_deposit: 'Fixed Deposit',
  eefc: 'EEFC', cash_credit: 'Cash Credit', overdraft: 'Overdraft',
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
  available: 'Available', issued: 'Issued', post_dated: 'Post-Dated',
  presented: 'Presented', cleared: 'Cleared', bounced: 'Bounced',
  stale: 'Stale', stop_payment: 'Stop Payment', cancelled: 'Cancelled',
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

const CAPITAL_TYPE_LABELS: Record<CapitalType, string> = {
  share_capital_equity: 'Equity Share Capital',
  share_capital_preference: 'Preference Share Capital',
  partners_capital: "Partner's Capital",
  proprietor_capital: "Proprietor's Capital",
  general_reserve: 'General Reserve',
  retained_earnings: 'Retained Earnings',
  other_reserve: 'Other Reserve',
};

const LENDER_TYPE_LABELS: Record<BorrowingLedgerDefinition['lenderType'], string> = {
  bank: 'Bank', nbfc: 'NBFC', director: 'Director',
  group_company: 'Group Company', individual: 'Individual', other: 'Other',
};

const LOAN_TYPE_LABELS: Record<BorrowingLedgerDefinition['loanType'], string> = {
  term_loan: 'Term Loan', od: 'Overdraft', cc: 'Cash Credit',
  demand_loan: 'Demand Loan', vehicle_loan: 'Vehicle Loan',
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
    if (n < 10000000) {
      const lakhs = Math.floor(n / 100000);
      return toWords(lakhs) + (lakhs === 1 ? 'Lakh ' : 'Lakhs ') + toWords(n % 100000);
    }
    const crores = Math.floor(n / 10000000);
    return toWords(crores) + (crores === 1 ? 'Crore ' : 'Crores ') + toWords(n % 10000000);
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
    mailingName: d.mailingName ?? '',
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
    acHolderName: d.acHolderName ?? '',
    bankPhone: d.bankPhone ?? '',
    neftEnabled: d.neftEnabled ?? true,
    rtgsEnabled: d.rtgsEnabled ?? true,
    impsEnabled: d.impsEnabled ?? true,
    upiEnabled: d.upiEnabled ?? true,
    bankManagerName: d.bankManagerName ?? '',
    bankManagerPhone: d.bankManagerPhone ?? '',
    bankManagerEmail: d.bankManagerEmail ?? '',
    // New ledger type compat
    hsnSacCode: d.hsnSacCode ?? '',
    hsnSacType: d.hsnSacType ?? '',
    gstRate: d.gstRate ?? 0, cgstRate: d.cgstRate ?? 0,
    sgstRate: d.sgstRate ?? 0, igstRate: d.igstRate ?? 0, cessRate: d.cessRate ?? 0,
    gstType: d.gstType ?? 'taxable',
    isGstApplicable: d.isGstApplicable ?? false,
    isItcEligible: d.isItcEligible ?? true,
    isRcmApplicable: d.isRcmApplicable ?? false,
    rcmSection: d.rcmSection ?? null,
    isTdsApplicable: d.isTdsApplicable ?? false,
    tdsSection: d.tdsSection ?? '',
    capitalType: d.capitalType ?? 'general_reserve',
    borrowerName: d.borrowerName ?? '', lenderName: d.lenderName ?? '',
    loanAmount: d.loanAmount ?? 0, interestRate: d.interestRate ?? 0,
    tenureMonths: d.tenureMonths ?? 0, emiAmount: d.emiAmount ?? 0,
    repaymentScheduleGenerated: d.repaymentScheduleGenerated ?? false,
    usePurchaseAdditionalExpense: d.usePurchaseAdditionalExpense ?? false,
    isBudgetHead: d.isBudgetHead ?? false,
    expenseNature: d.expenseNature ?? 'revenue',
    authorisedCapital: d.authorisedCapital ?? 0, issuedCapital: d.issuedCapital ?? 0,
    paidUpCapital: d.paidUpCapital ?? 0, faceValuePerShare: d.faceValuePerShare ?? 10,
    numberOfShares: d.numberOfShares ?? 0,
    partnerName: d.partnerName ?? '', partnerPAN: d.partnerPAN ?? '',
    profitSharingRatio: d.profitSharingRatio ?? 0, capitalContribution: d.capitalContribution ?? 0,
    proprietorName: d.proprietorName ?? '', proprietorPAN: d.proprietorPAN ?? '',
    includeInGstTurnover: d.includeInGstTurnover ?? true,
    costCentreApplicable: d.costCentreApplicable ?? false,
    lenderType: d.lenderType ?? 'bank', loanType: d.loanType ?? 'term_loan',
    firstEmiDate: d.firstEmiDate ?? '', loanAccountNo: d.loanAccountNo ?? '',
    collateralPledged: d.collateralPledged ?? '',
    // Duties & Tax compat
    taxType: d.taxType ?? 'other',
    gstSubType: d.gstSubType ?? null,
    calculationBasis: d.calculationBasis ?? null,
    rate: d.rate ?? 0,
    // Payroll Statutory compat
    payrollCategory: d.payrollCategory ?? 'employee_deduction',
    payrollComponent: d.payrollComponent ?? 'pf_employee',
    statutoryRate: d.statutoryRate ?? 0,
    calculationBase: d.calculationBase ?? '',
    wageCeiling: d.wageCeiling ?? null,
    maxAmount: d.maxAmount ?? null,
  }));
};

const loadCashDefs = (): CashLedgerDefinition[] =>
  loadAllDefinitions().filter(d => d.ledgerType === 'cash') as CashLedgerDefinition[];

const loadBankDefs = (): BankLedgerDefinition[] =>
  loadAllDefinitions().filter(d => d.ledgerType === 'bank') as BankLedgerDefinition[];

const loadLiabilityDefs = (): LiabilityLedgerDefinition[] =>
  loadAllDefinitions().filter(d => d.ledgerType === 'liability') as LiabilityLedgerDefinition[];
const loadCapitalDefs = (): CapitalLedgerDefinition[] =>
  loadAllDefinitions().filter(d => d.ledgerType === 'capital') as CapitalLedgerDefinition[];
const loadLoanRecDefs = (): LoanReceivableLedgerDefinition[] =>
  loadAllDefinitions().filter(d => d.ledgerType === 'loan_receivable') as LoanReceivableLedgerDefinition[];
const loadBorrowingDefs = (): BorrowingLedgerDefinition[] =>
  loadAllDefinitions().filter(d => d.ledgerType === 'borrowing') as BorrowingLedgerDefinition[];
const loadIncomeDefs = (): IncomeLedgerDefinition[] =>
  loadAllDefinitions().filter(d => d.ledgerType === 'income') as IncomeLedgerDefinition[];
const loadExpenseDefs = (): ExpenseLedgerDefinition[] =>
  loadAllDefinitions().filter(d => d.ledgerType === 'expense') as ExpenseLedgerDefinition[];

const saveDefinition = (def: AnyLedgerDefinition) => {
  const raw = localStorage.getItem('erp_group_ledger_definitions');
  const all: AnyLedgerDefinition[] = raw ? JSON.parse(raw).map((d: any) => ({ ...d, ledgerType: d.ledgerType ?? 'cash' })) : [];
  const idx = all.findIndex(d => d.id === def.id);
  if (idx >= 0) all[idx] = def; else all.push(def);
  localStorage.setItem('erp_group_ledger_definitions', JSON.stringify(all));
  // [JWT] POST/PUT /api/group/finecore/ledger-definitions
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
  // [JWT] POST/PUT /api/entity/${inst.entityId}/finecore/ledger-instances
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
  // [JWT] POST /api/entity/${record.entityId}/finecore/custodian-history
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
  // [JWT] POST/PUT /api/entity/${book.entityId}/finecore/cheque-books
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
  // [JWT] POST/PUT /api/entity/${rec.entityId}/finecore/cheque-records
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
  // [JWT] POST/PUT /api/entity/${m.entityId}/finecore/nach-mandates
};

// ── Loan Schedule helpers ─────────────────────────────────────────
const saveLoanSchedule = (records: LoanRepaymentRecord[]): void => {
  if (!records.length) return;
  const { borrowingLedgerDefinitionId: defId, entityId } = records[0];
  const key = `erp_entity_${entityId}_loan_schedule_${defId}`;
  localStorage.setItem(key, JSON.stringify(records));
  // [JWT] POST /api/entity/${entityId}/finecore/loan-schedule
};
const loadLoanSchedule = (entityId: string, defId: string): LoanRepaymentRecord[] => {
  try {
    const r = localStorage.getItem(`erp_entity_${entityId}_loan_schedule_${defId}`);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
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

// ── 6 new alpha code generators ──
const genLiabilityCode = (all: AnyLedgerDefinition[]) =>
  'LBL-' + String(all.filter(d => d.ledgerType === 'liability').length + 1).padStart(6, '0');
const genCapitalCode = (all: AnyLedgerDefinition[]) =>
  'CAP-' + String(all.filter(d => d.ledgerType === 'capital').length + 1).padStart(6, '0');
const genLoanRecCode = (all: AnyLedgerDefinition[]) =>
  'LRC-' + String(all.filter(d => d.ledgerType === 'loan_receivable').length + 1).padStart(6, '0');
const genBorrowingCode = (all: AnyLedgerDefinition[]) =>
  'BRW-' + String(all.filter(d => d.ledgerType === 'borrowing').length + 1).padStart(6, '0');
const genIncomeCode = (all: AnyLedgerDefinition[]) =>
  'INC-' + String(all.filter(d => d.ledgerType === 'income').length + 1).padStart(6, '0');
const genExpenseCode = (all: AnyLedgerDefinition[]) =>
  'EXP-' + String(all.filter(d => d.ledgerType === 'expense').length + 1).padStart(6, '0');
const genDutiesTaxCode = (all: AnyLedgerDefinition[]) =>
  'DTX-' + String(all.filter(d => d.ledgerType === 'duties_tax').length + 1).padStart(6, '0');
const genPayrollStatCode = (all: AnyLedgerDefinition[]) =>
  'PAY-' + String(all.filter(d => d.ledgerType === 'payroll_statutory').length + 1).padStart(6, '0');

// ─── Auto-Create Instances (Group Level Save) ─────────────────────────

const autoCreateInstances = (
  def: AnyLedgerDefinition,
  openingBalance: number,
  openingBalanceType: 'Dr' | 'Cr' = 'Dr',
) => {
  const allEntities = loadEntities();
  allEntities.forEach((entity, idx) => {
    const existingInstances = JSON.parse(
      localStorage.getItem(`erp_entity_${entity.id}_ledger_instances`) || '[]'
    ) as { ledgerDefinitionId: string }[];
    if (existingInstances.find(i => i.ledgerDefinitionId === def.id)) return;
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
      displayNumericCode: `${entity.shortCode}/${(def as any).numericCode || def.code}`,
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
  { label: 'Liability', icon: CreditCard, row: 'Balance Sheet', active: true },
  { label: 'Capital/Equity', icon: PiggyBank, row: 'Balance Sheet', active: true },
  { label: 'Loan Receivable', icon: HandCoins, row: 'Balance Sheet', active: true },
  { label: 'Borrowing', icon: Banknote, row: 'Balance Sheet', active: true },
  { label: 'Income', icon: TrendingUp, row: 'P&L', active: true },
  { label: 'Expense', icon: TrendingDown, row: 'P&L', active: true },
  { label: 'Duties & Taxes', icon: Receipt, row: 'P&L', active: true },
  { label: 'Payroll Statutory', icon: Users, row: 'P&L', active: true },
  { label: 'Customer', icon: Users, row: 'Party Masters', active: true },
  { label: 'Vendor', icon: Users, row: 'Party Masters', active: true },
  { label: 'Logistic', icon: Truck, row: 'Party Masters', active: true },
  { label: 'Branch & Division', icon: GitBranch, row: 'Party Masters', active: false },
  { label: 'Mode of Payment', icon: FileText, row: 'Transaction Defaults', active: true },
  { label: 'Terms of Payment', icon: FileText, row: 'Transaction Defaults', active: true },
  { label: 'Terms of Delivery', icon: FileText, row: 'Transaction Defaults', active: true },
];

// ─── Default Forms ────────────────────────────────────────────────────

const defaultBankForm = {
  parentGroupCode: 'BANK',
  parentGroupName: 'Bank Balances',
  name: '', alias: '', bankName: '', bankNameOther: '',
  accountNumber: '', ifscCode: '',
  accountType: '' as BankAccountType | '',
  currency: 'INR' as 'INR'|'USD'|'EUR'|'GBP'|'AED',
  odLimit: 0, openingBalance: 0,
  openingBalanceType: 'Dr' as 'Dr' | 'Cr',
  scope: 'group' as 'group' | 'entity', entityId: '',
  branchName: '', branchAddress: '', branchCity: '', branchState: '', branchPincode: '',
  micrCode: '', swiftCode: '', ifscAutoFilled: false,
  bankGstin: '', bankStateCode: '', gstOnCharges: true,
  chequeFormat: 'GENERIC_CTS' as 'HDFC_CTS'|'SBI_CTS'|'ICICI_CTS'|'AXIS_CTS'|'GENERIC_CTS'|'CUSTOM',
  chequeSize: 'A4' as 'A4'|'LEAF',
  defaultCrossing: 'account_payee' as 'account_payee'|'not_negotiable'|'none',
  brsEnabled: true, clearingDays: 2, cutoffTime: '14:30',
  mailingName: '', acHolderName: '',
  bankPhone: '', neftEnabled: true, rtgsEnabled: true, impsEnabled: true, upiEnabled: true,
  bankManagerName: '', bankManagerPhone: '', bankManagerEmail: '',
};

const defaultLoanRecForm = {
  parentGroupCode: 'LTLA', parentGroupName: 'Long-Term Loans & Advances',
  name: '', mailingName: '', alias: '', borrowerName: '',
  borrowerPhone: '', borrowerEmail: '', borrowerAddress: '',
  borrowerState: '', borrowerPincode: '', borrowerPAN: '',
  loanAmount: 0, interestRate: 0, interestType: 'simple' as 'simple'|'compound',
  tenureMonths: 0, disbursementDate: '', firstRepaymentDate: '',
  collateral: '', purpose: '', isTdsApplicable: false, tdsSection: '194A',
  scope: 'group' as 'group'|'entity', entityId: '',
};

const defaultBorrowingForm = {
  parentGroupCode: 'LTBOR', parentGroupName: 'Long-Term Borrowings',
  name: '', mailingName: '', alias: '', lenderName: '',
  lenderType: 'bank' as BorrowingLedgerDefinition['lenderType'],
  lenderPhone: '', lenderEmail: '', lenderAddress: '',
  loanAmount: 0, interestRate: 0,
  loanType: 'term_loan' as BorrowingLedgerDefinition['loanType'],
  tenureMonths: 0, firstEmiDate: '', loanAccountNo: '', collateralPledged: '',
  scope: 'group' as 'group'|'entity', entityId: '',
};

const defaultIncomeForm = {
  parentGroupCode: 'SERV', parentGroupName: 'Revenue from Services',
  name: '', mailingName: '', alias: '',
  isGstApplicable: false, hsnSacCode: '', hsnSacType: '' as 'hsn'|'sac'|'',
  gstRate: 0, cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: 0,
  gstType: 'taxable' as IncomeLedgerDefinition['gstType'],
  includeInGstTurnover: true,
  isTdsApplicable: false, tdsSection: '',
  costCentreApplicable: false,
  scope: 'group' as 'group'|'entity', entityId: '',
};

const defaultExpenseForm = {
  parentGroupCode: 'ADMIN', parentGroupName: 'Administrative Expenses',
  name: '', mailingName: '', alias: '',
  isGstApplicable: false, hsnSacCode: '', hsnSacType: '' as 'hsn'|'sac'|'',
  gstRate: 0, cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: 0,
  gstType: 'taxable' as ExpenseLedgerDefinition['gstType'],
  isItcEligible: true, isRcmApplicable: false, rcmSection: null as 'section_9_3'|'section_9_4'|null,
  isTdsApplicable: false, tdsSection: '',
  usePurchaseAdditionalExpense: false,
  costCentreApplicable: false, isBudgetHead: false,
  expenseNature: 'revenue' as 'revenue'|'capital_expense',
  scope: 'group' as 'group'|'entity', entityId: '',
};

// ─── HSNSACCombobox (inline) ──────────────────────────────────────────

function HSNSACCombobox({
  value, onSelect, codeType = 'both', disabled = false
}: {
  value: string;
  onSelect: (code: HSNSACCode) => void;
  codeType?: 'hsn' | 'sac' | 'both';
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const allCodes = codeType === 'hsn' ? HSN_CODES
    : codeType === 'sac' ? SAC_CODES
    : [...HSN_CODES, ...SAC_CODES];
  const filtered = allCodes.filter(c =>
    `${c.code} ${c.description}`.toLowerCase().includes(q.toLowerCase())).slice(0, 50);
  return (
    <div className="relative">
      <Input placeholder="Search HSN/SAC code..." value={q || value}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="pr-8" disabled={disabled}
        onKeyDown={onEnterNext} />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg">
          {filtered.map(c => (
            <button key={c.code} type="button" className="w-full text-left px-3 py-2 text-xs hover:bg-accent flex items-center justify-between"
              onClick={() => { onSelect(c); setOpen(false); setQ(''); }}>
              <span><span className="font-mono font-medium">{c.code}</span> <span className="text-muted-foreground ml-1">{c.description}</span></span>
              <Badge variant="outline" className="text-[9px] ml-2">{c.igstRate}%</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────

export function LedgerMasterPanel() {
  const [entities] = useState(() => loadEntities());
  const [cashDefs, setCashDefs] = useState<CashLedgerDefinition[]>(() => loadCashDefs());
  const [bankDefs, setBankDefs] = useState<BankLedgerDefinition[]>(() => loadBankDefs());
  const [liabilityDefs, setLiabilityDefs] = useState<LiabilityLedgerDefinition[]>(() => loadLiabilityDefs());
  const [capitalDefs, setCapitalDefs] = useState<CapitalLedgerDefinition[]>(() => loadCapitalDefs());
  const [loanRecDefs, setLoanRecDefs] = useState<LoanReceivableLedgerDefinition[]>(() => loadLoanRecDefs());
  const [borrowingDefs, setBorrowingDefs] = useState<BorrowingLedgerDefinition[]>(() => loadBorrowingDefs());
  const [incomeDefs, setIncomeDefs] = useState<IncomeLedgerDefinition[]>(() => loadIncomeDefs());
  const [expenseDefs, setExpenseDefs] = useState<ExpenseLedgerDefinition[]>(() => loadExpenseDefs());
  const [activeTab, setActiveTab] = useState<'definitions' | 'opening_balances'>('definitions');
  const [defSubTab, setDefSubTab] = useState<'cash'|'bank'|'capital'|'loans'|'income'|'expenses'|'liabilities'|'duties_tax'|'payroll'|'customer'|'vendor'|'logistic'|'branch_division'|'mode_payment'|'terms_payment'|'terms_delivery'>('cash');
  const [selEntityId, setSelEntityId] = useState(() => loadEntities()[0]?.id ?? '');
  const [instances, setInstances] = useState<EntityLedgerInstance[]>(
    () => loadInstances(loadEntities()[0]?.id ?? '')
  );

  // Cash dialog state
  const [cashCreateOpen, setCashCreateOpen] = useState(false);
  const [cashEditTarget, setCashEditTarget] = useState<CashLedgerDefinition | null>(null);
  const defaultCashForm = {
    parentGroupCode: 'CASH', parentGroupName: 'Cash & Cash Equivalents',
    name: '', alias: '', openingBalance: 0,
    scope: 'group' as 'group' | 'entity', entityId: '',
    location: '', cashLimit: 0, alertThreshold: 0, isMainCash: false,
    voucherSeries: 'CR', openingBalanceType: 'Dr' as 'Dr' | 'Cr', mailingName: '',
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
  const [chequeBookForm, setChequeBookForm] = useState({ bookReference: '', fromLeaf: 0, toLeaf: 0, issuedDate: '', entityId: '', defId: '' });
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
    name: '', designation: '', phone: '', handoverBy: '', cashBalanceAtHandover: 0, notes: '',
  });

  // New ledger dialog states
  const [liabilityOpen, setLiabilityOpen] = useState(false);
  const [capitalOpen, setCapitalOpen] = useState(false);
  const [loanRecOpen, setLoanRecOpen] = useState(false);
  const [borrowingOpen, setBorrowingOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [dutiesTaxOpen, setDutiesTaxOpen] = useState(false);
  const [payrollStatOpen, setPayrollStatOpen] = useState(false);

  // New ledger form states
  const [liabilityForm, setLiabilityForm] = useState({
    parentGroupCode: 'LTPROV', parentGroupName: 'Long-Term Provisions',
    name: '', mailingName: '', alias: '',
    openingBalance: 0, openingBalanceType: 'Cr' as 'Dr'|'Cr',
    scope: 'group' as 'group'|'entity', entityId: '',
  });
  const [capitalForm, setCapitalForm] = useState({
    parentGroupCode: 'RSRV', parentGroupName: 'Reserves & Surplus',
    name: '', mailingName: '', alias: '',
    openingBalance: 0, openingBalanceType: 'Cr' as 'Dr'|'Cr',
    capitalType: 'general_reserve' as CapitalType,
    authorisedCapital: 0, issuedCapital: 0, paidUpCapital: 0,
    faceValuePerShare: 10, numberOfShares: 0,
    partnerName: '', partnerPAN: '', profitSharingRatio: 0, capitalContribution: 0,
    proprietorName: '', proprietorPAN: '',
    scope: 'group' as 'group'|'entity', entityId: '',
  });
  const [loanRecForm, setLoanRecForm] = useState(defaultLoanRecForm);
  const [borrowingForm, setBorrowingForm] = useState(defaultBorrowingForm);
  const [incomeForm, setIncomeForm] = useState(defaultIncomeForm);
  const [expenseForm, setExpenseForm] = useState(defaultExpenseForm);

  // Duties & Tax + Payroll Statutory
  const [dutiesTaxDefs, setDutiesTaxDefs] = useState<DutiesTaxLedgerDefinition[]>(
    () => loadAllDefinitions().filter(d => d.ledgerType === 'duties_tax') as DutiesTaxLedgerDefinition[]
  );
  const [payrollStatDefs, setPayrollStatDefs] = useState<PayrollStatutoryLedgerDefinition[]>(
    () => loadAllDefinitions().filter(d => d.ledgerType === 'payroll_statutory') as PayrollStatutoryLedgerDefinition[]
  );

  const defaultDutiesTaxForm = {
    taxType: '' as TaxType | '',
    gstSubType: null as GstSubType,
    name: '', mailingName: '', alias: '',
    parentGroupCode: 'GSTP', parentGroupName: 'GST Payable',
    calculationBasis: null as CalcBasis,
    rate: 0,
    openingBalance: 0, openingBalanceType: 'Cr' as 'Dr'|'Cr',
    scope: 'group' as 'group'|'entity', entityId: '',
  };
  const [dutiesTaxForm, setDutiesTaxForm] = useState(defaultDutiesTaxForm);

  const defaultPayrollForm = {
    payrollCategory: '' as PayrollCategory | '',
    payrollComponent: '' as PayrollComponent | '',
    name: '', mailingName: '', alias: '',
    openingBalance: 0,
    scope: 'group' as 'group'|'entity', entityId: '',
  };
  const [payrollForm, setPayrollForm] = useState(defaultPayrollForm);

  const PAYROLL_COMPONENT_DEFAULTS: Record<PayrollComponent, { name: string; category: PayrollCategory; statutoryRate: number; calculationBase: string; wageCeiling: number | null; maxAmount: number | null }> = {
    pf_employee: { name: 'PF Employee Deduction', category: 'employee_deduction', statutoryRate: 12, calculationBase: 'basic_da', wageCeiling: 15000, maxAmount: null },
    esi_employee: { name: 'ESI Employee Deduction', category: 'employee_deduction', statutoryRate: 0.75, calculationBase: 'gross', wageCeiling: 21000, maxAmount: null },
    pt_employee: { name: 'PT Employee Deduction', category: 'employee_deduction', statutoryRate: 0, calculationBase: 'state_slab', wageCeiling: null, maxAmount: null },
    tds_salary: { name: 'TDS on Salary', category: 'employee_deduction', statutoryRate: 0, calculationBase: 'slab', wageCeiling: null, maxAmount: null },
    pf_employer_epf: { name: 'PF Employer — EPF', category: 'employer_contribution', statutoryRate: 3.67, calculationBase: 'basic_da', wageCeiling: 15000, maxAmount: null },
    pf_employer_eps: { name: 'PF Employer — EPS', category: 'employer_contribution', statutoryRate: 8.33, calculationBase: 'basic_da', wageCeiling: 15000, maxAmount: 1250 },
    pf_edli: { name: 'EDLI Contribution', category: 'employer_contribution', statutoryRate: 0.50, calculationBase: 'basic_da', wageCeiling: 15000, maxAmount: null },
    esi_employer: { name: 'ESI Employer Contribution', category: 'employer_contribution', statutoryRate: 3.25, calculationBase: 'gross', wageCeiling: 21000, maxAmount: null },
    lwf_employer: { name: 'LWF Employer Contribution', category: 'employer_contribution', statutoryRate: 0, calculationBase: 'state_specific', wageCeiling: null, maxAmount: null },
    gratuity_provision: { name: 'Gratuity Provision', category: 'employer_contribution', statutoryRate: 0, calculationBase: '15/26 x basic x years', wageCeiling: null, maxAmount: 2000000 },
  };

  const getDutiesTaxDefaults = (taxType: TaxType, gstSubType: GstSubType) => {
    if (taxType === 'gst') {
      const names: Record<string, string> = { cgst: 'CGST', sgst: 'SGST', igst: 'IGST', cess: 'GST Cess' };
      return { name: names[gstSubType ?? ''] ?? 'CGST', parentGroupCode: 'GSTP', parentGroupName: 'GST Payable', openingBalanceType: 'Cr' as const };
    }
    if (taxType === 'tds') return { name: 'TDS Payable', parentGroupCode: 'TDSP', parentGroupName: 'TDS Payable', openingBalanceType: 'Cr' as const };
    if (taxType === 'tcs') return { name: 'TCS Payable', parentGroupCode: 'DUTYP', parentGroupName: 'Duties & Taxes Payable', openingBalanceType: 'Cr' as const };
    return { name: '', parentGroupCode: 'DUTYP', parentGroupName: 'Duties & Taxes Payable', openingBalanceType: 'Cr' as const };
  };


  const [activeScheduleDefId, setActiveScheduleDefId] = useState<string | null>(null);
  const [loanSchedule, setLoanSchedule] = useState<LoanRepaymentRecord[]>([]);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [markPaidTarget, setMarkPaidTarget] = useState<LoanRepaymentRecord | null>(null);
  const [markPaidForm, setMarkPaidForm] = useState({ paidAmount: 0, paidDate: '', paymentReference: '', narration: '' });

  // HSN search
  const [hsnSearch, setHsnSearch] = useState('');

  // Reload instances when entity changes
  useEffect(() => {
    setInstances(loadInstances(selEntityId));
  }, [selEntityId]);

  const refreshAll = () => {
    setCashDefs(loadCashDefs());
    setBankDefs(loadBankDefs());
    setLiabilityDefs(loadLiabilityDefs());
    setCapitalDefs(loadCapitalDefs());
    setLoanRecDefs(loadLoanRecDefs());
    setBorrowingDefs(loadBorrowingDefs());
    setIncomeDefs(loadIncomeDefs());
    setExpenseDefs(loadExpenseDefs());
    setDutiesTaxDefs(loadAllDefinitions().filter(d => d.ledgerType === 'duties_tax') as DutiesTaxLedgerDefinition[]);
    setPayrollStatDefs(loadAllDefinitions().filter(d => d.ledgerType === 'payroll_statutory') as PayrollStatutoryLedgerDefinition[]);
    setInstances(loadInstances(selEntityId));
  };

  // EMI calculator
  const calculateEMI = (principal: number, annualRate: number, months: number): number => {
    if (months <= 0) return 0;
    if (annualRate === 0) return Math.round((principal / months) * 100) / 100;
    const r = annualRate / 100 / 12;
    return Math.round(principal * r * Math.pow(1+r,months) / (Math.pow(1+r,months)-1) * 100) / 100;
  };

  // Loan schedule generator
  const generateLoanSchedule = (
    def: BorrowingLedgerDefinition, entityId: string
  ): LoanRepaymentRecord[] => {
    const emi = def.emiAmount || calculateEMI(def.loanAmount, def.interestRate, def.tenureMonths);
    let balance = def.loanAmount;
    const [y, m, d] = def.firstEmiDate.split('-').map(Number);
    return Array.from({ length: def.tenureMonths }, (_, i) => {
      const interest = Math.round(balance * (def.interestRate/100/12) * 100) / 100;
      const isLast = i === def.tenureMonths - 1;
      const principal = isLast ? balance : Math.round((emi - interest) * 100) / 100;
      const closing = isLast ? 0 : Math.round((balance - principal) * 100) / 100;
      const dm = m + i - 1; const dy = y + Math.floor(dm / 12);
      const dueM = ((dm % 12) + 12) % 12 + 1;
      const dueDate = `${dy}-${String(dueM).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const rec: LoanRepaymentRecord = {
        id: crypto.randomUUID(), borrowingLedgerDefinitionId: def.id,
        entityId, month: i+1, openingBalance: balance, emiAmount: emi,
        principalComponent: principal, interestComponent: interest,
        closingBalance: closing, dueDate, paidDate: null, paidAmount: 0,
        status: 'pending', paymentReference: '', narration: '',
      };
      balance = closing;
      return rec;
    });
  };

  // HSN/SAC auto-fill helper
  const applyHsnSac = (
    code: HSNSACCode,
    setter: React.Dispatch<React.SetStateAction<any>>
  ) => {
    setter((f: any) => ({
      ...f,
      hsnSacCode: code.code,
      hsnSacType: code.codeType,
      gstRate: code.igstRate,
      cgstRate: code.cgstRate,
      sgstRate: code.sgstRate,
      igstRate: code.igstRate,
      cessRate: code.cessRate ?? 0,
      gstType: code.igstRate === 0
        ? (code.exemptionApplicable ? 'exempt' : 'nil_rated')
        : 'taxable',
      isRcmApplicable: code.reverseCharge,
      rcmSection: code.reverseCharge ? 'section_9_3' : null,
    }));
  };

  // Ctrl+S saves the active form
  useCtrlS(() => {
    if (cashCreateOpen) handleCashSave();
    if (bankCreateOpen) handleBankSave();
    if (liabilityOpen) handleLiabilitySave();
    if (capitalOpen) handleCapitalSave();
    if (loanRecOpen) handleLoanRecSave();
    if (borrowingOpen) handleBorrowingSave();
    if (incomeOpen) handleIncomeSave();
    if (expenseOpen) handleExpenseSave();
    if (dutiesTaxOpen) handleDutiesTaxSave();
    if (payrollStatOpen) handlePayrollStatSave();
  });

  // ── Stats ──
  const allDefs = [...cashDefs, ...bankDefs, ...liabilityDefs, ...capitalDefs, ...loanRecDefs, ...borrowingDefs, ...incomeDefs, ...expenseDefs, ...dutiesTaxDefs, ...payrollStatDefs];
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
        branchName: data.BRANCH ?? '', branchAddress: data.ADDRESS ?? '',
        branchCity: (data.CITY ?? data.DISTRICT ?? ''), branchState: data.STATE ?? '',
        branchPincode: String(data.PINCODE ?? ''), micrCode: data.MICR ?? '',
        swiftCode: data.SWIFT ?? '', ifscAutoFilled: true,
        mailingName: bankFromIfsc,
        bankPhone: data.CONTACT ?? '',
        neftEnabled: data.NEFT ?? true, rtgsEnabled: data.RTGS ?? true,
        impsEnabled: data.IMPS ?? true, upiEnabled: data.UPI ?? true,
        name: f.name.trim() === ''
          ? suggestBankLedgerName(bankFromIfsc, f.accountType, f.accountNumber)
          : f.name,
      }));
      setIfscValid(true);
      setBankShowBranch(true);
      const prefix = ifsc.slice(0, 4).toUpperCase();
      const fmtMap: Record<string, typeof bankForm.chequeFormat> = {
        HDFC: 'HDFC_CTS', SBIN: 'SBI_CTS', ICIC: 'ICICI_CTS', UTIB: 'AXIS_CTS',
      };
      const suggestedFmt = fmtMap[prefix] ?? 'GENERIC_CTS';
      const gstYes = ['HDFC','ICIC','UTIB','KKBK','INDB','IDFB','YESB','FDRL'];
      const suggestedGst = gstYes.includes(prefix);
      const privatePfx = ['HDFC','ICIC','UTIB','KKBK','INDB','IDFB','YESB','FDRL'];
      const suggestedDays = privatePfx.includes(prefix) ? 2 : 3;
      const cutoffMap: Record<string, string> = {
        HDFC: '14:30', ICIC: '14:30', UTIB: '14:30', SBIN: '13:30', PUNB: '13:00', BARB: '13:00',
      };
      const suggestedCutoff = cutoffMap[prefix] ?? '14:30';
      setBankForm(f => ({
        ...f,
        chequeFormat: f.chequeFormat === 'GENERIC_CTS' ? suggestedFmt : f.chequeFormat,
        gstOnCharges: f.gstOnCharges === true ? suggestedGst : f.gstOnCharges,
        clearingDays: f.clearingDays === 2 ? suggestedDays : f.clearingDays,
        cutoffTime: f.cutoffTime === '14:30' ? suggestedCutoff : f.cutoffTime,
      }));
      toast.success(`Branch details fetched: ${data.BRANCH}, ${data.CITY}`);
    } catch {
      setIfscFetchError('Branch details unavailable — please fill manually');
      setIfscValid(true);
    } finally {
      setIfscFetching(false);
    }
  };

  const suggestBankLedgerName = (bankName: string, acType: BankAccountType | '' = '', acNo: string): string => {
    if (!bankName || !acType) return '';
    const label: Record<string, string> = {
      current: 'Current A/c', savings: 'Savings A/c', fixed_deposit: 'Fixed Deposit',
      eefc: 'EEFC A/c', cash_credit: 'CC Limit', overdraft: 'OD A/c',
    };
    const last4 = acNo?.replace(/\D/g, '').slice(-4);
    return `${bankName} — ${label[acType] ?? ''}${last4 ? ` (${last4})` : ''}`;
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
      mailingName: def.mailingName ?? '',
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
      mailingName: def.mailingName ?? '',
      acHolderName: def.acHolderName ?? '',
      bankPhone: def.bankPhone ?? '',
      neftEnabled: def.neftEnabled ?? true, rtgsEnabled: def.rtgsEnabled ?? true,
      impsEnabled: def.impsEnabled ?? true, upiEnabled: def.upiEnabled ?? true,
      bankManagerName: def.bankManagerName ?? '',
      bankManagerPhone: def.bankManagerPhone ?? '',
      bankManagerEmail: def.bankManagerEmail ?? '',
    });
    setIfscValid(validateIFSC(def.ifscCode));
    setShowAccountPreview(true);
    setBankCreateOpen(true);
  };

  // ── Type button click handler ──
  const handleTypeButtonClick = (label: string) => {
    if (label === 'Cash') openCashCreate();
    else if (label === 'Bank') openBankCreate();
    else if (label === 'Liability') setLiabilityOpen(true);
    else if (label === 'Capital/Equity') setCapitalOpen(true);
    else if (label === 'Loan Receivable') setLoanRecOpen(true);
    else if (label === 'Borrowing') setBorrowingOpen(true);
    else if (label === 'Income') setIncomeOpen(true);
    else if (label === 'Expense') setExpenseOpen(true);
    else if (label === 'Duties & Taxes') setDutiesTaxOpen(true);
    else if (label === 'Payroll Statutory') { setActiveTab('definitions'); setDefSubTab('payroll'); }
    else if (label === 'Customer') { setActiveTab('definitions'); setDefSubTab('customer'); }
    else if (label === 'Vendor') { setActiveTab('definitions'); setDefSubTab('vendor'); }
    else if (label === 'Logistic') { setActiveTab('definitions'); setDefSubTab('logistic'); }
    else if (label === 'Branch & Division') { setActiveTab('definitions'); setDefSubTab('branch_division'); }
    else if (label === 'Mode of Payment') { setActiveTab('definitions'); setDefSubTab('mode_payment'); }
    else if (label === 'Terms of Payment') { setActiveTab('definitions'); setDefSubTab('terms_payment'); }
    else if (label === 'Terms of Delivery') { setActiveTab('definitions'); setDefSubTab('terms_delivery'); }
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
        mailingName: cashForm.mailingName.trim() || cashForm.name.trim(),
      };
      saveDefinition(updated);
      toast.success(`${updated.name} updated`);
    } else if (cashForm.scope === 'group') {
      const code = genCashGroupCode(all);
      const numericCode = genCashNumericCode(all, cashForm.parentGroupCode);
      const def: CashLedgerDefinition = {
        id: crypto.randomUUID(), ledgerType: 'cash',
        name: cashForm.name.trim(), code, numericCode, alias: cashForm.alias.trim(),
        mailingName: cashForm.mailingName.trim() || cashForm.name.trim(),
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
        mailingName: cashForm.mailingName.trim() || cashForm.name.trim(),
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
      bankName: resolvedBankName, accountNumber: bankForm.accountNumber,
      ifscCode: bankForm.ifscCode.toUpperCase(),
      accountType: bankForm.accountType as BankAccountType,
      odLimit: bankForm.odLimit, currency: bankForm.currency,
      branchName: bankForm.branchName, branchAddress: bankForm.branchAddress,
      branchCity: bankForm.branchCity, branchState: bankForm.branchState,
      branchPincode: bankForm.branchPincode,
      micrCode: bankForm.micrCode, swiftCode: bankForm.swiftCode,
      ifscAutoFilled: bankForm.ifscAutoFilled,
      bankGstin: bankForm.bankGstin, bankStateCode: bankForm.bankStateCode,
      gstOnCharges: bankForm.gstOnCharges, chequeFormat: bankForm.chequeFormat,
      chequeSize: bankForm.chequeSize, defaultCrossing: bankForm.defaultCrossing,
      brsEnabled: bankForm.brsEnabled, clearingDays: bankForm.clearingDays,
      cutoffTime: bankForm.cutoffTime,
      mailingName: bankForm.mailingName.trim() || resolvedBankName,
      acHolderName: bankForm.acHolderName.trim(),
      bankPhone: bankForm.bankPhone,
      neftEnabled: bankForm.neftEnabled, rtgsEnabled: bankForm.rtgsEnabled,
      impsEnabled: bankForm.impsEnabled, upiEnabled: bankForm.upiEnabled,
      bankManagerName: bankForm.bankManagerName.trim(),
      bankManagerPhone: bankForm.bankManagerPhone.trim(),
      bankManagerEmail: bankForm.bankManagerEmail.trim(),
    };
    if (bankEditTarget) {
      const updated: BankLedgerDefinition = {
        ...bankEditTarget, name: bankForm.name.trim(), alias: bankForm.alias.trim(),
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
        entityId: null, entityShortCode: null, status: 'active', ...bankFields,
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
        entityId: entity.id, entityShortCode: entity.shortCode, status: 'active', ...bankFields,
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

  // ── 6 New Save Handlers ──

  const handleLiabilitySave = () => {
    if (!liabilityForm.name.trim()) return toast.error('Name is required');
    const all = loadAllDefinitions();
    const code = genLiabilityCode(all);
    const numericCode = deriveLedgerNumericCode(liabilityForm.parentGroupCode,
      all.filter(d => d.ledgerType === 'liability').length + 1);
    const def: LiabilityLedgerDefinition = {
      id: crypto.randomUUID(), ledgerType: 'liability',
      name: liabilityForm.name.trim(),
      mailingName: liabilityForm.mailingName.trim() || liabilityForm.name.trim(),
      numericCode, code, alias: liabilityForm.alias.trim(),
      parentGroupCode: liabilityForm.parentGroupCode,
      parentGroupName: liabilityForm.parentGroupName,
      entityId: liabilityForm.scope === 'entity'
        ? entities.find(e => e.id === liabilityForm.entityId)?.id ?? null : null,
      entityShortCode: liabilityForm.scope === 'entity'
        ? entities.find(e => e.id === liabilityForm.entityId)?.shortCode ?? null : null,
      openingBalance: liabilityForm.openingBalance, openingBalanceType: liabilityForm.openingBalanceType,
      status: 'active',
    };
    saveDefinition(def);
    autoCreateInstances(def, liabilityForm.openingBalance, liabilityForm.openingBalanceType);
    toast.success(`${def.name} created`);
    setLiabilityOpen(false);
    setLiabilityForm({ parentGroupCode: 'LTPROV', parentGroupName: 'Long-Term Provisions',
      name: '', mailingName: '', alias: '', openingBalance: 0, openingBalanceType: 'Cr',
      scope: 'group', entityId: '' });
    refreshAll();
  };

  const handleCapitalSave = () => {
    if (!capitalForm.name.trim()) return toast.error('Name is required');
    const all = loadAllDefinitions();
    const code = genCapitalCode(all);
    const numericCode = deriveLedgerNumericCode(capitalForm.parentGroupCode,
      all.filter(d => d.ledgerType === 'capital').length + 1);
    const def: CapitalLedgerDefinition = {
      id: crypto.randomUUID(), ledgerType: 'capital',
      name: capitalForm.name.trim(),
      mailingName: capitalForm.mailingName.trim() || capitalForm.name.trim(),
      numericCode, code, alias: capitalForm.alias.trim(),
      parentGroupCode: capitalForm.parentGroupCode, parentGroupName: capitalForm.parentGroupName,
      entityId: capitalForm.scope === 'entity'
        ? entities.find(e => e.id === capitalForm.entityId)?.id ?? null : null,
      entityShortCode: capitalForm.scope === 'entity'
        ? entities.find(e => e.id === capitalForm.entityId)?.shortCode ?? null : null,
      openingBalance: capitalForm.openingBalance, openingBalanceType: 'Cr',
      capitalType: capitalForm.capitalType,
      authorisedCapital: capitalForm.authorisedCapital, issuedCapital: capitalForm.issuedCapital,
      paidUpCapital: capitalForm.paidUpCapital, faceValuePerShare: capitalForm.faceValuePerShare,
      numberOfShares: capitalForm.numberOfShares,
      partnerName: capitalForm.partnerName, partnerPAN: capitalForm.partnerPAN,
      profitSharingRatio: capitalForm.profitSharingRatio, capitalContribution: capitalForm.capitalContribution,
      proprietorName: capitalForm.proprietorName, proprietorPAN: capitalForm.proprietorPAN,
      status: 'active',
    };
    saveDefinition(def);
    autoCreateInstances(def, capitalForm.openingBalance, 'Cr');
    toast.success(`${def.name} created`);
    setCapitalOpen(false);
    setCapitalForm({ parentGroupCode: 'RSRV', parentGroupName: 'Reserves & Surplus',
      name: '', mailingName: '', alias: '', openingBalance: 0, openingBalanceType: 'Cr',
      capitalType: 'general_reserve', authorisedCapital: 0, issuedCapital: 0, paidUpCapital: 0,
      faceValuePerShare: 10, numberOfShares: 0, partnerName: '', partnerPAN: '',
      profitSharingRatio: 0, capitalContribution: 0, proprietorName: '', proprietorPAN: '',
      scope: 'group', entityId: '' });
    refreshAll();
  };

  const handleLoanRecSave = () => {
    if (!loanRecForm.name.trim()) return toast.error('Name is required');
    const all = loadAllDefinitions();
    const code = genLoanRecCode(all);
    const numericCode = deriveLedgerNumericCode(loanRecForm.parentGroupCode,
      all.filter(d => d.ledgerType === 'loan_receivable').length + 1);
    const def: LoanReceivableLedgerDefinition = {
      id: crypto.randomUUID(), ledgerType: 'loan_receivable',
      name: loanRecForm.name.trim(),
      mailingName: loanRecForm.mailingName.trim() || loanRecForm.borrowerName.trim() || loanRecForm.name.trim(),
      numericCode, code, alias: loanRecForm.alias.trim(),
      parentGroupCode: loanRecForm.parentGroupCode, parentGroupName: loanRecForm.parentGroupName,
      entityId: loanRecForm.scope === 'entity'
        ? entities.find(e => e.id === loanRecForm.entityId)?.id ?? null : null,
      entityShortCode: loanRecForm.scope === 'entity'
        ? entities.find(e => e.id === loanRecForm.entityId)?.shortCode ?? null : null,
      openingBalance: 0, openingBalanceType: 'Dr',
      borrowerName: loanRecForm.borrowerName, borrowerPhone: loanRecForm.borrowerPhone,
      borrowerEmail: loanRecForm.borrowerEmail, borrowerAddress: loanRecForm.borrowerAddress,
      borrowerState: loanRecForm.borrowerState, borrowerPincode: loanRecForm.borrowerPincode,
      borrowerPAN: loanRecForm.borrowerPAN,
      loanAmount: loanRecForm.loanAmount, interestRate: loanRecForm.interestRate,
      interestType: loanRecForm.interestType, tenureMonths: loanRecForm.tenureMonths,
      disbursementDate: loanRecForm.disbursementDate, firstRepaymentDate: loanRecForm.firstRepaymentDate,
      collateral: loanRecForm.collateral, purpose: loanRecForm.purpose,
      isTdsApplicable: loanRecForm.isTdsApplicable, tdsSection: loanRecForm.tdsSection,
      status: 'active',
    };
    saveDefinition(def);
    autoCreateInstances(def, 0, 'Dr');
    toast.success(`${def.name} created`);
    setLoanRecOpen(false);
    setLoanRecForm(defaultLoanRecForm);
    refreshAll();
  };

  const handleBorrowingSave = () => {
    if (!borrowingForm.name.trim()) return toast.error('Name is required');
    const all = loadAllDefinitions();
    const code = genBorrowingCode(all);
    const numericCode = deriveLedgerNumericCode(borrowingForm.parentGroupCode,
      all.filter(d => d.ledgerType === 'borrowing').length + 1);
    const emiAmount = calculateEMI(borrowingForm.loanAmount, borrowingForm.interestRate, borrowingForm.tenureMonths);
    const def: BorrowingLedgerDefinition = {
      id: crypto.randomUUID(), ledgerType: 'borrowing',
      name: borrowingForm.name.trim(),
      mailingName: borrowingForm.mailingName.trim() || borrowingForm.lenderName.trim() || borrowingForm.name.trim(),
      numericCode, code, alias: borrowingForm.alias.trim(),
      parentGroupCode: borrowingForm.parentGroupCode, parentGroupName: borrowingForm.parentGroupName,
      entityId: borrowingForm.scope === 'entity'
        ? entities.find(e => e.id === borrowingForm.entityId)?.id ?? null : null,
      entityShortCode: borrowingForm.scope === 'entity'
        ? entities.find(e => e.id === borrowingForm.entityId)?.shortCode ?? null : null,
      openingBalance: 0, openingBalanceType: 'Cr',
      lenderName: borrowingForm.lenderName, lenderType: borrowingForm.lenderType,
      lenderPhone: borrowingForm.lenderPhone, lenderEmail: borrowingForm.lenderEmail,
      lenderAddress: borrowingForm.lenderAddress,
      loanAmount: borrowingForm.loanAmount, interestRate: borrowingForm.interestRate,
      loanType: borrowingForm.loanType, tenureMonths: borrowingForm.tenureMonths,
      firstEmiDate: borrowingForm.firstEmiDate,
      loanAccountNo: borrowingForm.loanAccountNo, collateralPledged: borrowingForm.collateralPledged,
      emiAmount, repaymentScheduleGenerated: !!borrowingForm.firstEmiDate,
      status: 'active',
    };
    saveDefinition(def);
    autoCreateInstances(def, 0, 'Cr');
    // Generate schedule per entity
    if (def.firstEmiDate && def.tenureMonths > 0) {
      const allEntities = loadEntities();
      allEntities.forEach(entity => {
        const schedule = generateLoanSchedule(def, entity.id);
        saveLoanSchedule(schedule);
      });
    }
    toast.success(`${def.name} created`);
    setBorrowingOpen(false);
    setBorrowingForm(defaultBorrowingForm);
    refreshAll();
  };

  const handleIncomeSave = () => {
    if (!incomeForm.name.trim()) return toast.error('Name is required');
    const all = loadAllDefinitions();
    const code = genIncomeCode(all);
    const numericCode = deriveLedgerNumericCode(incomeForm.parentGroupCode,
      all.filter(d => d.ledgerType === 'income').length + 1);
    const def: IncomeLedgerDefinition = {
      id: crypto.randomUUID(), ledgerType: 'income',
      name: incomeForm.name.trim(),
      mailingName: incomeForm.mailingName.trim() || incomeForm.name.trim(),
      numericCode, code, alias: incomeForm.alias.trim(),
      parentGroupCode: incomeForm.parentGroupCode, parentGroupName: incomeForm.parentGroupName,
      entityId: incomeForm.scope === 'entity'
        ? entities.find(e => e.id === incomeForm.entityId)?.id ?? null : null,
      entityShortCode: incomeForm.scope === 'entity'
        ? entities.find(e => e.id === incomeForm.entityId)?.shortCode ?? null : null,
      openingBalance: 0, openingBalanceType: 'Cr',
      isGstApplicable: incomeForm.isGstApplicable,
      hsnSacCode: incomeForm.hsnSacCode, hsnSacType: incomeForm.hsnSacType,
      gstRate: incomeForm.gstRate, cgstRate: incomeForm.cgstRate,
      sgstRate: incomeForm.sgstRate, igstRate: incomeForm.igstRate, cessRate: incomeForm.cessRate,
      gstType: incomeForm.gstType, includeInGstTurnover: incomeForm.includeInGstTurnover,
      isTdsApplicable: incomeForm.isTdsApplicable, tdsSection: incomeForm.tdsSection,
      costCentreApplicable: incomeForm.costCentreApplicable,
      status: 'active',
    };
    saveDefinition(def);
    autoCreateInstances(def, 0, 'Cr');
    toast.success(`${def.name} created`);
    setIncomeOpen(false);
    setIncomeForm(defaultIncomeForm);
    refreshAll();
  };

  const handleExpenseSave = () => {
    if (!expenseForm.name.trim()) return toast.error('Name is required');
    const all = loadAllDefinitions();
    const code = genExpenseCode(all);
    const numericCode = deriveLedgerNumericCode(expenseForm.parentGroupCode,
      all.filter(d => d.ledgerType === 'expense').length + 1);
    const def: ExpenseLedgerDefinition = {
      id: crypto.randomUUID(), ledgerType: 'expense',
      name: expenseForm.name.trim(),
      mailingName: expenseForm.mailingName.trim() || expenseForm.name.trim(),
      numericCode, code, alias: expenseForm.alias.trim(),
      parentGroupCode: expenseForm.parentGroupCode, parentGroupName: expenseForm.parentGroupName,
      entityId: expenseForm.scope === 'entity'
        ? entities.find(e => e.id === expenseForm.entityId)?.id ?? null : null,
      entityShortCode: expenseForm.scope === 'entity'
        ? entities.find(e => e.id === expenseForm.entityId)?.shortCode ?? null : null,
      openingBalance: 0, openingBalanceType: 'Dr',
      isGstApplicable: expenseForm.isGstApplicable,
      hsnSacCode: expenseForm.hsnSacCode, hsnSacType: expenseForm.hsnSacType,
      gstRate: expenseForm.gstRate, cgstRate: expenseForm.cgstRate,
      sgstRate: expenseForm.sgstRate, igstRate: expenseForm.igstRate, cessRate: expenseForm.cessRate,
      gstType: expenseForm.gstType,
      isItcEligible: expenseForm.isItcEligible,
      isRcmApplicable: expenseForm.isRcmApplicable,
      rcmSection: expenseForm.rcmSection,
      isTdsApplicable: expenseForm.isTdsApplicable, tdsSection: expenseForm.tdsSection,
      usePurchaseAdditionalExpense: expenseForm.usePurchaseAdditionalExpense,
      costCentreApplicable: expenseForm.costCentreApplicable,
      isBudgetHead: expenseForm.isBudgetHead,
      expenseNature: expenseForm.expenseNature,
      status: 'active',
    };
    saveDefinition(def);
    autoCreateInstances(def, 0, 'Dr');
    toast.success(`${def.name} created`);
    setExpenseOpen(false);
    setExpenseForm(defaultExpenseForm);
    refreshAll();
  };

  // ── Save Duties & Tax ──
  const handleDutiesTaxSave = () => {
    if (!dutiesTaxForm.taxType) return toast.error('Select tax type');
    if (dutiesTaxForm.taxType === 'gst' && !dutiesTaxForm.gstSubType)
      return toast.error('Select GST type (CGST/SGST/IGST/Cess)');
    if (!dutiesTaxForm.name.trim()) return toast.error('Ledger name is required');
    const all = loadAllDefinitions();
    const code = genDutiesTaxCode(all);
    const numericCode = deriveLedgerNumericCode(dutiesTaxForm.parentGroupCode,
      all.filter(d => d.ledgerType === 'duties_tax').length + 1);
    const def: DutiesTaxLedgerDefinition = {
      id: crypto.randomUUID(), ledgerType: 'duties_tax',
      name: dutiesTaxForm.name.trim(),
      mailingName: dutiesTaxForm.mailingName.trim() || dutiesTaxForm.name.trim(),
      numericCode, code, alias: dutiesTaxForm.alias.trim(),
      parentGroupCode: dutiesTaxForm.parentGroupCode,
      parentGroupName: dutiesTaxForm.parentGroupName,
      entityId: null, entityShortCode: null,
      openingBalance: 0, openingBalanceType: 'Cr', status: 'active',
      taxType: dutiesTaxForm.taxType as TaxType,
      gstSubType: dutiesTaxForm.gstSubType,
      calculationBasis: dutiesTaxForm.calculationBasis,
      rate: dutiesTaxForm.rate,
    };
    saveDefinition(def);
    autoCreateInstances(def, 0, 'Cr');
    toast.success(`${def.name} created`);
    setDutiesTaxOpen(false);
    setDutiesTaxForm(defaultDutiesTaxForm);
    refreshAll();
  };

  // ── Save Payroll Statutory ──
  const handlePayrollStatSave = () => {
    if (!payrollForm.payrollComponent) return toast.error('Select a component');
    if (!payrollForm.name.trim()) return toast.error('Ledger name is required');
    const comp = payrollForm.payrollComponent as PayrollComponent;
    const defaults = PAYROLL_COMPONENT_DEFAULTS[comp];
    const all = loadAllDefinitions();
    const code = genPayrollStatCode(all);
    const numericCode = deriveLedgerNumericCode('EMPL',
      all.filter(d => d.ledgerType === 'payroll_statutory').length + 1);
    const def: PayrollStatutoryLedgerDefinition = {
      id: crypto.randomUUID(), ledgerType: 'payroll_statutory',
      name: payrollForm.name.trim(),
      mailingName: payrollForm.name.trim(),
      numericCode, code, alias: payrollForm.alias?.trim() ?? '',
      parentGroupCode: 'EMPL',
      parentGroupName: 'Employee Liabilities',
      entityId: null, entityShortCode: null,
      openingBalance: 0, openingBalanceType: 'Cr', status: 'active',
      payrollCategory: defaults.category,
      payrollComponent: comp,
      statutoryRate: defaults.statutoryRate,
      calculationBase: defaults.calculationBase,
      wageCeiling: defaults.wageCeiling,
      maxAmount: defaults.maxAmount,
    };
    saveDefinition(def);
    autoCreateInstances(def, 0, 'Cr');
    toast.success(`${def.name} created`);
    setPayrollStatOpen(false);
    setPayrollForm(defaultPayrollForm);
    refreshAll();
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
      // [JWT] PUT /api/entity/${inst.entityId}/finecore/custodian-history (close previous)
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
      fromLeaf: chequeBookForm.fromLeaf, toLeaf: chequeBookForm.toLeaf,
      issuedDate: chequeBookForm.issuedDate || new Date().toISOString().split('T')[0],
      currentLeaf: chequeBookForm.fromLeaf, status: 'active',
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
      payee: chequeIssueForm.payee.trim(), amount: chequeIssueForm.amount,
      date: chequeIssueForm.date || new Date().toISOString().split('T')[0],
      postDatedDate: chequeIssueForm.isPDC ? chequeIssueForm.postDatedDate : null,
      isPDC: chequeIssueForm.isPDC, crossingType: chequeIssueForm.crossingType,
      narration: chequeIssueForm.narration, voucherId: null,
      status: chequeIssueForm.isPDC ? 'post_dated' : 'issued',
      issuedDate: new Date().toISOString().split('T')[0],
      presentedDate: null, clearedDate: null, bounceDate: null,
      bounceReason: '', stopPaymentDate: null,
    };
    saveChequeRecord(rec);
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
      bankLedgerDefinitionId: nachForm.defId, entityId: nachForm.entityId,
      mandateRef: nachForm.mandateRef.trim(), beneficiary: nachForm.beneficiary.trim(),
      amount: nachForm.amount, amountMin: nachForm.amountMin, amountMax: nachForm.amountMax,
      frequency: nachForm.frequency, debitDay: nachForm.debitDay,
      startDate: nachForm.startDate || new Date().toISOString().split('T')[0],
      endDate: nachForm.endDate || null, status: 'active', notes: nachForm.notes,
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

  // ── Mark Loan Paid ──
  const handleMarkPaid = () => {
    if (!markPaidTarget) return;
    const updated: LoanRepaymentRecord = {
      ...markPaidTarget,
      status: 'paid',
      paidDate: markPaidForm.paidDate || new Date().toISOString().split('T')[0],
      paidAmount: markPaidForm.paidAmount || markPaidTarget.emiAmount,
      paymentReference: markPaidForm.paymentReference,
      narration: markPaidForm.narration,
    };
    const key = `erp_entity_${updated.entityId}_loan_schedule_${updated.borrowingLedgerDefinitionId}`;
    const existing = loadLoanSchedule(updated.entityId, updated.borrowingLedgerDefinitionId);
    const updatedSchedule = existing.map(r => r.id === updated.id ? updated : r);
    localStorage.setItem(key, JSON.stringify(updatedSchedule));
    // [JWT] PUT /api/entity/${updated.entityId}/finecore/loan-schedule
    setLoanSchedule(updatedSchedule);
    setMarkPaidOpen(false);
    setMarkPaidTarget(null);
    toast.success(`EMI month ${updated.month} marked as paid`);
  };

  // ── FinFrame L4 groups for parent pickers ──
  const l4CashGroups = getFinFrameL4Groups(['CASH']);
  const l4BankGroups = getFinFrameL4Groups(['BANK', 'STBOR']);
  const l4LiabilityGroups = getFinFrameL4Groups(['LTPROV', 'ONCL', 'OPAY', 'EMPL', 'LEASE', 'BOND']);
  const l4CapitalGroups = getFinFrameL4Groups(['EQSH', 'PRSH', 'RSRV', 'OCI', 'PCAP', 'BD', 'SUS']);
  const l4LoanRecGroups = getFinFrameL4Groups(['LTLA', 'STLA']);
  const l4BorrowingGroups = getFinFrameL4Groups(['LTBOR', 'STBOR', 'BOND']);
  const l4IncomeGroups = getFinFrameL4Groups(['PCAP', 'SERV', 'EXINC', 'INTINC', 'DIVINC', 'RNTINC', 'GAIN', 'MISC']);
  const l4ExpenseGroups = getFinFrameL4Groups(['PURCH', 'DEXP', 'EMPB', 'RENT', 'UTIL', 'TRAV', 'PRFEE', 'ADMIN', 'SELL', 'REPAIR', 'INTEXP', 'BKCHG']);

  // L3 groups for parent pickers
  const liabilityL3 = L3_FINANCIAL_GROUPS.filter(g => ['LTPROV','ONCL','OPAY','EMPL','LEASE','BOND'].includes(g.code));
  const capitalL3 = L3_FINANCIAL_GROUPS.filter(g => ['EQSH','PRSH','RSRV','OCI','PCAP','BD','SUS'].includes(g.code));
  const loanRecL3 = L3_FINANCIAL_GROUPS.filter(g => ['LTLA','STLA'].includes(g.code));
  const borrowingL3 = L3_FINANCIAL_GROUPS.filter(g => ['LTBOR','STBOR','BOND'].includes(g.code));
  const incomeL3 = L3_FINANCIAL_GROUPS.filter(g => ['PCAP','SERV','EXINC','INTINC','DIVINC','RNTINC','GAIN','MISC'].includes(g.code));
  const expenseL3 = L3_FINANCIAL_GROUPS.filter(g => ['PURCH','DEXP','EMPB','RENT','UTIL','TRAV','PRFEE','ADMIN','SELL','REPAIR','INTEXP','BKCHG'].includes(g.code));

  // Filter instances for Opening Balances tab
  const allDefIds = new Set(allDefs.filter(d => !d.entityId).map(d => d.id));
  const filteredInstances = instances.filter(i => allDefIds.has(i.ledgerDefinitionId));

  const getDefForInstance = (inst: EntityLedgerInstance): AnyLedgerDefinition | undefined =>
    allDefs.find(d => d.id === inst.ledgerDefinitionId);

  const rows: Record<string, typeof TYPE_BUTTONS> = {};
  TYPE_BUTTONS.forEach(b => { if (!rows[b.row]) rows[b.row] = []; rows[b.row].push(b); });

  const suggestedParent = bankForm.accountType ? getSuggestedParent(bankForm.accountType as BankAccountType) : null;

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

  // ── Shared scope section renderer ──
  const renderScopeSection = (form: { scope: string; entityId: string }, setForm: React.Dispatch<React.SetStateAction<any>>) => (
    <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Entity Scope</Label>
        <div className="flex gap-3">
          <button type="button" onClick={() => setForm((f: any) => ({ ...f, scope: 'group', entityId: '' }))}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${form.scope === 'group' ? 'bg-teal-500/10 text-teal-600 border-teal-500/30' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'}`}>Group Level</button>
          <button type="button" onClick={() => setForm((f: any) => ({ ...f, scope: 'entity' }))}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${form.scope === 'entity' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'}`}>Entity Specific</button>
        </div>
      </div>
      {form.scope === 'entity' && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Entity <span className="text-destructive">*</span></Label>
          <Select value={form.entityId} onValueChange={(v) => setForm((f: any) => ({ ...f, entityId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
            <SelectContent>{entities.map(e => (<SelectItem key={e.id} value={e.id}>{e.name} ({e.shortCode})</SelectItem>))}</SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  // ── Shared parent group picker ──
  const renderParentGroupPicker = (
    value: string, l3Groups: typeof L3_FINANCIAL_GROUPS, l4Groups: typeof l4CashGroups,
    onChange: (code: string, name: string) => void
  ) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Parent Group <span className="text-destructive">*</span></Label>
      <Select value={value} onValueChange={(v) => {
        const l3 = l3Groups.find(g => g.code === v);
        const l4 = l4Groups.find(g => g.code === v);
        onChange(v, l3?.name ?? l4?.name ?? v);
      }}>
        <SelectTrigger><SelectValue placeholder="Select parent group" /></SelectTrigger>
        <SelectContent>
          {l3Groups.map(g => (<SelectItem key={g.code} value={g.code}>{g.name}</SelectItem>))}
          {l4Groups.map(g => (<SelectItem key={g.code} value={g.code}>↳ {g.name}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );

  // ── Shared definitions table ──
  const renderDefTable = (
    defs: AnyLedgerDefinition[],
    columns: { label: string; render: (d: AnyLedgerDefinition) => React.ReactNode }[],
    emptyMsg: string,
  ) => defs.length === 0 ? (
    <div className="text-center py-12 text-muted-foreground text-sm">{emptyMsg}</div>
  ) : (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(c => <TableHead key={c.label}>{c.label}</TableHead>)}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {defs.map(def => (
            <TableRow key={def.id}>
              {columns.map(c => <TableCell key={c.label}>{c.render(def)}</TableCell>)}
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeactivate(def)}><Ban className="h-3.5 w-3.5" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  // ── EMI preview for borrowing form ──
  const borrowingEMIPreview = borrowingForm.loanAmount > 0 && borrowingForm.interestRate > 0 && borrowingForm.tenureMonths > 0
    ? calculateEMI(borrowingForm.loanAmount, borrowingForm.interestRate, borrowingForm.tenureMonths)
    : 0;
  const borrowingTotalPayment = borrowingEMIPreview * borrowingForm.tenureMonths;
  const borrowingTotalInterest = borrowingTotalPayment - borrowingForm.loanAmount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-foreground">Ledger Master</h1>
            <Badge className="text-[10px] bg-teal-500/10 text-teal-600 border-teal-500/20">Cash</Badge>
            <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">Bank</Badge>
            <Badge className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20">+6 Types</Badge>
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
          parentGroupName: 'Bank Balances', name: 'HDFC Bank — Current A/C', openingBalanceType: 'Dr',
        })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 transition-colors text-sm font-medium text-blue-600">
          <Plus className="h-4 w-4" /> HDFC Current A/C
        </button>
        <button onClick={() => handleBankQuickStart({
          bankName: 'State Bank of India (SBI)', accountType: 'savings', parentGroupCode: 'BANK',
          parentGroupName: 'Bank Balances', name: 'SBI — Savings A/C', openingBalanceType: 'Dr',
        })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 transition-colors text-sm font-medium text-blue-600">
          <Plus className="h-4 w-4" /> SBI Savings A/C
        </button>
        <button onClick={() => handleBankQuickStart({
          accountType: 'cash_credit', parentGroupCode: 'STBOR',
          parentGroupName: 'Short-Term Borrowings', name: '', openingBalanceType: 'Cr',
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
                return (
                  <button key={btn.label}
                    onClick={() => handleTypeButtonClick(btn.label)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
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
            <TabsList className="h-9 flex-wrap">
              <TabsTrigger value="cash" className="text-xs gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> Cash ({cashDefs.length})
              </TabsTrigger>
              <TabsTrigger value="bank" className="text-xs gap-1.5">
                <Landmark className="h-3.5 w-3.5" /> Bank ({bankDefs.length})
              </TabsTrigger>
              <TabsTrigger value="capital" className="text-xs gap-1.5">
                <Scale className="h-3.5 w-3.5" /> Capital ({capitalDefs.length})
              </TabsTrigger>
              <TabsTrigger value="loans" className="text-xs gap-1.5">
                <ArrowUpRight className="h-3.5 w-3.5" /> Loans ({loanRecDefs.length + borrowingDefs.length})
              </TabsTrigger>
              <TabsTrigger value="income" className="text-xs gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Income ({incomeDefs.length})
              </TabsTrigger>
              <TabsTrigger value="expenses" className="text-xs gap-1.5">
                <Receipt className="h-3.5 w-3.5" /> Expenses ({expenseDefs.length})
              </TabsTrigger>
              <TabsTrigger value="liabilities" className="text-xs gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Liabilities ({liabilityDefs.length})
              </TabsTrigger>
              <TabsTrigger value="duties_tax" className="text-xs gap-1.5">
                <Receipt className="h-3.5 w-3.5" /> Duties & Tax ({dutiesTaxDefs.length})
              </TabsTrigger>
              <TabsTrigger value="payroll" className="text-xs gap-1.5">
                <Users className="h-3.5 w-3.5" /> Payroll Statutory ({payrollStatDefs.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Cash List */}
          {defSubTab === 'cash' && renderDefTable(cashDefs, [
            { label: 'Name', render: d => <span className="font-medium">{d.name}</span> },
            { label: 'Numeric Code', render: d => <span className="font-mono text-xs text-teal-600">{d.numericCode || '—'}</span> },
            { label: 'Parent Group', render: d => <span className="text-xs">{d.parentGroupName}</span> },
            { label: 'Scope', render: d => d.entityId
              ? <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">{entities.find(e => e.id === d.entityId)?.name ?? d.entityShortCode}</Badge>
              : <Badge variant="outline" className="text-[10px] bg-teal-500/10 text-teal-600 border-teal-500/20">Group</Badge> },
            { label: 'Status', render: d => <Badge variant="outline" className={`text-[10px] ${d.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{d.status}</Badge> },
          ], 'No cash ledgers yet. Click + Cash above or use a Quick Start template.')}

          {/* Bank List */}
          {defSubTab === 'bank' && renderDefTable(bankDefs, [
            { label: 'Name', render: d => <span className="font-medium">{d.name}</span> },
            { label: 'Numeric Code', render: d => <span className="font-mono text-xs text-teal-600">{d.numericCode || '—'}</span> },
            { label: 'Bank', render: d => <span className="text-xs">{(d as BankLedgerDefinition).bankName}</span> },
            { label: 'Account Type', render: d => {
              const bd = d as BankLedgerDefinition;
              return <Badge variant="outline" className={`text-[10px] ${ACCOUNT_TYPE_COLORS[bd.accountType]}`}>{ACCOUNT_TYPE_LABELS[bd.accountType]}</Badge>;
            }},
            { label: 'Status', render: d => <Badge variant="outline" className={`text-[10px] ${d.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{d.status}</Badge> },
          ], 'No bank ledgers yet. Click + Bank above or use a Quick Start template.')}

          {/* Capital List */}
          {defSubTab === 'capital' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setCapitalOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Capital</Button>
              </div>
              {renderDefTable(capitalDefs, [
                { label: 'Name', render: d => <span className="font-medium">{d.name}</span> },
                { label: 'Numeric Code', render: d => <span className="font-mono text-xs text-teal-600">{d.numericCode || '—'}</span> },
                { label: 'Capital Type', render: d => <span className="text-xs">{CAPITAL_TYPE_LABELS[(d as CapitalLedgerDefinition).capitalType]}</span> },
                { label: 'Status', render: d => <Badge variant="outline" className={`text-[10px] ${d.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{d.status}</Badge> },
              ], 'No capital ledgers yet.')}
            </div>
          )}

          {/* Loans List */}
          {defSubTab === 'loans' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5"><ArrowUpRight className="h-4 w-4 text-emerald-600" /> Loan Receivable (Dr)</h3>
                  <Button size="sm" onClick={() => setLoanRecOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Loan Receivable</Button>
                </div>
                {renderDefTable(loanRecDefs, [
                  { label: 'Name', render: d => <span className="font-medium">{d.name}</span> },
                  { label: 'Numeric Code', render: d => <span className="font-mono text-xs text-teal-600">{d.numericCode || '—'}</span> },
                  { label: 'Borrower', render: d => <span className="text-xs">{(d as LoanReceivableLedgerDefinition).borrowerName || '—'}</span> },
                  { label: 'Status', render: d => <Badge variant="outline" className={`text-[10px] ${d.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{d.status}</Badge> },
                ], 'No loan receivables yet.')}
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5"><ArrowDownLeft className="h-4 w-4 text-red-500" /> Borrowings (Cr)</h3>
                  <Button size="sm" onClick={() => setBorrowingOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Borrowing</Button>
                </div>
                {borrowingDefs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">No borrowings yet.</div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Numeric Code</TableHead>
                          <TableHead>Lender</TableHead>
                          <TableHead>Loan Type</TableHead>
                          <TableHead>EMI</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {borrowingDefs.map(def => (
                          <>
                            <TableRow key={def.id} className="cursor-pointer" onClick={() => {
                              if (activeScheduleDefId === def.id) { setActiveScheduleDefId(null); }
                              else {
                                setActiveScheduleDefId(def.id);
                                const eid = selEntityId || entities[0]?.id || '';
                                setLoanSchedule(loadLoanSchedule(eid, def.id));
                              }
                            }}>
                              <TableCell className="font-medium">{def.name}</TableCell>
                              <TableCell className="font-mono text-xs text-teal-600">{def.numericCode || '—'}</TableCell>
                              <TableCell className="text-xs">{def.lenderName}</TableCell>
                              <TableCell className="text-xs">{LOAN_TYPE_LABELS[def.loanType]}</TableCell>
                              <TableCell className="text-xs font-mono">{def.emiAmount ? `₹${def.emiAmount.toLocaleString('en-IN')}` : '—'}</TableCell>
                              <TableCell><Badge variant="outline" className={`text-[10px] ${def.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{def.status}</Badge></TableCell>
                              <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeactivate(def)}><Ban className="h-3.5 w-3.5" /></Button>
                              </TableCell>
                            </TableRow>
                            {activeScheduleDefId === def.id && (
                              <TableRow key={`${def.id}-schedule`}>
                                <TableCell colSpan={7} className="p-0">
                                  <div className="bg-muted/20 border-t border-border p-4">
                                    {loanSchedule.length === 0 ? (
                                      <p className="text-xs text-muted-foreground text-center py-4">No repayment schedule generated.</p>
                                    ) : (
                                      <div className="space-y-3">
                                        <div className="flex flex-wrap gap-4 text-xs">
                                          <span>Total EMIs: <strong>{loanSchedule.length}</strong></span>
                                          <span>Paid: <strong className="text-emerald-600">{loanSchedule.filter(r => r.status === 'paid').length}</strong></span>
                                          <span>Outstanding: <strong>₹{loanSchedule.filter(r => r.status !== 'paid').reduce((s, r) => s + r.emiAmount, 0).toLocaleString('en-IN')}</strong></span>
                                        </div>
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="text-xs">Month</TableHead>
                                              <TableHead className="text-xs">Due Date</TableHead>
                                              <TableHead className="text-xs">Opening</TableHead>
                                              <TableHead className="text-xs">EMI</TableHead>
                                              <TableHead className="text-xs">Principal</TableHead>
                                              <TableHead className="text-xs">Interest</TableHead>
                                              <TableHead className="text-xs">Closing</TableHead>
                                              <TableHead className="text-xs">Status</TableHead>
                                              <TableHead className="text-xs text-right">Action</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {loanSchedule.map(rec => {
                                              const days = getDaysUntil(rec.dueDate);
                                              const isOverdue = days < 0 && rec.status === 'pending';
                                              const isDue = days <= 7 && days >= 0 && rec.status === 'pending';
                                              return (
                                                <TableRow key={rec.id} className={isOverdue ? 'bg-red-500/5' : isDue ? 'bg-amber-500/5' : ''}>
                                                  <TableCell className="text-xs font-mono">{rec.month}</TableCell>
                                                  <TableCell className="text-xs">{rec.dueDate}</TableCell>
                                                  <TableCell className="text-xs font-mono">₹{rec.openingBalance.toLocaleString('en-IN')}</TableCell>
                                                  <TableCell className="text-xs font-mono">₹{rec.emiAmount.toLocaleString('en-IN')}</TableCell>
                                                  <TableCell className="text-xs font-mono">₹{rec.principalComponent.toLocaleString('en-IN')}</TableCell>
                                                  <TableCell className="text-xs font-mono">₹{rec.interestComponent.toLocaleString('en-IN')}</TableCell>
                                                  <TableCell className="text-xs font-mono">₹{rec.closingBalance.toLocaleString('en-IN')}</TableCell>
                                                  <TableCell>
                                                    <Badge variant="outline" className={`text-[9px] ${
                                                      rec.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' :
                                                      isOverdue ? 'bg-red-500/10 text-red-500' :
                                                      isDue ? 'bg-amber-500/10 text-amber-600' :
                                                      'bg-muted/50 text-muted-foreground'
                                                    }`}>{rec.status === 'paid' ? '✅ Paid' : isOverdue ? 'Overdue' : isDue ? `Due in ${days}d` : 'Pending'}</Badge>
                                                  </TableCell>
                                                  <TableCell className="text-right">
                                                    {(rec.status === 'pending' || isOverdue) && (
                                                      <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => {
                                                        setMarkPaidTarget(rec);
                                                        setMarkPaidForm({ paidAmount: rec.emiAmount, paidDate: '', paymentReference: '', narration: '' });
                                                        setMarkPaidOpen(true);
                                                      }}>Mark Paid</Button>
                                                    )}
                                                  </TableCell>
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Income List */}
          {defSubTab === 'income' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setIncomeOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Income</Button>
              </div>
              {renderDefTable(incomeDefs, [
                { label: 'Name', render: d => <span className="font-medium">{d.name}</span> },
                { label: 'Numeric Code', render: d => <span className="font-mono text-xs text-teal-600">{d.numericCode || '—'}</span> },
                { label: 'Parent Group', render: d => <span className="text-xs">{d.parentGroupName}</span> },
                { label: 'GST Rate', render: d => {
                  const inc = d as IncomeLedgerDefinition;
                  return inc.isGstApplicable ? <span className="text-xs font-mono">{inc.gstRate}%</span> : <span className="text-xs text-muted-foreground">N/A</span>;
                }},
                { label: 'TDS Section', render: d => {
                  const inc = d as IncomeLedgerDefinition;
                  return inc.isTdsApplicable ? <span className="text-xs font-mono">{inc.tdsSection}</span> : <span className="text-xs text-muted-foreground">—</span>;
                }},
                { label: 'Status', render: d => <Badge variant="outline" className={`text-[10px] ${d.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{d.status}</Badge> },
              ], 'No income ledgers yet.')}
            </div>
          )}

          {/* Expenses List */}
          {defSubTab === 'expenses' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setExpenseOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Expense</Button>
              </div>
              {renderDefTable(expenseDefs, [
                { label: 'Name', render: d => <span className="font-medium">{d.name}</span> },
                { label: 'Numeric Code', render: d => <span className="font-mono text-xs text-teal-600">{d.numericCode || '—'}</span> },
                { label: 'Parent Group', render: d => <span className="text-xs">{d.parentGroupName}</span> },
                { label: 'GST Rate', render: d => {
                  const exp = d as ExpenseLedgerDefinition;
                  return exp.isGstApplicable ? <span className="text-xs font-mono">{exp.gstRate}%</span> : <span className="text-xs text-muted-foreground">N/A</span>;
                }},
                { label: 'RCM', render: d => (d as ExpenseLedgerDefinition).isRcmApplicable
                  ? <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20">RCM</Badge>
                  : <span className="text-xs text-muted-foreground">—</span> },
                { label: 'TDS Section', render: d => {
                  const exp = d as ExpenseLedgerDefinition;
                  return exp.isTdsApplicable ? <span className="text-xs font-mono">{exp.tdsSection}</span> : <span className="text-xs text-muted-foreground">—</span>;
                }},
                { label: 'Status', render: d => <Badge variant="outline" className={`text-[10px] ${d.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{d.status}</Badge> },
              ], 'No expense ledgers yet.')}
            </div>
          )}

          {/* Liabilities List */}
          {defSubTab === 'liabilities' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setLiabilityOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Liability</Button>
              </div>
              {renderDefTable(liabilityDefs, [
                { label: 'Name', render: d => <span className="font-medium">{d.name}</span> },
                { label: 'Numeric Code', render: d => <span className="font-mono text-xs text-teal-600">{d.numericCode || '—'}</span> },
                { label: 'Parent Group', render: d => <span className="text-xs">{d.parentGroupName}</span> },
                { label: 'Status', render: d => <Badge variant="outline" className={`text-[10px] ${d.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{d.status}</Badge> },
              ], 'No liability ledgers yet.')}
            </div>
          )}

          {/* Duties & Tax List */}
          {defSubTab === 'duties_tax' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setDutiesTaxOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Duties & Tax</Button>
              </div>
              {renderDefTable(dutiesTaxDefs, [
                { label: 'Name', render: d => <span className="font-medium">{d.name}</span> },
                { label: 'Numeric Code', render: d => <span className="font-mono text-xs text-teal-600">{d.numericCode || '—'}</span> },
                { label: 'Tax Type', render: d => <Badge variant="outline" className="text-[10px] uppercase">{(d as DutiesTaxLedgerDefinition).taxType}</Badge> },
                { label: 'GST Sub-type / Kind', render: d => {
                  const dt = d as DutiesTaxLedgerDefinition;
                  if (dt.taxType === 'gst') return <span className="text-xs uppercase">{dt.gstSubType} — {dt.calculationBasis === 'item_rate' ? 'On Item Rate' : dt.calculationBasis === 'ledger_value' ? `On Ledger Value (${dt.rate}%)` : '—'}</span>;
                  return <span className="text-xs text-muted-foreground">—</span>;
                }},
                { label: 'Status', render: d => <Badge variant="outline" className={`text-[10px] ${d.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{d.status}</Badge> },
              ], 'No duties & tax ledgers yet.')}
            </div>
          )}

          {/* Payroll Statutory List */}
          {defSubTab === 'payroll' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setPayrollStatOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Payroll Statutory</Button>
              </div>
              {renderDefTable(payrollStatDefs, [
                { label: 'Name', render: d => <span className="font-medium">{d.name}</span> },
                { label: 'Numeric Code', render: d => <span className="font-mono text-xs text-teal-600">{d.numericCode || '—'}</span> },
                { label: 'Category', render: d => <Badge variant="outline" className="text-[10px] capitalize">{(d as PayrollStatutoryLedgerDefinition).payrollCategory.replace('_', ' ')}</Badge> },
                { label: 'Rate', render: d => {
                  const p = d as PayrollStatutoryLedgerDefinition;
                  if (p.statutoryRate > 0) return <span className="text-xs">{p.statutoryRate}% of {p.calculationBase.replace('_',' ')}</span>;
                  if (p.calculationBase === 'state_slab' || p.calculationBase === 'state_specific') return <span className="text-xs text-muted-foreground">State-specific</span>;
                  if (p.calculationBase === 'slab') return <span className="text-xs text-muted-foreground">IT slab</span>;
                  return <span className="text-xs text-muted-foreground">{p.calculationBase}</span>;
                }},
                { label: 'Status', render: d => <Badge variant="outline" className={`text-[10px] ${d.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{d.status}</Badge> },
              ], 'No payroll statutory ledgers yet.')}
            </div>
          )}

          {/* Customer Master */}
          {defSubTab === 'customer' && <CustomerMasterPanel />}

          {/* Vendor Master */}
          {defSubTab === 'vendor' && <VendorMasterPanel />}

          {/* Logistic Master */}
          {defSubTab === 'logistic' && <LogisticMasterPanel />}

          {/* Branch & Division */}
          {defSubTab === 'branch_division' && (
            <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="font-medium">Branch & Division Master</p>
              <p className="text-xs mt-1">Coming soon in a future release.</p>
            </div>
          )}

          {/* Mode of Payment */}
          {defSubTab === 'mode_payment' && <ModeOfPaymentMasterPanel />}

          {/* Terms of Payment */}
          {defSubTab === 'terms_payment' && <TermsOfPaymentMasterPanel />}

          {/* Terms of Delivery */}
          {defSubTab === 'terms_delivery' && <TermsOfDeliveryMasterPanel />}
        </TabsContent>

        {/* Tab 2 — Opening Balances */}
        <TabsContent value="opening_balances">
          <div className="space-y-4" data-keyboard-form>
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">Entity:</Label>
              <Select value={selEntityId} onValueChange={setSelEntityId}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.shortCode})</SelectItem>)}
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
                        <TableHead>Type</TableHead>
                        <TableHead>Display Code</TableHead>
                        <TableHead>Opening Balance (₹)</TableHead>
                        <TableHead>Dr/Cr</TableHead>
                        <TableHead>Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInstances.map(inst => {
                        const def = getDefForInstance(inst);
                        const displayCode = `${inst.entityShortCode}/${inst.displayCode}`;
                        return (
                          <TableRow key={inst.id}>
                            <TableCell className="font-medium">{def?.name ?? '—'}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[9px]">{def?.ledgerType ?? '—'}</Badge></TableCell>
                            <TableCell className="font-mono text-xs">{displayCode}</TableCell>
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
                              <div className="flex rounded-md border border-input overflow-hidden text-xs font-medium">
                                <button type="button" onClick={() => setInstances(prev => prev.map(i => i.id === inst.id ? { ...i, openingBalanceType: 'Dr' } : i))}
                                  className={`px-2 py-1 transition-colors ${inst.openingBalanceType === 'Dr' ? 'bg-blue-500/15 text-blue-700' : 'text-muted-foreground'}`}>Dr</button>
                                <button type="button" onClick={() => setInstances(prev => prev.map(i => i.id === inst.id ? { ...i, openingBalanceType: 'Cr' } : i))}
                                  className={`px-2 py-1 transition-colors ${inst.openingBalanceType === 'Cr' ? 'bg-amber-500/15 text-amber-700' : 'text-muted-foreground'}`}>Cr</button>
                              </div>
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
            <DialogDescription>{cashEditTarget ? 'Update ledger definition details.' : 'Define a new cash ledger.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-keyboard-form>
            {renderParentGroupPicker(cashForm.parentGroupCode, L3_FINANCIAL_GROUPS.filter(g => g.code === 'CASH'), l4CashGroups,
              (code, name) => setCashForm(f => ({ ...f, parentGroupCode: code, parentGroupName: name })))}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ledger Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., Main Cash" value={cashForm.name} onKeyDown={onEnterNext}
                onChange={(e) => setCashForm(f => ({
                  ...f, name: e.target.value,
                  mailingName: (!f.mailingName || f.mailingName === f.name) ? e.target.value : f.mailingName,
                }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Mailing Name</Label>
              <Input value={cashForm.mailingName} onKeyDown={onEnterNext}
                onChange={(e) => setCashForm(f => ({ ...f, mailingName: e.target.value }))} />
            </div>
            {!cashEditTarget && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Opening Balance</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">₹</span>
                  <Input {...amountInputProps} className="flex-1" value={cashForm.openingBalance || ''} placeholder="0"
                    onChange={(e) => setCashForm(f => ({ ...f, openingBalance: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))}
                    onKeyDown={onEnterNext} />
                </div>
              </div>
            )}
            {!cashEditTarget && (
              <>
                <button type="button" onClick={() => setCashShowAdvanced(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  ⚙ <span>{cashShowAdvanced ? 'Hide advanced' : 'Advanced options'}</span>
                </button>
                {cashShowAdvanced && renderScopeSection(cashForm, setCashForm)}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCashCreateOpen(false); setCashEditTarget(null); }}>Cancel</Button>
            <Button data-primary onClick={handleCashSave}>{cashEditTarget ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Bank Create / Edit Dialog ─── */}
      <Dialog open={bankCreateOpen} onOpenChange={(open) => { if (!open) { setBankCreateOpen(false); setBankEditTarget(null); setIfscValid(null); setShowAccountPreview(false); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{bankEditTarget ? 'Edit Bank Ledger' : 'Create Bank Ledger'}</DialogTitle>
            <DialogDescription>{bankEditTarget ? 'Update bank ledger definition.' : 'Define a new bank account ledger.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-keyboard-form>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">IFSC Code <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input placeholder="e.g., HDFC0001234" value={bankForm.ifscCode} maxLength={11} onKeyDown={onEnterNext}
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
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ledger Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., HDFC Bank — Current A/c" value={bankForm.name} onKeyDown={onEnterNext}
                onChange={(e) => setBankForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Account Type <span className="text-destructive">*</span></Label>
              <Select value={bankForm.accountType} onValueChange={(v) => {
                const acType = v as BankAccountType;
                const suggested = getSuggestedParent(acType);
                setBankForm(f => ({
                  ...f, accountType: acType,
                  parentGroupCode: suggested.code, parentGroupName: suggested.name,
                  openingBalanceType: getDefaultNature(acType),
                }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select account type" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACCOUNT_TYPE_LABELS) as BankAccountType[]).map(k => (
                    <SelectItem key={k} value={k}>{ACCOUNT_TYPE_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!bankEditTarget && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Opening Balance</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">₹</span>
                  <Input {...amountInputProps} className="flex-1" value={bankForm.openingBalance || ''} placeholder="0" onKeyDown={onEnterNext}
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
            {!bankEditTarget && (
              <>
                <button type="button" onClick={() => setBankShowAdvanced(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  ⚙ <span>{bankShowAdvanced ? 'Hide advanced' : 'Advanced options'}</span>
                </button>
                {bankShowAdvanced && renderScopeSection(bankForm, setBankForm)}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBankCreateOpen(false); setBankEditTarget(null); setIfscValid(null); setShowAccountPreview(false); }}>Cancel</Button>
            <Button data-primary onClick={handleBankSave}>{bankEditTarget ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Liability Dialog ─── */}
      <Dialog open={liabilityOpen} onOpenChange={(open) => { if (!open) setLiabilityOpen(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Liability Ledger</DialogTitle>
            <DialogDescription>Define a liability account (Cr).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-keyboard-form>
            {renderParentGroupPicker(liabilityForm.parentGroupCode, liabilityL3, l4LiabilityGroups,
              (code, name) => setLiabilityForm(f => ({ ...f, parentGroupCode: code, parentGroupName: name })))}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ledger Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., Audit Fee Payable" value={liabilityForm.name} onKeyDown={onEnterNext}
                onChange={(e) => setLiabilityForm(f => ({
                  ...f, name: e.target.value,
                  mailingName: (!f.mailingName || f.mailingName === f.name) ? e.target.value : f.mailingName,
                }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Mailing Name</Label>
              <Input value={liabilityForm.mailingName} onKeyDown={onEnterNext}
                onChange={(e) => setLiabilityForm(f => ({ ...f, mailingName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Opening Balance</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">₹</span>
                <Input {...amountInputProps} className="flex-1" value={liabilityForm.openingBalance || ''} placeholder="0" onKeyDown={onEnterNext}
                  onChange={(e) => setLiabilityForm(f => ({ ...f, openingBalance: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))} />
                <div className="flex rounded-md border border-input overflow-hidden text-xs font-medium">
                  <button type="button" onClick={() => setLiabilityForm(f => ({ ...f, openingBalanceType: 'Dr' }))}
                    className={`px-3 py-1.5 transition-colors ${liabilityForm.openingBalanceType === 'Dr' ? 'bg-blue-500/15 text-blue-700' : 'text-muted-foreground'}`}>Dr</button>
                  <button type="button" onClick={() => setLiabilityForm(f => ({ ...f, openingBalanceType: 'Cr' }))}
                    className={`px-3 py-1.5 transition-colors ${liabilityForm.openingBalanceType === 'Cr' ? 'bg-amber-500/15 text-amber-700' : 'text-muted-foreground'}`}>Cr</button>
                </div>
              </div>
            </div>
            <button type="button" onClick={() => setLiabilityForm(f => ({ ...f, scope: f.scope === 'group' ? 'entity' : 'group' }))}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              ⚙ Advanced
            </button>
            {liabilityForm.scope === 'entity' && renderScopeSection(liabilityForm, setLiabilityForm)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLiabilityOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleLiabilitySave}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Capital Dialog ─── */}
      <Dialog open={capitalOpen} onOpenChange={(open) => { if (!open) setCapitalOpen(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Capital / Equity Ledger</DialogTitle>
            <DialogDescription>Define a capital account (Cr).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-keyboard-form>
            {renderParentGroupPicker(capitalForm.parentGroupCode, capitalL3, l4CapitalGroups,
              (code, name) => setCapitalForm(f => ({ ...f, parentGroupCode: code, parentGroupName: name })))}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Capital Type</Label>
              <Select value={capitalForm.capitalType} onValueChange={(v) => setCapitalForm(f => ({ ...f, capitalType: v as CapitalType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(CAPITAL_TYPE_LABELS)).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ledger Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., Equity Share Capital" value={capitalForm.name} onKeyDown={onEnterNext}
                onChange={(e) => setCapitalForm(f => ({
                  ...f, name: e.target.value,
                  mailingName: (!f.mailingName || f.mailingName === f.name) ? e.target.value : f.mailingName,
                }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Mailing Name</Label>
              <Input value={capitalForm.mailingName} onKeyDown={onEnterNext}
                onChange={(e) => setCapitalForm(f => ({ ...f, mailingName: e.target.value }))} />
            </div>
            {(capitalForm.capitalType === 'share_capital_equity' || capitalForm.capitalType === 'share_capital_preference') && (
              <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
                <p className="text-xs font-medium">Capital Details</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Authorised Capital</Label>
                    <Input {...amountInputProps} value={capitalForm.authorisedCapital || ''} onKeyDown={onEnterNext}
                      onChange={(e) => setCapitalForm(f => ({ ...f, authorisedCapital: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Issued Capital</Label>
                    <Input {...amountInputProps} value={capitalForm.issuedCapital || ''} onKeyDown={onEnterNext}
                      onChange={(e) => setCapitalForm(f => ({ ...f, issuedCapital: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Paid-Up Capital</Label>
                    <Input {...amountInputProps} value={capitalForm.paidUpCapital || ''} onKeyDown={onEnterNext}
                      onChange={(e) => setCapitalForm(f => ({ ...f, paidUpCapital: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Face Value/Share</Label>
                    <Input {...amountInputProps} value={capitalForm.faceValuePerShare || ''} onKeyDown={onEnterNext}
                      onChange={(e) => setCapitalForm(f => ({ ...f, faceValuePerShare: parseFloat(e.target.value.replace(/,/g, '')) || 10 }))} /></div>
                </div>
              </div>
            )}
            {capitalForm.capitalType === 'partners_capital' && (
              <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
                <p className="text-xs font-medium">Partner Details</p>
                <Input placeholder="Partner Name" value={capitalForm.partnerName} onKeyDown={onEnterNext}
                  onChange={(e) => setCapitalForm(f => ({ ...f, partnerName: e.target.value, mailingName: e.target.value }))} />
                <Input placeholder="Partner PAN" value={capitalForm.partnerPAN} maxLength={10} onKeyDown={onEnterNext}
                  onChange={(e) => setCapitalForm(f => ({ ...f, partnerPAN: e.target.value.toUpperCase() }))} />
                <Input {...amountInputProps} placeholder="Profit Sharing Ratio %" value={capitalForm.profitSharingRatio || ''} onKeyDown={onEnterNext}
                  onChange={(e) => setCapitalForm(f => ({ ...f, profitSharingRatio: parseFloat(e.target.value) || 0 }))} />
              </div>
            )}
            {capitalForm.capitalType === 'proprietor_capital' && (
              <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
                <p className="text-xs font-medium">Proprietor Details</p>
                <Input placeholder="Proprietor Name" value={capitalForm.proprietorName} onKeyDown={onEnterNext}
                  onChange={(e) => setCapitalForm(f => ({ ...f, proprietorName: e.target.value, mailingName: e.target.value }))} />
                <Input placeholder="Proprietor PAN" value={capitalForm.proprietorPAN} maxLength={10} onKeyDown={onEnterNext}
                  onChange={(e) => setCapitalForm(f => ({ ...f, proprietorPAN: e.target.value.toUpperCase() }))} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCapitalOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleCapitalSave}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Loan Receivable Dialog ─── */}
      <Dialog open={loanRecOpen} onOpenChange={(open) => { if (!open) setLoanRecOpen(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Loan Receivable</DialogTitle>
            <DialogDescription>Define a loan given (Dr).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-keyboard-form>
            {renderParentGroupPicker(loanRecForm.parentGroupCode, loanRecL3, l4LoanRecGroups,
              (code, name) => setLoanRecForm(f => ({ ...f, parentGroupCode: code, parentGroupName: name })))}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ledger Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., Loan to ABC Ltd" value={loanRecForm.name} onKeyDown={onEnterNext}
                onChange={(e) => setLoanRecForm(f => ({
                  ...f, name: e.target.value,
                  mailingName: (!f.mailingName || f.mailingName === f.name) ? e.target.value : f.mailingName,
                }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Borrower Name</Label>
              <Input value={loanRecForm.borrowerName} onKeyDown={onEnterNext}
                onChange={(e) => setLoanRecForm(f => ({ ...f, borrowerName: e.target.value, mailingName: e.target.value }))} />
            </div>
            <button type="button" onClick={() => {}} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              + Loan Terms
            </button>
            <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label className="text-xs">Loan Amount</Label>
                  <Input {...amountInputProps} value={loanRecForm.loanAmount || ''} onKeyDown={onEnterNext}
                    onChange={(e) => setLoanRecForm(f => ({ ...f, loanAmount: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Interest Rate %</Label>
                  <Input {...amountInputProps} value={loanRecForm.interestRate || ''} onKeyDown={onEnterNext}
                    onChange={(e) => setLoanRecForm(f => ({ ...f, interestRate: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Tenure (months)</Label>
                  <Input {...amountInputProps} value={loanRecForm.tenureMonths || ''} onKeyDown={onEnterNext}
                    onChange={(e) => setLoanRecForm(f => ({ ...f, tenureMonths: parseInt(e.target.value) || 0 }))} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={loanRecForm.isTdsApplicable}
                  onCheckedChange={(v) => setLoanRecForm(f => ({ ...f, isTdsApplicable: v, tdsSection: v ? '194A' : '' }))} />
                <Label className="text-sm">TDS on Interest (194A)</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoanRecOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleLoanRecSave}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Borrowing Dialog ─── */}
      <Dialog open={borrowingOpen} onOpenChange={(open) => { if (!open) setBorrowingOpen(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Borrowing Ledger</DialogTitle>
            <DialogDescription>Define a loan taken (Cr).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-keyboard-form>
            {renderParentGroupPicker(borrowingForm.parentGroupCode, borrowingL3, l4BorrowingGroups,
              (code, name) => setBorrowingForm(f => ({ ...f, parentGroupCode: code, parentGroupName: name })))}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ledger Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., HDFC Term Loan" value={borrowingForm.name} onKeyDown={onEnterNext}
                onChange={(e) => setBorrowingForm(f => ({
                  ...f, name: e.target.value,
                  mailingName: (!f.mailingName || f.mailingName === f.name) ? e.target.value : f.mailingName,
                }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Lender Name</Label>
              <Input value={borrowingForm.lenderName} onKeyDown={onEnterNext}
                onChange={(e) => setBorrowingForm(f => ({ ...f, lenderName: e.target.value, mailingName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Lender Type</Label>
              <Select value={borrowingForm.lenderType} onValueChange={(v: any) => setBorrowingForm(f => ({ ...f, lenderType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LENDER_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
              <p className="text-xs font-medium">Loan Terms</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label className="text-xs">Loan Amount</Label>
                  <Input {...amountInputProps} value={borrowingForm.loanAmount || ''} onKeyDown={onEnterNext}
                    onChange={(e) => setBorrowingForm(f => ({ ...f, loanAmount: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Interest Rate %</Label>
                  <Input {...amountInputProps} value={borrowingForm.interestRate || ''} onKeyDown={onEnterNext}
                    onChange={(e) => setBorrowingForm(f => ({ ...f, interestRate: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Loan Type</Label>
                  <Select value={borrowingForm.loanType} onValueChange={(v: any) => setBorrowingForm(f => ({ ...f, loanType: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LOAN_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Tenure (months)</Label>
                  <Input {...amountInputProps} value={borrowingForm.tenureMonths || ''} onKeyDown={onEnterNext}
                    onChange={(e) => setBorrowingForm(f => ({ ...f, tenureMonths: parseInt(e.target.value) || 0 }))} /></div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">First EMI Date</Label>
                <SmartDateInput value={borrowingForm.firstEmiDate} onChange={(v) => setBorrowingForm(f => ({ ...f, firstEmiDate: v }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Loan Account No.</Label>
                <Input value={borrowingForm.loanAccountNo} onKeyDown={onEnterNext}
                  onChange={(e) => setBorrowingForm(f => ({ ...f, loanAccountNo: e.target.value }))} />
              </div>
              {borrowingEMIPreview > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-teal-500/10 text-teal-600 border-teal-500/20 text-xs">
                    EMI: ₹{borrowingEMIPreview.toLocaleString('en-IN')}/month
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Total Interest: ₹{Math.round(borrowingTotalInterest).toLocaleString('en-IN')}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Total Payment: ₹{Math.round(borrowingTotalPayment).toLocaleString('en-IN')}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBorrowingOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleBorrowingSave}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Income Dialog ─── */}
      <Dialog open={incomeOpen} onOpenChange={(open) => { if (!open) setIncomeOpen(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Income Ledger</DialogTitle>
            <DialogDescription>Define an income account (Cr).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-keyboard-form>
            {renderParentGroupPicker(incomeForm.parentGroupCode, incomeL3, l4IncomeGroups,
              (code, name) => setIncomeForm(f => ({ ...f, parentGroupCode: code, parentGroupName: name })))}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ledger Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., Consulting Revenue" value={incomeForm.name} onKeyDown={onEnterNext}
                onChange={(e) => setIncomeForm(f => ({
                  ...f, name: e.target.value,
                  mailingName: (!f.mailingName || f.mailingName === f.name) ? e.target.value : f.mailingName,
                }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Mailing Name</Label>
              <Input value={incomeForm.mailingName} onKeyDown={onEnterNext}
                onChange={(e) => setIncomeForm(f => ({ ...f, mailingName: e.target.value }))} />
            </div>
            <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">GST Applicable</Label>
                <Switch checked={incomeForm.isGstApplicable}
                  onCheckedChange={(v) => setIncomeForm(f => ({ ...f, isGstApplicable: v }))} />
              </div>
              {incomeForm.isGstApplicable && (
                <div className="space-y-2">
                  <HSNSACCombobox value={incomeForm.hsnSacCode} codeType="sac"
                    onSelect={(code) => applyHsnSac(code, setIncomeForm)} />
                  {incomeForm.hsnSacCode && (
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <Badge variant="outline">Rate {incomeForm.gstRate}%</Badge>
                      <Badge variant="outline">CGST {incomeForm.cgstRate}%</Badge>
                      <Badge variant="outline">SGST {incomeForm.sgstRate}%</Badge>
                      <Badge variant="outline">IGST {incomeForm.igstRate}%</Badge>
                      <Badge variant="outline">Cess {incomeForm.cessRate || 'Nil'}</Badge>
                      <Badge variant="outline">Type: {incomeForm.gstType}</Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Switch checked={incomeForm.includeInGstTurnover}
                      onCheckedChange={(v) => setIncomeForm(f => ({ ...f, includeInGstTurnover: v }))} />
                    <Label className="text-xs">Include in GST Turnover</Label>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">TDS Applicable</Label>
                <Switch checked={incomeForm.isTdsApplicable}
                  onCheckedChange={(v) => setIncomeForm(f => ({ ...f, isTdsApplicable: v }))} />
              </div>
              {incomeForm.isTdsApplicable && (
                <Select value={incomeForm.tdsSection} onValueChange={(v) => setIncomeForm(f => ({ ...f, tdsSection: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select TDS section" /></SelectTrigger>
                  <SelectContent>
                    {TDS_SECTIONS.filter(s => s.status === 'active').map(s => (
                      <SelectItem key={s.sectionCode} value={s.sectionCode}>
                        {s.sectionCode} — {s.natureOfPayment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncomeOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleIncomeSave}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Expense Dialog ─── */}
      <Dialog open={expenseOpen} onOpenChange={(open) => { if (!open) setExpenseOpen(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Expense Ledger</DialogTitle>
            <DialogDescription>Define an expense account (Dr).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-keyboard-form>
            {renderParentGroupPicker(expenseForm.parentGroupCode, expenseL3, l4ExpenseGroups,
              (code, name) => setExpenseForm(f => ({ ...f, parentGroupCode: code, parentGroupName: name })))}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ledger Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., Rent Expense" value={expenseForm.name} onKeyDown={onEnterNext}
                onChange={(e) => setExpenseForm(f => ({
                  ...f, name: e.target.value,
                  mailingName: (!f.mailingName || f.mailingName === f.name) ? e.target.value : f.mailingName,
                }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Mailing Name</Label>
              <Input value={expenseForm.mailingName} onKeyDown={onEnterNext}
                onChange={(e) => setExpenseForm(f => ({ ...f, mailingName: e.target.value }))} />
            </div>
            <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">GST & ITC</Label>
                <Switch checked={expenseForm.isGstApplicable}
                  onCheckedChange={(v) => setExpenseForm(f => ({ ...f, isGstApplicable: v }))} />
              </div>
              {expenseForm.isGstApplicable && (
                <div className="space-y-2">
                  <HSNSACCombobox value={expenseForm.hsnSacCode} codeType="both"
                    onSelect={(code) => applyHsnSac(code, setExpenseForm)} />
                  {expenseForm.hsnSacCode && (
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <Badge variant="outline">Rate {expenseForm.gstRate}%</Badge>
                      <Badge variant="outline">CGST {expenseForm.cgstRate}%</Badge>
                      <Badge variant="outline">SGST {expenseForm.sgstRate}%</Badge>
                      <Badge variant="outline">IGST {expenseForm.igstRate}%</Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Switch checked={expenseForm.isItcEligible}
                      onCheckedChange={(v) => setExpenseForm(f => ({ ...f, isItcEligible: v }))} />
                    <Label className="text-xs">ITC Eligible</Label>
                  </div>
                  {!expenseForm.isItcEligible && (
                    <p className="text-[10px] text-amber-600">⚠ Blocked under Section 17(5) — ITC not claimable</p>
                  )}
                </div>
              )}
            </div>
            {expenseForm.isRcmApplicable && (
              <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">RCM Applicable</Label>
                  <Switch checked={expenseForm.isRcmApplicable}
                    onCheckedChange={(v) => setExpenseForm(f => ({ ...f, isRcmApplicable: v }))} />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="radio" name="rcm" checked={expenseForm.rcmSection === 'section_9_3'}
                      onChange={() => setExpenseForm(f => ({ ...f, rcmSection: 'section_9_3' }))} />
                    Section 9(3) — Supplier is unregistered, you pay GST on their behalf
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="radio" name="rcm" checked={expenseForm.rcmSection === 'section_9_4'}
                      onChange={() => setExpenseForm(f => ({ ...f, rcmSection: 'section_9_4' }))} />
                    Section 9(4) — Specific notified services (e.g., legal, GTA, sponsorship)
                  </label>
                </div>
              </div>
            )}
            <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">TDS Applicable</Label>
                <Switch checked={expenseForm.isTdsApplicable}
                  onCheckedChange={(v) => setExpenseForm(f => ({ ...f, isTdsApplicable: v }))} />
              </div>
              {expenseForm.isTdsApplicable && (
                <Select value={expenseForm.tdsSection} onValueChange={(v) => setExpenseForm(f => ({ ...f, tdsSection: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select TDS section" /></SelectTrigger>
                  <SelectContent>
                    {TDS_SECTIONS.filter(s => s.status === 'active').map(s => (
                      <SelectItem key={s.sectionCode} value={s.sectionCode}>
                        {s.sectionCode} — {s.natureOfPayment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Expense Nature</Label>
              <div className="flex rounded-md border border-input overflow-hidden text-xs font-medium">
                <button type="button" onClick={() => setExpenseForm(f => ({ ...f, expenseNature: 'revenue' }))}
                  className={`flex-1 px-3 py-1.5 transition-colors ${expenseForm.expenseNature === 'revenue' ? 'bg-blue-500/15 text-blue-700' : 'text-muted-foreground'}`}>Revenue</button>
                <button type="button" onClick={() => setExpenseForm(f => ({ ...f, expenseNature: 'capital_expense' }))}
                  className={`flex-1 px-3 py-1.5 transition-colors ${expenseForm.expenseNature === 'capital_expense' ? 'bg-blue-500/15 text-blue-700' : 'text-muted-foreground'}`}>Capital</button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleExpenseSave}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Mark Paid Dialog ─── */}
      <Dialog open={markPaidOpen} onOpenChange={(open) => { if (!open) setMarkPaidOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark EMI as Paid</DialogTitle>
            <DialogDescription>Record payment for month {markPaidTarget?.month}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-keyboard-form>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Paid Amount</Label>
              <Input {...amountInputProps} value={markPaidForm.paidAmount || ''} onKeyDown={onEnterNext}
                onChange={(e) => setMarkPaidForm(f => ({ ...f, paidAmount: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Paid Date</Label>
              <SmartDateInput value={markPaidForm.paidDate} onChange={(v) => setMarkPaidForm(f => ({ ...f, paidDate: v }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Payment Reference</Label>
              <Input placeholder="Cheque No. / UTR / NEFT Ref" value={markPaidForm.paymentReference} onKeyDown={onEnterNext}
                onChange={(e) => setMarkPaidForm(f => ({ ...f, paymentReference: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Narration</Label>
              <Input placeholder="Optional" value={markPaidForm.narration} onKeyDown={onEnterNext}
                onChange={(e) => setMarkPaidForm(f => ({ ...f, narration: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPaidOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleMarkPaid}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Duties & Tax Dialog ─── */}
      <Dialog open={dutiesTaxOpen} onOpenChange={(open) => { if (!open) setDutiesTaxOpen(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Duties & Tax Ledger</DialogTitle>
            <DialogDescription>Create a GST, TDS, TCS, or other statutory tax ledger.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-keyboard-form>
            {/* Step 1 — Tax Type */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Tax Type <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                {(['gst', 'tds', 'tcs', 'other'] as TaxType[]).map(tt => (
                  <button key={tt} type="button" onClick={() => {
                    const d = getDutiesTaxDefaults(tt, tt === 'gst' ? 'cgst' : null);
                    setDutiesTaxForm(f => ({ ...f, taxType: tt, gstSubType: tt === 'gst' ? 'cgst' : null, ...d }));
                  }} className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                    dutiesTaxForm.taxType === tt ? 'bg-teal-500/15 text-teal-700 border-teal-500/40' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                  }`}>{tt.toUpperCase()}</button>
                ))}
              </div>
            </div>

            {/* Step 2 — GST Sub-Type */}
            {dutiesTaxForm.taxType === 'gst' && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">GST Type <span className="text-destructive">*</span></Label>
                <div className="flex gap-2">
                  {(['cgst', 'sgst', 'igst', 'cess'] as const).map(st => (
                    <button key={st} type="button" onClick={() => {
                      const d = getDutiesTaxDefaults('gst', st);
                      setDutiesTaxForm(f => ({ ...f, gstSubType: st, ...d }));
                    }} className={`px-3 py-1.5 rounded-lg border text-xs font-medium uppercase transition-colors ${
                      dutiesTaxForm.gstSubType === st ? 'bg-blue-500/15 text-blue-700 border-blue-500/40' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                    }`}>{st}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3 — Name + Mailing Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ledger Name <span className="text-destructive">*</span></Label>
              <Input value={dutiesTaxForm.name} onKeyDown={onEnterNext}
                onChange={(e) => setDutiesTaxForm(f => ({ ...f, name: e.target.value, mailingName: (!f.mailingName || f.mailingName === f.name) ? e.target.value : f.mailingName }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Mailing Name</Label>
              <Input value={dutiesTaxForm.mailingName} onKeyDown={onEnterNext}
                onChange={(e) => setDutiesTaxForm(f => ({ ...f, mailingName: e.target.value }))} />
            </div>

            {/* Step 4 — Calculation Basis (GST only) */}
            {dutiesTaxForm.taxType === 'gst' && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Calculation Basis</Label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setDutiesTaxForm(f => ({ ...f, calculationBasis: 'item_rate' }))}
                    className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      dutiesTaxForm.calculationBasis === 'item_rate' ? 'bg-teal-500/15 text-teal-700 border-teal-500/40' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                    }`}>
                    <div>On Item Rate</div>
                    <div className="text-[10px] text-muted-foreground">GST rate from HSN/item code</div>
                  </button>
                  <button type="button" onClick={() => setDutiesTaxForm(f => ({ ...f, calculationBasis: 'ledger_value' }))}
                    className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      dutiesTaxForm.calculationBasis === 'ledger_value' ? 'bg-teal-500/15 text-teal-700 border-teal-500/40' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                    }`}>
                    <div>On Ledger Value</div>
                    <div className="text-[10px] text-muted-foreground">Fixed % × voucher amount</div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 5 — Rate (only when ledger_value) */}
            {dutiesTaxForm.calculationBasis === 'ledger_value' && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Tax Rate</Label>
                <div className="flex items-center gap-1">
                  <Input type="number" className="w-24" value={dutiesTaxForm.rate || ''} onKeyDown={onEnterNext}
                    onChange={(e) => setDutiesTaxForm(f => ({ ...f, rate: parseFloat(e.target.value) || 0 }))} />
                  <span className="text-muted-foreground text-sm">%</span>
                </div>
              </div>
            )}

            {/* Opening Balance */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Opening Balance</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">₹</span>
                <Input {...amountInputProps} value={dutiesTaxForm.openingBalance || ''} placeholder="0" onKeyDown={onEnterNext}
                  onChange={(e) => setDutiesTaxForm(f => ({ ...f, openingBalance: parseFloat(e.target.value.replace(/,/g,'')) || 0 }))} />
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">Cr</Badge>
              </div>
            </div>

            {/* Advanced — Entity Scope */}
            <button type="button" onClick={() => setDutiesTaxForm(f => ({ ...f, scope: f.scope === 'group' ? 'entity' : 'group' } as any))}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ChevronDown className="h-3 w-3" /> Advanced
            </button>
            {(dutiesTaxForm as any).scope === 'entity' && renderScopeSection(dutiesTaxForm as any, setDutiesTaxForm)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDutiesTaxOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleDutiesTaxSave}>Create Ledger</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Payroll Statutory Dialog ─── */}
      <Dialog open={payrollStatOpen} onOpenChange={(open) => { if (!open) setPayrollStatOpen(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Payroll Statutory Ledger</DialogTitle>
            <DialogDescription>Create a statutory deduction or contribution holding account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-keyboard-form>
            {/* Step 1 — Category */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Category <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPayrollForm(f => ({ ...f, payrollCategory: 'employee_deduction', payrollComponent: '' }))}
                  className={`p-3 rounded-xl border text-sm font-medium transition-colors flex-1 text-left ${
                    payrollForm.payrollCategory === 'employee_deduction' ? 'bg-teal-500/15 text-teal-700 border-teal-500/40' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                  }`}>
                  <div>Employees' Statutory Deductions</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">PF · ESI · PT · TDS deducted from salary</div>
                </button>
                <button type="button" onClick={() => setPayrollForm(f => ({ ...f, payrollCategory: 'employer_contribution', payrollComponent: '' }))}
                  className={`p-3 rounded-xl border text-sm font-medium transition-colors flex-1 text-left ${
                    payrollForm.payrollCategory === 'employer_contribution' ? 'bg-teal-500/15 text-teal-700 border-teal-500/40' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                  }`}>
                  <div>Employer's Statutory Contributions</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">PF · ESI · EDLI · LWF · Gratuity</div>
                </button>
              </div>
            </div>

            {/* Step 2 — Component chips */}
            {payrollForm.payrollCategory && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Component <span className="text-destructive">*</span></Label>
                <div className="flex flex-wrap gap-2">
                  {(payrollForm.payrollCategory === 'employee_deduction'
                    ? (['pf_employee','esi_employee','pt_employee','tds_salary'] as PayrollComponent[])
                    : (['pf_employer_epf','pf_employer_eps','pf_edli','esi_employer','lwf_employer','gratuity_provision'] as PayrollComponent[])
                  ).map(comp => {
                    const d = PAYROLL_COMPONENT_DEFAULTS[comp];
                    return (
                      <button key={comp} type="button" onClick={() => setPayrollForm(f => ({ ...f, payrollComponent: comp, name: d.name, mailingName: d.name }))}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          payrollForm.payrollComponent === comp ? 'bg-blue-500/15 text-blue-700 border-blue-500/40' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                        }`}>{d.name}</button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3 — Ledger Name */}
            {payrollForm.payrollComponent && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Ledger Name <span className="text-destructive">*</span></Label>
                <Input value={payrollForm.name} onKeyDown={onEnterNext}
                  onChange={(e) => setPayrollForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            )}

            {/* Step 4 — Rate Info (READ ONLY) */}
            {payrollForm.payrollComponent && (() => {
              const d = PAYROLL_COMPONENT_DEFAULTS[payrollForm.payrollComponent as PayrollComponent];
              return (
                <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 space-y-1.5">
                  <p className="text-xs font-medium text-teal-700">Statutory Rate (not editable — set by law)</p>
                  {d.statutoryRate > 0 && <Badge variant="outline" className="text-[10px] bg-teal-500/10 text-teal-700 border-teal-500/30">{d.statutoryRate}% of {d.calculationBase.replace('_',' ')}</Badge>}
                  {d.calculationBase === 'state_slab' && <p className="text-[10px] text-muted-foreground">Rate varies by state · Managed in PT Master</p>}
                  {d.calculationBase === 'state_specific' && <p className="text-[10px] text-muted-foreground">Amount varies by state · Managed in LWF Master</p>}
                  {d.calculationBase === '15/26 x basic x years' && <p className="text-[10px] text-muted-foreground">15/26 × Basic × Years of Service</p>}
                  {d.wageCeiling && <p className="text-[10px] text-muted-foreground">Wage ceiling: ₹{d.wageCeiling.toLocaleString('en-IN')}/month</p>}
                  {d.maxAmount && <p className="text-[10px] text-muted-foreground">Maximum: ₹{d.maxAmount.toLocaleString('en-IN')}</p>}
                </div>
              );
            })()}

            {/* Opening Balance */}
            {payrollForm.payrollComponent && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Opening Balance</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">₹</span>
                  <Input {...amountInputProps} value={payrollForm.openingBalance || ''} placeholder="0" onKeyDown={onEnterNext}
                    onChange={(e) => setPayrollForm(f => ({ ...f, openingBalance: parseFloat(e.target.value.replace(/,/g,'')) || 0 }))} />
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">Cr</Badge>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayrollStatOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handlePayrollStatSave}>Create Ledger</Button>
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
            <div className="border-t border-border pt-3 space-y-3">
              <p className="text-xs font-medium">Add Signatory</p>
              <Input placeholder="Name" value={signatoryForm.name} onKeyDown={onEnterNext}
                onChange={(e) => setSignatoryForm(f => ({ ...f, name: e.target.value }))} />
              <Input placeholder="Designation" value={signatoryForm.designation} onKeyDown={onEnterNext}
                onChange={(e) => setSignatoryForm(f => ({ ...f, designation: e.target.value }))} />
              <div className="space-y-1">
                <Label className="text-xs">Signing Limit (₹, 0 = unlimited)</Label>
                <Input {...amountInputProps} value={signatoryForm.signingLimit || ''} placeholder="0" onKeyDown={onEnterNext}
                  onChange={(e) => setSignatoryForm(f => ({ ...f, signingLimit: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))} />
              </div>
            </div>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChequeIssueOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleChequeIssue}>Issue Cheque</Button>
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
