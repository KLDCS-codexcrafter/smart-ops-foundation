/**
 * @file        src/lib/docvault-governance-engine.ts
 * @realizes    DocVault Control Pt 2 · sharing/ACL (TDL 6-action) · retention/review ·
 *              B.7 DocumentLinkRef (+voucher · TDL) · TF-34 circulars (Comply360 read-only) ·
 *              TF-38 required-docs completeness (TDL) · FY facet
 * @reads-from  docvault-control-engine · docvault-engine · party-master ·
 *              useEmployees-data (EMPLOYEES_KEY) · comply360 S138 adapters (ALL READ-ONLY)
 * @sprint      Sprint 144 · T-TaskFlow-A641.8 · ARC CLOSER
 * @[JWT]       P2BB: external share delivery · server retention execution · watermark rendering service
 *
 * Additive sibling: docvault-engine + docvault-control-engine version/lifecycle machinery +
 * Q-LOCK-15a FKs + approval-workflow-engine + Comply360 + push-notification-bridge ALL 0-DIFF.
 * Lifecycle transitions go through docvault-control-engine.setLifecycleStatus (S143 engine).
 * All mutations audited via document_control_event (inline · D-AUDIT-SAFE).
 */
import type {
  Document, DocumentCategory, ConfidentialityLevel,
  DocumentShare, SharePermission, DocVaultUserACL,
  DocumentRetentionRule, DocumentReviewCycle,
  DocumentLinkRef, Circular, CircularAcknowledgment,
  DocumentRequirementTemplate, CompletenessResult,
} from '@/types/docvault';
import type { Employee } from '@/types/employee';
import type { AuditEntityType } from '@/types/audit-trail';
import { loadDocuments, getDocument } from '@/lib/docvault-engine';
import { getControl, setLifecycleStatus } from '@/lib/docvault-control-engine';
import { loadPartiesByType } from '@/lib/party-master-engine';
import { EMPLOYEES_KEY } from '@/types/employee';
import { logAudit } from '@/lib/audit-trail-engine';

// ──────────────────────────────────────────────────────────────────────────────
// Storage keys (entity-scoped · additive)
// ──────────────────────────────────────────────────────────────────────────────
const SHARES_KEY = (e: string): string => `dv_shares_${e}`;
const ACL_KEY = (e: string): string => `dv_user_acl_${e}`;
const RETENTION_KEY = (e: string): string => `dv_retention_rules_${e}`;
const REVIEW_KEY = (e: string): string => `dv_review_cycles_${e}`;
const LINKS_KEY = (e: string): string => `dv_links_${e}`;
const CIRCULAR_KEY = (e: string): string => `dv_circulars_${e}`;
const CIRC_ACK_KEY = (e: string): string => `dv_circular_acks_${e}`;
const TEMPLATE_KEY = (e: string): string => `dv_req_templates_${e}`;
const DOCUMENTS_KEY = (e: string): string => `erp_documents_${e}`;

const AUDIT_TYPE = 'document_control_event' as unknown as AuditEntityType;

const nowISO = (): string => new Date().toISOString();
const newId = (p: string): string =>
  `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const readJSON = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; }
  catch { return fallback; }
};
const writeJSON = (key: string, value: unknown): void => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
};

const safeAudit = (
  entityCode: string, action: string, recordId: string,
  before: unknown, after: unknown, label: string,
): void => {
  try {
    logAudit({
      entityCode, action: 'update', entityType: AUDIT_TYPE,
      recordId, recordLabel: `docvault-governance · ${label}`,
      beforeState: (before ?? null) as Record<string, unknown> | null,
      afterState: (after ?? null) as Record<string, unknown> | null,
      reason: action, sourceModule: 'docvault-governance-engine',
    });
  } catch { /* D-AUDIT-SAFE */ }
};

const CONFIDENTIALITY_ORDER: ConfidentialityLevel[] =
  ['public', 'internal', 'confidential', 'restricted', 'top_secret'];
const confRank = (c: ConfidentialityLevel | null | undefined): number =>
  c ? CONFIDENTIALITY_ORDER.indexOf(c) : 1;

const PERMISSION_RANK: SharePermission[] =
  ['view', 'view_watermark', 'download', 'comment', 'edit'];
const permRank = (p: SharePermission): number => PERMISSION_RANK.indexOf(p);
const maxPerm = (a: SharePermission, b: SharePermission): SharePermission =>
  permRank(a) >= permRank(b) ? a : b;

// ══════════════════════════════════════════════════════════════════════════════
// 1 · SHARING (TDL: internal/external · watermark contract · approval gate)
// ══════════════════════════════════════════════════════════════════════════════

export function listShares(entityCode: string, documentId?: string): DocumentShare[] {
  const all = readJSON<DocumentShare[]>(SHARES_KEY(entityCode), []);
  return documentId ? all.filter((s) => s.document_id === documentId) : all;
}

export interface GrantShareInput {
  document_id: string;
  grantee_user_id?: string | null;
  external_email?: string | null;
  permission: SharePermission;
  expires_at?: string | null;
  created_by: string;
}

export function grantShare(entityCode: string, input: GrantShareInput): DocumentShare {
  const hasInternal = !!input.grantee_user_id;
  const hasExternal = !!input.external_email;
  if (hasInternal === hasExternal) {
    throw new Error('grantShare: exactly one of grantee_user_id or external_email required');
  }
  const share: DocumentShare = {
    id: newId('dvs'),
    entity_id: entityCode,
    document_id: input.document_id,
    grantee_user_id: input.grantee_user_id ?? null,
    external_email: input.external_email ?? null,
    permission: input.permission,
    expires_at: input.expires_at ?? null,
    requires_approval: hasExternal ? true : false,
    approved_by: null, approved_at: null,
    created_by: input.created_by,
    created_at: nowISO(), revoked_at: null,
  };
  const all = listShares(entityCode);
  all.push(share);
  writeJSON(SHARES_KEY(entityCode), all);
  safeAudit(entityCode, 'share_granted', input.document_id, null, share, 'share_granted');
  return share;
}

export function approveExternalShare(
  entityCode: string, shareId: string, approverUserId: string,
): DocumentShare {
  const all = listShares(entityCode);
  const idx = all.findIndex((s) => s.id === shareId);
  if (idx < 0) throw new Error(`share not found: ${shareId}`);
  if (!all[idx].requires_approval) throw new Error('share does not require approval');
  const before = { ...all[idx] };
  all[idx] = {
    ...all[idx],
    requires_approval: false,
    approved_by: approverUserId, approved_at: nowISO(),
  };
  writeJSON(SHARES_KEY(entityCode), all);
  safeAudit(entityCode, 'share_approved', all[idx].document_id, before, all[idx], 'share_approved');
  return all[idx];
}

export function revokeShare(entityCode: string, shareId: string, byUserId: string): DocumentShare {
  const all = listShares(entityCode);
  const idx = all.findIndex((s) => s.id === shareId);
  if (idx < 0) throw new Error(`share not found: ${shareId}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], revoked_at: nowISO() };
  writeJSON(SHARES_KEY(entityCode), all);
  safeAudit(entityCode, 'share_revoked', all[idx].document_id, before, all[idx], `revoked_by:${byUserId}`);
  return all[idx];
}

export interface EffectivePermission {
  permission: SharePermission | null;
  watermark?: string | null;
}

/** Effective permission for a user on a document, confidentiality-aware. */
export function getEffectivePermission(
  entityCode: string, documentId: string, userId: string, userName?: string,
  nowISOArg?: string,
): EffectivePermission {
  const now = nowISOArg ?? nowISO();
  const doc = getDocument(entityCode, documentId);
  if (!doc) return { permission: null };
  const control = getControl(doc);
  const isOwner = control.owner_id === userId;
  const restricted = confRank(control.confidentiality) >= confRank('restricted');

  // Owner gets full edit access regardless.
  if (isOwner) return { permission: 'edit' };

  const shares = listShares(entityCode, documentId).filter((s) => {
    if (s.revoked_at) return false;
    if (s.requires_approval) return false;
    if (s.grantee_user_id !== userId) return false;
    if (s.expires_at && s.expires_at <= now) return false;
    return true;
  });

  if (shares.length === 0) {
    if (restricted) return { permission: null };
    // Non-restricted: no explicit grant means no access via this engine.
    return { permission: null };
  }

  let best = shares[0].permission;
  for (const s of shares) best = maxPerm(best, s.permission);

  if (best === 'view_watermark') {
    return {
      permission: best,
      watermark: `${userName ?? userId} · ${now}`,
    };
  }
  return { permission: best };
}

// ══════════════════════════════════════════════════════════════════════════════
// 2 · ACL (TDL 6-action set · default profile)
// ══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_ACL = (userId: string, entityCode: string): DocVaultUserACL => ({
  user_id: userId, entity_id: entityCode,
  allow_config: false, allow_upload: false, allow_view: true,
  allow_download: true, allow_delete: false,
  updated_by: 'system', updated_at: nowISO(),
});

export function listACLs(entityCode: string): DocVaultUserACL[] {
  return readJSON<DocVaultUserACL[]>(ACL_KEY(entityCode), []);
}
export function getACL(entityCode: string, userId: string): DocVaultUserACL {
  const found = listACLs(entityCode).find((a) => a.user_id === userId);
  return found ?? DEFAULT_ACL(userId, entityCode);
}
export function upsertACL(entityCode: string, acl: DocVaultUserACL): DocVaultUserACL {
  const all = listACLs(entityCode);
  const idx = all.findIndex((a) => a.user_id === acl.user_id);
  const next = { ...acl, updated_at: nowISO() };
  if (idx < 0) all.push(next); else all[idx] = next;
  writeJSON(ACL_KEY(entityCode), all);
  safeAudit(entityCode, 'acl_upsert', acl.user_id, null, next, 'acl_upsert');
  return next;
}

export type AclAction = 'config' | 'upload' | 'view' | 'download' | 'delete';
export function assertAcl(entityCode: string, userId: string, action: AclAction): void {
  const acl = getACL(entityCode, userId);
  const key = `allow_${action}` as keyof DocVaultUserACL;
  if (!acl[key]) throw new Error(`ACL denied: ${action} for ${userId}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 3 · RETENTION + REVIEW
// ══════════════════════════════════════════════════════════════════════════════

export function listRetentionRules(entityCode: string): DocumentRetentionRule[] {
  return readJSON<DocumentRetentionRule[]>(RETENTION_KEY(entityCode), []);
}
export function upsertRetentionRule(
  entityCode: string,
  input: Omit<DocumentRetentionRule, 'id' | 'entity_id' | 'created_at' | 'updated_at'> & { id?: string },
): DocumentRetentionRule {
  const all = listRetentionRules(entityCode);
  const now = nowISO();
  if (input.id) {
    const idx = all.findIndex((r) => r.id === input.id);
    if (idx < 0) throw new Error(`retention rule not found: ${input.id}`);
    const before = { ...all[idx] };
    all[idx] = { ...all[idx], ...input, id: input.id, entity_id: entityCode, updated_at: now };
    writeJSON(RETENTION_KEY(entityCode), all);
    safeAudit(entityCode, 'retention_rule_updated', input.id, before, all[idx], 'retention_rule_updated');
    return all[idx];
  }
  const rec: DocumentRetentionRule = {
    id: newId('drr'), entity_id: entityCode, created_at: now, updated_at: now,
    category: input.category ?? null, retain_years: input.retain_years,
    action_at_end: input.action_at_end, is_active: input.is_active,
  };
  all.push(rec);
  writeJSON(RETENTION_KEY(entityCode), all);
  safeAudit(entityCode, 'retention_rule_created', rec.id, null, rec, 'retention_rule_created');
  return rec;
}

export interface RetentionVerdict {
  document_id: string; category: DocumentCategory | null; created_at: string;
  retain_years: number | null; due: boolean; action_at_end: 'archive' | 'flag_delete' | null;
}

export function evaluateRetention(entityCode: string, nowISOArg?: string): RetentionVerdict[] {
  const now = nowISOArg ? new Date(nowISOArg) : new Date();
  const rules = listRetentionRules(entityCode).filter((r) => r.is_active);
  const docs = loadDocuments(entityCode);
  const verdicts: RetentionVerdict[] = [];
  for (const d of docs) {
    const ctl = getControl(d);
    const rule = rules.find((r) => r.category === ctl.category)
              ?? rules.find((r) => r.category == null);
    if (!rule) continue;
    let due = false;
    if (rule.retain_years != null) {
      const created = new Date(d.created_at);
      const dueDate = new Date(created);
      dueDate.setFullYear(dueDate.getFullYear() + rule.retain_years);
      due = now.getTime() >= dueDate.getTime();
    }
    verdicts.push({
      document_id: d.id, category: ctl.category ?? null, created_at: d.created_at,
      retain_years: rule.retain_years, due,
      action_at_end: rule.action_at_end,
    });
  }
  return verdicts;
}

export function archivePerRetention(
  entityCode: string, docIds: string[], byUserId: string,
): { archived: string[]; skipped: string[] } {
  const archived: string[] = [];
  const skipped: string[] = [];
  for (const id of docIds) {
    try {
      setLifecycleStatus(entityCode, id, 'archived', byUserId);
      archived.push(id);
    } catch { skipped.push(id); }
  }
  return { archived, skipped };
}

export function listReviewCycles(entityCode: string): DocumentReviewCycle[] {
  return readJSON<DocumentReviewCycle[]>(REVIEW_KEY(entityCode), []);
}
export function upsertReviewCycle(
  entityCode: string,
  input: Omit<DocumentReviewCycle, 'id' | 'entity_id'> & { id?: string },
): DocumentReviewCycle {
  const all = listReviewCycles(entityCode);
  if (input.id) {
    const idx = all.findIndex((c) => c.id === input.id);
    if (idx < 0) throw new Error(`review cycle not found: ${input.id}`);
    all[idx] = { ...all[idx], ...input, id: input.id, entity_id: entityCode };
    writeJSON(REVIEW_KEY(entityCode), all);
    return all[idx];
  }
  // Enforce one active per category.
  if (input.is_active) {
    for (const c of all) {
      if (c.category === input.category && c.is_active) c.is_active = false;
    }
  }
  const rec: DocumentReviewCycle = {
    id: newId('drc'), entity_id: entityCode, category: input.category,
    frequency: input.frequency, escalate_to_owner: input.escalate_to_owner,
    is_active: input.is_active,
  };
  all.push(rec);
  writeJSON(REVIEW_KEY(entityCode), all);
  return rec;
}

const FREQUENCY_MONTHS: Record<DocumentReviewCycle['frequency'], number> = {
  monthly: 1, quarterly: 3, half_yearly: 6, yearly: 12, biennial: 24,
};

export interface ReviewDue {
  document_id: string; category: DocumentCategory | null;
  review_date: string | null; due: boolean; reason: 'date_past' | 'cycle_derived';
}

export function evaluateReviewsDue(entityCode: string, nowISOArg?: string): ReviewDue[] {
  const now = nowISOArg ? new Date(nowISOArg) : new Date();
  const cycles = listReviewCycles(entityCode).filter((c) => c.is_active);
  const out: ReviewDue[] = [];
  for (const d of loadDocuments(entityCode)) {
    const ctl = getControl(d);
    if (ctl.review_date) {
      if (new Date(ctl.review_date).getTime() <= now.getTime()) {
        out.push({ document_id: d.id, category: ctl.category ?? null,
          review_date: ctl.review_date, due: true, reason: 'date_past' });
        continue;
      }
    }
    const cycle = cycles.find((c) => c.category === ctl.category);
    if (cycle) {
      const base = new Date(ctl.effective_date ?? d.created_at);
      const next = new Date(base);
      next.setMonth(next.getMonth() + FREQUENCY_MONTHS[cycle.frequency]);
      if (now.getTime() >= next.getTime()) {
        out.push({ document_id: d.id, category: ctl.category ?? null,
          review_date: ctl.review_date ?? null, due: true, reason: 'cycle_derived' });
      }
    }
  }
  return out;
}

export function markReviewed(
  entityCode: string, documentId: string, byUserId: string, nowISOArg?: string,
): Document {
  const doc = getDocument(entityCode, documentId);
  if (!doc) throw new Error(`document not found: ${documentId}`);
  const ctl = getControl(doc);
  const cycle = listReviewCycles(entityCode).find((c) => c.is_active && c.category === ctl.category);
  const now = nowISOArg ? new Date(nowISOArg) : new Date();
  const next = new Date(now);
  if (cycle) next.setMonth(next.getMonth() + FREQUENCY_MONTHS[cycle.frequency]);
  else next.setFullYear(next.getFullYear() + 1);

  const all = loadDocuments(entityCode);
  const idx = all.findIndex((x) => x.id === documentId);
  const before = all[idx].control ?? null;
  all[idx] = { ...all[idx], control: { ...(all[idx].control ?? {}),
    review_date: next.toISOString() } };
  writeJSON(DOCUMENTS_KEY(entityCode), all);
  safeAudit(entityCode, 'review_marked', documentId, before, all[idx].control, `by:${byUserId}`);
  return all[idx];
}

// ══════════════════════════════════════════════════════════════════════════════
// 4 · B.7 GENERALIZED LINKS
// ══════════════════════════════════════════════════════════════════════════════

export function listLinks(entityCode: string): DocumentLinkRef[] {
  return readJSON<DocumentLinkRef[]>(LINKS_KEY(entityCode), []);
}
export function linkDocument(
  entityCode: string, documentId: string,
  ref: { ref_type: DocumentLinkRef['ref_type']; ref_id: string; ref_label: string; created_by: string },
): DocumentLinkRef {
  const rec: DocumentLinkRef = {
    id: newId('dvl'), entity_id: entityCode, document_id: documentId,
    ref_type: ref.ref_type, ref_id: ref.ref_id, ref_label: ref.ref_label,
    created_by: ref.created_by, created_at: nowISO(),
  };
  const all = listLinks(entityCode);
  all.push(rec);
  writeJSON(LINKS_KEY(entityCode), all);
  safeAudit(entityCode, 'document_linked', documentId, null, rec, `${ref.ref_type}:${ref.ref_id}`);
  return rec;
}
export function unlinkDocument(entityCode: string, linkId: string): void {
  const all = listLinks(entityCode);
  const idx = all.findIndex((l) => l.id === linkId);
  if (idx < 0) return;
  const rec = all[idx];
  all.splice(idx, 1);
  writeJSON(LINKS_KEY(entityCode), all);
  safeAudit(entityCode, 'document_unlinked', rec.document_id, rec, null, `${rec.ref_type}:${rec.ref_id}`);
}
export function listLinksForRef(
  entityCode: string, refType: DocumentLinkRef['ref_type'], refId: string,
): DocumentLinkRef[] {
  return listLinks(entityCode).filter((l) => l.ref_type === refType && l.ref_id === refId);
}
export function listLinksForDocument(entityCode: string, documentId: string): DocumentLinkRef[] {
  return listLinks(entityCode).filter((l) => l.document_id === documentId);
}

// ══════════════════════════════════════════════════════════════════════════════
// 5 · TF-34 CIRCULARS
// ══════════════════════════════════════════════════════════════════════════════

const loadAllEmployees = (): Employee[] => {
  try {
    const raw = (typeof window !== 'undefined') ? localStorage.getItem(EMPLOYEES_KEY) : null;
    return raw ? (JSON.parse(raw) as Employee[]) : [];
  } catch { return []; }
};

export function listCirculars(entityCode: string): Circular[] {
  return readJSON<Circular[]>(CIRCULAR_KEY(entityCode), []);
}

export interface PublishCircularInput {
  document_id: string;
  title: string;
  target: 'all' | 'department';
  target_department_id?: string | null;
  obligation_ref?: { id: string; label: string } | null;
  published_by: string;
  due_by?: string | null;
}

export function publishCircular(entityCode: string, input: PublishCircularInput): Circular {
  const doc = getDocument(entityCode, input.document_id);
  if (!doc) throw new Error(`document not found: ${input.document_id}`);
  const ctl = getControl(doc);
  if (ctl.lifecycle_status !== 'published') {
    throw new Error('circular requires document in lifecycle "published"');
  }
  if (input.target === 'department' && !input.target_department_id) {
    throw new Error('target_department_id required when target=department');
  }
  const rec: Circular = {
    id: newId('cir'), entity_id: entityCode, document_id: input.document_id,
    title: input.title, target: input.target,
    target_department_id: input.target_department_id ?? null,
    obligation_ref: input.obligation_ref ?? null,
    published_by: input.published_by, published_at: nowISO(),
    due_by: input.due_by ?? null, closed_at: null,
  };
  const all = listCirculars(entityCode);
  all.push(rec);
  writeJSON(CIRCULAR_KEY(entityCode), all);
  safeAudit(entityCode, 'circular_published', input.document_id, null, rec, 'circular_published');
  return rec;
}

function getCircular(entityCode: string, circularId: string): Circular | null {
  return listCirculars(entityCode).find((c) => c.id === circularId) ?? null;
}

function getTargetedUserIds(c: Circular): string[] {
  const emps = loadAllEmployees();
  if (c.target === 'all') return emps.map((e) => e.id);
  return emps.filter((e) => e.departmentId === c.target_department_id).map((e) => e.id);
}

export function listCircularAcks(entityCode: string, circularId?: string): CircularAcknowledgment[] {
  const all = readJSON<CircularAcknowledgment[]>(CIRC_ACK_KEY(entityCode), []);
  return circularId ? all.filter((a) => a.circular_id === circularId) : all;
}

export function acknowledgeCircular(
  entityCode: string, circularId: string, userId: string,
): CircularAcknowledgment {
  const circ = getCircular(entityCode, circularId);
  if (!circ) throw new Error(`circular not found: ${circularId}`);
  const targeted = new Set(getTargetedUserIds(circ));
  if (!targeted.has(userId)) throw new Error(`user not targeted by circular: ${userId}`);
  const acks = listCircularAcks(entityCode);
  const existing = acks.find((a) => a.circular_id === circularId && a.user_id === userId);
  if (existing) return existing; // idempotent
  const rec: CircularAcknowledgment = {
    id: newId('cak'), circular_id: circularId, user_id: userId, acknowledged_at: nowISO(),
  };
  acks.push(rec);
  writeJSON(CIRC_ACK_KEY(entityCode), acks);
  safeAudit(entityCode, 'circular_acknowledged', circ.document_id, null, rec, `user:${userId}`);
  return rec;
}

export interface CircularStatus {
  targeted: number; acknowledged: number; pending: string[]; pct: number;
}

export function getCircularStatus(entityCode: string, circularId: string): CircularStatus {
  const circ = getCircular(entityCode, circularId);
  if (!circ) return { targeted: 0, acknowledged: 0, pending: [], pct: 0 };
  const targeted = getTargetedUserIds(circ);
  const acked = new Set(listCircularAcks(entityCode, circularId).map((a) => a.user_id));
  const pending = targeted.filter((u) => !acked.has(u));
  const ackedCount = targeted.length - pending.length;
  const pct = targeted.length === 0 ? 0 : Math.round((ackedCount / targeted.length) * 1000) / 10;
  return { targeted: targeted.length, acknowledged: ackedCount, pending, pct };
}

export function closeCircular(entityCode: string, circularId: string, byUserId: string): Circular {
  const all = listCirculars(entityCode);
  const idx = all.findIndex((c) => c.id === circularId);
  if (idx < 0) throw new Error(`circular not found: ${circularId}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], closed_at: nowISO() };
  writeJSON(CIRCULAR_KEY(entityCode), all);
  safeAudit(entityCode, 'circular_closed', all[idx].document_id, before, all[idx], `by:${byUserId}`);
  return all[idx];
}

// ══════════════════════════════════════════════════════════════════════════════
// 6 · TF-38 REQUIRED-DOCUMENTS COMPLETENESS
// ══════════════════════════════════════════════════════════════════════════════

export function listRequirementTemplates(entityCode: string): DocumentRequirementTemplate[] {
  return readJSON<DocumentRequirementTemplate[]>(TEMPLATE_KEY(entityCode), []);
}
export function upsertRequirementTemplate(
  entityCode: string,
  input: Omit<DocumentRequirementTemplate, 'id' | 'entity_id' | 'created_at' | 'updated_at'> & { id?: string },
): DocumentRequirementTemplate {
  const all = listRequirementTemplates(entityCode);
  const now = nowISO();
  if (input.id) {
    const idx = all.findIndex((t) => t.id === input.id);
    if (idx < 0) throw new Error(`template not found: ${input.id}`);
    all[idx] = { ...all[idx], ...input, id: input.id, entity_id: entityCode, updated_at: now };
    writeJSON(TEMPLATE_KEY(entityCode), all);
    return all[idx];
  }
  const rec: DocumentRequirementTemplate = {
    id: newId('drt'), entity_id: entityCode,
    target_kind: input.target_kind, target_filter: input.target_filter ?? null,
    required_items: input.required_items, is_active: input.is_active,
    created_at: now, updated_at: now,
  };
  all.push(rec);
  writeJSON(TEMPLATE_KEY(entityCode), all);
  return rec;
}
export function deleteRequirementTemplate(entityCode: string, templateId: string): void {
  const all = listRequirementTemplates(entityCode).filter((t) => t.id !== templateId);
  writeJSON(TEMPLATE_KEY(entityCode), all);
}

interface CompletenessTarget { id: string; label: string; }

function gatherTargets(
  entityCode: string, kind: DocumentRequirementTemplate['target_kind'],
): CompletenessTarget[] {
  switch (kind) {
    case 'customer': {
      const parties = loadPartiesByType(entityCode, 'customer');
      return parties.map((p) => ({ id: p.id, label: p.party_name }));
    }
    case 'vendor': {
      const parties = loadPartiesByType(entityCode, 'vendor');
      return parties.map((p) => ({ id: p.id, label: p.party_name }));
    }
    case 'employee': {
      return loadAllEmployees().map((e) => ({ id: e.id, label: e.displayName || e.empCode }));
    }
    case 'document_category':
      return [{ id: 'all', label: 'All categories' }];
  }
}

function documentsForTarget(
  entityCode: string,
  kind: DocumentRequirementTemplate['target_kind'],
  targetId: string,
): Document[] {
  const docs = loadDocuments(entityCode);
  if (kind === 'customer') return docs.filter((d) => d.customer_id === targetId);
  if (kind === 'vendor')   return docs.filter((d) => d.vendor_id === targetId);
  if (kind === 'employee') {
    const links = listLinksForRef(entityCode, 'employee', targetId);
    const ids = new Set(links.map((l) => l.document_id));
    return docs.filter((d) => ids.has(d.id));
  }
  return docs; // document_category → all docs
}

export function evaluateCompleteness(
  entityCode: string, targetKind?: DocumentRequirementTemplate['target_kind'],
): CompletenessResult[] {
  const templates = listRequirementTemplates(entityCode).filter((t) =>
    t.is_active && (!targetKind || t.target_kind === targetKind));
  const out: CompletenessResult[] = [];
  for (const tpl of templates) {
    const targets = gatherTargets(entityCode, tpl.target_kind);
    for (const tgt of targets) {
      const docs = documentsForTarget(entityCode, tpl.target_kind, tgt.id);
      const docCats = new Set(docs.map((d) => getControl(d).category).filter(Boolean) as string[]);
      const mandatory = tpl.required_items.filter((r) => r.mandatory);
      const missing = mandatory
        .filter((r) => !docCats.has(r.category))
        .map((r) => ({ title: r.title, category: r.category as string }));
      out.push({
        target_kind: tpl.target_kind, target_id: tgt.id, target_label: tgt.label,
        required: mandatory.length, present: mandatory.length - missing.length, missing,
      });
    }
  }
  return out;
}

export interface CompletenessSummary {
  kind: string; total: number; complete: number; incomplete: number;
}
export function getCompletenessSummary(
  entityCode: string, targetKind?: DocumentRequirementTemplate['target_kind'],
): CompletenessSummary[] {
  const results = evaluateCompleteness(entityCode, targetKind);
  const byKind = new Map<string, CompletenessResult[]>();
  for (const r of results) {
    if (!byKind.has(r.target_kind)) byKind.set(r.target_kind, []);
    byKind.get(r.target_kind)!.push(r);
  }
  return Array.from(byKind.entries()).map(([kind, rs]) => ({
    kind, total: rs.length,
    complete: rs.filter((r) => r.missing.length === 0).length,
    incomplete: rs.filter((r) => r.missing.length > 0).length,
  }));
}

// ══════════════════════════════════════════════════════════════════════════════
// 7 · FY FACET
// ══════════════════════════════════════════════════════════════════════════════

const FY_RE = /^FY\d{4}-\d{2}$/;

export function setFinancialYear(
  entityCode: string, documentId: string, fy: string, byUserId: string,
): Document {
  if (!FY_RE.test(fy)) throw new Error(`invalid FY format: ${fy} (expected FYYYYY-YY)`);
  const all = loadDocuments(entityCode);
  const idx = all.findIndex((d) => d.id === documentId);
  if (idx < 0) throw new Error(`document not found: ${documentId}`);
  const before = all[idx].control ?? null;
  all[idx] = { ...all[idx], control: { ...(all[idx].control ?? {}), financial_year: fy } };
  writeJSON(DOCUMENTS_KEY(entityCode), all);
  safeAudit(entityCode, 'fy_set', documentId, before, all[idx].control, `by:${byUserId}`);
  return all[idx];
}

export function listDocumentsByFY(entityCode: string, fy: string): Document[] {
  return loadDocuments(entityCode).filter((d) => (d.control?.financial_year ?? null) === fy);
}
