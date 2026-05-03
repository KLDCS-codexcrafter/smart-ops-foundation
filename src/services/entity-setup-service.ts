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
import { VOUCHER_TYPE_SEEDS } from '@/data/voucher-type-seed-data';
// Sprint T-Phase-1.2.6f-pre-1 · RequestX wiring (sibling additions only)
import { DEFAULT_NON_FINECORE_VOUCHER_TYPES, nonFineCoreVoucherTypesKey } from '@/lib/non-finecore-voucher-type-registry';
import { DEMO_MATERIAL_INDENTS, DEMO_SERVICE_REQUESTS, DEMO_CAPITAL_INDENTS } from '@/data/demo-requestx-data';
import { materialIndentsKey } from '@/types/material-indent';
import { serviceRequestsKey } from '@/types/service-request';
import { capitalIndentsKey } from '@/types/capital-indent';
import { procurementEnquiriesKey } from '@/types/procurement-enquiry';
import { rfqsKey } from '@/types/rfq';
import { vendorQuotationsKey } from '@/types/vendor-quotation';
import {
  DEMO_PROCUREMENT_ENQUIRIES,
  DEMO_RFQS,
  DEMO_QUOTATIONS,
} from '@/data/demo-procurement-data';
// Sprint T-Phase-1.2.6f-pre-2 · Block K · Org structure auto-seed
import { ORG_PRESETS, resolvePreset } from '@/data/org-presets';
import { DIVISIONS_KEY, DEPARTMENTS_KEY, type Division, type Department } from '@/types/org-structure';

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
  autoSeedDemo?: boolean;   // NEW — when true, seeds demo data after setup
}

export interface SetupResult {
  ledgersCreated: number;
  l4GroupsCreated: number;
  bdLedgersCreated: number;
  entityRegistered: boolean;
  uomsCreated: number;
  /** Sprint T-Phase-1.1.1p-v2 — true when the auto-created
   *  "Samples & Demos - Out with 3rd Party" godown was added this run. */
  samplesGodownCreated: boolean;
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
const isExportEntity = (o: SetupOptions) => o.businessActivity === 'Import / Export' || (o as SetupOptions & { specialZone?: string }).specialZone === 'SEZ';

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

    // NEW (Sprint T10-pre.1a) — Stock adjustment pair (per owner directive Q5)
    { ledgerType: 'expense', name: 'Stock Adjustment — Write Off', code: 'STADJWO-000001', parentGroupCode: 'ADMIN', parentGroupName: l3Name('ADMIN'), alias: 'Stk WO', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'income',  name: 'Stock Adjustment — Write On',  code: 'STADJWN-000001', parentGroupCode: 'OTHI',  parentGroupName: l3Name('OTHI'),  alias: 'Stk WN', entityId: null, entityShortCode: null, status: 'active' },

    // NEW — Forex ledgers (relevant when multi-currency lands in Polish 1.5)
    { ledgerType: 'income',  name: 'Forex Gain', code: 'FXGAIN-000001', parentGroupCode: 'OTHI',  parentGroupName: l3Name('OTHI'),  alias: 'Fx Gain', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'expense', name: 'Forex Loss', code: 'FXLOSS-000001', parentGroupCode: 'ADMIN', parentGroupName: l3Name('ADMIN'), alias: 'Fx Loss', entityId: null, entityShortCode: null, status: 'active' },

    // NEW — Discount pair (for SI/PI header-level discount in T10-pre.3+)
    { ledgerType: 'expense', name: 'Discount Allowed',  code: 'DISCA-000001', parentGroupCode: 'ADMIN', parentGroupName: l3Name('ADMIN'), alias: 'Disc Allowed',  entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'income',  name: 'Discount Received', code: 'DISCR-000001', parentGroupCode: 'OTHI',  parentGroupName: l3Name('OTHI'),  alias: 'Disc Received', entityId: null, entityShortCode: null, status: 'active' },

    // NEW — Freight pair (inward capitalised / outward expensed)
    { ledgerType: 'expense', name: 'Freight Inward',  code: 'FRTIN-000001',  parentGroupCode: 'ADMIN', parentGroupName: l3Name('ADMIN'), alias: 'Frt In',  entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'expense', name: 'Freight Outward', code: 'FRTOUT-000001', parentGroupCode: 'ADMIN', parentGroupName: l3Name('ADMIN'), alias: 'Frt Out', entityId: null, entityShortCode: null, status: 'active' },
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
      type LedgerInstanceRef = { id: string; ledgerDefinitionId: string; [k: string]: unknown };
      const inst: LedgerInstanceRef[] = JSON.parse(localStorage.getItem(key) || '[]');
      if (!inst.find((i) => i.ledgerDefinitionId === def.id)) {
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
    : ['Construction', 'D&C', 'Design & Construction', 'Engineering & Construction'].includes(businessActivity) ? 'd_and_c'  // [T-T8.1-LedgerSeed-Triggers]
    : null;

  // [JWT] GET /api/entities/setup/:entityId
  const raw = localStorage.getItem('erp_group_finframe_l4_groups');
  interface L4GroupRef { name: string; parentL3Code: string; }
  const existing: L4GroupRef[] = raw ? JSON.parse(raw) : [];
  const existingNames = new Set(existing.map((g) => g.name.toLowerCase()));

  // Always load common pack
  const packs = [
    ...L4_INDUSTRY_PACKS.common,
    ...(packKey ? L4_INDUSTRY_PACKS[packKey] : []),
  ];

  const l3Counters: Record<string, number> = {};
  const toCreate = packs
    .filter(g => !existingNames.has(g.name.toLowerCase()))
    .map(g => {
      const existingCount = existing.filter((e) => e.parentL3Code === g.l3Code).length;
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

  // 2b. Seed voucher types (tenant-global; idempotent — only seeds if key absent)
  try {
    // [JWT] POST /api/accounting/voucher-types/bulk-seed
    const existingVT = localStorage.getItem('erp_voucher_types');
    if (!existingVT) {
      localStorage.setItem('erp_voucher_types', JSON.stringify(VOUCHER_TYPE_SEEDS));
    }
  } catch { /* ignore */ }

  // 2c. Sprint T-Phase-1.2.6f-pre-1 — Seed Non-FineCore voucher types (RequestX + sibling families).
  try {
    // [JWT] POST /api/voucher-types/non-finecore/bulk-seed
    const nfcKey = nonFineCoreVoucherTypesKey(opts.shortCode);
    if (!localStorage.getItem(nfcKey)) {
      localStorage.setItem(nfcKey, JSON.stringify(DEFAULT_NON_FINECORE_VOUCHER_TYPES));
    }
  } catch { /* ignore */ }

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

  // 8. Optionally seed demo data
  if (opts.autoSeedDemo) {
    try {
      // [JWT] POST /api/demo/seed-entity
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@/lib/demo-seed-orchestrator') as typeof import('@/lib/demo-seed-orchestrator');
      const archetype = mod.detectArchetype(opts.businessActivity);
      mod.seedEntityDemoData(opts.shortCode, archetype);
    } catch { /* demo module optional */ }

    // 8b. Sprint T-Phase-1.2.6f-pre-1-fix · Multi-entity demo seed · per-entity filtering by id-prefix.
    try {
      // [JWT] POST /api/requestx/demo-seed
      const miKey = materialIndentsKey(opts.shortCode);
      if (!localStorage.getItem(miKey)) {
        const codePrefix = opts.shortCode.toLowerCase().slice(0, 5);
        const stamp = <T extends { id: string; entity_id: string }>(rows: readonly T[]): T[] =>
          rows.filter(r => r.id.includes(codePrefix)).map(r => ({ ...r, entity_id: opts.entityId }));
        const myMaterials = stamp(DEMO_MATERIAL_INDENTS);
        const myServices = stamp(DEMO_SERVICE_REQUESTS);
        const myCapitals = stamp(DEMO_CAPITAL_INDENTS);
        if (myMaterials.length > 0) localStorage.setItem(miKey, JSON.stringify(myMaterials));
        if (myServices.length > 0) localStorage.setItem(serviceRequestsKey(opts.shortCode), JSON.stringify(myServices));
        if (myCapitals.length > 0) localStorage.setItem(capitalIndentsKey(opts.shortCode), JSON.stringify(myCapitals));
      }
    } catch { /* ignore */ }
    // 8b-procure. Sprint T-Phase-1.2.6f-a-fix · FIX-2 · Procure360 demo seed (per-entity prefix).
    try {
      // [JWT] POST /api/procure360/demo-seed
      const peKey = procurementEnquiriesKey(opts.shortCode);
      if (!localStorage.getItem(peKey)) {
        const codePrefix = opts.shortCode.toLowerCase().slice(0, 5);
        const matchingEnq = DEMO_PROCUREMENT_ENQUIRIES
          .filter((e) => e.id.includes(`-${codePrefix}-`))
          .map((e) => ({ ...e, entity_id: opts.entityId }));
        const matchingRfqs = DEMO_RFQS
          .filter((r) => r.id.includes(`-${codePrefix}-`))
          .map((r) => ({ ...r, entity_id: opts.entityId }));
        const matchingQuotations = DEMO_QUOTATIONS
          .filter((q) => q.id.includes(`-${codePrefix}-`))
          .map((q) => ({ ...q, entity_id: opts.entityId }));
        if (matchingEnq.length > 0) localStorage.setItem(peKey, JSON.stringify(matchingEnq));
        if (matchingRfqs.length > 0) localStorage.setItem(rfqsKey(opts.shortCode), JSON.stringify(matchingRfqs));
        if (matchingQuotations.length > 0) localStorage.setItem(vendorQuotationsKey(opts.shortCode), JSON.stringify(matchingQuotations));
      }
    } catch { /* ignore */ }
    // 8c. Sprint T-Phase-1.2.6f-pre-2 · Block K · Auto-seed divisions/departments per industry preset.
    try {
      // [JWT] POST /api/foundation/org-structure/auto-seed
      const presetId = opts.businessActivity === 'Manufacturing' ? 'manufacturing'
        : ['Trading', 'Distribution', 'Import / Export'].includes(opts.businessActivity) ? 'trading'
        : ['Services', 'IT Services', 'Consulting'].includes(opts.businessActivity) ? 'services'
        : opts.businessActivity === 'Retail' ? 'retail' : 'minimal';
      const preset = ORG_PRESETS.find(p => p.id === presetId);
      if (preset) {
        const existingDivs: Division[] = JSON.parse(localStorage.getItem(DIVISIONS_KEY) || '[]');
        const existingDepts: Department[] = JSON.parse(localStorage.getItem(DEPARTMENTS_KEY) || '[]');
        const alreadySeeded = existingDivs.some(d => d.entity_id === opts.entityId)
          || existingDepts.some(d => d.entity_id === opts.entityId);
        if (!alreadySeeded) {
          const now = new Date().toISOString();
          const { divisions: newDivs, departments: newDepts } = resolvePreset(preset, now);
          const stampedDivs = newDivs.map((d, i) => ({
            ...d,
            id: `div-${opts.shortCode}-${Date.now()}-${i}`,
            code: `DIV-${opts.shortCode}-${String(i + 1).padStart(3, '0')}`,
            entity_id: opts.entityId,
          }));
          const divIdMap = new Map<string, string>();
          newDivs.forEach((d, i) => divIdMap.set(d.id, stampedDivs[i].id));
          const stampedDepts = newDepts.map((d, i) => ({
            ...d,
            id: `dept-${opts.shortCode}-${Date.now()}-${i}`,
            code: `DEPT-${opts.shortCode}-${String(i + 1).padStart(3, '0')}`,
            entity_id: opts.entityId,
            division_id: d.division_id ? (divIdMap.get(d.division_id) ?? null) : null,
          }));
          localStorage.setItem(DIVISIONS_KEY, JSON.stringify([...existingDivs, ...stampedDivs]));
          localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify([...existingDepts, ...stampedDepts]));
        }
      }
    } catch { /* ignore */ }
  }

  // 9. Sprint T-Phase-1.1.1p-v2 — Auto-create
  //    "Samples & Demos - Out with 3rd Party" godown.
  //    Ownership type: third_party_our_stock (Our stock at customer's premises).
  //    Tracks all sample/demo units in circulation. Idempotent.
  let samplesGodownCreated = false;
  try {
    const GODOWN_KEY = 'erp_godowns';
    // [JWT] GET /api/inventory/godowns?entityCode=:entityCode
    const existing: Array<{ name: string }> = JSON.parse(
      localStorage.getItem(GODOWN_KEY) || '[]',
    );
    const alreadyExists = existing.some(
      g => g.name === 'Samples & Demos - Out with 3rd Party',
    );
    if (!alreadyExists) {
      const nowIso = new Date().toISOString();
      const samplesGodown = {
        id: `gd-samples-${opts.shortCode}-${Date.now()}`,
        code: `${opts.shortCode}-SMPL-GD`,
        name: 'Samples & Demos - Out with 3rd Party',
        ownership_type: 'third_party_our_stock' as const,
        party_id: null,
        party_name: null,
        address: null, city: null, state: null, pincode: null,
        country: 'India',
        latitude: null, longitude: null,
        total_capacity: null, capacity_unit: null,
        contact_person: null, contact_phone: null, contact_email: null,
        gst_number: null,
        description: 'Auto-created for tracking sample & demo units in circulation with customers / prospects. Non-refundable samples are booked as consumed. Refundable units return to main store on receipt.',
        status: 'active' as const,
        zones: [], agreements: [],
        created_at: nowIso, updated_at: nowIso,
      };
      // [JWT] POST /api/inventory/godowns
      localStorage.setItem(GODOWN_KEY, JSON.stringify([...existing, samplesGodown]));
      samplesGodownCreated = true;
    }

    // Sprint T-Phase-1.2.1 · Seed 5 departmental godowns idempotently.
    // Indian ERP-first: every plant has a Main Store + Maintenance + Production WIP +
    // Paint Shop + QC Hold. These are the minimum 5 needed for departmental accountability.
    const refreshed: Array<{ name: string; code: string }> = JSON.parse(
      localStorage.getItem(GODOWN_KEY) || '[]',
    );
    const nowIso2 = new Date().toISOString();
    type SeedG = {
      code: string; name: string;
      department_code: 'main' | 'maintenance' | 'production' | 'paint_shop' | 'qc';
      requires_issue_note: boolean; is_virtual: boolean;
      description: string;
    };
    const departmentSeeds: SeedG[] = [
      { code: `${opts.shortCode}-MAIN-GD`,  name: 'Main Store',          department_code: 'main',        requires_issue_note: false, is_virtual: false, description: 'Primary raw material & consumables store. All inward GRNs land here by default.' },
      { code: `${opts.shortCode}-MTNC-GD`,  name: 'Maintenance Store',   department_code: 'maintenance', requires_issue_note: true,  is_virtual: false, description: 'Spares, tools & consumables for plant maintenance. Issued only on MIN voucher.' },
      { code: `${opts.shortCode}-WIP-GD`,   name: 'Production / WIP',    department_code: 'production',  requires_issue_note: true,  is_virtual: true,  description: 'Virtual godown holding work-in-progress stock on the shop floor.' },
      { code: `${opts.shortCode}-PAINT-GD`, name: 'Paint Shop Store',    department_code: 'paint_shop',  requires_issue_note: true,  is_virtual: false, description: 'Paints, thinners & PPE for paint booth. Hazmat tracked.' },
      { code: `${opts.shortCode}-QC-GD`,    name: 'QC Hold Store',       department_code: 'qc',          requires_issue_note: true,  is_virtual: false, description: 'Quarantine for items pending inspection or failed QC.' },
    ];
    const toAppend = departmentSeeds.filter(s => !refreshed.some(r => r.code === s.code || r.name === s.name));
    if (toAppend.length > 0) {
      const seeded = toAppend.map(s => ({
        id: `gdn-seed-${opts.shortCode}-${s.department_code}-${Date.now()}`,
        code: s.code, name: s.name,
        ownership_type: 'own_own_stock' as const,
        party_id: null, party_name: null,
        address: null, city: null, state: null, pincode: null,
        country: 'India',
        latitude: null, longitude: null,
        total_capacity: null, capacity_unit: null,
        contact_person: null, contact_phone: null, contact_email: null,
        gst_number: null,
        description: s.description,
        status: 'active' as const,
        zones: [], agreements: [],
        department_code: s.department_code,
        responsible_person_id: null, responsible_person_name: null,
        is_virtual: s.is_virtual,
        requires_issue_note: s.requires_issue_note,
        project_centre_id: null,
        created_at: nowIso2, updated_at: nowIso2,
      }));
      // [JWT] POST /api/inventory/godowns (bulk)
      const merged = JSON.parse(localStorage.getItem(GODOWN_KEY) || '[]');
      localStorage.setItem(GODOWN_KEY, JSON.stringify([...seeded, ...merged]));
    }

    // Sprint T-Phase-1.2.1-fix · Blueprint-specific extra godowns.
    // Supplements the 5 universal departmental godowns above with patterns
    // unique to each blueprint's business model.
    type ExtraDept =
      | 'main' | 'maintenance' | 'production' | 'paint_shop' | 'qc'
      | 'welding' | 'site' | 'service' | 'dispatch';
    type ExtraG = {
      code: string; name: string;
      department_code: ExtraDept;
      requires_issue_note: boolean;
      is_virtual: boolean;
      description: string;
    };
    const blueprintExtras: Record<string, ExtraG[]> = {
      SINHA: [
        { code: 'SINHA-WELD-GD',  name: 'Welding Bay Stock',    department_code: 'welding',     requires_issue_note: true,  is_virtual: true,  description: 'Electrodes, Argon/CO2, wire — issued from Main Store. Virtual floor stock.' },
        { code: 'SINHA-SITE-GD',  name: 'Site Stock',           department_code: 'site',        requires_issue_note: true,  is_virtual: true,  description: 'Material issued to customer conveyor installation sites. Per-project accountability.' },
        { code: 'SINHA-DISP-GD',  name: 'Dispatch Staging',     department_code: 'dispatch',    requires_issue_note: false, is_virtual: false, description: 'Finished conveyor structures and spare parts awaiting dispatch.' },
      ],
      SMRTP: [
        { code: 'SMRTP-SVC-GD',   name: 'Service Parts Store',  department_code: 'service',     requires_issue_note: true,  is_virtual: false, description: 'Spare parts for Smartpower AMC customers. Accountability critical — missing parts = failed SLA.' },
        { code: 'SMRTP-SITE-GD',  name: 'Site Stock',           department_code: 'site',        requires_issue_note: true,  is_virtual: true,  description: 'Material at customer installation sites (UPS, gate automation).' },
      ],
      CHRSE: [
        { code: 'CHRSE-BEV-GD',   name: 'Beverage Concentrate', department_code: 'main',        requires_issue_note: false, is_virtual: false, description: 'Beverage concentrate, syrup, pods. FIFO critical — perishable.' },
        { code: 'CHRSE-DEV-GD',   name: 'Device Spare Parts',   department_code: 'maintenance', requires_issue_note: true,  is_virtual: false, description: 'Vending machine spare parts (heaters, pumps, sensors).' },
        { code: 'CHRSE-DISP-GD',  name: 'Dispatch — D2C',       department_code: 'dispatch',    requires_issue_note: false, is_virtual: false, description: 'Packed beverage orders for Blinkit / D2C / B2B dispatch.' },
      ],
      AMITH: [
        { code: 'AMITH-WH-GD',    name: 'Warehouse — Howrah',   department_code: 'main',        requires_issue_note: false, is_virtual: false, description: 'Imported marble slabs, granite blocks, tiles in bulk.' },
        { code: 'AMITH-SHOW-GD',  name: 'Showroom — Kolkata',   department_code: 'dispatch',    requires_issue_note: false, is_virtual: false, description: 'Display and retail stock in Kolkata showroom.' },
      ],
    };
    const extras = blueprintExtras[opts.shortCode] ?? [];
    if (extras.length > 0) {
      const currentGodowns: Array<{ name: string; code: string }> = JSON.parse(
        localStorage.getItem(GODOWN_KEY) || '[]',
      );
      const toAppendExtras = extras.filter(
        e => !currentGodowns.some(g => g.code === e.code || g.name === e.name),
      );
      if (toAppendExtras.length > 0) {
        const seededExtras = toAppendExtras.map(e => ({
          id: `gdn-seed-${e.code.toLowerCase()}-${Date.now()}`,
          code: e.code, name: e.name,
          ownership_type: 'own_own_stock' as const,
          party_id: null, party_name: null,
          address: null, city: null, state: null, pincode: null,
          country: 'India',
          latitude: null, longitude: null,
          total_capacity: null, capacity_unit: null,
          contact_person: null, contact_phone: null, contact_email: null,
          gst_number: null, description: e.description,
          status: 'active' as const, zones: [], agreements: [],
          department_code: e.department_code,
          responsible_person_id: null, responsible_person_name: null,
          is_virtual: e.is_virtual,
          requires_issue_note: e.requires_issue_note,
          project_centre_id: null,
          created_at: nowIso2, updated_at: nowIso2,
        }));
        // [JWT] POST /api/inventory/godowns (bulk)
        const mergedExtras = JSON.parse(localStorage.getItem(GODOWN_KEY) || '[]');
        localStorage.setItem(GODOWN_KEY, JSON.stringify([...seededExtras, ...mergedExtras]));
      }
    }

    // Sprint T-Phase-1.2.4 · System Goods-in-Transit godown (every entity gets one · idempotent)
    const GIT_CODE = `${opts.shortCode}-GIT-GD`;
    const currentForGit: Array<{ code: string }> = JSON.parse(localStorage.getItem(GODOWN_KEY) || '[]');
    if (!currentForGit.some(g => g.code === GIT_CODE)) {
      const gitGodown = {
        id: `gdn-seed-git-${opts.shortCode.toLowerCase()}-${Date.now()}`,
        code: GIT_CODE,
        name: 'Goods in Transit',
        ownership_type: 'goods_in_transit' as const,
        party_id: null, party_name: null,
        address: null, city: null, state: null, pincode: null, country: 'India',
        latitude: null, longitude: null,
        total_capacity: null, capacity_unit: null,
        contact_person: null, contact_phone: null, contact_email: null,
        gst_number: null,
        description: 'Virtual godown for invoice-received-material-pending scenario. Material here means vendor invoice booked but physical receipt pending.',
        status: 'active' as const,
        zones: [], agreements: [],
        department_code: null,
        responsible_person_id: null, responsible_person_name: null,
        is_virtual: true,
        requires_issue_note: false,
        project_centre_id: null,
        is_system_godown: true,
        created_at: nowIso2, updated_at: nowIso2,
      };
      const mergedGit = JSON.parse(localStorage.getItem(GODOWN_KEY) || '[]');
      // [JWT] POST /api/inventory/godowns (system seed)
      localStorage.setItem(GODOWN_KEY, JSON.stringify([gitGodown, ...mergedGit]));
    }
  } catch { /* ignore */ }

  // Sprint T-Phase-1.2.3 · Demo seed: a few reorder rules + heat numbers so
  // ReorderAlerts and HeatMaster have testable data on a fresh entity.
  // Idempotent — only seeds when the respective stores are empty.
  try {
    const RR_KEY = 'erp_location_reorder_rules';
    const HEAT_KEY = `erp_heat_numbers_${opts.shortCode}`;
    const ITEM_KEY = `erp_group_items_${opts.shortCode}`;
    const GODOWN_KEY2 = 'erp_godowns';
    const existingRules: Array<{ id: string }> = JSON.parse(localStorage.getItem(RR_KEY) || '[]');
    const existingHeats: Array<{ heat_no: string }> = JSON.parse(localStorage.getItem(HEAT_KEY) || '[]');
    const seedItems: Array<{ id: string; code?: string; name: string }> = JSON.parse(
      localStorage.getItem(ITEM_KEY)
        || localStorage.getItem('erp_group_items')
        || '[]'
    );
    const seedGodowns: Array<{ id: string; name: string; code: string }> = JSON.parse(
      localStorage.getItem(GODOWN_KEY2) || '[]'
    );
    const mainGd = seedGodowns.find(g => /MAIN-GD$/i.test(g.code) || /Main Store/i.test(g.name));
    const nowIso3 = new Date().toISOString();

    if (existingRules.length === 0 && seedItems.length > 0 && mainGd) {
      const sample = seedItems.slice(0, 3);
      const seededRules = sample.map((it, idx) => ({
        id: `rr-seed-${opts.shortCode}-${idx}-${Date.now()}`,
        item_id: it.id, item_code: it.code ?? '', item_name: it.name,
        godown_id: mainGd.id, godown_name: mainGd.name,
        department_tag_id: null, department_tag_name: null,
        min_stock: 50, max_stock: 500, reorder_qty: 100,
        safety_stock: 25, lead_time_days: 7,
        priority: idx === 0 ? 'critical' : idx === 1 ? 'high' : 'normal',
        is_active: true,
        created_at: nowIso3, updated_at: nowIso3,
      }));
      // [JWT] POST /api/inventory/reorder-rules (bulk)
      localStorage.setItem(RR_KEY, JSON.stringify(seededRules));
    }

    if (existingHeats.length === 0 && opts.shortCode === 'SINHA' && seedItems.length > 0) {
      const steelItem = seedItems.find(it => /steel|plate|sheet|bar|rod/i.test(it.name)) ?? seedItems[0];
      const seededHeats = [
        {
          id: `heat-seed-${opts.shortCode}-1`,
          heat_no: 'HT-2026-0001', cast_no: 'C-1001',
          mill_name: 'Tata Steel Jamshedpur', mill_batch_ref: 'TS-2026-0001',
          supplier_id: null, supplier_name: 'Tata Steel Ltd', supplier_batch_ref: null,
          item_id: steelItem.id, item_name: steelItem.name, grade: 'IS 2062 E250',
          received_qty: 1500, available_qty: 1500, uom: 'KG',
          status: 'received',
          created_at: nowIso3, updated_at: nowIso3,
        },
        {
          id: `heat-seed-${opts.shortCode}-2`,
          heat_no: 'HT-2026-0002', cast_no: 'C-1002',
          mill_name: 'JSW Steel', mill_batch_ref: 'JSW-2026-0002',
          supplier_id: null, supplier_name: 'JSW Steel Ltd', supplier_batch_ref: null,
          item_id: steelItem.id, item_name: steelItem.name, grade: 'IS 2062 E350',
          received_qty: 800, available_qty: 600, uom: 'KG',
          status: 'in_production',
          created_at: nowIso3, updated_at: nowIso3,
        },
      ];
      // [JWT] POST /api/inventory/heat-numbers (bulk)
      localStorage.setItem(HEAT_KEY, JSON.stringify(seededHeats));
    }

    // Sprint T-Phase-1.2.4 · One demo in-transit GRN per entity (idempotent · demos GIT feature)
    const GRN_KEY = `erp_grns_${opts.shortCode}`;
    const grnsForGit: Array<{ id: string; status?: string }> = JSON.parse(
      localStorage.getItem(GRN_KEY) || '[]'
    );
    const hasInTransitGrn = grnsForGit.some(g => g.status === 'in_transit');
    const itemForDemo = seedItems[0];
    const allGodowns: Array<{ id: string; ownership_type?: string }> = JSON.parse(
      localStorage.getItem('erp_godowns') || '[]'
    );
    const gitGdId = allGodowns.find(g => g.ownership_type === 'goods_in_transit')?.id;
    if (!hasInTransitGrn && itemForDemo && gitGdId && mainGd) {
      const sixDaysAgoIso = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
      const demoInTransitGrn = {
        id: `grn-git-demo-${opts.shortCode.toLowerCase()}-${Date.now()}`,
        entity_id: opts.shortCode,
        grn_no: `IGRN/26-27/0001`,
        voucher_type_id: 'vt-receipt-note-import',
        voucher_type_name: 'Goods Receipt Note (Import)',
        receipt_mode: 'two_stage' as const,
        status: 'in_transit' as const,
        po_id: null, po_no: null,
        vendor_id: '', vendor_name: 'Demo Vendor (Import)',
        vendor_invoice_no: 'INV-DEMO-12345',
        vendor_invoice_date: sixDaysAgoIso.slice(0, 10),
        receipt_date: nowIso3.slice(0, 10),
        vehicle_no: 'MH-04-AB-1234', lr_no: 'LR-DEMO-001',
        received_by_id: '', received_by_name: 'Auto-seed',
        godown_id: gitGdId, godown_name: 'Goods in Transit',
        project_centre_id: null,
        lines: [{
          id: `grnline-git-demo-1`,
          item_id: itemForDemo.id, item_code: itemForDemo.code ?? '', item_name: itemForDemo.name,
          item_type: 'Raw Material', uom: 'kg',
          ordered_qty: 500, received_qty: 500, accepted_qty: 500, rejected_qty: 0,
          unit_rate: 50, line_total: 25000,
          batch_no: null, serial_nos: [], heat_no: null,
          bin_id: null, qc_result: 'pending', qc_notes: '',
        }],
        total_qty: 500, total_value: 25000,
        has_discrepancy: false,
        narration: 'Demo: Vendor invoice received, material in transit (6 days)',
        invoice_received_at: sixDaysAgoIso,
        physical_received_at: null,
        created_at: nowIso3, updated_at: nowIso3,
        posted_at: null, cancelled_at: null, cancellation_reason: null,
      };
      const mergedGrns = JSON.parse(localStorage.getItem(GRN_KEY) || '[]');
      // [JWT] POST /api/inventory/grn (demo seed)
      localStorage.setItem(GRN_KEY, JSON.stringify([demoInTransitGrn, ...mergedGrns]));

      // Stage stock in GIT godown for the demo
      const balKey = `erp_stock_balance_${opts.shortCode}`;
      const balances: Array<{
        item_id: string; item_code: string; item_name: string;
        godown_id: string; godown_name: string;
        qty: number; value: number; weighted_avg_rate: number;
        last_grn_id: string | null; last_grn_no: string | null;
        updated_at: string;
      }> = JSON.parse(localStorage.getItem(balKey) || '[]');
      const alreadyStaged = balances.some(b => b.item_id === itemForDemo.id && b.godown_id === gitGdId);
      if (!alreadyStaged) {
        balances.unshift({
          item_id: itemForDemo.id, item_code: itemForDemo.code ?? '', item_name: itemForDemo.name,
          godown_id: gitGdId, godown_name: 'Goods in Transit',
          qty: 500, value: 25000, weighted_avg_rate: 50,
          last_grn_id: demoInTransitGrn.id, last_grn_no: demoInTransitGrn.grn_no,
          updated_at: nowIso3,
        });
        localStorage.setItem(balKey, JSON.stringify(balances));
      }
    }
  } catch { /* ignore — demo seed is best-effort */ }

  // Sprint T-Phase-1.2.5 · Store Discipline Depth · idempotent demo seed
  try {
    const ITEM_KEY_25 = `erp_group_items_${opts.shortCode}`;
    const seedItems25: Array<{ id: string; name: string; abc_class?: string | null; abc_class_pinned?: boolean }> = JSON.parse(
      localStorage.getItem(ITEM_KEY_25)
        || localStorage.getItem('erp_group_items')
        || localStorage.getItem('erp_inventory_items')
        || '[]',
    );
    const nowIso25 = new Date().toISOString();

    // 9a) ABC pin first matching item to A (idempotent: only when not already pinned)
    const PIN_TARGETS: Record<string, RegExp> = {
      SINHA: /MS Plate 12|plate.*12/i,
      SMRTP: /UPS.*5\s*KVA|ups.*5kva/i,
      BCPL: /paracetamol|api/i,
      SHKPH: /paracetamol|api/i,
      CHRSE: /sugar|cleaning/i,
    };
    const tgt = PIN_TARGETS[opts.shortCode];
    if (tgt && seedItems25.length > 0) {
      let mut = false;
      for (let i = 0; i < seedItems25.length; i++) {
        if (tgt.test(seedItems25[i].name) && !seedItems25[i].abc_class_pinned) {
          seedItems25[i] = {
            ...seedItems25[i],
            abc_class: 'A', abc_class_pinned: true,
            // @ts-expect-error sibling fields
            abc_classified_at: nowIso25, updated_at: nowIso25,
          };
          mut = true;
          break;
        }
      }
      if (mut) {
        const k = localStorage.getItem(ITEM_KEY_25) ? ITEM_KEY_25
          : localStorage.getItem('erp_group_items') ? 'erp_group_items' : 'erp_inventory_items';
        localStorage.setItem(k, JSON.stringify(seedItems25));
      }
    }

    // 9b) Hazmat profiles
    const HZ_KEY = `erp_hazmat_profiles_${opts.shortCode}`;
    const existingHz: Array<{ profile_name: string }> = JSON.parse(localStorage.getItem(HZ_KEY) || '[]');
    interface HzSeed {
      name: string; dg_class: '3' | '5' | '8'; sub: string | null; un: string;
      pg: 'I' | 'II' | 'III'; flash: number | null; oxid: boolean; corr: boolean; tox: boolean;
    }
    const HZ_BY_ENTITY: Record<string, HzSeed[]> = {
      BCPL: [
        { name: 'Toluene Solvent', dg_class: '3', sub: null, un: 'UN1294', pg: 'II', flash: 4, oxid: false, corr: false, tox: true },
        { name: 'Hydrochloric Acid 32%', dg_class: '8', sub: null, un: 'UN1789', pg: 'II', flash: null, oxid: false, corr: true, tox: true },
        { name: 'Hydrogen Peroxide 50%', dg_class: '5', sub: '5.1', un: 'UN2014', pg: 'II', flash: null, oxid: true, corr: true, tox: false },
      ],
      SHKPH: [
        { name: 'Methanol', dg_class: '3', sub: null, un: 'UN1230', pg: 'II', flash: 11, oxid: false, corr: false, tox: true },
        { name: 'Acetic Acid Glacial', dg_class: '8', sub: null, un: 'UN2789', pg: 'II', flash: 39, oxid: false, corr: true, tox: false },
      ],
      CHRSE: [
        { name: 'Cleaning Concentrate (alkaline)', dg_class: '8', sub: null, un: 'UN1719', pg: 'III', flash: null, oxid: false, corr: true, tox: false },
      ],
    };
    const hzSeeds = HZ_BY_ENTITY[opts.shortCode] ?? [];
    const toCreateHz = hzSeeds.filter(h => !existingHz.some(e => e.profile_name === h.name));
    if (toCreateHz.length > 0) {
      const merged = [...existingHz];
      for (const h of toCreateHz) {
        merged.push({
          // @ts-expect-error full HazmatProfile shape
          id: `hzm-seed-${opts.shortCode}-${h.name.replace(/\s+/g, '-').toLowerCase()}`,
          entity_id: opts.shortCode, profile_name: h.name,
          dg_class: h.dg_class, dg_sub_class: h.sub, un_number: h.un,
          packing_group: h.pg, proper_shipping_name: h.name,
          flash_point_celsius: h.flash, boiling_point_celsius: null,
          is_oxidizer: h.oxid, is_water_reactive: false, is_corrosive: h.corr,
          is_toxic: h.tox, is_carcinogenic: false,
          msds_document_url: null, msds_document_filename: null,
          msds_uploaded_at: null, msds_revision_no: null,
          emergency_contact_no: null, emergency_contact_name: null,
          max_storage_temperature_celsius: null, min_storage_temperature_celsius: null,
          ventilation_required: h.dg_class === '3', segregation_notes: null,
          notes: 'Demo seed', created_at: nowIso25, updated_at: nowIso25,
        });
      }
      // [JWT] POST /api/inventory/hazmat-profiles (bulk demo seed)
      localStorage.setItem(HZ_KEY, JSON.stringify(merged));
    }

    // 9c) SINHA substitutes
    if (opts.shortCode === 'SINHA' && seedItems25.length >= 2) {
      const SUB_KEY = `erp_item_substitutes_${opts.shortCode}`;
      const existingSubs: Array<{ id: string }> = JSON.parse(localStorage.getItem(SUB_KEY) || '[]');
      if (existingSubs.length === 0) {
        const a = seedItems25[0]; const b = seedItems25[1];
        const today = nowIso25.slice(0, 10);
        const subs = [{
          id: `sub-seed-${opts.shortCode}-1`,
          entity_id: opts.shortCode,
          primary_item_id: a.id, primary_item_code: '', primary_item_name: a.name,
          substitute_item_id: b.id, substitute_item_code: '', substitute_item_name: b.name,
          ratio: 1.0, scenarios: ['production'], notes: 'Demo: equivalent grade',
          approval_status: 'approved', approved_by_id: null, approved_by_name: 'Engineering',
          approved_at: nowIso25, approval_doc_ref: 'ECO-2026-001',
          effective_from: today, effective_until: null, is_active: true,
          used_count: 0, last_used_at: null,
          created_at: nowIso25, updated_at: nowIso25,
        }];
        // [JWT] POST /api/inventory/item-substitutes (demo seed)
        localStorage.setItem(SUB_KEY, JSON.stringify(subs));
      }
    }

    // 9d) Returnable packaging — SINHA pallets + SMRTP crates
    const RP_KEY = `erp_returnable_packaging_${opts.shortCode}`;
    const existingRp: Array<{ unit_no: string }> = JSON.parse(localStorage.getItem(RP_KEY) || '[]');
    interface RpSeed { prefix: string; kind: 'pallet' | 'crate'; cost: number; count: number }
    const RP_BY_ENTITY: Record<string, RpSeed | null> = {
      SINHA: { prefix: 'PALLET-SINHA-2024', kind: 'pallet', cost: 1500, count: 5 },
      SMRTP: { prefix: 'CRATE-SMRTP-2024', kind: 'crate', cost: 2200, count: 3 },
    };
    const rpCfg = RP_BY_ENTITY[opts.shortCode];
    if (rpCfg && existingRp.length === 0) {
      const dueIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const sentIso = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const seedRp: unknown[] = [];
      for (let i = 1; i <= rpCfg.count; i++) {
        const unitNo = `${rpCfg.prefix}-${String(i).padStart(4, '0')}`;
        const withCustomer = i <= Math.ceil(rpCfg.count / 2);
        seedRp.push({
          id: `pkg-seed-${opts.shortCode}-${i}`,
          entity_id: opts.shortCode,
          unit_no: unitNo, kind: rpCfg.kind,
          description: `Demo ${rpCfg.kind} unit`,
          acquisition_cost: rpCfg.cost,
          expected_lifetime_cycles: 50, current_cycle_count: withCustomer ? 1 : 0,
          status: withCustomer ? 'with_customer' : 'in_stock',
          current_location: withCustomer ? 'Demo Customer A' : 'IN_STOCK',
          current_godown_id: null,
          current_customer_id: withCustomer ? 'cust-demo-a' : null,
          sent_with_dln_id: null,
          sent_to_customer_id: withCustomer ? 'cust-demo-a' : null,
          sent_to_customer_name: withCustomer ? 'Demo Customer A' : null,
          sent_at: withCustomer ? sentIso : null,
          return_due_date: withCustomer ? dueIso : null,
          returned_at: null, return_grn_id: null, return_condition: null,
          notes: null, created_at: nowIso25, updated_at: nowIso25,
        });
      }
      // [JWT] POST /api/inventory/returnable-packaging (demo seed)
      localStorage.setItem(RP_KEY, JSON.stringify(seedRp));
    }
  } catch { /* ignore — 1.2.5 demo seed is best-effort */ }

  // Sprint T-Phase-1.2.6 · Cycle Count + RTV demo seed (idempotent)
  try {
    const nowIso26 = new Date().toISOString();

    // 11a) Bin capacities for SINHA + SMRTP
    const BIN_KEY = `erp_bin_labels_${opts.shortCode}`;
    interface BinLite { id: string; capacity?: number | null; capacity_unit?: string | null; updated_at?: string }
    const bins: BinLite[] = JSON.parse(localStorage.getItem(BIN_KEY) || '[]');
    const CAP_BY_ENTITY: Record<string, { caps: number[]; unit: 'kg' | 'units' }> = {
      SINHA: { caps: [1000, 1000, 500, 2000, 2000], unit: 'kg' },
      SMRTP: { caps: [50, 100, 100], unit: 'units' },
    };
    const cfg = CAP_BY_ENTITY[opts.shortCode];
    if (cfg && bins.length > 0) {
      let mut = false;
      for (let i = 0; i < bins.length && i < cfg.caps.length; i++) {
        if (bins[i].capacity == null) {
          bins[i] = { ...bins[i], capacity: cfg.caps[i], capacity_unit: cfg.unit, updated_at: nowIso26 };
          mut = true;
        }
      }
      if (mut) localStorage.setItem(BIN_KEY, JSON.stringify(bins));
    }

    // 11b) 1 posted cycle count per entity (idempotent)
    const CC_KEY = `erp_cycle_counts_${opts.shortCode}`;
    const ccExisting: Array<{ id: string }> = JSON.parse(localStorage.getItem(CC_KEY) || '[]');
    const balRows: Array<{
      item_id: string; item_code: string; item_name: string;
      godown_id: string; godown_name: string;
      qty: number; weighted_avg_rate: number;
    }> = JSON.parse(localStorage.getItem(`erp_stock_balance_${opts.shortCode}`) || '[]');
    if (ccExisting.length === 0 && balRows.length >= 5) {
      const sample = balRows.slice(0, 5);
      const lines = sample.map((b, i) => {
        const variance = i === 2 ? -2 : 0;
        const physical = b.qty + variance;
        const varValue = variance * b.weighted_avg_rate;
        return {
          id: `ccline-seed-${i}`,
          item_id: b.item_id, item_code: b.item_code, item_name: b.item_name,
          uom: 'NOS',
          godown_id: b.godown_id, godown_name: b.godown_name,
          bin_id: null, bin_code: null,
          system_qty: b.qty, physical_qty: physical, variance_qty: variance,
          weighted_avg_rate: b.weighted_avg_rate,
          variance_value: Math.round(varValue * 100) / 100,
          variance_reason: variance !== 0 ? 'count_error' : null,
          variance_notes: variance !== 0 ? 'Demo seed · count error' : null,
          recount_qty: null, recount_at: null, recount_by_id: null, recount_by_name: null,
        };
      });
      const totalVarValue = lines.reduce((s, l) => s + l.variance_value, 0);
      const cc = {
        id: `cc-seed-${opts.shortCode}`,
        entity_id: opts.shortCode,
        count_no: `PSV/26-27/0001`,
        count_kind: 'random' as const,
        count_date: nowIso26.slice(0, 10),
        godown_id: null, godown_name: null,
        bin_filter: null, abc_class_filter: null,
        counter_id: 'demo-counter', counter_name: 'Demo Counter',
        reviewer_id: 'demo-reviewer', reviewer_name: 'Demo Reviewer',
        approver_id: 'demo-approver', approver_name: 'Demo Approver',
        status: 'posted' as const,
        submitted_at: nowIso26, approved_at: nowIso26,
        rejected_at: null, rejection_reason: null,
        posted_at: nowIso26, cancelled_at: null, cancellation_reason: null,
        lines,
        total_lines: lines.length,
        variance_lines: lines.filter(l => l.variance_qty !== 0).length,
        total_variance_qty_abs: Math.abs(lines.reduce((s, l) => s + l.variance_qty, 0)),
        total_variance_value: Math.round(totalVarValue * 100) / 100,
        net_shrinkage_pct: 0,
        notes: 'Demo seed cycle count',
        created_at: nowIso26, updated_at: nowIso26,
      };
      localStorage.setItem(CC_KEY, JSON.stringify([cc]));
    }

    // 11c) SINHA RTV demo (idempotent)
    if (opts.shortCode === 'SINHA') {
      const RTV_KEY = `erp_rtvs_${opts.shortCode}`;
      const rtvExisting: Array<{ id: string }> = JSON.parse(localStorage.getItem(RTV_KEY) || '[]');
      if (rtvExisting.length === 0 && balRows.length > 0) {
        const b = balRows[0];
        const qty = 50;
        const rate = b.weighted_avg_rate || 100;
        const lineTotal = Math.round(qty * rate * 100) / 100;
        const rtv = {
          id: `rtv-seed-${opts.shortCode}`,
          entity_id: opts.shortCode,
          rtv_no: `RJO/26-27/0001`,
          status: 'posted' as const,
          rtv_date: nowIso26.slice(0, 10),
          vendor_id: '', vendor_name: 'Demo Vendor (QC Failed)',
          vendor_address: null, vendor_gst: null,
          transport_mode: 'Road', vehicle_no: 'MH-04-RT-9999', lr_no: 'LR-RTV-001',
          expected_credit_note_no: null,
          lines: [{
            id: 'rtvline-seed-1',
            item_id: b.item_id, item_code: b.item_code, item_name: b.item_name,
            uom: 'kg',
            godown_id: b.godown_id, godown_name: b.godown_name,
            bin_id: null,
            rejected_qty: qty, unit_rate: rate, line_total: lineTotal,
            source_grn_id: null, source_grn_no: null, source_grn_line_id: null,
            qc_failure_reason: 'Material below mechanical spec — fails IS 2062 E350 yield',
            batch_no: null, serial_nos: [], heat_no: null,
          }],
          total_qty: qty, total_value: lineTotal,
          narration: 'Demo seed RTV from QC-failed receipt',
          posted_at: nowIso26, shipped_at: null,
          cancelled_at: null, cancellation_reason: null,
          created_at: nowIso26, updated_at: nowIso26,
        };
        localStorage.setItem(RTV_KEY, JSON.stringify([rtv]));
      }
    }
  } catch { /* ignore — 1.2.6 demo seed is best-effort */ }

  // Sprint T-Phase-1.2.2 · Auto-activate Inventory Hub + ProjX voucher types on entity creation
  // Founder lock: "if voucher type is not then create the same while creating entity refer command center"
  // vt-stock-journal + vt-stock-transfer are already is_active:true — no action needed
  // vt-consumption-entry + ProjX types are feature_based → activate on every entity creation
  try {
    const VT_KEY = 'erp_voucher_types';
    const vts: Array<{ id: string; is_active: boolean; updated_at?: string }> =
      JSON.parse(localStorage.getItem(VT_KEY) || '[]');
    const toActivate = [
      'vt-consumption-entry',          // Inventory Hub
      'vt-project-invoice',            // ProjX billing
      'vt-project-advance-receipt',    // ProjX advance
      'vt-retention-settlement',       // ProjX retention (1.5.7)
      // Sprint T-Phase-1.2.4 · GRN multi-variant — every entity gets all 3 (founder lock)
      'vt-receipt-note-domestic',
      'vt-receipt-note-import',
      'vt-receipt-note-subcon',
      // Sprint T-Phase-1.2.6 · Cycle Count + RTV
      'vt-physical-stock',
      'vt-rejections-out',
    ];
    let changed = false;
    toActivate.forEach(vtId => {
      const idx = vts.findIndex(v => v.id === vtId);
      if (idx !== -1 && !vts[idx].is_active) {
        vts[idx] = { ...vts[idx], is_active: true, updated_at: new Date().toISOString() };
        changed = true;
        // [JWT] PATCH /api/accounting/voucher-types/:vtId/activate
      }
    });
    if (changed) localStorage.setItem(VT_KEY, JSON.stringify(vts));
  } catch { /* ignore — VT activation is best-effort */ }

  return {
    ledgersCreated,
    l4GroupsCreated,
    bdLedgersCreated,
    entityRegistered: true,
    uomsCreated,
    samplesGodownCreated,
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
  interface BusinessUnitRef { id: string; name: string; entityId?: string; parentEntityId?: string; unitType?: string }
  const existing: BusinessUnitRef[] = JSON.parse(localStorage.getItem(BU_KEY) || '[]');
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
    interface UOMRef { id?: string; symbol: string }
    const existing: UOMRef[] = JSON.parse(localStorage.getItem(key)||'[]');
    const existingSymbols = new Set(existing.map((u) => u.symbol));
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
