/**
 * @file        src/lib/comply360-survival-kit-engine.ts
 * @sibling     NEW @ Sprint 82 · DP-S82-3 · OOB-4 · Auditor Pre-Audit Survival Kit · UNIQUE TO OPERIX
 * @reads-from  comply360-caro-extended-engine · comply360-audit-framework-engine
 *              comply360-auditor-workspace-engine · audit-trail-engine · aggregator
 * @sprint      Sprint 82 · T-Phase-5.B.2.3 · FLOOR 2 CLOSES
 * [JWT] Phase 8: POST /api/comply360/survival-kit/*
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-caro-extended-engine',
    'comply360-audit-framework-engine',
    'comply360-auditor-workspace-engine',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: ['erp_survival_kits', 'erp_sk_checklist_items', 'erp_sk_likely_questions'],
} as const;

const KIT_KEY = 'erp_survival_kits';
const CL_KEY = 'erp_sk_checklist_items';
const Q_KEY = 'erp_sk_likely_questions';

function AUD(t: string): LogAuditEntityType { return t as unknown as LogAuditEntityType; }
function uid(p: string): string { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function readJson<T>(k: string, fb: T): T {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : fb; } catch { return fb; }
}
function writeJson(k: string, v: unknown): void {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
}
function activeEntityCode(): string {
  try { return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO'; } catch { return 'OPERIX-DEMO'; }
}

export type DocumentArea =
  | 'financial_statements' | 'caro_compliance' | 'statutory_filings'
  | 'internal_controls' | 'related_party' | 'going_concern'
  | 'inventory' | 'fixed_assets' | 'employee_benefits' | 'taxation';

export type ChecklistStatus = 'pending' | 'in_progress' | 'ready' | 'not_applicable';
export type ReadinessBand = 'audit_ready' | 'mostly_ready' | 'partial' | 'not_ready';
export type SkPriority = 'critical' | 'high' | 'medium' | 'low';

export interface PreAuditChecklistItem {
  id: string;
  survival_kit_id: string;
  document_area: DocumentArea;
  document_name: string;
  caro_clause_ref: string | null;
  priority: SkPriority;
  status: ChecklistStatus;
  notes: string;
  marked_by_bap: BAPAccountId | null;
  marked_at: string | null;
}

export interface AuditorLikelyQuestion {
  id: string;
  survival_kit_id: string;
  question_text: string;
  caro_clause_ref: string | null;
  likely_followup_questions: string[];
  suggested_response: string;
  priority: SkPriority;
}

export interface SurvivalKit {
  id: string;
  engagement_id: string;
  fy: string;
  generated_at: string;
  generated_by_bap: BAPAccountId;
  total_checklist_items: number;
  ready_items_count: number;
  pending_items_count: number;
  readiness_percentage: number;
  readiness_band: ReadinessBand;
  total_likely_questions: number;
}

const PRIORITY_WEIGHT: Record<SkPriority, number> = { critical: 4, high: 3, medium: 2, low: 1 };

const SEED_ITEMS: Array<Omit<PreAuditChecklistItem, 'id' | 'survival_kit_id' | 'status' | 'marked_by_bap' | 'marked_at' | 'notes'>> = [
  { document_area: 'financial_statements', document_name: 'Trial Balance · FY signed', caro_clause_ref: null, priority: 'critical' },
  { document_area: 'financial_statements', document_name: 'P&L Statement · audit-ready', caro_clause_ref: null, priority: 'critical' },
  { document_area: 'financial_statements', document_name: 'Balance Sheet · with notes', caro_clause_ref: null, priority: 'critical' },
  { document_area: 'financial_statements', document_name: 'Cash-flow statement', caro_clause_ref: null, priority: 'high' },
  { document_area: 'caro_compliance', document_name: 'CARO 3(i) PPE register', caro_clause_ref: '3(i)', priority: 'critical' },
  { document_area: 'caro_compliance', document_name: 'CARO 3(ii) Inventory verification', caro_clause_ref: '3(ii)', priority: 'high' },
  { document_area: 'caro_compliance', document_name: 'CARO 3(iii) Loans/advances disclosures', caro_clause_ref: '3(iii)', priority: 'high' },
  { document_area: 'statutory_filings', document_name: 'GST returns · 12 months', caro_clause_ref: null, priority: 'high' },
  { document_area: 'statutory_filings', document_name: 'TDS returns · 4 quarters', caro_clause_ref: null, priority: 'high' },
  { document_area: 'statutory_filings', document_name: 'EPF/ESI challans', caro_clause_ref: null, priority: 'medium' },
  { document_area: 'internal_controls', document_name: 'IFC documentation', caro_clause_ref: null, priority: 'high' },
  { document_area: 'internal_controls', document_name: 'Segregation-of-duties matrix', caro_clause_ref: null, priority: 'medium' },
  { document_area: 'related_party', document_name: 'Related-party register (Sec 188)', caro_clause_ref: null, priority: 'high' },
  { document_area: 'going_concern', document_name: 'Going-concern assessment', caro_clause_ref: null, priority: 'critical' },
  { document_area: 'inventory', document_name: 'Inventory physical verification report', caro_clause_ref: '3(ii)', priority: 'high' },
  { document_area: 'fixed_assets', document_name: 'PPE physical verification report', caro_clause_ref: '3(i)', priority: 'high' },
  { document_area: 'employee_benefits', document_name: 'Actuarial valuation report (gratuity)', caro_clause_ref: null, priority: 'medium' },
  { document_area: 'taxation', document_name: 'Form 26AS reconciliation', caro_clause_ref: null, priority: 'high' },
  { document_area: 'taxation', document_name: 'Tax provision computation', caro_clause_ref: null, priority: 'critical' },
  { document_area: 'taxation', document_name: 'Form 3CD draft', caro_clause_ref: null, priority: 'high' },
];

const SEED_QUESTIONS: Array<Omit<AuditorLikelyQuestion, 'id' | 'survival_kit_id'>> = [
  { question_text: 'How is your PPE register reconciled with the general ledger?', caro_clause_ref: '3(i)', likely_followup_questions: ['Any disposals not derecognized?', 'Last physical verification date?'], suggested_response: 'Monthly reconciliation via FA module · sample workpapers available.', priority: 'critical' },
  { question_text: 'Walk me through your inventory cycle-count program.', caro_clause_ref: '3(ii)', likely_followup_questions: ['Cycle frequency?', 'Variance threshold?'], suggested_response: 'Quarterly cycle count with ABC stratification · variance log retained.', priority: 'high' },
  { question_text: 'Provide the related-party listing along with Sec 188 approvals.', caro_clause_ref: null, likely_followup_questions: ['Board resolutions on file?', 'Arm’s-length pricing memos?'], suggested_response: 'Master register maintained in Company Secretary module.', priority: 'high' },
  { question_text: 'Explain the going-concern assessment for FY.', caro_clause_ref: null, likely_followup_questions: ['Liquidity ratios?', 'Loan covenants?'], suggested_response: 'Cashflow forecast + debt-service coverage modeled · documented memo on file.', priority: 'critical' },
  { question_text: 'Show GST reconciliation between 3B / 1 / 2A / Books.', caro_clause_ref: null, likely_followup_questions: ['Any unmatched ITC?', 'Open mismatches?'], suggested_response: 'Auto-reconciler runs monthly · mismatch register zeroed out at month-close.', priority: 'high' },
  { question_text: 'Tax provision workings and Form 26AS reconciliation.', caro_clause_ref: null, likely_followup_questions: ['Disallowances list?', 'Carry-forward losses?'], suggested_response: 'Computation sheet generated by Tax module · 26AS auto-pulled.', priority: 'critical' },
];

export function computeReadinessPercentage(items: PreAuditChecklistItem[]): number {
  const applicable = items.filter((i) => i.status !== 'not_applicable');
  if (applicable.length === 0) return 0;
  const totalWeight = applicable.reduce((s, i) => s + PRIORITY_WEIGHT[i.priority], 0);
  const readyWeight = applicable
    .filter((i) => i.status === 'ready')
    .reduce((s, i) => s + PRIORITY_WEIGHT[i.priority], 0);
  if (totalWeight === 0) return 0;
  return Math.round((readyWeight / totalWeight) * 100);
}

export function mapReadinessBand(percentage: number): ReadinessBand {
  if (percentage >= 85) return 'audit_ready';
  if (percentage >= 70) return 'mostly_ready';
  if (percentage >= 50) return 'partial';
  return 'not_ready';
}

export function generateSurvivalKit(opts: {
  engagement_id: string;
  fy: string;
  generated_by_bap: BAPAccountId;
}): SurvivalKit {
  const kit_id = uid('sk');
  const items: PreAuditChecklistItem[] = SEED_ITEMS.map((s) => ({
    ...s,
    id: uid('cli'),
    survival_kit_id: kit_id,
    status: 'pending',
    notes: '',
    marked_by_bap: null,
    marked_at: null,
  }));
  const questions: AuditorLikelyQuestion[] = SEED_QUESTIONS.map((q) => ({
    ...q,
    id: uid('ql'),
    survival_kit_id: kit_id,
  }));

  // persist items + questions (append)
  const allItems = readJson<PreAuditChecklistItem[]>(CL_KEY, []).concat(items);
  writeJson(CL_KEY, allItems);
  const allQ = readJson<AuditorLikelyQuestion[]>(Q_KEY, []).concat(questions);
  writeJson(Q_KEY, allQ);

  const ready = items.filter((i) => i.status === 'ready').length;
  const pct = computeReadinessPercentage(items);
  const kit: SurvivalKit = {
    id: kit_id,
    engagement_id: opts.engagement_id,
    fy: opts.fy,
    generated_at: new Date().toISOString(),
    generated_by_bap: opts.generated_by_bap,
    total_checklist_items: items.length,
    ready_items_count: ready,
    pending_items_count: items.length - ready,
    readiness_percentage: pct,
    readiness_band: mapReadinessBand(pct),
    total_likely_questions: questions.length,
  };
  const kits = readJson<SurvivalKit[]>(KIT_KEY, []);
  kits.push(kit);
  writeJson(KIT_KEY, kits);

  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('survival_kit'),
    recordId: kit.id,
    recordLabel: `Survival Kit · ${opts.fy} · ${items.length} items`,
    beforeState: null,
    afterState: kit as unknown as Record<string, unknown>,
    sourceModule: 'comply360-survival-kit-engine',
  });
  return kit;
}

export function markChecklistItemStatus(
  item_id: string,
  status: ChecklistStatus,
  by_bap: BAPAccountId,
  notes?: string,
): PreAuditChecklistItem {
  const all = readJson<PreAuditChecklistItem[]>(CL_KEY, []);
  const idx = all.findIndex((i) => i.id === item_id);
  if (idx < 0) throw new Error(`Checklist item not found: ${item_id}`);
  const before = { ...all[idx] };
  all[idx] = {
    ...all[idx],
    status,
    notes: notes ?? all[idx].notes,
    marked_by_bap: by_bap,
    marked_at: new Date().toISOString(),
  };
  writeJson(CL_KEY, all);
  // recompute parent kit aggregates
  const kits = readJson<SurvivalKit[]>(KIT_KEY, []);
  const kIdx = kits.findIndex((k) => k.id === all[idx].survival_kit_id);
  if (kIdx >= 0) {
    const kitItems = all.filter((i) => i.survival_kit_id === kits[kIdx].id);
    const ready = kitItems.filter((i) => i.status === 'ready').length;
    const pct = computeReadinessPercentage(kitItems);
    kits[kIdx] = {
      ...kits[kIdx],
      ready_items_count: ready,
      pending_items_count: kitItems.length - ready,
      readiness_percentage: pct,
      readiness_band: mapReadinessBand(pct),
    };
    writeJson(KIT_KEY, kits);
  }
  logAudit({
    entityCode: activeEntityCode(),
    action: 'update',
    entityType: AUD('pre_audit_checklist_item'),
    recordId: item_id,
    recordLabel: `Checklist item → ${status}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-survival-kit-engine',
  });
  return all[idx];
}

export function listChecklistItems(
  survival_kit_id: string,
  opts?: { document_area?: DocumentArea; status?: ChecklistStatus },
): PreAuditChecklistItem[] {
  return readJson<PreAuditChecklistItem[]>(CL_KEY, [])
    .filter((i) => i.survival_kit_id === survival_kit_id)
    .filter((i) => !opts?.document_area || i.document_area === opts.document_area)
    .filter((i) => !opts?.status || i.status === opts.status);
}

export function listLikelyQuestions(
  survival_kit_id: string,
  opts?: { priority?: SkPriority },
): AuditorLikelyQuestion[] {
  return readJson<AuditorLikelyQuestion[]>(Q_KEY, [])
    .filter((q) => q.survival_kit_id === survival_kit_id)
    .filter((q) => !opts?.priority || q.priority === opts.priority);
}

export function listSurvivalKits(engagement_id: string): SurvivalKit[] {
  return readJson<SurvivalKit[]>(KIT_KEY, []).filter((k) => k.engagement_id === engagement_id);
}

export function getSurvivalKit(id: string): SurvivalKit | null {
  return readJson<SurvivalKit[]>(KIT_KEY, []).find((k) => k.id === id) ?? null;
}

registerAuditEntityType({ id: 'survival_kit', module: 'audit-trail', label: 'Survival Kit · Container' });
registerAuditEntityType({ id: 'pre_audit_checklist_item', module: 'audit-trail', label: 'Survival Kit · Checklist Item' });
registerAuditEntityType({ id: 'auditor_likely_question', module: 'audit-trail', label: 'Survival Kit · Likely Question' });
