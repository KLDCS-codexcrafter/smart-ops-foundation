/**
 * @file        src/lib/comply360-ia-control-testing-engine.ts
 * @sibling     NEW @ Sprint 81a · Comply360 Floor 2 Internal Audit · Pass A · DP-S81-9
 * @realizes    Control Testing Worksheets specialist · Q17 Module 7.
 *              Maps controls to S80b analytics procedures.
 *              Auto-populates S80a working papers when control tests complete.
 *              SEPARATE SIBLING (DP-S81-9) for forward extensibility: S82 External Audit
 *              + S81c Mock Audit Simulator both consume control testing results.
 * @reads-from  comply360-audit-analytics-engine (S80b · 18 procedures)
 *              comply360-audit-framework-engine (S80a · createWorkingPaper · BAP visibility)
 *              comply360-payroll-audit-engine (S80b · 27 modules for HR controls)
 *              audit-trail-engine (Phase 4 · logAudit)
 *              comply360-audit-trail-aggregator-engine (S78a · registerAuditEntityType)
 * @sprint      Sprint 81a · T-Phase-5.B.2.2-PASS-A
 * [JWT] Phase 8: POST /api/comply360/ia-control-testing/run
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import { type BAPAccountId, createWorkingPaper } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-audit-analytics-engine',
    'comply360-audit-framework-engine',
    'comply360-payroll-audit-engine',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: ['erp_ia_control_tests', 'erp_ia_control_test_results'],
} as const;

export type ControlObjective =
  | 'completeness'
  | 'accuracy'
  | 'validity'
  | 'authorization'
  | 'segregation_of_duties'
  | 'physical_safeguarding'
  | 'reconciliation';

export interface ControlTestDefinition {
  id: string;
  control_code: string;
  control_name: string;
  control_description: string;
  control_objective: ControlObjective;
  process_area: string;
  test_procedure: string;
  analytics_procedure_codes: string[];
  payroll_audit_module_codes: string[];
  sample_size_target: number;
  evidence_required: string[];
  authored_by_bap: BAPAccountId;
  created_at: string;
}

export type ControlTestResult = 'passed' | 'failed' | 'compensating_control' | 'not_applicable';

export interface ControlTestRun {
  id: string;
  engagement_id: string;
  control_test_id: string;
  result: ControlTestResult;
  sample_size_tested: number;
  exceptions_count: number;
  observations: string;
  evidence_refs: string[];
  working_paper_id: string | null;
  tested_at: string;
  tested_by_bap: BAPAccountId;
  reviewed_by_bap: BAPAccountId | null;
  reviewed_at: string | null;
}

const DEF_KEY = 'erp_ia_control_tests';
const RUN_KEY = 'erp_ia_control_test_results';

function activeEntityCode(): string {
  try { return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO'; }
  catch { return 'OPERIX-DEMO'; }
}
function uid(p: string): string { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function readJson<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : fallback; }
  catch { return fallback; }
}
function writeJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}
function AUD(t: string): LogAuditEntityType { return t as unknown as LogAuditEntityType; }

export function defineControlTest(input: Omit<ControlTestDefinition, 'id' | 'created_at'>): ControlTestDefinition {
  const def: ControlTestDefinition = { ...input, id: uid('iactl'), created_at: new Date().toISOString() };
  const all = readJson<ControlTestDefinition[]>(DEF_KEY, []);
  all.push(def);
  writeJson(DEF_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('ia_control_test'),
    recordId: def.id,
    recordLabel: `Control Test Def · ${def.control_code}`,
    beforeState: null,
    afterState: def as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ia-control-testing-engine',
  });
  return def;
}

export function listControlTests(
  opts?: { process_area?: string; control_objective?: ControlObjective },
): ControlTestDefinition[] {
  return readJson<ControlTestDefinition[]>(DEF_KEY, [])
    .filter((t) => !opts?.process_area || t.process_area === opts.process_area)
    .filter((t) => !opts?.control_objective || t.control_objective === opts.control_objective);
}

export function getControlTest(id: string): ControlTestDefinition | null {
  return readJson<ControlTestDefinition[]>(DEF_KEY, []).find((t) => t.id === id) ?? null;
}

export interface RunControlTestInput {
  engagement_id: string;
  control_test_id: string;
  result: ControlTestResult;
  sample_size_tested: number;
  exceptions_count: number;
  observations: string;
  evidence_refs?: string[];
  tested_by_bap: BAPAccountId;
  auto_create_working_paper?: boolean;
}

export function runControlTest(input: RunControlTestInput): ControlTestRun {
  const def = getControlTest(input.control_test_id);
  if (!def) throw new Error(`ControlTest ${input.control_test_id} not found`);
  const autoCreate = input.auto_create_working_paper !== false;
  let working_paper_id: string | null = null;
  if (autoCreate && input.result !== 'passed') {
    const wp = createWorkingPaper({
      engagement_id: input.engagement_id,
      title: `Control Test · ${def.control_code} · ${input.result.toUpperCase()}`,
      body: `Control: ${def.control_name}\nProcedure: ${def.test_procedure}\nResult: ${input.result}\nExceptions: ${input.exceptions_count}/${input.sample_size_tested}\nObservations: ${input.observations}`,
      authored_by_bap: input.tested_by_bap,
    });
    working_paper_id = wp.id;
  }
  const run: ControlTestRun = {
    id: uid('iarun'),
    engagement_id: input.engagement_id,
    control_test_id: input.control_test_id,
    result: input.result,
    sample_size_tested: input.sample_size_tested,
    exceptions_count: input.exceptions_count,
    observations: input.observations,
    evidence_refs: input.evidence_refs ?? [],
    working_paper_id,
    tested_at: new Date().toISOString(),
    tested_by_bap: input.tested_by_bap,
    reviewed_by_bap: null,
    reviewed_at: null,
  };
  const all = readJson<ControlTestRun[]>(RUN_KEY, []);
  all.push(run);
  writeJson(RUN_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('ia_control_test'),
    recordId: run.id,
    recordLabel: `Control Test Run · ${def.control_code} · ${input.result}`,
    beforeState: null,
    afterState: run as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ia-control-testing-engine',
  });
  return run;
}

export function reviewControlTestRun(
  run_id: string,
  reviewed_by_bap: BAPAccountId,
  review_notes?: string,
): ControlTestRun {
  const all = readJson<ControlTestRun[]>(RUN_KEY, []);
  const idx = all.findIndex((r) => r.id === run_id);
  if (idx < 0) throw new Error(`ControlTestRun ${run_id} not found`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], reviewed_by_bap, reviewed_at: new Date().toISOString() };
  writeJson(RUN_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'update',
    entityType: AUD('ia_control_test'),
    recordId: run_id,
    recordLabel: `Control Test Run ${run_id} reviewed by ${reviewed_by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    reason: review_notes ?? null,
    sourceModule: 'comply360-ia-control-testing-engine',
  });
  return all[idx];
}

export function listControlTestRuns(
  engagement_id: string,
  opts?: { control_test_id?: string; result?: ControlTestResult },
): ControlTestRun[] {
  return readJson<ControlTestRun[]>(RUN_KEY, [])
    .filter((r) => r.engagement_id === engagement_id)
    .filter((r) => !opts?.control_test_id || r.control_test_id === opts.control_test_id)
    .filter((r) => !opts?.result || r.result === opts.result);
}

export function computeControlEffectivenessSummary(engagement_id: string): {
  total_tests_defined: number;
  total_tests_executed: number;
  passed_count: number;
  failed_count: number;
  compensating_control_count: number;
  effectiveness_percentage: number;
} {
  const defs = listControlTests();
  const runs = listControlTestRuns(engagement_id);
  const executed = runs.filter((r) => r.result !== 'not_applicable');
  const passed = executed.filter((r) => r.result === 'passed').length;
  const failed = executed.filter((r) => r.result === 'failed').length;
  const comp = executed.filter((r) => r.result === 'compensating_control').length;
  const pct = executed.length === 0 ? 0 : Math.round(((passed + comp) / executed.length) * 100);
  return {
    total_tests_defined: defs.length,
    total_tests_executed: executed.length,
    passed_count: passed,
    failed_count: failed,
    compensating_control_count: comp,
    effectiveness_percentage: pct,
  };
}

export function seedStandardControlTestsLibrary(by_bap: BAPAccountId): ControlTestDefinition[] {
  const defs: Array<Omit<ControlTestDefinition, 'id' | 'created_at'>> = [
    { control_code: 'CTRL-AP-001', control_name: '3-Way Matching', control_description: 'PO ⇄ GRN ⇄ Invoice match', control_objective: 'validity', process_area: 'Accounts Payable', test_procedure: 'Sample 25 AP invoices · trace to PO and GRN', analytics_procedure_codes: ['PENDING_DOCUMENTS'], payroll_audit_module_codes: [], sample_size_target: 25, evidence_required: ['PO', 'GRN', 'Invoice'], authored_by_bap: by_bap },
    { control_code: 'CTRL-VM-001', control_name: 'Vendor Master Segregation', control_description: 'Vendor master changes require approval by independent reviewer', control_objective: 'segregation_of_duties', process_area: 'Vendor Master', test_procedure: 'Review vendor master change log · confirm dual control', analytics_procedure_codes: [], payroll_audit_module_codes: [], sample_size_target: 20, evidence_required: ['Change log'], authored_by_bap: by_bap },
    { control_code: 'CTRL-BR-001', control_name: 'Bank Reconciliation Review', control_description: 'Monthly bank reconciliation reviewed and signed', control_objective: 'reconciliation', process_area: 'Treasury', test_procedure: 'Inspect 12 monthly reconciliations · confirm reviewer sign-off', analytics_procedure_codes: ['INTER_BANK_TRANSFER'], payroll_audit_module_codes: [], sample_size_target: 12, evidence_required: ['Recon statement'], authored_by_bap: by_bap },
    { control_code: 'CTRL-PR-001', control_name: 'Payroll Authorization', control_description: 'Payroll register approved before disbursement', control_objective: 'authorization', process_area: 'Payroll', test_procedure: 'Sample 6 payroll runs · verify approval', analytics_procedure_codes: [], payroll_audit_module_codes: ['PAY-APPROVAL'], sample_size_target: 6, evidence_required: ['Approval email/log'], authored_by_bap: by_bap },
    { control_code: 'CTRL-PF-001', control_name: 'PF/ESI Timely Deposit', control_description: 'PF + ESI deposited by due date', control_objective: 'completeness', process_area: 'Statutory Payroll', test_procedure: 'Test all 12 months for timely deposit', analytics_procedure_codes: ['STATUTORY_PAYMENTS'], payroll_audit_module_codes: ['PF-DEPOSIT', 'ESI-DEPOSIT'], sample_size_target: 12, evidence_required: ['Challans'], authored_by_bap: by_bap },
    { control_code: 'CTRL-GST-001', control_name: 'GST Reconciliation', control_description: 'GSTR-2B vs purchase register reconciled monthly', control_objective: 'reconciliation', process_area: 'Tax', test_procedure: 'Test 3 months of GST reconciliation', analytics_procedure_codes: ['STATUTORY_PAYMENTS'], payroll_audit_module_codes: [], sample_size_target: 3, evidence_required: ['Recon sheet'], authored_by_bap: by_bap },
    { control_code: 'CTRL-FA-001', control_name: 'Fixed Asset Additions Approval', control_description: 'Capex additions require management approval', control_objective: 'authorization', process_area: 'Fixed Assets', test_procedure: 'Sample 10 FA additions · verify approval', analytics_procedure_codes: ['FIXED_ASSETS_ANALYSIS'], payroll_audit_module_codes: [], sample_size_target: 10, evidence_required: ['Capex memo'], authored_by_bap: by_bap },
    { control_code: 'CTRL-INV-001', control_name: 'Inventory Physical Count', control_description: 'Periodic inventory counts performed and variances investigated', control_objective: 'physical_safeguarding', process_area: 'Inventory', test_procedure: 'Observe count + reconcile variances', analytics_procedure_codes: [], payroll_audit_module_codes: [], sample_size_target: 1, evidence_required: ['Count sheets'], authored_by_bap: by_bap },
    { control_code: 'CTRL-AR-001', control_name: 'Customer Credit Limit', control_description: 'Sales orders blocked when credit limit breached', control_objective: 'authorization', process_area: 'Accounts Receivable', test_procedure: 'Sample 20 orders · verify credit check', analytics_procedure_codes: [], payroll_audit_module_codes: [], sample_size_target: 20, evidence_required: ['SO log'], authored_by_bap: by_bap },
    { control_code: 'CTRL-BK-001', control_name: 'Bank Cheque Numerical Sequence', control_description: 'Cheque book numerical sequence accounted for', control_objective: 'completeness', process_area: 'Treasury', test_procedure: 'Trace cheque sequence end-to-end', analytics_procedure_codes: [], payroll_audit_module_codes: [], sample_size_target: 1, evidence_required: ['Cheque register'], authored_by_bap: by_bap },
    { control_code: 'CTRL-IT-001', control_name: 'User Access Reviews', control_description: 'Quarterly user access reviews completed', control_objective: 'segregation_of_duties', process_area: 'IT', test_procedure: 'Inspect quarterly review records', analytics_procedure_codes: [], payroll_audit_module_codes: [], sample_size_target: 4, evidence_required: ['Access review'], authored_by_bap: by_bap },
    { control_code: 'CTRL-GL-001', control_name: 'Period-End Accruals', control_description: 'Period-end accruals reviewed and approved', control_objective: 'accuracy', process_area: 'General Ledger', test_procedure: 'Sample 10 accrual entries · trace to support', analytics_procedure_codes: [], payroll_audit_module_codes: [], sample_size_target: 10, evidence_required: ['Accrual support'], authored_by_bap: by_bap },
  ];
  return defs.map((d) => defineControlTest(d));
}

registerAuditEntityType({ id: 'ia_control_test', module: 'audit-trail', label: 'IA · Control Test' });
