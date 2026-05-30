/**
 * @file        src/lib/comply360-ia-walkthrough-engine.ts
 * @sibling     NEW @ Sprint 81a · Comply360 Floor 2 Internal Audit · Pass A · DP-S81-8
 * @realizes    Walkthrough Documentation specialist · Q17 Module 6.
 *              Auto-extracts process walkthroughs from audit-trail-aggregator.
 *              Generates entity-flow diagrams (text-based · Phase 5 · Phase 8 backend renders graphical).
 *              SEPARATE SIBLING (DP-S81-8) for forward extensibility: S82 External Audit + S81c
 *              walkthrough-automation-engine both consume.
 * @reads-from  comply360-audit-trail-aggregator-engine (S78a · aggregateAuditTrail)
 *              comply360-time-machine-engine (S78a · reconstructSnapshotAt)
 *              audit-trail-engine (Phase 4 · readAuditTrail)
 *              comply360-internal-audit-engine (S81a · engagement context · same-sprint same-arc)
 * @sprint      Sprint 81a · T-Phase-5.B.2.2-PASS-A
 * [JWT] Phase 8: GET /api/comply360/ia-walkthrough/:engagement_id/:entity_type/:entity_id
 */
import { logAudit, readAuditTrail } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType, AuditTrailEntry } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-audit-trail-aggregator-engine',
    'comply360-time-machine-engine',
    'audit-trail-engine',
    'comply360-internal-audit-engine',
  ],
  storage_keys: ['erp_ia_walkthroughs'],
} as const;

export interface WalkthroughStep {
  step_number: number;
  timestamp: string;
  actor_id: string;
  actor_role: string | null;
  action: string;
  entity_state: 'initial' | 'modified' | 'final';
  card: string;
  controls_applied: string[];
  observations: string;
}

export interface ProcessWalkthrough {
  id: string;
  engagement_id: string;
  process_name: string;
  entity_type: string;
  entity_id: string;
  entity_code: string;
  steps: WalkthroughStep[];
  total_steps: number;
  documented_at: string;
  documented_by_bap: BAPAccountId;
  control_gaps: string[];
}

const WALK_KEY = 'erp_ia_walkthroughs';

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

function inferCard(sourceModule: string): string {
  if (sourceModule.startsWith('comply360-')) return 'comply360';
  if (sourceModule.startsWith('payhub') || sourceModule.includes('payroll')) return 'pay-hub';
  if (sourceModule.startsWith('fincore') || sourceModule.includes('voucher')) return 'fincore';
  if (sourceModule.startsWith('salesx')) return 'sales-x';
  if (sourceModule.startsWith('procure')) return 'procure-hub';
  return sourceModule;
}

function entriesToSteps(entries: AuditTrailEntry[]): WalkthroughStep[] {
  return entries.map((e, i, arr) => {
    const state: WalkthroughStep['entity_state'] =
      i === 0 ? 'initial' : i === arr.length - 1 ? 'final' : 'modified';
    return {
      step_number: i + 1,
      timestamp: e.timestamp,
      actor_id: e.user_id,
      actor_role: e.user_role,
      action: `${e.action} · ${e.record_label}`,
      entity_state: state,
      card: inferCard(e.source_module),
      controls_applied: [],
      observations: '',
    };
  });
}

export function generateWalkthrough(opts: {
  engagement_id: string;
  process_name: string;
  entity_type: string;
  entity_id: string;
  entity_code: string;
  documented_by_bap: BAPAccountId;
}): ProcessWalkthrough {
  const entries = readAuditTrail(opts.entity_code)
    .filter((e) => e.entity_type === opts.entity_type && e.record_id === opts.entity_id)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const steps = entriesToSteps(entries);
  const walk: ProcessWalkthrough = {
    id: uid('iawalk'),
    engagement_id: opts.engagement_id,
    process_name: opts.process_name,
    entity_type: opts.entity_type,
    entity_id: opts.entity_id,
    entity_code: opts.entity_code,
    steps,
    total_steps: steps.length,
    documented_at: new Date().toISOString(),
    documented_by_bap: opts.documented_by_bap,
    control_gaps: [],
  };
  const all = readJson<ProcessWalkthrough[]>(WALK_KEY, []);
  all.push(walk);
  writeJson(WALK_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('ia_walkthrough_doc'),
    recordId: walk.id,
    recordLabel: `Walkthrough · ${walk.process_name} · ${walk.entity_id}`,
    beforeState: null,
    afterState: walk as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ia-walkthrough-engine',
  });
  return walk;
}

export function listWalkthroughs(
  engagement_id: string,
  opts?: { process_name?: string },
): ProcessWalkthrough[] {
  return readJson<ProcessWalkthrough[]>(WALK_KEY, [])
    .filter((w) => w.engagement_id === engagement_id)
    .filter((w) => !opts?.process_name || w.process_name === opts.process_name);
}

export function getWalkthrough(id: string): ProcessWalkthrough | null {
  return readJson<ProcessWalkthrough[]>(WALK_KEY, []).find((w) => w.id === id) ?? null;
}

export function annotateControlGap(
  walkthrough_id: string,
  step_number: number,
  gap: string,
  by_bap: BAPAccountId,
): ProcessWalkthrough {
  const all = readJson<ProcessWalkthrough[]>(WALK_KEY, []);
  const idx = all.findIndex((w) => w.id === walkthrough_id);
  if (idx < 0) throw new Error(`Walkthrough ${walkthrough_id} not found`);
  const before = { ...all[idx] };
  const annotated: ProcessWalkthrough = {
    ...all[idx],
    control_gaps: [...all[idx].control_gaps, `Step ${step_number}: ${gap}`],
  };
  all[idx] = annotated;
  writeJson(WALK_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'update',
    entityType: AUD('ia_walkthrough_doc'),
    recordId: walkthrough_id,
    recordLabel: `Walkthrough ${walkthrough_id} gap @ step ${step_number} by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: annotated as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ia-walkthrough-engine',
  });
  return annotated;
}

registerAuditEntityType({ id: 'ia_walkthrough_doc', module: 'audit-trail', label: 'IA · Walkthrough Document' });
