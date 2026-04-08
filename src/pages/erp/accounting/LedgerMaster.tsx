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
  PiggyBank, HandCoins, Edit2, Ban, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { loadEntities } from '@/data/mock-entities';
import {
  L3_FINANCIAL_GROUPS, L4_INDUSTRY_PACKS,
  deriveL3NumericCode, deriveLedgerNumericCode, L3_NUMERIC_MAP,
} from '@/data/finframe-seed-data';
import { onEnterNext, useCtrlS, amountInputProps } from '@/lib/keyboard';

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

// ─── Types (Two-Table Architecture) ───────────────────────────────────

interface CashLedgerDefinition {
  id: string;
  ledgerType: 'cash';
  // Identity
  name: string;
  numericCode: string;
  code: string;
  alias: string;
  // Parent
  parentGroupCode: string;
  parentGroupName: string;
  // Scope
  entityId: string | null;
  entityShortCode: string | null;
  // Cash controls
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
  name: string;
  code: string;
  alias: string;
  parentGroupCode: string;
  parentGroupName: string;
  entityId: string | null;
  entityShortCode: string | null;
  status: 'active' | 'inactive';
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: BankAccountType;
  odLimit: number;
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

// ─── Helpers ──────────────────────────────────────────────────────────

const validateIFSC = (code: string): boolean =>
  /^[A-Z]{4}0[A-Z0-9]{6}$/.test(code.toUpperCase());

const getDefaultNature = (type: BankAccountType): 'Dr' | 'Cr' =>
  ['cash_credit', 'overdraft'].includes(type) ? 'Cr' : 'Dr';

const getSuggestedParent = (type: BankAccountType) => {
  if (['cash_credit', 'overdraft'].includes(type))
    return { code: 'STBOR', name: 'Short-Term Borrowings (Bank OD A/c)' };
  return { code: 'BANK', name: 'Bank Balances (Bank Accounts)' };
};

const maskAccountNo = (num: string): string => {
  if (num.length <= 4) return num;
  return '•'.repeat(num.length - 4) + num.slice(-4);
};

// ─── localStorage Helpers ─────────────────────────────────────────────

const loadAllDefinitions = (): AnyLedgerDefinition[] => {
  const raw = localStorage.getItem('erp_group_ledger_definitions');
  if (!raw) return [];
  const all = JSON.parse(raw);
  return all.map((d: any) => ({
    ...d,
    ledgerType: d.ledgerType ?? 'cash',
    // Backward compat: cash control fields
    numericCode: d.numericCode ?? '',
    location: d.location ?? '',
    cashLimit: d.cashLimit ?? 0,
    alertThreshold: d.alertThreshold ?? 0,
    isMainCash: d.isMainCash ?? false,
    voucherSeries: d.voucherSeries ?? 'CR',
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
  }));
};

const saveInstance = (inst: EntityLedgerInstance) => {
  const raw = localStorage.getItem(`erp_entity_${inst.entityId}_ledger_instances`);
  const all: EntityLedgerInstance[] = raw ? JSON.parse(raw).map((i: any) => ({
    ...i,
    openingBalanceType: i.openingBalanceType ?? 'Dr',
    displayNumericCode: i.displayNumericCode ?? '',
    currentCustodian: i.currentCustodian ?? null,
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
      displayNumericCode: `${entity.shortCode}/${'numericCode' in def ? (def as CashLedgerDefinition).numericCode || def.code : def.code}`,
      currentCustodian: null,
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

// ─── Default Bank Form ────────────────────────────────────────────────

const defaultBankForm = {
  parentGroupCode: 'BANK',
  parentGroupName: 'Bank Balances (Bank Accounts)',
  name: '',
  alias: '',
  bankName: '',
  bankNameOther: '',
  accountNumber: '',
  ifscCode: '',
  accountType: '' as BankAccountType | '',
  odLimit: 0,
  openingBalance: 0,
  openingBalanceType: 'Dr' as 'Dr' | 'Cr',
  scope: 'group' as 'group' | 'entity',
  entityId: '',
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
    parentGroupName: 'Cash & Cash Equivalents (Cash-in-Hand)',
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

  // ── Cash Quick Start ──
  const handleCashQuickStart = (name: string) => {
    setCashForm({ ...defaultCashForm, name });
    setCashEditTarget(null);
    setCashCreateOpen(true);
  };

  // ── Bank Quick Start ──
  const handleBankQuickStart = (preset: Partial<typeof defaultBankForm>) => {
    setBankForm({ ...defaultBankForm, ...preset });
    setBankEditTarget(null);
    setBankCreateOpen(true);
  };

  // ── Open Cash Create ──
  const openCashCreate = () => {
    setCashForm(defaultCashForm);
    setCashEditTarget(null);
    setCashCreateOpen(true);
  };

  // ── Open Cash Edit ──
  const openCashEdit = (def: CashLedgerDefinition) => {
    setCashEditTarget(def);
    setCashForm({
      parentGroupCode: def.parentGroupCode,
      parentGroupName: def.parentGroupName,
      name: def.name,
      alias: def.alias,
      openingBalance: 0,
      scope: def.entityId ? 'entity' : 'group',
      entityId: def.entityId ?? '',
      location: def.location ?? '',
      cashLimit: def.cashLimit ?? 0,
      alertThreshold: def.alertThreshold ?? 0,
      isMainCash: def.isMainCash ?? false,
      voucherSeries: def.voucherSeries ?? 'CR',
      openingBalanceType: 'Dr',
    });
    setCashCreateOpen(true);
  };

  // ── Open Bank Create ──
  const openBankCreate = () => {
    setBankForm(defaultBankForm);
    setBankEditTarget(null);
    setIfscValid(null);
    setShowAccountPreview(false);
    setBankCreateOpen(true);
  };

  // ── Open Bank Edit ──
  const openBankEdit = (def: BankLedgerDefinition) => {
    setBankEditTarget(def);
    setBankForm({
      parentGroupCode: def.parentGroupCode,
      parentGroupName: def.parentGroupName,
      name: def.name,
      alias: def.alias,
      bankName: INDIAN_BANKS.includes(def.bankName as any) ? def.bankName : 'Other',
      bankNameOther: INDIAN_BANKS.includes(def.bankName as any) ? '' : def.bankName,
      accountNumber: def.accountNumber,
      ifscCode: def.ifscCode,
      accountType: def.accountType,
      odLimit: def.odLimit,
      openingBalance: 0,
      openingBalanceType: getDefaultNature(def.accountType),
      scope: def.entityId ? 'entity' : 'group',
      entityId: def.entityId ?? '',
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
        name: cashForm.name.trim(),
        alias: cashForm.alias.trim(),
        parentGroupCode: cashForm.parentGroupCode,
        parentGroupName: cashForm.parentGroupName,
        location: cashForm.location,
        cashLimit: cashForm.cashLimit,
        alertThreshold: cashForm.alertThreshold,
        isMainCash: cashForm.isMainCash,
        voucherSeries: cashForm.voucherSeries || 'CR',
      };
      saveDefinition(updated);
      toast.success(`${updated.name} updated`);
    } else if (cashForm.scope === 'group') {
      const code = genCashGroupCode(all);
      const numericCode = genCashNumericCode(all, cashForm.parentGroupCode);
      const def: CashLedgerDefinition = {
        id: crypto.randomUUID(), ledgerType: 'cash',
        name: cashForm.name.trim(), code, numericCode,
        alias: cashForm.alias.trim(),
        parentGroupCode: cashForm.parentGroupCode,
        parentGroupName: cashForm.parentGroupName,
        entityId: null, entityShortCode: null,
        location: cashForm.location,
        cashLimit: cashForm.cashLimit,
        alertThreshold: cashForm.alertThreshold,
        isMainCash: cashForm.isMainCash,
        voucherSeries: cashForm.voucherSeries || 'CR',
        status: 'active',
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
        name: cashForm.name.trim(), code, numericCode,
        alias: cashForm.alias.trim(),
        parentGroupCode: cashForm.parentGroupCode,
        parentGroupName: cashForm.parentGroupName,
        entityId: entity.id, entityShortCode: entity.shortCode,
        location: cashForm.location,
        cashLimit: cashForm.cashLimit,
        alertThreshold: cashForm.alertThreshold,
        isMainCash: cashForm.isMainCash,
        voucherSeries: cashForm.voucherSeries || 'CR',
        status: 'active',
      };
      saveDefinition(def);
      saveInstance({
        id: crypto.randomUUID(),
        ledgerDefinitionId: def.id,
        entityId: entity.id, entityName: entity.name,
        entityShortCode: entity.shortCode,
        openingBalance: cashForm.openingBalance,
        openingBalanceType: 'Dr',
        isActive: true, displayCode: def.code,
        displayNumericCode: `${entity.shortCode}/${numericCode}`,
        currentCustodian: null,
      });
      toast.success(`${code} created for ${entity.name}`);
    }

    setCashCreateOpen(false);
    setCashEditTarget(null);
    setCashForm(defaultCashForm);
    refreshAll();
  };

  // ── Save Bank ──
  const handleBankSave = () => {
    if (!bankForm.name.trim()) return toast.error('Ledger name is required');
    const resolvedBankName = bankForm.bankName === 'Other' ? bankForm.bankNameOther.trim() : bankForm.bankName;
    if (!resolvedBankName) return toast.error('Select a bank');
    if (!bankForm.accountNumber) return toast.error('Account number is required');
    if (!validateIFSC(bankForm.ifscCode)) return toast.error('Invalid IFSC code');
    if (!bankForm.accountType) return toast.error('Select account type');

    const all = loadAllDefinitions();

    if (bankEditTarget) {
      const updated: BankLedgerDefinition = {
        ...bankEditTarget,
        name: bankForm.name.trim(),
        alias: bankForm.alias.trim(),
        parentGroupCode: bankForm.parentGroupCode,
        parentGroupName: bankForm.parentGroupName,
        bankName: resolvedBankName,
        accountNumber: bankForm.accountNumber,
        ifscCode: bankForm.ifscCode.toUpperCase(),
        accountType: bankForm.accountType as BankAccountType,
        odLimit: bankForm.odLimit,
      };
      saveDefinition(updated);
      toast.success(`${updated.name} updated`);
    } else if (bankForm.scope === 'group') {
      const code = genBankGroupCode(all);
      const def: BankLedgerDefinition = {
        id: crypto.randomUUID(), ledgerType: 'bank',
        name: bankForm.name.trim(), code, alias: bankForm.alias.trim(),
        parentGroupCode: bankForm.parentGroupCode,
        parentGroupName: bankForm.parentGroupName,
        entityId: null, entityShortCode: null, status: 'active',
        bankName: resolvedBankName,
        accountNumber: bankForm.accountNumber,
        ifscCode: bankForm.ifscCode.toUpperCase(),
        accountType: bankForm.accountType as BankAccountType,
        odLimit: bankForm.odLimit,
      };
      saveDefinition(def);
      autoCreateInstances(def, bankForm.openingBalance, bankForm.openingBalanceType);
      toast.success(`${def.name} created. Opening balances set for ${entities.length} entities.`);
    } else {
      const entity = entities.find(e => e.id === bankForm.entityId);
      if (!entity) return toast.error('Select an entity');
      const code = genBankEntityCode(all, entity.shortCode);
      const def: BankLedgerDefinition = {
        id: crypto.randomUUID(), ledgerType: 'bank',
        name: bankForm.name.trim(), code, alias: bankForm.alias.trim(),
        parentGroupCode: bankForm.parentGroupCode,
        parentGroupName: bankForm.parentGroupName,
        entityId: entity.id, entityShortCode: entity.shortCode, status: 'active',
        bankName: resolvedBankName, accountNumber: bankForm.accountNumber,
        ifscCode: bankForm.ifscCode.toUpperCase(), accountType: bankForm.accountType as BankAccountType,
        odLimit: bankForm.odLimit,
      };
      saveDefinition(def);
      saveInstance({
        id: crypto.randomUUID(), ledgerDefinitionId: def.id,
        entityId: entity.id, entityName: entity.name,
        entityShortCode: entity.shortCode,
        openingBalance: bankForm.openingBalance,
        openingBalanceType: bankForm.openingBalanceType,
        isActive: true, displayCode: def.code,
        displayNumericCode: `${entity.shortCode}/${def.code}`,
        currentCustodian: null,
      });
      toast.success(`${code} created for ${entity.name}`);
    }

    setBankCreateOpen(false);
    setBankEditTarget(null);
    setBankForm(defaultBankForm);
    setIfscValid(null);
    setShowAccountPreview(false);
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

    // 1. Close previous custodian history record
    if (inst.currentCustodian) {
      const existing = loadCustodianHistory(inst.entityId, inst.ledgerDefinitionId);
      const updatedHistory = existing.map(h =>
        h.toDate === null
          ? { ...h, toDate: now, handoverToName: custodianForm.name }
          : h
      );
      const key = `erp_entity_${inst.entityId}_custodian_history_${inst.ledgerDefinitionId}`;
      localStorage.setItem(key, JSON.stringify(updatedHistory));
    }

    // 2. Append new custodian history record (IMMUTABLE)
    const newRecord: CustodianHistoryRecord = {
      id: crypto.randomUUID(),
      ledgerDefinitionId: inst.ledgerDefinitionId,
      entityId: inst.entityId,
      custodianName: custodianForm.name,
      designation: custodianForm.designation,
      phone: custodianForm.phone,
      fromDate: now,
      toDate: null,
      handoverToName: '',
      handoverBy: custodianForm.handoverBy,
      cashBalanceAtHandover: custodianForm.cashBalanceAtHandover,
      notes: custodianForm.notes,
      recordedAt: now,
    };
    appendCustodianHistory(newRecord);

    // 3. Update instance with new current custodian
    const updatedInst: EntityLedgerInstance = {
      ...inst,
      currentCustodian: {
        name: custodianForm.name,
        designation: custodianForm.designation,
        phone: custodianForm.phone,
        assignedOn: now,
        assignedBy: custodianForm.handoverBy,
      },
    };
    saveInstance(updatedInst);
    setInstances(prev => prev.map(i => i.id === inst.id ? updatedInst : i));

    // 4. Reload history and reset form
    setCustodianHistory(loadCustodianHistory(inst.entityId, inst.ledgerDefinitionId));
    setCustodianForm({ name: '', designation: '', phone: '', handoverBy: '', cashBalanceAtHandover: 0, notes: '' });
    toast.success(`Custody transferred to ${custodianForm.name}`);
  };

  // ── FinFrame L4 groups for parent pickers ──
  const l4CashGroups = getFinFrameL4Groups(['CASH']);
  const l4BankGroups = getFinFrameL4Groups(['BANK', 'STBOR']);

  // Filter instances for Opening Balances tab
  const allDefIds = new Set([...cashDefs, ...bankDefs].filter(d => !d.entityId).map(d => d.id));
  const filteredInstances = instances.filter(i => allDefIds.has(i.ledgerDefinitionId));

  // Find parent def for an instance to determine its type
  const getDefForInstance = (inst: EntityLedgerInstance): AnyLedgerDefinition | undefined =>
    [...cashDefs, ...bankDefs].find(d => d.id === inst.ledgerDefinitionId);

  const rows: Record<string, typeof TYPE_BUTTONS> = {};
  TYPE_BUTTONS.forEach(b => {
    if (!rows[b.row]) rows[b.row] = [];
    rows[b.row].push(b);
  });

  const suggestedParent = bankForm.accountType ? getSuggestedParent(bankForm.accountType as BankAccountType) : null;

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
          parentGroupName: 'Bank Balances (Bank Accounts)', name: 'HDFC Bank — Current A/C',
          openingBalanceType: 'Dr',
        })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 transition-colors text-sm font-medium text-blue-600">
          <Plus className="h-4 w-4" /> HDFC Current A/C
        </button>
        <button onClick={() => handleBankQuickStart({
          bankName: 'State Bank of India (SBI)', accountType: 'savings', parentGroupCode: 'BANK',
          parentGroupName: 'Bank Balances (Bank Accounts)', name: 'SBI — Savings A/C',
          openingBalanceType: 'Dr',
        })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 transition-colors text-sm font-medium text-blue-600">
          <Plus className="h-4 w-4" /> SBI Savings A/C
        </button>
        <button onClick={() => handleBankQuickStart({
          accountType: 'cash_credit', parentGroupCode: 'STBOR',
          parentGroupName: 'Short-Term Borrowings (Bank OD A/c)', name: '',
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
                const color = isCash ? 'teal' : 'blue';
                return (
                  <button key={btn.label}
                    onClick={() => { if (isCash) openCashCreate(); else openBankCreate(); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-${color}-500/10 text-${color}-600 border border-${color}-500/20 hover:bg-${color}-500/20 transition-colors`}>
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
                      <TableHead>Code</TableHead>
                      <TableHead>Numeric Code</TableHead>
                      <TableHead>Parent Group</TableHead>
                      <TableHead>Alias</TableHead>
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
                        <TableCell className="font-mono text-xs">{def.code}</TableCell>
                        <TableCell className="font-mono text-xs text-teal-600">{def.numericCode || '—'}</TableCell>
                        <TableCell className="text-xs">{def.parentGroupName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{def.alias || '—'}</TableCell>
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
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Bank Name</TableHead>
                      <TableHead>Account Type</TableHead>
                      <TableHead>IFSC</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankDefs.map(def => (
                      <TableRow key={def.id}>
                        <TableCell className="font-medium">{def.name}</TableCell>
                        <TableCell className="font-mono text-xs">{def.code}</TableCell>
                        <TableCell className="text-xs">{def.bankName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${ACCOUNT_TYPE_COLORS[def.accountType]}`}>
                            {ACCOUNT_TYPE_LABELS[def.accountType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{def.ifscCode}</TableCell>
                        <TableCell>
                          {def.entityId ? (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                              {entities.find(e => e.id === def.entityId)?.name ?? def.entityShortCode}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">Group</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${def.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                            {def.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openBankEdit(def)}><Edit2 className="h-3.5 w-3.5" /></Button>
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
                        <TableHead>Opening Balance (₹)</TableHead>
                        <TableHead>Dr/Cr</TableHead>
                        <TableHead>Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInstances.map(inst => {
                        const def = getDefForInstance(inst);
                        const isCash = def?.ledgerType === 'cash';
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
                                      }}>
                                      Transfer
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                isCash ? (
                                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-teal-600"
                                    onClick={() => {
                                      setCustodianTargetInstanceId(inst.id);
                                      setCustodianHistory(loadCustodianHistory(inst.entityId, inst.ledgerDefinitionId));
                                      setCustodianOpen(true);
                                    }}>
                                    Assign
                                  </Button>
                                ) : <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground text-sm">₹</span>
                                <Input
                                  {...amountInputProps}
                                  className="w-32 h-8 text-sm"
                                  value={inst.openingBalance || ''}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                                    setInstances(prev => prev.map(i => i.id === inst.id ? { ...i, openingBalance: val } : i));
                                  }}
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              {isCash ? (
                                <Badge variant="outline" className="text-[10px] bg-muted/50 text-muted-foreground border-border">Dr</Badge>
                              ) : (
                                <Select value={inst.openingBalanceType} onValueChange={(v: 'Dr' | 'Cr') => {
                                  const updated = instances.map(i =>
                                    i.id === inst.id ? { ...i, openingBalanceType: v } : i
                                  );
                                  setInstances(updated);
                                }}>
                                  <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Dr">Dr</SelectItem>
                                    <SelectItem value="Cr">Cr</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                            <TableCell>
                              <Switch checked={inst.isActive}
                                onCheckedChange={(checked) => {
                                  const updated = instances.map(i =>
                                    i.id === inst.id ? { ...i, isActive: checked } : i
                                  );
                                  setInstances(updated);
                                }}
                              />
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
            {/* Parent Group Picker */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Parent Group <span className="text-destructive">*</span></Label>
              <Select value={cashForm.parentGroupCode} onValueChange={(v) => {
                if (v === 'CASH') setCashForm(f => ({ ...f, parentGroupCode: 'CASH', parentGroupName: 'Cash & Cash Equivalents (Cash-in-Hand)' }));
                else { const l4 = l4CashGroups.find(g => g.code === v); setCashForm(f => ({ ...f, parentGroupCode: v, parentGroupName: l4?.name ?? v })); }
              }}>
                <SelectTrigger><SelectValue placeholder="Select parent group" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH"><span className="flex items-center gap-1.5"><Lock className="h-3 w-3 text-muted-foreground" />Cash & Cash Equivalents</span></SelectItem>
                  {l4CashGroups.map(g => (<SelectItem key={g.code} value={g.code}>{g.name}</SelectItem>))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">System Groups (L3) are locked. Your FinFrame L4 groups appear below.</p>
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
                  <Input
                    {...amountInputProps}
                    className="flex-1"
                    value={cashForm.openingBalance || ''}
                    onChange={(e) => setCashForm(f => ({
                      ...f, openingBalance: parseFloat(e.target.value.replace(/,/g, '')) || 0
                    }))}
                    onKeyDown={onEnterNext}
                    disabled={!cashForm.parentGroupCode}
                    placeholder="0"
                  />
                  {/* Dr / Cr segmented control */}
                  <div className="flex rounded-md border border-input overflow-hidden text-xs font-medium">
                    <button type="button"
                      onClick={() => setCashForm(f => ({ ...f, openingBalanceType: 'Dr' }))}
                      className={`px-3 py-1.5 transition-colors ${cashForm.openingBalanceType === 'Dr'
                        ? 'bg-teal-500/15 text-teal-700 border-r border-input'
                        : 'text-muted-foreground hover:bg-muted/40 border-r border-input'}`}
                      disabled={!cashForm.parentGroupCode}>Dr</button>
                    <button type="button"
                      onClick={() => setCashForm(f => ({ ...f, openingBalanceType: 'Cr' }))}
                      className={`px-3 py-1.5 transition-colors ${cashForm.openingBalanceType === 'Cr'
                        ? 'bg-amber-500/15 text-amber-700'
                        : 'text-muted-foreground hover:bg-muted/40'}`}
                      disabled={!cashForm.parentGroupCode}>Cr</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Optional fields ── */}
            <button type="button"
              onClick={() => setCashShowMore(v => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <span>{cashShowMore ? '−' : '+'}</span>
              <span>{cashShowMore ? 'Hide details' : 'More Details'}</span>
            </button>
            {cashShowMore && (
              <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Location</Label>
                  <Input placeholder="e.g., HO Cashbox, Delhi Reception" value={cashForm.location}
                    onChange={(e) => setCashForm(f => ({ ...f, location: e.target.value }))} disabled={!cashForm.parentGroupCode} />
                  <p className="text-[10px] text-muted-foreground">Physical location of this cash box (for multi-location companies)</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Cash Limit (₹)</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">₹</span>
                    <Input {...amountInputProps} value={cashForm.cashLimit || ''}
                      onChange={(e) => setCashForm(f => ({ ...f, cashLimit: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))} disabled={!cashForm.parentGroupCode}
                      placeholder="0" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Maximum cash to hold. Alert shown when balance exceeds this.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Cash Receipt Series</Label>
                  <Input placeholder="e.g., CR" value={cashForm.voucherSeries} maxLength={4}
                    onChange={(e) => setCashForm(f => ({ ...f, voucherSeries: e.target.value.toUpperCase().slice(0, 4) }))} disabled={!cashForm.parentGroupCode} />
                  <p className="text-[10px] text-muted-foreground">Prefix for cash receipt numbers. Default: CR → CR-2526-0001</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={cashForm.isMainCash}
                    onChange={(e) => setCashForm(f => ({ ...f, isMainCash: e.target.checked }))}
                    disabled={!cashForm.parentGroupCode}
                    className="h-4 w-4" />
                  <Label className="text-sm">Set as primary cash account for this entity</Label>
                </div>
              </div>
            )}

            {!cashEditTarget && (
              <>
                <button type="button"
                  onClick={() => setCashShowAdvanced(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  ⚙
                  <span>{cashShowAdvanced ? 'Hide advanced' : 'Advanced options'}</span>
                </button>
                {cashShowAdvanced && (
                  <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Entity Scope</Label>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setCashForm(f => ({ ...f, scope: 'group', entityId: '' }))}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${cashForm.scope === 'group' ? 'bg-teal-500/10 text-teal-600 border-teal-500/30' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'}`} disabled={!cashForm.parentGroupCode}>
                          Group Level
                        </button>
                        <button type="button" onClick={() => setCashForm(f => ({ ...f, scope: 'entity' }))}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${cashForm.scope === 'entity' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'}`} disabled={!cashForm.parentGroupCode}>
                          Entity Specific
                        </button>
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
              {bankEditTarget ? 'Update bank ledger definition details.' : 'Define a new bank account ledger for your group or a specific entity.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 1. Parent Group Picker */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Parent Group <span className="text-destructive">*</span></Label>
              <Select value={bankForm.parentGroupCode} onValueChange={(v) => {
                if (v === 'BANK') setBankForm(f => ({ ...f, parentGroupCode: 'BANK', parentGroupName: 'Bank Balances (Bank Accounts)' }));
                else if (v === 'STBOR') setBankForm(f => ({ ...f, parentGroupCode: 'STBOR', parentGroupName: 'Short-Term Borrowings (Bank OD A/c)' }));
                else { const l4 = l4BankGroups.find(g => g.code === v); setBankForm(f => ({ ...f, parentGroupCode: v, parentGroupName: l4?.name ?? v })); }
              }}>
                <SelectTrigger><SelectValue placeholder="Select parent group" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK">
                    <span className="flex items-center gap-1.5">
                      <Lock className="h-3 w-3 text-muted-foreground" /> Bank Balances (Bank Accounts)
                      {suggestedParent?.code === 'BANK' && <Badge className="text-[9px] ml-1 bg-blue-500/10 text-blue-600 border-blue-500/20">Suggested</Badge>}
                    </span>
                  </SelectItem>
                  <SelectItem value="STBOR">
                    <span className="flex items-center gap-1.5">
                      <Lock className="h-3 w-3 text-muted-foreground" /> Short-Term Borrowings (Bank OD A/c)
                      {suggestedParent?.code === 'STBOR' && <Badge className="text-[9px] ml-1 bg-amber-500/10 text-amber-600 border-amber-500/20">Suggested</Badge>}
                    </span>
                  </SelectItem>
                  {l4BankGroups.map(g => (<SelectItem key={g.code} value={g.code}>{g.name}</SelectItem>))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">System Groups (L3) are locked. Your FinFrame L4 groups appear below.</p>
            </div>

            {/* 2. Ledger Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ledger Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., HDFC Bank — Current A/C 001234" value={bankForm.name}
                onChange={(e) => setBankForm(f => ({ ...f, name: e.target.value }))} disabled={!bankForm.parentGroupCode} />
            </div>

            {/* 3. Bank Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Bank Name <span className="text-destructive">*</span></Label>
              <Select value={bankForm.bankName} onValueChange={(v) => setBankForm(f => ({ ...f, bankName: v, bankNameOther: v === 'Other' ? f.bankNameOther : '' }))}>
                <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                <SelectContent>
                  {INDIAN_BANKS.map(b => (<SelectItem key={b} value={b}>{b}</SelectItem>))}
                </SelectContent>
              </Select>
              {bankForm.bankName === 'Other' && (
                <Input placeholder="Enter bank name" value={bankForm.bankNameOther}
                  onChange={(e) => setBankForm(f => ({ ...f, bankNameOther: e.target.value }))} className="mt-1.5" />
              )}
            </div>

            {/* 4. Account Number */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Account Number <span className="text-destructive">*</span></Label>
              <Input placeholder="Enter account number" value={bankEditTarget ? maskAccountNo(bankForm.accountNumber) : bankForm.accountNumber}
                onChange={(e) => {
                  if (bankEditTarget) return;
                  const v = e.target.value.replace(/\D/g, '');
                  setBankForm(f => ({ ...f, accountNumber: v }));
                  setShowAccountPreview(false);
                }}
                onBlur={() => { if (bankForm.accountNumber) setShowAccountPreview(true); }}
                readOnly={!!bankEditTarget}
              />
              {showAccountPreview && bankForm.accountNumber && (
                <p className="text-[10px] text-muted-foreground">Saved as: {maskAccountNo(bankForm.accountNumber)}</p>
              )}
              {bankEditTarget && <p className="text-[10px] text-muted-foreground">Click to reveal (masked for security)</p>}
            </div>

            {/* 5. IFSC Code */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">IFSC Code <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input placeholder="e.g., HDFC0001234" value={bankForm.ifscCode}
                  className={ifscValid === false ? 'border-destructive' : ifscValid === true ? 'border-emerald-500' : ''}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase();
                    setBankForm(f => ({ ...f, ifscCode: v }));
                    setIfscValid(null);
                  }}
                  onBlur={() => { if (bankForm.ifscCode) setIfscValid(validateIFSC(bankForm.ifscCode)); }}
                  maxLength={11}
                />
                {ifscValid === true && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                )}
              </div>
              {ifscValid === false && (
                <p className="text-[10px] text-destructive">Invalid IFSC. Format: HDFC0001234 (4 letters + 0 + 6 alphanumeric)</p>
              )}
              <p className="text-[10px] text-muted-foreground">First 4 letters = bank code, then 0, then 6 alphanumeric</p>
            </div>

            {/* 6. Account Type */}
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

            {/* 7. OD / CC Limit (conditional) */}
            {(bankForm.accountType === 'cash_credit' || bankForm.accountType === 'overdraft') && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">OD / CC Limit</Label>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-sm">₹</span>
                  <Input type="number" value={bankForm.odLimit}
                    onChange={(e) => setBankForm(f => ({ ...f, odLimit: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
            )}

            {/* 8. Opening Balance + Dr/Cr */}
            {!bankEditTarget && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Opening Balance</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">₹</span>
                  <Input type="number" className="flex-1" value={bankForm.openingBalance}
                    onChange={(e) => setBankForm(f => ({ ...f, openingBalance: parseFloat(e.target.value) || 0 }))} />
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <button type="button" onClick={() => setBankForm(f => ({ ...f, openingBalanceType: 'Dr' }))}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${bankForm.openingBalanceType === 'Dr' ? 'bg-blue-500/10 text-blue-600' : 'bg-muted/30 text-muted-foreground'}`}>Dr</button>
                    <button type="button" onClick={() => setBankForm(f => ({ ...f, openingBalanceType: 'Cr' }))}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${bankForm.openingBalanceType === 'Cr' ? 'bg-amber-500/10 text-amber-600' : 'bg-muted/30 text-muted-foreground'}`}>Cr</button>
                  </div>
                </div>
              </div>
            )}

            {/* 9. Alias */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Alias</Label>
              <Input placeholder="e.g., HDFC-CC, SBI-SAV" value={bankForm.alias}
                onChange={(e) => setBankForm(f => ({ ...f, alias: e.target.value }))} />
            </div>

            {/* 10. Entity Scope */}
            {!bankEditTarget && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Entity Scope</Label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setBankForm(f => ({ ...f, scope: 'group', entityId: '' }))}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${bankForm.scope === 'group' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'}`}>
                      Group Level
                    </button>
                    <button type="button" onClick={() => setBankForm(f => ({ ...f, scope: 'entity' }))}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${bankForm.scope === 'entity' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'}`}>
                      Entity Specific
                    </button>
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
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBankCreateOpen(false); setBankEditTarget(null); }}>Cancel</Button>
            <Button onClick={handleBankSave} disabled={!bankForm.parentGroupCode}>{bankEditTarget ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Custodian Dialog ─── */}
      <Dialog open={custodianOpen} onOpenChange={(open) => { if (!open) setCustodianOpen(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cash Custodian Management</DialogTitle>
            <DialogDescription>
              Assign or transfer custody of this cash account. Every change is recorded permanently.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">New Custodian Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Enter custodian name" value={custodianForm.name}
                onChange={(e) => setCustodianForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Designation <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g., Cashier, Accountant" value={custodianForm.designation}
                onChange={(e) => setCustodianForm(f => ({ ...f, designation: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Phone</Label>
              <Input placeholder="Phone number" value={custodianForm.phone}
                onChange={(e) => setCustodianForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Handover Authorised By <span className="text-destructive">*</span></Label>
              <Input placeholder="Name of authorising person" value={custodianForm.handoverBy}
                onChange={(e) => setCustodianForm(f => ({ ...f, handoverBy: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Cash Balance at Handover (₹)</Label>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-sm">₹</span>
                <Input type="number" value={custodianForm.cashBalanceAtHandover}
                  onChange={(e) => setCustodianForm(f => ({ ...f, cashBalanceAtHandover: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Notes</Label>
              <Input placeholder="Transfer notes" value={custodianForm.notes}
                onChange={(e) => setCustodianForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {/* History */}
            {custodianHistory.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Custodian History</Label>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Custodian</TableHead>
                        <TableHead className="text-xs">From</TableHead>
                        <TableHead className="text-xs">To</TableHead>
                        <TableHead className="text-xs">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {custodianHistory.map(h => (
                        <TableRow key={h.id}>
                          <TableCell className="text-xs">
                            <p className="font-medium">{h.custodianName}</p>
                            <p className="text-muted-foreground">{h.designation}</p>
                          </TableCell>
                          <TableCell className="text-xs">{new Date(h.fromDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-xs">{h.toDate ? new Date(h.toDate).toLocaleDateString() : <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600">Current</Badge>}</TableCell>
                          <TableCell className="text-xs font-mono">₹{h.cashBalanceAtHandover.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustodianOpen(false)}>Close</Button>
            <Button onClick={handleCustodianSave}>
              {(() => {
                const inst = instances.find(i => i.id === custodianTargetInstanceId);
                return inst?.currentCustodian ? 'Transfer Custody' : 'Assign Custodian';
              })()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LedgerMaster() {
  return (
    <SidebarProvider defaultOpen={false}>
      <ERPHeader
        breadcrumbs={[
          { label: 'Operix Core', href: '/erp/dashboard' },
          { label: 'FineCore', href: '/erp/accounting' },
          { label: 'Ledger Master' },
        ]}
        showDatePicker={false}
        showCompany={false}
      />
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <LedgerMasterPanel />
      </div>
    </SidebarProvider>
  );
}