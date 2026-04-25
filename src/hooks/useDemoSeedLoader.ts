/**
 * useDemoSeedLoader.ts — Demo data lifecycle manager
 * Single entry point for loading, checking, and resetting demo data.
 * Additive-only — never overwrites existing data.
 * [JWT] Replace localStorage calls with REST endpoints as annotated.
 */

import { toast } from 'sonner';
import {
  DEMO_COMPANY_PROFILES, DEMO_EMPLOYEES, DEMO_SALARY_STRUCTURES,
  DEMO_PAY_GRADES, DEMO_HOLIDAY_CALENDAR, DEMO_SHIFTS, DEMO_LEAVE_TYPES,
  DEMO_LOAN_TYPES, DEMO_BONUS_CONFIGS, DEMO_GRATUITY_NPS,
  DEMO_ATTENDANCE_TYPES, DEMO_OVERTIME_RULES, DEMO_HOLIDAY_DATES,
} from '@/data/demo-seed-data';
import {
  DEMO_PAYROLL_RUNS, DEMO_LEAVE_REQUESTS, DEMO_IT_DECLARATIONS,
  DEMO_LOAN_APPLICATIONS, DEMO_SALARY_ADVANCES, generateAttendanceRecords,
} from '@/data/demo-transactions-pay-hub';
import { payrollRunsKey } from '@/types/payroll-run';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

// ── DemoModule registry ─────────────────────────────────────────────────

export interface DemoModule {
  id: string;
  label: string;
  sprint: string;
  status: 'complete' | 'partial' | 'planned';
  masterKeys: string[];
  transactionKeys: string[];
  loadMasters: () => void;
  loadTransactions: () => void;
  getCount: (key: string) => number;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function safeSet(key: string, data: unknown[]): void {
  // [JWT] GET /api/entity/storage/:key
  const existing = localStorage.getItem(key);
  if (existing) {
    const parsed = JSON.parse(existing);
    if (Array.isArray(parsed) && parsed.length > 0) return;
  }
  // [JWT] POST /api/entity/storage/:key
  localStorage.setItem(key, JSON.stringify(data));
}

function safeSetObj(key: string, data: unknown): void {
  // [JWT] GET /api/entity/storage/:key
  const existing = localStorage.getItem(key);
  if (existing) return;
  // [JWT] POST /api/entity/storage/:key
  localStorage.setItem(key, JSON.stringify(data));
}

function getStoredCount(key: string): number {
  try {
    // [JWT] GET /api/entity/storage/:key/count
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : (typeof parsed === 'object' ? 1 : 0);
  } catch { return 0; }
}

// ── Foundation loader ───────────────────────────────────────────────────

function loadFoundationMasters(): void {
  // Entity registry
  const entities = DEMO_COMPANY_PROFILES.map(p => ({
    id: p.id, name: p.legalEntityName, shortCode: p.entityCode, type: p.type,
  }));
  safeSet('erp_group_entities', entities);

  // Parent company profile
  const parent = DEMO_COMPANY_PROFILES.find(p => p.type === 'parent');
  if (parent) {
    safeSetObj('erp_parent_company', {
      id: parent.id,
      legalEntityName: parent.legalEntityName,
      tradingBrandName: parent.tradingBrandName,
      businessEntity: parent.businessEntity,
      industry: parent.industry,
      businessActivity: parent.businessActivity,
      pan: parent.pan, cin: parent.cin, gstin: parent.gstin,
      gstRegistrationType: parent.gstRegistrationType,
      tan: parent.tan, msmeUdyam: parent.msmeUdyam,
      addressLine: parent.addressLine, city: parent.city,
      state: parent.state, stateCode: parent.stateCode, pincode: parent.pincode,
      phone: parent.phone, email: parent.email, website: parent.website,
    });
  }

  // Companies
  const companies = DEMO_COMPANY_PROFILES
    .filter(p => p.type === 'subsidiary')
    .map(p => ({ ...p }));
  if (companies.length) safeSet('erp_companies', companies);

  // Branches
  const branches = DEMO_COMPANY_PROFILES
    .filter(p => p.type === 'branch')
    .map(p => ({ ...p }));
  if (branches.length) safeSet('erp_branch_offices', branches);
}

// ── Pay Hub master loader ───────────────────────────────────────────────

function loadPayHubMasters(): void {
  safeSet('erp_employees', DEMO_EMPLOYEES);
  safeSet('erp_salary_structures', DEMO_SALARY_STRUCTURES);
  safeSet('erp_pay_grades', DEMO_PAY_GRADES);
  safeSet('erp_shifts', DEMO_SHIFTS);
  safeSet('erp_leave_types', DEMO_LEAVE_TYPES);
  safeSet('erp_holiday_calendars', [DEMO_HOLIDAY_CALENDAR]);
  safeSet('erp_attendance_types', DEMO_ATTENDANCE_TYPES);
  safeSet('erp_overtime_rules', DEMO_OVERTIME_RULES);
  safeSet('erp_loan_types', DEMO_LOAN_TYPES);
  safeSet('erp_bonus_configs', DEMO_BONUS_CONFIGS);
  safeSetObj('erp_gratuity_nps_config', DEMO_GRATUITY_NPS);
}

// ── Pay Hub transaction loader ──────────────────────────────────────────

function loadPayHubTransactions(): void {
  safeSet(payrollRunsKey(DEFAULT_ENTITY_SHORTCODE), DEMO_PAYROLL_RUNS);
  safeSet('erp_leave_requests', DEMO_LEAVE_REQUESTS);
  safeSet('erp_it_declarations', DEMO_IT_DECLARATIONS);
  safeSet('erp_loan_applications', DEMO_LOAN_APPLICATIONS);
  safeSet('erp_salary_advances', DEMO_SALARY_ADVANCES);

  // Generate attendance records at runtime
  // [JWT] GET /api/entity/storage/erp_attendance_records
  const existingAtt = localStorage.getItem('erp_attendance_records');
  if (!existingAtt || JSON.parse(existingAtt).length === 0) {
    const empIds = DEMO_EMPLOYEES.map(e => e.id);
    const records = generateAttendanceRecords(empIds, ['2026-01', '2026-02', '2026-03'], DEMO_HOLIDAY_DATES);
    // [JWT] POST /api/entity/storage/erp_attendance_records
    localStorage.setItem('erp_attendance_records', JSON.stringify(records));
  }
}

// ── Module registry ─────────────────────────────────────────────────────

export const DEMO_MODULES: DemoModule[] = [
  {
    id: 'foundation',
    label: 'Foundation & Entities',
    sprint: 'Live',
    status: 'complete',
    masterKeys: ['erp_companies', 'erp_subsidiaries', 'erp_branch_offices',
                 'erp_group_entities', 'erp_parent_company'],
    transactionKeys: [],
    loadMasters: loadFoundationMasters,
    loadTransactions: () => {},
    getCount: (key) => getStoredCount(key),
  },
  {
    id: 'pay-hub',
    label: 'Pay Hub',
    sprint: 'Live — fully complete',
    status: 'complete',
    masterKeys: ['erp_employees', 'erp_salary_structures', 'erp_pay_grades',
                 'erp_shifts', 'erp_leave_types', 'erp_holiday_calendars',
                 'erp_attendance_types', 'erp_overtime_rules',
                 'erp_loan_types', 'erp_bonus_configs', 'erp_gratuity_nps_config'],
    transactionKeys: ['erp_payroll_runs_SMRT', 'erp_attendance_records',
                      'erp_leave_requests', 'erp_it_declarations',
                      'erp_loan_applications', 'erp_salary_advances'],
    loadMasters: loadPayHubMasters,
    loadTransactions: loadPayHubTransactions,
    getCount: (key) => getStoredCount(key),
  },
  {
    id: 'finecore',
    label: 'Fin Core',
    sprint: 'FC Sprint 1',
    status: 'partial' as const,
    masterKeys: ['erp_group_vouchers_SMRT'],
    transactionKeys: [],
    loadMasters: () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { loadFineCoreTransactions } = require('@/data/demo-transactions-finecore');
        loadFineCoreTransactions(DEFAULT_ENTITY_SHORTCODE);
      } catch { /* seed data module not yet loaded */ }
    },
    loadTransactions: () => {},
    getCount: (key: string) => getStoredCount(key),
  },
  {
    id: 'salesx',
    label: 'SalesX Hub',
    sprint: 'Live — Sprint 1-5',
    status: 'complete' as const,
    masterKeys: ['erp_group_customer_master', 'erp_sam_persons_SMRT', 'erp_sam_hierarchy_SMRT',
                 'erp_enquiry_sources_SMRT', 'erp_campaigns_SMRT'],
    transactionKeys: ['erp_enquiries_SMRT', 'erp_quotations_SMRT',
                      'erp_opportunities_SMRT', 'erp_commission_register_SMRT'],
    loadMasters: () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('@/lib/demo-seed-orchestrator') as typeof import('@/lib/demo-seed-orchestrator');
        mod.seedEntityDemoData(DEFAULT_ENTITY_SHORTCODE, 'trading');
      } catch { /* not yet loaded */ }
    },
    loadTransactions: () => { /* handled inside seedEntityDemoData */ },
    getCount: (key: string) => getStoredCount(key),
  },
  {
    id: 'receivx',
    label: 'ReceivX Hub',
    sprint: 'Live — Sprint 6A',
    status: 'complete' as const,
    masterKeys: ['erp_receivx_templates_SMRT', 'erp_receivx_execs_SMRT',
                 'erp_receivx_schemes_SMRT', 'erp_receivx_config_SMRT'],
    transactionKeys: ['erp_receivx_ptps_SMRT', 'erp_receivx_comm_log_SMRT',
                      'erp_receivx_tasks_SMRT'],
    loadMasters: () => { /* handled by salesx orchestrator */ },
    loadTransactions: () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('@/lib/demo-seed-orchestrator') as typeof import('@/lib/demo-seed-orchestrator');
        mod.seedEntityDemoData(DEFAULT_ENTITY_SHORTCODE, 'trading');
      } catch { /* not yet loaded */ }
    },
    getCount: (key: string) => getStoredCount(key),
  },
];

// ── Hook ────────────────────────────────────────────────────────────────

export function useDemoSeedLoader() {
  const loadModule = (moduleId: string, type: 'masters' | 'transactions' | 'all') => {
    const mod = DEMO_MODULES.find(m => m.id === moduleId);
    if (!mod) return;
    if (type === 'masters' || type === 'all') mod.loadMasters();
    if (type === 'transactions' || type === 'all') mod.loadTransactions();
    // [JWT] PATCH /api/demo/loaded-modules
    const loaded = JSON.parse(localStorage.getItem('erp_demo_loaded') || '{}');
    loaded[moduleId] = { loadedAt: new Date().toISOString(), type };
    // [JWT] POST /api/demo/loaded-modules
    localStorage.setItem('erp_demo_loaded', JSON.stringify(loaded));
    toast.success(`${mod.label} demo data loaded`);
  };

  const resetModule = (moduleId: string) => {
    const mod = DEMO_MODULES.find(m => m.id === moduleId);
    if (!mod) return;
    [...mod.masterKeys, ...mod.transactionKeys].forEach(key => {
      // [JWT] DELETE /api/entity/storage/:key
      localStorage.removeItem(key);
    });
    // [JWT] PATCH /api/demo/loaded-modules
    const loaded = JSON.parse(localStorage.getItem('erp_demo_loaded') || '{}');
    delete loaded[moduleId];
    // [JWT] POST /api/demo/loaded-modules
    localStorage.setItem('erp_demo_loaded', JSON.stringify(loaded));
    toast.info(`${mod.label} demo data cleared`);
  };

  const loadAll = () => DEMO_MODULES.forEach(m => loadModule(m.id, 'all'));
  const resetAll = () => DEMO_MODULES.forEach(m => resetModule(m.id));

  const getLoadedModules = (): Record<string, { loadedAt: string; type: string }> => {
    // [JWT] GET /api/demo/loaded-modules
    return JSON.parse(localStorage.getItem('erp_demo_loaded') || '{}');
  };

  const seedEntityByArchetype = (
    entityCode: string,
    archetype: 'trading' | 'services' | 'manufacturing',
  ) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@/lib/demo-seed-orchestrator') as typeof import('@/lib/demo-seed-orchestrator');
      const result = mod.seedEntityDemoData(entityCode, archetype);
      toast.success(`${entityCode} seeded: ${result.customers} cust, ${result.salesInvoices} inv, ${result.ptps} PTPs`);
      return result;
    } catch (err) {
      toast.error(`Seed failed: ${(err as Error).message}`);
      return null;
    }
  };

  return { loadModule, resetModule, loadAll, resetAll, getLoadedModules, seedEntityByArchetype, DEMO_MODULES };
}
