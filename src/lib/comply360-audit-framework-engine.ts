/**
 * @file        src/lib/comply360-audit-framework-engine.ts
 * @sibling     NEW @ Sprint 80a · Comply360 Floor 2 Audit-Suite · Pass A · DP-S80-9
 * @realizes    Master audit-workflow framework. Provides voucher verification,
 *              sampling methods (SA 530), working papers, CARO clause tagging,
 *              For-Future-Reference carry-forward, audit findings register.
 *              Integrates BAP visibility matrix (OOB-12 · DP-S80-18) and
 *              SA 530 sampling justification (OOB-10 · DP-S80-17).
 *              CONSUMED BY: S81 Internal Audit · S82 External Audit · Floor 5
 *              S89-S94 statutory compliance sprints.
 * @reads-from  audit-trail-engine (Phase 4 · 0-DIFF)
 *              audit-trail-hash-chain (Phase 4 · 0-DIFF)
 *              comply360-audit-trail-aggregator-engine (S78a · 0-DIFF)
 *              comply360-statutory-memory (S69 · 0-DIFF)
 *              comply360-calendar-engine (S78a · 0-DIFF)
 * @sprint      Sprint 80a · T-Phase-5.B.2.1-PASS-A
 * [JWT] Phase 8: POST /api/comply360/audit-framework/verify-voucher
 *               GET /api/comply360/audit-framework/working-papers
 *               POST /api/comply360/audit-framework/findings
 */

import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';

// ── READS_FROM canon (v1.22 codification) ──────────────────────────────
export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'audit-trail-hash-chain',
    'comply360-audit-trail-aggregator-engine',
    'comply360-statutory-memory',
    'comply360-calendar-engine',
  ],
  storage_keys: [
    'erp_audit_framework_working_papers',
    'erp_audit_framework_findings',
    'erp_audit_framework_ffr',
    'erp_audit_framework_sampling_log',
    'erp_audit_framework_verifications',
    'erp_bap_active_account_id',
  ],
} as const;

// ── Helpers ────────────────────────────────────────────────────────────
function activeEntityCode(): string {
  try {
    return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO';
  } catch {
    return 'OPERIX-DEMO';
  }
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — non-fatal */
  }
}

/** Cast helper · audit-framework entity types extend the union additively. */
function AUD(t: string): LogAuditEntityType {
  return t as unknown as LogAuditEntityType;
}

// ── BAP Visibility Matrix (OOB-12 · DP-S80-18) ─────────────────────────
export const BAP_ACCOUNT_KEY = 'erp_bap_active_account_id';
export type BAPAccountId =
  | 'mr-a-client'
  | 'mr-b-auditor-1'
  | 'mr-c-auditor-2'
  | 'mr-d-article';

export function getActiveBAPAccount(): BAPAccountId {
  try {
    const v = localStorage.getItem(BAP_ACCOUNT_KEY) as BAPAccountId | null;
    return v ?? 'mr-a-client';
  } catch {
    return 'mr-a-client';
  }
}

export function setActiveBAPAccount(id: BAPAccountId): void {
  try {
    localStorage.setItem(BAP_ACCOUNT_KEY, id);
  } catch {
    /* ignore */
  }
}

/**
 * BAP visibility matrix per DP-S80-18:
 * - mr-a-client: cannot see any auditor notes
 * - mr-b-auditor-1: sees own + article (mr-d) notes; cannot see mr-c
 * - mr-c-auditor-2: sees own notes; cannot see mr-b
 * - mr-d-article: sees own + mr-b (their auditor) notes
 * - author can always see own notes
 */
export function canViewNote(
  viewer: BAPAccountId,
  note_author: BAPAccountId,
  _engagement_id: string,
): boolean {
  if (viewer === note_author) return true;
  if (viewer === 'mr-a-client') return false;
  if (note_author === 'mr-a-client') return true; // auditors see client notes
  const visibility: Record<BAPAccountId, BAPAccountId[]> = {
    'mr-a-client': [],
    'mr-b-auditor-1': ['mr-d-article'],
    'mr-c-auditor-2': [],
    'mr-d-article': ['mr-b-auditor-1'],
  };
  return visibility[viewer].includes(note_author);
}

// ── Voucher verification ───────────────────────────────────────────────
export interface VoucherVerificationInput {
  voucher_id: string;
  voucher_type: string;
  engagement_id: string;
  verified_by_bap: BAPAccountId;
  observations?: string;
  caro_clauses?: string[];
}

export interface VoucherVerificationResult {
  id: string;
  voucher_id: string;
  voucher_type: string;
  engagement_id: string;
  verified_by_bap: BAPAccountId;
  verified_at: string;
  status: 'verified' | 'observation_raised' | 'modified_opinion';
  observations: string;
  caro_clauses: string[];
  audit_trail_id: string;
}

const VERIFICATIONS_KEY = 'erp_audit_framework_verifications';

export function verifyVoucher(
  input: VoucherVerificationInput,
): VoucherVerificationResult {
  const id = uid('vv');
  const result: VoucherVerificationResult = {
    id,
    voucher_id: input.voucher_id,
    voucher_type: input.voucher_type,
    engagement_id: input.engagement_id,
    verified_by_bap: input.verified_by_bap,
    verified_at: new Date().toISOString(),
    status: input.observations && input.observations.length > 0
      ? 'observation_raised'
      : 'verified',
    observations: input.observations ?? '',
    caro_clauses: input.caro_clauses ?? [],
    audit_trail_id: '',
  };
  const trail = logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('audit_framework_voucher_verification'),
    recordId: id,
    recordLabel: `Voucher ${input.voucher_id} verified by ${input.verified_by_bap}`,
    beforeState: null,
    afterState: result as unknown as Record<string, unknown>,
    sourceModule: 'comply360-audit-framework-engine',
  });
  result.audit_trail_id = trail.id;

  const all = readJson<VoucherVerificationResult[]>(VERIFICATIONS_KEY, []);
  all.push(result);
  writeJson(VERIFICATIONS_KEY, all);
  return result;
}

export function listVerifiedVouchers(
  engagement_id: string,
  opts?: { voucher_type?: string },
): VoucherVerificationResult[] {
  return readJson<VoucherVerificationResult[]>(VERIFICATIONS_KEY, []).filter(
    (v) =>
      v.engagement_id === engagement_id &&
      (!opts?.voucher_type || v.voucher_type === opts.voucher_type),
  );
}

// ── SA 530 Sampling (OOB-10 · DP-S80-17) ───────────────────────────────
export type SamplingMethod =
  | 'amount_range'
  | 'statistical'
  | 'random'
  | 'stratified';

export interface SamplingInput {
  population: Array<{ id: string; amount: number; date: string; ledger: string }>;
  method: SamplingMethod;
  justification: string;
  parameters: {
    threshold_amount?: number;
    confidence_level?: number;
    sample_size?: number;
    strata?: string[];
  };
  engagement_id: string;
  sampled_by_bap: BAPAccountId;
}

export interface SamplingResult {
  id: string;
  method: SamplingMethod;
  justification: string;
  population_count: number;
  sample: Array<{ id: string; amount: number; date: string; ledger: string }>;
  sampling_log_id: string;
}

const SAMPLING_LOG_KEY = 'erp_audit_framework_sampling_log';

export function executeSampling(input: SamplingInput): SamplingResult {
  if (!input.justification || input.justification.trim().length < 10) {
    throw new Error(
      'SA 530 compliance: sampling justification must be at least 10 characters',
    );
  }
  let sample: SamplingInput['population'] = [];
  switch (input.method) {
    case 'amount_range': {
      const t = input.parameters.threshold_amount ?? 0;
      sample = input.population.filter((p) => p.amount >= t);
      break;
    }
    case 'random': {
      const n = Math.min(
        input.parameters.sample_size ?? 1,
        input.population.length,
      );
      const pool = [...input.population];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      sample = pool.slice(0, n);
      break;
    }
    case 'stratified': {
      const strata = input.parameters.strata ?? [];
      const perStratum = Math.max(
        1,
        Math.floor((input.parameters.sample_size ?? strata.length) / Math.max(1, strata.length)),
      );
      sample = strata.flatMap((s) =>
        input.population.filter((p) => p.ledger === s).slice(0, perStratum),
      );
      break;
    }
    case 'statistical': {
      const conf = input.parameters.confidence_level ?? 95;
      const n = Math.max(
        1,
        Math.ceil(input.population.length * (conf / 100) * 0.1),
      );
      sample = input.population.slice(0, Math.min(n, input.population.length));
      break;
    }
  }

  const id = uid('samp');
  const trail = logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('audit_framework_sampling'),
    recordId: id,
    recordLabel: `Sampling ${input.method} · ${sample.length}/${input.population.length}`,
    beforeState: null,
    afterState: {
      method: input.method,
      justification: input.justification,
      population_count: input.population.length,
      sample_count: sample.length,
      engagement_id: input.engagement_id,
      sampled_by_bap: input.sampled_by_bap,
    },
    reason: input.justification,
    sourceModule: 'comply360-audit-framework-engine',
  });

  const result: SamplingResult = {
    id,
    method: input.method,
    justification: input.justification,
    population_count: input.population.length,
    sample,
    sampling_log_id: trail.id,
  };
  const all = readJson<Array<SamplingResult & { engagement_id: string }>>(
    SAMPLING_LOG_KEY,
    [],
  );
  all.push({ ...result, engagement_id: input.engagement_id });
  writeJson(SAMPLING_LOG_KEY, all);
  return result;
}

export function listSamplingLog(engagement_id: string): SamplingResult[] {
  return readJson<Array<SamplingResult & { engagement_id: string }>>(
    SAMPLING_LOG_KEY,
    [],
  )
    .filter((s) => s.engagement_id === engagement_id)
    .map((s) => ({
      id: s.id,
      method: s.method,
      justification: s.justification,
      population_count: s.population_count,
      sample: s.sample,
      sampling_log_id: s.sampling_log_id,
    }));
}

// ── Working papers ─────────────────────────────────────────────────────
export interface WorkingPaperInput {
  engagement_id: string;
  title: string;
  body: string;
  ledger?: string;
  voucher_refs?: string[];
  authored_by_bap: BAPAccountId;
  caro_clauses?: string[];
}

export interface WorkingPaper extends WorkingPaperInput {
  id: string;
  created_at: string;
  last_modified_at: string;
}

const WP_KEY = 'erp_audit_framework_working_papers';

export function createWorkingPaper(input: WorkingPaperInput): WorkingPaper {
  const now = new Date().toISOString();
  const wp: WorkingPaper = {
    ...input,
    id: uid('wp'),
    created_at: now,
    last_modified_at: now,
  };
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('audit_framework_working_paper'),
    recordId: wp.id,
    recordLabel: `WP: ${wp.title}`,
    beforeState: null,
    afterState: wp as unknown as Record<string, unknown>,
    sourceModule: 'comply360-audit-framework-engine',
  });
  const all = readJson<WorkingPaper[]>(WP_KEY, []);
  all.push(wp);
  writeJson(WP_KEY, all);
  return wp;
}

export function listWorkingPapers(
  engagement_id: string,
  viewer: BAPAccountId,
): WorkingPaper[] {
  return readJson<WorkingPaper[]>(WP_KEY, [])
    .filter((w) => w.engagement_id === engagement_id)
    .filter((w) => canViewNote(viewer, w.authored_by_bap, engagement_id));
}

// ── Audit findings register ────────────────────────────────────────────
export type FindingStatus = 'open' | 'in_progress' | 'resolved' | 'waived';

export interface AuditFindingInput {
  engagement_id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  caro_clauses?: string[];
  source_module?: string;
  source_record_id?: string;
  raised_by_bap: BAPAccountId;
  owner_bap?: BAPAccountId;
}

export interface AuditFinding extends AuditFindingInput {
  id: string;
  status: FindingStatus;
  comments: Array<{ at: string; by_bap: BAPAccountId; text: string }>;
  raised_at: string;
  resolved_at: string | null;
}

const FINDINGS_KEY = 'erp_audit_framework_findings';

export function raiseFinding(input: AuditFindingInput): AuditFinding {
  const finding: AuditFinding = {
    ...input,
    id: uid('find'),
    status: 'open',
    comments: [],
    raised_at: new Date().toISOString(),
    resolved_at: null,
  };
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('audit_framework_finding'),
    recordId: finding.id,
    recordLabel: `Finding: ${finding.title} (${finding.severity})`,
    beforeState: null,
    afterState: finding as unknown as Record<string, unknown>,
    sourceModule: 'comply360-audit-framework-engine',
  });
  const all = readJson<AuditFinding[]>(FINDINGS_KEY, []);
  all.push(finding);
  writeJson(FINDINGS_KEY, all);
  return finding;
}

export function updateFindingStatus(
  finding_id: string,
  status: FindingStatus,
  by_bap: BAPAccountId,
  comment?: string,
): AuditFinding {
  const all = readJson<AuditFinding[]>(FINDINGS_KEY, []);
  const idx = all.findIndex((f) => f.id === finding_id);
  if (idx < 0) throw new Error(`Finding ${finding_id} not found`);
  const before = { ...all[idx] };
  const updated: AuditFinding = {
    ...all[idx],
    status,
    resolved_at:
      status === 'resolved' || status === 'waived'
        ? new Date().toISOString()
        : all[idx].resolved_at,
    comments: [
      ...all[idx].comments,
      ...(comment
        ? [{ at: new Date().toISOString(), by_bap, text: comment }]
        : []),
    ],
  };
  all[idx] = updated;
  writeJson(FINDINGS_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'update',
    entityType: AUD('audit_framework_finding'),
    recordId: finding_id,
    recordLabel: `Finding ${finding_id} → ${status}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: updated as unknown as Record<string, unknown>,
    reason: comment ?? null,
    sourceModule: 'comply360-audit-framework-engine',
  });
  return updated;
}

export function listFindings(
  engagement_id: string,
  opts?: { status?: FindingStatus; viewer?: BAPAccountId },
): AuditFinding[] {
  return readJson<AuditFinding[]>(FINDINGS_KEY, [])
    .filter((f) => f.engagement_id === engagement_id)
    .filter((f) => !opts?.status || f.status === opts.status)
    .filter(
      (f) =>
        !opts?.viewer ||
        canViewNote(opts.viewer, f.raised_by_bap, engagement_id),
    );
}

// ── For-Future-Reference (DP-S80-14) ───────────────────────────────────
export interface FFRInput {
  engagement_id: string;
  text: string;
  carry_forward_to_fy: string;
  authored_by_bap: BAPAccountId;
}

export interface FFREntry extends FFRInput {
  id: string;
  created_at: string;
}

const FFR_KEY = 'erp_audit_framework_ffr';

export function addFFR(input: FFRInput): FFREntry {
  const entry: FFREntry = {
    ...input,
    id: uid('ffr'),
    created_at: new Date().toISOString(),
  };
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('audit_framework_ffr'),
    recordId: entry.id,
    recordLabel: `FFR → ${entry.carry_forward_to_fy}`,
    beforeState: null,
    afterState: entry as unknown as Record<string, unknown>,
    sourceModule: 'comply360-audit-framework-engine',
  });
  const all = readJson<FFREntry[]>(FFR_KEY, []);
  all.push(entry);
  writeJson(FFR_KEY, all);
  return entry;
}

export function listFFR(engagement_id: string): FFREntry[] {
  return readJson<FFREntry[]>(FFR_KEY, []).filter(
    (f) => f.engagement_id === engagement_id,
  );
}

// ── Entity-type registration (side-effect on import) ───────────────────
registerAuditEntityType({
  id: 'audit_framework_voucher_verification',
  module: 'audit-trail',
  label: 'Audit Framework · Voucher Verification',
});
registerAuditEntityType({
  id: 'audit_framework_sampling',
  module: 'audit-trail',
  label: 'Audit Framework · SA 530 Sampling',
});
registerAuditEntityType({
  id: 'audit_framework_working_paper',
  module: 'audit-trail',
  label: 'Audit Framework · Working Paper',
});
registerAuditEntityType({
  id: 'audit_framework_finding',
  module: 'audit-trail',
  label: 'Audit Framework · Finding',
});
registerAuditEntityType({
  id: 'audit_framework_ffr',
  module: 'audit-trail',
  label: 'Audit Framework · For-Future-Reference',
});
