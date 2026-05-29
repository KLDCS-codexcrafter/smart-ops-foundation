/**
 * @file        src/lib/comply360-auditor-workspace-engine.ts
 * @sibling     NEW @ Sprint 80a · Comply360 Floor 2 Audit-Suite · Pass A · OOB-6 · DP-S80-19
 * @realizes    Persistent Auditor Workspace · engagement-level state CRUD.
 *              Solves "where did I leave off" via engagement_id-scoped storage.
 *              Multi-CA collaboration within engagement (BAP visibility from
 *              audit-framework-engine).
 * @reads-from  comply360-audit-framework-engine (S80a · 0-DIFF · same-sprint)
 * @sprint      Sprint 80a · T-Phase-5.B.2.1-PASS-A
 * [JWT] Phase 8: POST /api/comply360/auditor-workspace/engagement
 *               GET /api/comply360/auditor-workspace/engagement/:id
 */

import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: ['comply360-audit-framework-engine'],
  storage_keys: [
    'erp_auditor_workspace_engagements',
    'erp_auditor_workspace_active',
  ],
} as const;

const ENGAGEMENTS_KEY = 'erp_auditor_workspace_engagements';
const ACTIVE_KEY = 'erp_auditor_workspace_active';

export type EngagementType =
  | 'statutory_audit'
  | 'internal_audit'
  | 'tax_audit'
  | 'gst_audit'
  | 'cost_audit'
  | 'secretarial_audit';

export interface AuditEngagement {
  id: string;
  name: string;
  type: EngagementType;
  fy: string;
  entity_code: string;
  ca_firm_name: string;
  created_at: string;
  last_active_at: string;
  status: 'active' | 'completed' | 'archived';
  bap_team: BAPAccountId[];
}

export interface CreateEngagementInput {
  name: string;
  type: EngagementType;
  fy: string;
  entity_code: string;
  ca_firm_name: string;
  bap_team?: BAPAccountId[];
}

function activeEntityCode(): string {
  try {
    return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO';
  } catch {
    return 'OPERIX-DEMO';
  }
}

function uid(): string {
  return `eng_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readAll(): AuditEngagement[] {
  try {
    const raw = localStorage.getItem(ENGAGEMENTS_KEY);
    return raw ? (JSON.parse(raw) as AuditEngagement[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: AuditEngagement[]): void {
  try {
    localStorage.setItem(ENGAGEMENTS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

const AUD = (t: string): LogAuditEntityType =>
  t as unknown as LogAuditEntityType;

export function createEngagement(input: CreateEngagementInput): AuditEngagement {
  const now = new Date().toISOString();
  const eng: AuditEngagement = {
    id: uid(),
    name: input.name,
    type: input.type,
    fy: input.fy,
    entity_code: input.entity_code,
    ca_firm_name: input.ca_firm_name,
    created_at: now,
    last_active_at: now,
    status: 'active',
    bap_team: input.bap_team ?? [],
  };
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('auditor_workspace_engagement'),
    recordId: eng.id,
    recordLabel: `Engagement: ${eng.name}`,
    beforeState: null,
    afterState: eng as unknown as Record<string, unknown>,
    sourceModule: 'comply360-auditor-workspace-engine',
  });
  const all = readAll();
  all.push(eng);
  writeAll(all);
  return eng;
}

export function listEngagements(opts?: {
  status?: 'active' | 'completed' | 'archived';
}): AuditEngagement[] {
  return readAll().filter((e) => !opts?.status || e.status === opts.status);
}

export function getEngagement(id: string): AuditEngagement | null {
  return readAll().find((e) => e.id === id) ?? null;
}

export function setActiveEngagement(id: string): void {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* ignore */
  }
  const all = readAll();
  const idx = all.findIndex((e) => e.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], last_active_at: new Date().toISOString() };
    writeAll(all);
  }
}

export function getActiveEngagement(): AuditEngagement | null {
  try {
    const id = localStorage.getItem(ACTIVE_KEY);
    if (!id) return null;
    return getEngagement(id);
  } catch {
    return null;
  }
}

export function updateEngagementStatus(
  id: string,
  status: 'active' | 'completed' | 'archived',
): AuditEngagement {
  const all = readAll();
  const idx = all.findIndex((e) => e.id === id);
  if (idx < 0) throw new Error(`Engagement ${id} not found`);
  const before = { ...all[idx] };
  const updated: AuditEngagement = {
    ...all[idx],
    status,
    last_active_at: new Date().toISOString(),
  };
  all[idx] = updated;
  writeAll(all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'update',
    entityType: AUD('auditor_workspace_engagement'),
    recordId: id,
    recordLabel: `Engagement ${id} → ${status}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: updated as unknown as Record<string, unknown>,
    sourceModule: 'comply360-auditor-workspace-engine',
  });
  return updated;
}

export function addBAPToEngagement(
  engagement_id: string,
  bap: BAPAccountId,
): AuditEngagement {
  const all = readAll();
  const idx = all.findIndex((e) => e.id === engagement_id);
  if (idx < 0) throw new Error(`Engagement ${engagement_id} not found`);
  const before = { ...all[idx] };
  const team = all[idx].bap_team.includes(bap)
    ? all[idx].bap_team
    : [...all[idx].bap_team, bap];
  const updated: AuditEngagement = { ...all[idx], bap_team: team };
  all[idx] = updated;
  writeAll(all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'update',
    entityType: AUD('auditor_workspace_engagement'),
    recordId: engagement_id,
    recordLabel: `Engagement ${engagement_id} +BAP ${bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: updated as unknown as Record<string, unknown>,
    sourceModule: 'comply360-auditor-workspace-engine',
  });
  return updated;
}

registerAuditEntityType({
  id: 'auditor_workspace_engagement',
  module: 'audit-trail',
  label: 'Auditor Workspace · Engagement',
});
