/**
 * @file        src/lib/comply360-walkthrough-automation-engine.ts
 * @sibling     NEW @ Sprint 81c · Comply360 Floor 2 Internal Audit Arc 2.2 · Pass C
 * @realizes    Walkthrough Automation Engine · auto-generates ProcessWalkthroughs from audit-trail
 *              without manual annotation. Heuristic process-name inference + control-gap detection.
 *              EXTENDS S81a ia-walkthrough-engine with batch + heuristic capabilities.
 * @reads-from  comply360-ia-walkthrough-engine (S81a · generateWalkthrough primitive)
 *              comply360-audit-trail-aggregator-engine (S78a · aggregateAuditTrail · registerAuditEntityType)
 *              audit-trail-engine (Phase 4 · readAuditTrail · logAudit)
 * @sprint      Sprint 81c · T-Phase-5.B.2.2-PASS-C
 * [JWT] Phase 8: POST /api/comply360/walkthrough-automation/auto-generate
 */
import { logAudit, readAuditTrail } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import { generateWalkthrough } from './comply360-ia-walkthrough-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-ia-walkthrough-engine',
    'comply360-audit-trail-aggregator-engine',
    'audit-trail-engine',
  ],
  storage_keys: ['erp_auto_walkthroughs'],
} as const;

export type ProcessName =
  | 'Procure-to-Pay'
  | 'Order-to-Cash'
  | 'Hire-to-Retire'
  | 'Record-to-Report'
  | 'Bank-Reconciliation'
  | 'Statutory-Filing'
  | 'Custom';

export interface AutoWalkthroughInput {
  engagement_id: string;
  process_name: ProcessName;
  entity_type: string;
  entity_id: string;
  entity_code: string;
  documented_by_bap: BAPAccountId;
  auto_detect_control_gaps?: boolean;
}

export interface DetectedControlGap {
  step_number: number;
  gap_description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  auto_detected: true;
}

export interface AutoWalkthroughResult {
  id: string;
  walkthrough_id: string;
  engagement_id: string;
  process_name: ProcessName;
  entity_type: string;
  entity_id: string;
  detected_control_gaps: DetectedControlGap[];
  auto_inferred_process: boolean;
  inference_confidence: number;
  generated_at: string;
  generated_by_bap: BAPAccountId;
}

const AUTO_KEY = 'erp_auto_walkthroughs';

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

export function inferProcessName(entity_type: string): {
  process_name: ProcessName;
  confidence: number;
} {
  const t = entity_type.toLowerCase();
  if (t.startsWith('sales_invoice') || t.startsWith('customer_receipt')) {
    return { process_name: 'Order-to-Cash', confidence: 85 };
  }
  if (t.startsWith('invoice') || t.startsWith('voucher_payment') || t.startsWith('bill_passing')) {
    return { process_name: 'Procure-to-Pay', confidence: 85 };
  }
  if (t.startsWith('employee') || t.startsWith('payroll')) {
    return { process_name: 'Hire-to-Retire', confidence: 85 };
  }
  if (t.startsWith('bank_recon') || t.startsWith('bank_statement')) {
    return { process_name: 'Bank-Reconciliation', confidence: 90 };
  }
  if (t.startsWith('statutory') || t.startsWith('challan')) {
    return { process_name: 'Statutory-Filing', confidence: 90 };
  }
  if (t.startsWith('journal_entry') || t.startsWith('ledger_close')) {
    return { process_name: 'Record-to-Report', confidence: 75 };
  }
  return { process_name: 'Custom', confidence: 50 };
}

function detectControlGaps(
  entity_type: string,
  entity_id: string,
  entity_code: string,
): DetectedControlGap[] {
  const entries = readAuditTrail(entity_code)
    .filter((e) => e.entity_type === entity_type && e.record_id === entity_id)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const gaps: DetectedControlGap[] = [];
  const actors = new Set<string>();
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    actors.add(e.user_id);
    // Authorization-step heuristic: 'approve' / 'post' should have a different actor than 'create'
    if ((e.action === 'approve' || e.action === 'post') && i > 0) {
      const creator = entries.find((x) => x.action === 'create');
      if (creator && creator.user_id === e.user_id) {
        gaps.push({
          step_number: i + 1,
          gap_description: 'Maker and checker are the same user (Segregation of Duties).',
          severity: 'high',
          auto_detected: true,
        });
      }
    }
    // Process delay heuristic
    if (i > 0) {
      const prev = new Date(entries[i - 1].timestamp).getTime();
      const cur = new Date(e.timestamp).getTime();
      if (cur - prev > 24 * 60 * 60 * 1000) {
        gaps.push({
          step_number: i + 1,
          gap_description: 'Gap >24h between sequential steps; potential process delay.',
          severity: 'medium',
          auto_detected: true,
        });
      }
    }
  }
  if (entries.length > 0 && actors.size === 1) {
    gaps.push({
      step_number: entries.length,
      gap_description: 'Single actor across entire flow — no independent review.',
      severity: 'critical',
      auto_detected: true,
    });
  }
  return gaps;
}

export function autoGenerateWalkthrough(input: AutoWalkthroughInput): AutoWalkthroughResult {
  const walk = generateWalkthrough({
    engagement_id: input.engagement_id,
    process_name: input.process_name,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    entity_code: input.entity_code,
    documented_by_bap: input.documented_by_bap,
  });
  const inferred = inferProcessName(input.entity_type);
  const gaps = input.auto_detect_control_gaps === false
    ? []
    : detectControlGaps(input.entity_type, input.entity_id, input.entity_code);

  const result: AutoWalkthroughResult = {
    id: uid('autowalk'),
    walkthrough_id: walk.id,
    engagement_id: input.engagement_id,
    process_name: input.process_name,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    detected_control_gaps: gaps,
    auto_inferred_process: inferred.process_name === input.process_name,
    inference_confidence: inferred.confidence,
    generated_at: new Date().toISOString(),
    generated_by_bap: input.documented_by_bap,
  };
  const all = readJson<AutoWalkthroughResult[]>(AUTO_KEY, []);
  all.push(result);
  writeJson(AUTO_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('auto_walkthrough'),
    recordId: result.id,
    recordLabel: `Auto Walkthrough · ${input.process_name} · ${input.entity_id}`,
    beforeState: null,
    afterState: { id: result.id, gaps: gaps.length } as Record<string, unknown>,
    sourceModule: 'comply360-walkthrough-automation-engine',
  });
  return result;
}

export function batchAutoGenerateWalkthroughs(opts: {
  engagement_id: string;
  entities: Array<{ entity_type: string; entity_id: string; entity_code: string }>;
  documented_by_bap: BAPAccountId;
}): AutoWalkthroughResult[] {
  return opts.entities.map((e) =>
    autoGenerateWalkthrough({
      engagement_id: opts.engagement_id,
      process_name: inferProcessName(e.entity_type).process_name,
      entity_type: e.entity_type,
      entity_id: e.entity_id,
      entity_code: e.entity_code,
      documented_by_bap: opts.documented_by_bap,
      auto_detect_control_gaps: true,
    }),
  );
}

export function listAutoWalkthroughs(
  engagement_id: string,
  opts?: { process_name?: ProcessName },
): AutoWalkthroughResult[] {
  return readJson<AutoWalkthroughResult[]>(AUTO_KEY, [])
    .filter((w) => w.engagement_id === engagement_id)
    .filter((w) => !opts?.process_name || w.process_name === opts.process_name);
}

// ── Entity-type registration ──────────────────────────────────────────
registerAuditEntityType({ id: 'auto_walkthrough', module: 'audit-trail', label: 'Auto-Generated Walkthrough' });
