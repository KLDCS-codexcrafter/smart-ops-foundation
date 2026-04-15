/**
 * entity-setup-service.ts — Entity Auto-Setup Engine
 * After saving any entity, creates default ledgers, loads industry L4 groups,
 * and sets up Branch/Division inter-entity ledgers.
 * [JWT] Replace localStorage calls with real API endpoints.
 */
import { MOCK_ENTITIES, type MockEntity } from '@/data/mock-entities';
import { L3_FINANCIAL_GROUPS, L4_INDUSTRY_PACKS } from '@/data/finframe-seed-data';
import {
  MODE_OF_PAYMENT_SEED, TERMS_OF_PAYMENT_SEED, TERMS_OF_DELIVERY_SEED,
  type ModeOfPayment, type TermsOfPayment, type TermsOfDelivery,
} from '@/data/masters-seed-data';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SetupOptions {
  entityId: string;
  entityName: string;
  shortCode: string;
  entityType: 'parent' | 'subsidiary' | 'branch';
  businessEntity: string;
  industry: string;
  businessActivity: string;
  loadIndustryPack: boolean;
  siblingEntities: MockEntity[];
}

export interface SetupResult {
  ledgersCreated: number;
  l4GroupsCreated: number;
  bdLedgersCreated: number;
  entityRegistered: boolean;
  uomsCreated: number;
  supportingMastersCreated: {
    modeOfPayment: number;
    termsOfPayment: number;
    termsOfDelivery: number;
  };
}

interface AnyLedgerDefinition {
  id: string;
  ledgerType: string;
  name: string;
  code: string;
  parentGroupCode: string;
  parentGroupName: string;
  alias: string;
  entityId: string | null;
  entityShortCode: string | null;
  status: 'active' | 'inactive';
  // Cash-specific fields (optional for non-cash types)
  numericCode?: string;
  location?: string;
  cashLimit?: number;
  alertThreshold?: number;
  isMainCash?: boolean;
  voucherSeries?: string;
  // Duties & Tax fields
  taxType?: string;
  gstSubType?: string | null;
  calculationBasis?: string | null;
  rate?: number;
  // Payroll Statutory fields
  payrollCategory?: string;
  payrollComponent?: string;
  statutoryRate?: number;
  calculationBase?: string;
  wageCeiling?: number | null;
  maxAmount?: number | null;
}

// ── 2.2 Entity Registry ─────────────────────────────────────────────────────

export const registerEntity = (entity: MockEntity): void => {
  // [JWT] GET /api/entities/setup/:entityId
  const raw = localStorage.getItem('erp_group_entities');
  const all: MockEntity[] = raw ? JSON.parse(raw) : [];
  if (!all.find(e => e.id === entity.id)) {
    all.push(entity);
    // [JWT] POST /api/entities/setup/:entityId
    localStorage.setItem('erp_group_entities', JSON.stringify(all));
    // [JWT] POST /api/foundation/entities/register
  }
};

// ── 2.3 loadEntities ────────────────────────────────────────────────────────

export const loadEntities = (): MockEntity[] => {
  try {
    // [JWT] GET /api/entities/setup/:entityId
    const raw = localStorage.getItem('erp_group_entities');
    if (raw) {
      const stored = JSON.parse(raw);
      if (stored.length > 0) return stored;
    }
  } catch { /* ignore */ }
  return MOCK_ENTITIES;
};

// ── Helper: find L3 group name by code ──────────────────────────────────────

const l3Name = (code: string): string => {
  const g = L3_FINANCIAL_GROUPS.find(g => g.code === code);
  return g?.name ?? code;
};

// ── 2.4 Default Ledger Definitions ──────────────────────────────────────────

const isCompany = (e: string) => ['Private Limited', 'Public Limited', 'OPC'].includes(e);
const isPartnershipOrLLP = (e: string) => ['LLP', 'Partnership'].includes(e);
const isProprietorshipOrHUF = (e: string) => ['Sole Proprietorship', 'HUF'].includes(e);
const isExportEntity = (o: SetupOptions) => o.businessActivity === 'Import / Export' || (o as any).specialZone === 'SEZ';

const createDefaultLedgers = (opts: SetupOptions): number => {
  const isMfg = opts.businessActivity === 'Manufacturing';
  const isService = ['Services', 'IT Services', 'Consulting'].includes(opts.businessActivity);
  const sc = opts.shortCode;

  const ledgers: Omit<AnyLedgerDefinition, 'id'>[] = [
    // Cash
    { ledgerType: 'cash', name: 'Cash', code: 'CASH-000001', numericCode: '1203-0001', parentGroupCode: 'CASH', parentGroupName: l3Name('CASH'), alias: 'Cash', entityId: null, entityShortCode: null, location: 'Main Office', cashLimit: 0, alertThreshold: 0, isMainCash: true, voucherSeries: 'CR', status: 'active' },
    // P&L (entity-specific)
    { ledgerType: 'equity', name: 'Profit & Loss A/c', code: `${sc}-PL-000001`, parentGroupCode: 'RSRV', parentGroupName: l3Name('RSRV'), alias: 'P&L', entityId: opts.entityId, entityShortCode: sc, status: 'active' },
    // GST
    { ledgerType: 'duties_tax', name: 'CGST', code: 'CGST-000001', parentGroupCode: 'GSTP', parentGroupName: l3Name('GSTP'), taxType: 'gst', gstSubType: 'cgst', calculationBasis: 'item_rate', rate: 0, alias: 'CGST', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'duties_tax', name: 'SGST', code: 'SGST-000001', parentGroupCode: 'GSTP', parentGroupName: l3Name('GSTP'), taxType: 'gst', gstSubType: 'sgst', calculationBasis: 'item_rate', rate: 0, alias: 'SGST', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'duties_tax', name: 'IGST', code: 'IGST-000001', parentGroupCode: 'GSTP', parentGroupName: l3Name('GSTP'), taxType: 'gst', gstSubType: 'igst', calculationBasis: 'item_rate', rate: 0, alias: 'IGST', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'duties_tax', name: 'GST Cess', code: 'CESS-000001', parentGroupCode: 'GSTP', parentGroupName: l3Name('GSTP'), taxType: 'gst', gstSubType: 'cess', calculationBasis: 'item_rate', rate: 0, alias: 'Cess', entityId: null, entityShortCode: null, status: 'active' },
    // TDS
    { ledgerType: 'duties_tax', name: 'TDS Payable', code: 'TDSP-000001', parentGroupCode: 'TDSP', parentGroupName: l3Name('TDSP'), taxType: 'tds', gstSubType: null, calculationBasis: null, rate: 0, alias: 'TDS Pay', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'asset', name: 'TDS Receivable', code: 'TDSR-000001', parentGroupCode: 'ADTAX', parentGroupName: l3Name('ADTAX'), alias: 'TDS Rec', entityId: null, entityShortCode: null, status: 'active' },
    // Salary
    { ledgerType: 'liability', name: 'Salary Payable', code: 'SALP-000001', parentGroupCode: 'EMPL', parentGroupName: l3Name('EMPL'), alias: 'Sal Pay', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'asset', name: 'Salary Advance', code: 'SALA-000001', parentGroupCode: 'STLA', parentGroupName: l3Name('STLA'), alias: 'Sal Adv', entityId: null, entityShortCode: null, status: 'active' },
    // Advance from Customers
    { ledgerType: 'liability', name: 'Advance from Customers', code: 'AFC-000001', parentGroupCode: 'ADVRC', parentGroupName: l3Name('ADVRC'), alias: 'Adv Rec', entityId: null, entityShortCode: null, status: 'active' },
    // Advance to Suppliers
    { ledgerType: 'asset', name: 'Advance to Suppliers', code: 'ATS-000001', parentGroupCode: 'STLA', parentGroupName: l3Name('STLA'), alias: '', entityId: null, entityShortCode: null, status: 'active' },
    // Suspense
    { ledgerType: 'suspense', name: 'Suspense Account', code: 'SUS-000001', parentGroupCode: 'SUS', parentGroupName: l3Name('SUS'), alias: 'Suspense', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'suspense', name: 'Opening Balance Difference', code: 'OBD-000001', parentGroupCode: 'SUS', parentGroupName: l3Name('SUS'), alias: 'OB Diff', entityId: null, entityShortCode: null, status: 'active' },
    // Expense
    { ledgerType: 'expense', name: 'Rounding Off', code: 'RNDO-000001', parentGroupCode: 'ADMIN', parentGroupName: l3Name('ADMIN'), alias: 'Rounding', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'expense', name: 'Bank Charges', code: 'BKCHG-000001', parentGroupCode: 'BKCHG', parentGroupName: l3Name('BKCHG'), alias: 'Bnk Chrg', entityId: null, entityShortCode: null, status: 'active' },
    // Income
    { ledgerType: 'income', name: 'Sales — Domestic', code: 'SALD-000001', parentGroupCode: 'SALE', parentGroupName: l3Name('SALE'), alias: 'Sales Dom', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'income', name: 'Sales Returns', code: 'SRET-000001', parentGroupCode: 'SRET', parentGroupName: l3Name('SRET'), alias: 'Sal Ret', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'expense', name: 'Purchase — Domestic', code: 'PURCD-000001', parentGroupCode: 'PURCH', parentGroupName: l3Name('PURCH'), alias: 'Purch Dom', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'expense', name: 'Purchase Returns', code: 'PRET-000001', parentGroupCode: 'PRET', parentGroupName: l3Name('PRET'), alias: 'Purch Ret', entityId: null, entityShortCode: null, status: 'active' },
    // TCS Payable
    { ledgerType: 'duties_tax', name: 'TCS Payable', code: 'TCSP-000001', parentGroupCode: 'DUTYP', parentGroupName: l3Name('DUTYP'), taxType: 'tcs', gstSubType: null, calculationBasis: null, rate: 0, alias: 'TCS Pay', entityId: null, entityShortCode: null, status: 'active' },
    // Professional Tax Payable
    { ledgerType: 'duties_tax', name: 'Professional Tax Payable', code: 'PTP-000001', parentGroupCode: 'DUTYP', parentGroupName: l3Name('DUTYP'), taxType: 'other', gstSubType: null, calculationBasis: null, rate: 0, alias: 'PT Pay', entityId: null, entityShortCode: null, status: 'active' },
    // Retained Earnings
    { ledgerType: 'equity', name: 'Retained Earnings', code: 'RETE-000001', parentGroupCode: 'RSRV', parentGroupName: l3Name('RSRV'), alias: 'Ret Earn', entityId: null, entityShortCode: null, status: 'active' },
    // Security Deposit Paid
    { ledgerType: 'asset', name: 'Security Deposit Paid', code: 'SECDP-000001', parentGroupCode: 'STLA', parentGroupName: l3Name('STLA'), alias: 'Sec Dep', entityId: null, entityShortCode: null, status: 'active' },
    // ── Payroll Statutory — Employees' Deductions ──
    { ledgerType: 'payroll_statutory', name: 'PF Employee Deduction', code: 'PFE-000001', parentGroupCode: 'EMPL', parentGroupName: l3Name('EMPL'), payrollCategory: 'employee_deduction', payrollComponent: 'pf_employee', statutoryRate: 12, calculationBase: 'basic_da', wageCeiling: 15000, maxAmount: null, alias: 'PF Emp', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'payroll_statutory', name: 'ESI Employee Deduction', code: 'ESIE-000001', parentGroupCode: 'EMPL', parentGroupName: l3Name('EMPL'), payrollCategory: 'employee_deduction', payrollComponent: 'esi_employee', statutoryRate: 0.75, calculationBase: 'gross', wageCeiling: 21000, maxAmount: null, alias: 'ESI Emp', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'payroll_statutory', name: 'PT Employee Deduction', code: 'PTE-000001', parentGroupCode: 'EMPL', parentGroupName: l3Name('EMPL'), payrollCategory: 'employee_deduction', payrollComponent: 'pt_employee', statutoryRate: 0, calculationBase: 'state_slab', wageCeiling: null, maxAmount: null, alias: 'PT Emp', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'payroll_statutory', name: 'TDS on Salary', code: 'TDSS-000001', parentGroupCode: 'EMPL', parentGroupName: l3Name('EMPL'), payrollCategory: 'employee_deduction', payrollComponent: 'tds_salary', statutoryRate: 0, calculationBase: 'slab', wageCeiling: null, maxAmount: null, alias: 'TDS Sal', entityId: null, entityShortCode: null, status: 'active' },
    // ── Payroll Statutory — Employer's Contributions ──
    { ledgerType: 'payroll_statutory', name: 'PF Employer — EPF', code: 'PFEPF-000001', parentGroupCode: 'EMPL', parentGroupName: l3Name('EMPL'), payrollCategory: 'employer_contribution', payrollComponent: 'pf_employer_epf', statutoryRate: 3.67, calculationBase: 'basic_da', wageCeiling: 15000, maxAmount: null, alias: 'PF EPF', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'payroll_statutory', name: 'PF Employer — EPS', code: 'PFEPS-000001', parentGroupCode: 'EMPL', parentGroupName: l3Name('EMPL'), payrollCategory: 'employer_contribution', payrollComponent: 'pf_employer_eps', statutoryRate: 8.33, calculationBase: 'basic_da', wageCeiling: 15000, maxAmount: 1250, alias: 'PF EPS', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'payroll_statutory', name: 'EDLI Contribution', code: 'EDLI-000001', parentGroupCode: 'EMPL', parentGroupName: l3Name('EMPL'), payrollCategory: 'employer_contribution', payrollComponent: 'pf_edli', statutoryRate: 0.50, calculationBase: 'basic_da', wageCeiling: 15000, maxAmount: null, alias: 'EDLI', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'payroll_statutory', name: 'ESI Employer Contribution', code: 'ESIER-000001', parentGroupCode: 'EMPL', parentGroupName: l3Name('EMPL'), payrollCategory: 'employer_contribution', payrollComponent: 'esi_employer', statutoryRate: 3.25, calculationBase: 'gross', wageCeiling: 21000, maxAmount: null, alias: 'ESI Emplr', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'payroll_statutory', name: 'LWF Employer Contribution', code: 'LWF-000001', parentGroupCode: 'EMPL', parentGroupName: l3Name('EMPL'), payrollCategory: 'employer_contribution', payrollComponent: 'lwf_employer', statutoryRate: 0, calculationBase: 'state_specific', wageCeiling: null, maxAmount: null, alias: 'LWF', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'payroll_statutory', name: 'Gratuity Provision', code: 'GRAT-000001', parentGroupCode: 'EMPL', parentGroupName: l3Name('EMPL'), payrollCategory: 'employer_contribution', payrollComponent: 'gratuity_provision', statutoryRate: 0, calculationBase: '15/26 x basic x years', wageCeiling: null, maxAmount: 2000000, alias: 'Gratuity', entityId: null, entityShortCode: null, status: 'active' },
  ];

  // Conditional: Service Revenue
  if (isService || isMfg) {
    ledgers.push({ ledgerType: 'income', name: 'Service Revenue', code: 'SERV-000001', parentGroupCode: 'SERV', parentGroupName: l3Name('SERV'), alias: 'Serv Rev', entityId: null, entityShortCode: null, status: 'active' });
  }

  // Capital: branch by entity type (FIX 5 — LLP/Partnership gets CE-PP, not CE-SF)
  if (isCompany(opts.businessEntity)) {
    ledgers.push(
      { ledgerType: 'capital_equity', name: 'Share Capital', code: `${sc}-SCAP-000001`, parentGroupCode: 'EQSH', parentGroupName: l3Name('EQSH'), alias: 'Share Cap', entityId: opts.entityId, entityShortCode: sc, status: 'active' },
      { ledgerType: 'capital_equity', name: 'Securities Premium Reserve', code: `${sc}-SECP-000001`, parentGroupCode: 'RSRV', parentGroupName: l3Name('RSRV'), alias: 'Sec Prem', entityId: opts.entityId, entityShortCode: sc, status: 'active' },
    );
  } else if (isPartnershipOrLLP(opts.businessEntity)) {
    ledgers.push(
      { ledgerType: 'capital_equity', name: 'Partner A — Capital Account', code: `${sc}-PCAP1-000001`, parentGroupCode: 'PCAP', parentGroupName: l3Name('PCAP'), alias: 'Partner A', entityId: opts.entityId, entityShortCode: sc, status: 'active' },
      { ledgerType: 'capital_equity', name: 'Partner B — Capital Account', code: `${sc}-PCAP2-000001`, parentGroupCode: 'PCAP', parentGroupName: l3Name('PCAP'), alias: 'Partner B', entityId: opts.entityId, entityShortCode: sc, status: 'active' },
      { ledgerType: 'capital_equity', name: 'Partners Current Account', code: `${sc}-PCA-000001`, parentGroupCode: 'PCAP', parentGroupName: l3Name('PCAP'), alias: 'Partners Cur', entityId: opts.entityId, entityShortCode: sc, status: 'active' },
    );
  } else if (isProprietorshipOrHUF(opts.businessEntity)) {
    ledgers.push(
      { ledgerType: 'capital_equity', name: "Owner's Capital Account", code: `${sc}-OCAP-000001`, parentGroupCode: 'PCAP', parentGroupName: l3Name('PCAP'), alias: 'Owner Cap', entityId: opts.entityId, entityShortCode: sc, status: 'active' },
      { ledgerType: 'capital_equity', name: "Owner's Drawing Account", code: `${sc}-ODRW-000001`, parentGroupCode: 'PCAP', parentGroupName: l3Name('PCAP'), alias: 'Owner Draw', entityId: opts.entityId, entityShortCode: sc, status: 'active' },
    );
  } else {
    // Branch Office or other — basic capital account
    ledgers.push({ ledgerType: 'capital_equity', name: "Capital A/c", code: `${sc}-CAP-000001`, parentGroupCode: 'PCAP', parentGroupName: l3Name('PCAP'), alias: 'Capital', entityId: opts.entityId, entityShortCode: sc, status: 'active' });
  }

  // EXIM / SEZ ledgers (FIX 5)
  if (isExportEntity(opts)) {
    ledgers.push(
      { ledgerType: 'asset', name: 'RODTEP Scrip Receivable', code: `${sc}-RDTP-000001`, parentGroupCode: 'ADTAX', parentGroupName: l3Name('ADTAX'), alias: 'RODTEP', entityId: opts.entityId, entityShortCode: sc, status: 'active' },
      { ledgerType: 'asset', name: 'Duty Drawback Receivable', code: `${sc}-DDWB-000001`, parentGroupCode: 'ADTAX', parentGroupName: l3Name('ADTAX'), alias: 'Duty DBK', entityId: opts.entityId, entityShortCode: sc, status: 'active' },
      { ledgerType: 'liability', name: 'LC Payable — Buyers Credit', code: `${sc}-LCPY-000001`, parentGroupCode: 'UNSB', parentGroupName: l3Name('UNSB'), alias: 'LC Pay', entityId: opts.entityId, entityShortCode: sc, status: 'active' },
      { ledgerType: 'asset', name: 'Forward Contract (Hedge)', code: `${sc}-FWDC-000001`, parentGroupCode: 'STLA', parentGroupName: l3Name('STLA'), alias: 'Fwd Cont', entityId: opts.entityId, entityShortCode: sc, status: 'active' },
      { ledgerType: 'income', name: 'Export Sales (FOB)', code: `${sc}-EXSALE-000001`, parentGroupCode: 'SALE', parentGroupName: l3Name('SALE'), alias: 'Exp Sales', entityId: opts.entityId, entityShortCode: sc, status: 'active' },
      { ledgerType: 'income', name: 'Freight Inward (Reimbursable)', code: `${sc}-FRTI-000001`, parentGroupCode: 'OTHI', parentGroupName: l3Name('OTHI'), alias: 'Frt Inward', entityId: opts.entityId, entityShortCode: sc, status: 'active' },
    );
  }

  // Deduplicate against existing
  // [JWT] GET /api/entities/setup/:entityId
  const raw = localStorage.getItem('erp_group_ledger_definitions');
  const existing: AnyLedgerDefinition[] = raw ? JSON.parse(raw) : [];
  const existingNames = new Set(existing.map(d => d.name.toLowerCase()));

  const toCreate: AnyLedgerDefinition[] = ledgers
    .filter(l => !existingNames.has(l.name.toLowerCase()))
    .map(l => ({ ...l, id: crypto.randomUUID() } as AnyLedgerDefinition));

  const updated = [...existing, ...toCreate];
  // [JWT] POST /api/entities/setup/:entityId
  localStorage.setItem('erp_group_ledger_definitions', JSON.stringify(updated));
  // [JWT] POST /api/group/finecore/ledger-definitions/bulk

  // Auto-create entity instances for ALL registered entities
  const entities = loadEntities();
  toCreate.forEach(def => {
    entities.forEach(entity => {
      const key = `erp_entity_${entity.id}_ledger_instances`;
      // [JWT] GET /api/entities/setup/:entityId
      const inst = JSON.parse(localStorage.getItem(key) || '[]');
      if (!inst.find((i: any) => i.ledgerDefinitionId === def.id)) {
        inst.push({
          id: crypto.randomUUID(),
          ledgerDefinitionId: def.id,
          entityId: entity.id,
          entityName: entity.name,
          entityShortCode: entity.shortCode,
          openingBalance: 0,
          openingBalanceType: 'Dr',
          isActive: true,
          displayCode: def.code,
          displayNumericCode: `${entity.shortCode}/${def.numericCode ?? def.code}`,
          currentCustodian: null,
        });
        // [JWT] POST /api/entities/setup/:entityId
        localStorage.setItem(key, JSON.stringify(inst));
      }
    });
  });

  return toCreate.length;
};

// ── 2.5 loadIndustryPack ────────────────────────────────────────────────────

const loadIndustryPack = (businessActivity: string): number => {
  const packKey = businessActivity === 'Manufacturing' ? 'manufacturing'
    : ['Trading', 'Import / Export', 'Distribution'].includes(businessActivity) ? 'trading'
    : ['Services', 'IT Services', 'Consulting'].includes(businessActivity) ? 'services'
    : null;

  // [JWT] GET /api/entities/setup/:entityId
  const raw = localStorage.getItem('erp_group_finframe_l4_groups');
  const existing = raw ? JSON.parse(raw) : [];
  const existingNames = new Set(existing.map((g: any) => g.name.toLowerCase()));

  // Always load common pack
  const packs = [
    ...L4_INDUSTRY_PACKS.common,
    ...(packKey ? L4_INDUSTRY_PACKS[packKey] : []),
  ];

  const l3Counters: Record<string, number> = {};
  const toCreate = packs
    .filter(g => !existingNames.has(g.name.toLowerCase()))
    .map(g => {
      const existingCount = existing.filter((e: any) => e.parentL3Code === g.l3Code).length;
      l3Counters[g.l3Code] = (l3Counters[g.l3Code] ?? 0) + 1;
      return {
        id: crypto.randomUUID(),
        name: g.name,
        code: `${g.l3Code}-${String(existingCount + l3Counters[g.l3Code]).padStart(6, '0')}`,
        parentL3Code: g.l3Code,
        parentGroupId: null,
        nature: g.nature,
        gstApplicable: false,
        tdsApplicable: false,
        notes: '',
        status: 'active' as const,
      };
    });

  if (toCreate.length > 0) {
    // [JWT] POST /api/entities/setup/:entityId
    localStorage.setItem('erp_group_finframe_l4_groups',
      JSON.stringify([...existing, ...toCreate]));
    // [JWT] POST /api/group/finecore/account-groups/bulk
  }
  return toCreate.length;
};

// ── 2.6 createBDLedgers ─────────────────────────────────────────────────────

const createBDLedgers = (opts: SetupOptions): number => {
  if (opts.siblingEntities.length === 0) return 0;

  // [JWT] GET /api/entities/setup/:entityId
  const raw = localStorage.getItem('erp_group_ledger_definitions');
  const existing: AnyLedgerDefinition[] = raw ? JSON.parse(raw) : [];
  const existingNames = new Set(existing.map(d => d.name.toLowerCase()));

  const toCreate: AnyLedgerDefinition[] = [];

  opts.siblingEntities.forEach((sibling) => {
    // Count existing BD ledgers for this entity to avoid code collision
    const existingBDCountForThis = existing.filter(
      d => d.ledgerType === 'branch_division' && d.entityShortCode === opts.shortCode
    ).length + toCreate.filter(d => d.entityShortCode === opts.shortCode).length;

    // In THIS entity's books: create a ledger for the sibling
    const nameInThis = `${sibling.name} A/c`;
    if (!existingNames.has(nameInThis.toLowerCase())) {
      toCreate.push({
        id: crypto.randomUUID(),
        ledgerType: 'branch_division',
        name: nameInThis,
        code: `${opts.shortCode}-BD-${String(existingBDCountForThis + 1).padStart(6, '0')}`,
        parentGroupCode: 'BD',
        parentGroupName: 'Branch & Division Accounts',
        alias: sibling.shortCode,
        entityId: opts.entityId,
        entityShortCode: opts.shortCode,
        status: 'active',
      });
    }

    // In THE SIBLING's books: create a ledger for this new entity
    const nameInSibling = `${opts.entityName} A/c`;
    // [JWT] GET /api/entities/setup/:entityId
    const sibRaw = localStorage.getItem('erp_group_ledger_definitions');
    const sibExisting: AnyLedgerDefinition[] = sibRaw ? JSON.parse(sibRaw) : [];
    const sibNames = new Set(sibExisting.map(d => d.name.toLowerCase()));
    if (!sibNames.has(nameInSibling.toLowerCase())) {
      toCreate.push({
        id: crypto.randomUUID(),
        ledgerType: 'branch_division',
        name: nameInSibling,
        code: `${sibling.shortCode}-BD-${String(
          sibExisting.filter(d => d.ledgerType === 'branch_division' && d.entityShortCode === sibling.shortCode).length + 1
        ).padStart(6, '0')}`,
        parentGroupCode: 'BD',
        parentGroupName: 'Branch & Division Accounts',
        alias: opts.shortCode,
        entityId: sibling.id,
        entityShortCode: sibling.shortCode,
        status: 'active',
      });
    }
  });

  if (toCreate.length > 0) {
    // [JWT] GET /api/entities/setup/:entityId
    const allRaw = localStorage.getItem('erp_group_ledger_definitions');
    const all = allRaw ? JSON.parse(allRaw) : [];
    // [JWT] POST /api/entities/setup/:entityId
    localStorage.setItem('erp_group_ledger_definitions',
      JSON.stringify([...all, ...toCreate]));
    // [JWT] POST /api/group/finecore/ledger-definitions/bulk
  }
  return opts.siblingEntities.length;
};

// ── 2.7 runEntitySetup — main export ────────────────────────────────────────

export const runEntitySetup = (opts: SetupOptions): SetupResult => {
  // 1. Register entity in the entity registry
  registerEntity({
    id: opts.entityId,
    name: opts.entityName,
    shortCode: opts.shortCode,
    type: opts.entityType,
  });

  // 2. Create default ledgers (+ auto-create instances for all entities)
  const ledgersCreated = createDefaultLedgers(opts);

  // 3. Load industry L4 groups into FinFrame
  const l4GroupsCreated = opts.loadIndustryPack ? loadIndustryPack(opts.businessActivity) : 0;

  // 4. Create Branch/Division inter-entity ledgers
  const bdLedgersCreated = createBDLedgers(opts);

  // 5. Create default supporting masters
  const mopCreated = createDefaultModeOfPayment();
  const topCreated = createDefaultTermsOfPayment();
  const todCreated = createDefaultTermsOfDelivery();

  // 6. Create default Business Unit (Head Office)
  createDefaultBusinessUnit(opts.entityId, opts.entityName, opts.shortCode);

  // 7. Create default UOMs
  const uomsCreated = createDefaultUOMs();

  return {
    ledgersCreated,
    l4GroupsCreated,
    bdLedgersCreated,
    entityRegistered: true,
    uomsCreated,
    supportingMastersCreated: {
      modeOfPayment: mopCreated,
      termsOfPayment: topCreated,
      termsOfDelivery: todCreated,
    },
  };
};

// ── 2.8 createDefaultBusinessUnit ──────────────────────────────────────────
export const createDefaultBusinessUnit = (entityId: string, entityName: string, entityShortCode: string): void => {
  const BU_KEY = 'erp_group_business_unit_master';
  // [JWT] GET /api/entities/setup/:entityId
  const existing: any[] = JSON.parse(localStorage.getItem(BU_KEY) || '[]');
  // Don't create if already exists for this entity
  if (existing.some(u => u.parentEntityId === entityId && u.unitType === 'branch_office')) return;
  const defaultUnit = {
    id: crypto.randomUUID(),
    partyCode: 'BU-' + String(existing.length + 1).padStart(6, '0'),
    name: entityName + ' – Head Office',
    shortCode: entityShortCode.slice(0, 4).toUpperCase(),
    unitType: 'branch_office',
    parentEntityId: entityId,
    parentEntityName: entityName,
    headName: '', headDesignation: '', headMobile: '', headEmail: '',
    addressLine: '', stateCode: '', stateName: '', gstStateCode: '',
    districtCode: '', districtName: '', cityCode: '', cityName: '', pinCode: '',
    gstin: '', costCentreCode: entityShortCode + '-HO',
    isProfitCentre: true,
    openingDate: new Date().toISOString().split('T')[0],
    closingDate: '',
    status: 'active',
    description: 'Auto-created on entity setup',
    notes: '',
    suspendedBy: null, suspendedAt: null, suspendedReason: null,
    reinstatedBy: null, reinstatedAt: null, reinstatedReason: null,
  };
  existing.push(defaultUnit);
  // [JWT] POST /api/entities/setup/:entityId
  localStorage.setItem(BU_KEY, JSON.stringify(existing));
  // [JWT] POST /api/group/masters/business-units
};

// ── 2.9 createDefaultModeOfPayment ─────────────────────────────────────────
const createDefaultModeOfPayment = (): number => {
  const key = 'erp_group_mode_of_payment';
  // [JWT] GET /api/entities/setup/:entityId
  const existing: ModeOfPayment[] = JSON.parse(localStorage.getItem(key) || '[]');
  const existingCodes = new Set(existing.map(r => r.code));
  const toCreate = MODE_OF_PAYMENT_SEED
    .filter(r => !existingCodes.has(r.code))
    .map(r => ({ ...r, id: crypto.randomUUID(), isSeeded: true, isActive: true }));
  if (toCreate.length > 0) {
    // [JWT] POST /api/entities/setup/:entityId
    localStorage.setItem(key, JSON.stringify([...existing, ...toCreate]));
    // [JWT] POST /api/group/masters/mode-of-payment/bulk
  }
  return toCreate.length;
};

// ── 2.9 createDefaultTermsOfPayment ────────────────────────────────────────
const createDefaultTermsOfPayment = (): number => {
  const key = 'erp_group_terms_of_payment';
  // [JWT] GET /api/entities/setup/:entityId
  const existing: TermsOfPayment[] = JSON.parse(localStorage.getItem(key) || '[]');
  const existingCodes = new Set(existing.map(r => r.code));
  const toCreate = TERMS_OF_PAYMENT_SEED
    .filter(r => !existingCodes.has(r.code))
    .map(r => ({ ...r, id: crypto.randomUUID(), isSeeded: true, isActive: true }));
  if (toCreate.length > 0) {
    // [JWT] POST /api/entities/setup/:entityId
    localStorage.setItem(key, JSON.stringify([...existing, ...toCreate]));
    // [JWT] POST /api/group/masters/terms-of-payment/bulk
  }
  return toCreate.length;
};

// ── 2.10 createDefaultTermsOfDelivery ──────────────────────────────────────
const createDefaultTermsOfDelivery = (): number => {
  const key = 'erp_group_terms_of_delivery';
  // [JWT] GET /api/entities/setup/:entityId
  const existing: TermsOfDelivery[] = JSON.parse(localStorage.getItem(key) || '[]');
  const existingCodes = new Set(existing.map(r => r.code));
  const toCreate = TERMS_OF_DELIVERY_SEED
    .filter(r => !existingCodes.has(r.code))
    .map(r => ({ ...r, id: crypto.randomUUID(), isSeeded: true, isActive: true }));
  if (toCreate.length > 0) {
    // [JWT] POST /api/entities/setup/:entityId
    localStorage.setItem(key, JSON.stringify([...existing, ...toCreate]));
    // [JWT] POST /api/group/masters/terms-of-delivery/bulk
  }
  return toCreate.length;
};

// ── 2.11 UOM Seed Data ─────────────────────────────────────────────────────
const UOM_SEED_DATA=[
    // Weight (5)
    {code:'MG',name:'Milligram',symbol:'mg',category:'weight',uom_type:'simple',decimal_precision:3,uqc_code:'MGS',is_system:true},
    {code:'GM',name:'Gram',symbol:'g',category:'weight',uom_type:'simple',decimal_precision:3,uqc_code:'GMS',is_system:true},
    {code:'KG',name:'Kilogram',symbol:'kg',category:'weight',uom_type:'simple',decimal_precision:3,uqc_code:'KGS',is_system:true},
    {code:'QT',name:'Quintal',symbol:'qtl',category:'weight',uom_type:'compound',decimal_precision:2,uqc_code:'QTL',is_system:true},
    {code:'MT',name:'Metric Tonne',symbol:'MT',category:'weight',uom_type:'compound',decimal_precision:3,uqc_code:'TON',is_system:true},
    // Length (8)
    {code:'MM',name:'Millimetre',symbol:'mm',category:'length',uom_type:'simple',decimal_precision:2,uqc_code:'CMS',is_system:true},
    {code:'CM',name:'Centimetre',symbol:'cm',category:'length',uom_type:'simple',decimal_precision:2,uqc_code:'CMS',is_system:true},
    {code:'MR',name:'Metre',symbol:'m',category:'length',uom_type:'simple',decimal_precision:3,uqc_code:'MTR',is_system:true},
    {code:'KM',name:'Kilometre',symbol:'km',category:'length',uom_type:'compound',decimal_precision:3,uqc_code:'KME',is_system:true},
    {code:'FT',name:'Foot',symbol:'ft',category:'length',uom_type:'simple',decimal_precision:2,uqc_code:'FT',is_system:true},
    {code:'IN',name:'Inch',symbol:'in',category:'length',uom_type:'simple',decimal_precision:2,uqc_code:'INH',is_system:true},
    {code:'RF',name:'Running Foot',symbol:'rft',category:'length',uom_type:'simple',decimal_precision:2,uqc_code:'RFT',is_system:true},
    {code:'RM',name:'Running Metre',symbol:'rm',category:'length',uom_type:'simple',decimal_precision:3,uqc_code:'MTR',is_system:true},
    // Volume (4)
    {code:'ML',name:'Millilitre',symbol:'ml',category:'volume',uom_type:'simple',decimal_precision:2,uqc_code:'MLS',is_system:true},
    {code:'LT',name:'Litre',symbol:'l',category:'volume',uom_type:'simple',decimal_precision:3,uqc_code:'LTR',is_system:true},
    {code:'KL',name:'Kilolitre',symbol:'kl',category:'volume',uom_type:'compound',decimal_precision:3,uqc_code:'KLR',is_system:true},
    {code:'CBM',name:'Cubic Metre',symbol:'m³',category:'volume',uom_type:'simple',decimal_precision:3,uqc_code:'CBM',is_system:true},
    // Quantity (19)
    {code:'PCS',name:'Pieces',symbol:'pcs',category:'quantity',uom_type:'simple',decimal_precision:0,uqc_code:'NOS',is_system:true},
    {code:'NOS',name:'Numbers',symbol:'nos',category:'quantity',uom_type:'simple',decimal_precision:0,uqc_code:'NOS',is_system:true},
    {code:'UNT',name:'Unit',symbol:'unit',category:'quantity',uom_type:'simple',decimal_precision:0,uqc_code:'UNT',is_system:true},
    {code:'DOZ',name:'Dozen',symbol:'doz',category:'quantity',uom_type:'compound',decimal_precision:0,uqc_code:'DOZ',is_system:true},
    {code:'GRS',name:'Gross',symbol:'grs',category:'quantity',uom_type:'compound',decimal_precision:0,uqc_code:'GRS',is_system:true},
    {code:'PAC',name:'Pack',symbol:'pack',category:'quantity',uom_type:'simple',decimal_precision:0,uqc_code:'PAC',is_system:true},
    {code:'SET',name:'Set',symbol:'set',category:'quantity',uom_type:'simple',decimal_precision:0,uqc_code:'SET',is_system:true},
    {code:'PAR',name:'Pair',symbol:'pair',category:'quantity',uom_type:'simple',decimal_precision:0,uqc_code:'PAR',is_system:true},
    {code:'SHT',name:'Sheet',symbol:'sht',category:'quantity',uom_type:'simple',decimal_precision:0,uqc_code:'SHT',is_system:true},
    {code:'ROL',name:'Roll',symbol:'roll',category:'quantity',uom_type:'simple',decimal_precision:0,uqc_code:'ROL',is_system:true},
    {code:'BAG',name:'Bag',symbol:'bag',category:'quantity',uom_type:'simple',decimal_precision:0,uqc_code:'BAG',is_system:true},
    {code:'BOX',name:'Box',symbol:'box',category:'quantity',uom_type:'simple',decimal_precision:0,uqc_code:'BOX',is_system:true},
    {code:'CTN',name:'Carton',symbol:'ctn',category:'quantity',uom_type:'simple',decimal_precision:0,uqc_code:'CTN',is_system:true},
    {code:'BDL',name:'Bundle',symbol:'bdl',category:'quantity',uom_type:'simple',decimal_precision:0,uqc_code:'BDL',is_system:true},
    {code:'DRM',name:'Drum',symbol:'drum',category:'quantity',uom_type:'simple',decimal_precision:0,uqc_code:'DRM',is_system:true},
    {code:'BTL',name:'Bottle',symbol:'btl',category:'quantity',uom_type:'simple',decimal_precision:0,uqc_code:'BTL',is_system:true},
    {code:'TUB',name:'Tube',symbol:'tube',category:'quantity',uom_type:'simple',decimal_precision:0,uqc_code:'TBS',is_system:true},
    {code:'STR',name:'Strip',symbol:'strip',category:'quantity',uom_type:'simple',decimal_precision:0,uqc_code:'STR',is_system:true},
    {code:'AMP',name:'Ampoule',symbol:'amp',category:'quantity',uom_type:'simple',decimal_precision:0,uqc_code:'NOS',is_system:true},
    // Area (4)
    {code:'SQF',name:'Square Foot',symbol:'sqft',category:'area',uom_type:'simple',decimal_precision:2,uqc_code:'SQF',is_system:true},
    {code:'SQM',name:'Square Metre',symbol:'sqm',category:'area',uom_type:'simple',decimal_precision:2,uqc_code:'SQM',is_system:true},
    {code:'SQY',name:'Square Yard',symbol:'sqyd',category:'area',uom_type:'simple',decimal_precision:2,uqc_code:'SQY',is_system:true},
    {code:'ACR',name:'Acre',symbol:'acre',category:'area',uom_type:'simple',decimal_precision:3,uqc_code:'ACR',is_system:true},
    // Time (4)
    {code:'HR',name:'Hour',symbol:'hr',category:'time',uom_type:'simple',decimal_precision:2,uqc_code:'HRS',is_system:true},
    {code:'DAY',name:'Day',symbol:'day',category:'time',uom_type:'simple',decimal_precision:0,uqc_code:'DAY',is_system:true},
    {code:'MON',name:'Month',symbol:'mon',category:'time',uom_type:'simple',decimal_precision:0,uqc_code:'MON',is_system:true},
    {code:'YR',name:'Year',symbol:'yr',category:'time',uom_type:'simple',decimal_precision:0,uqc_code:'YRS',is_system:true},
];

// ── 2.12 createDefaultUOMs ─────────────────────────────────────────────────
const createDefaultUOMs=():number=>{
    const key='erp_uom';
    // [JWT] GET /api/entities/setup/:entityId
    const existing:any[]=JSON.parse(localStorage.getItem(key)||'[]');
    const existingSymbols=new Set(existing.map((u:any)=>u.symbol));
    const toCreate=UOM_SEED_DATA.filter(u=>!existingSymbols.has(u.symbol))
        .map(u=>({...u,id:crypto.randomUUID(),status:'active',is_active:true,
            created_at:new Date().toISOString(),updated_at:new Date().toISOString()}));
    if(toCreate.length>0){
        // [JWT] POST /api/entities/setup/:entityId
        localStorage.setItem(key,JSON.stringify([...existing,...toCreate]));
        // [JWT] POST /api/inventory/uom/bulk-seed
    }
    return toCreate.length;
};
