/**
 * @file        src/lib/idea-5-master-access-matrix-engine.ts
 * @sibling     NEW @ Sprint 100 · 💡 Idea 5 · per-master × per-entity × per-role access matrix
 * @realizes    Governs WHO can edit / view / request-approval on group-shared masters across
 *              the 7-tier entity hierarchy. Complements field-lock-metadata-engine (which
 *              governs WHICH FIELDS lock); idea-5 governs WHICH ROLES/ENTITIES touch them.
 * @reads-from  master-replication-engine (MasterType · type-only) · field-lock-metadata-engine (boundary doc)
 * @audit       Owns + logs `master_access_change` (module: 'mca-roc').
 * @sprint      T-Phase-6.A.0.5 · Block 4
 * [JWT] Phase 8: GET /api/master-access-matrix · POST /api/master-access-matrix
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { registerAuditEntityType } from '@/lib/comply360-audit-trail-aggregator-engine';
import type { MasterType } from '@/lib/master-replication-engine';
import { ALL_MASTER_TYPES } from '@/lib/master-replication-engine';

export const READS_FROM = {
  engines: ['master-replication-engine', 'field-lock-metadata-engine'],
  storage_keys: ['erp_master_access_rules'],
} as const;

registerAuditEntityType({
  id: 'master_access_change',
  module: 'mca-roc',
  label: 'Master Access Rule Change',
});

export type MasterAccessPermission = 'edit' | 'view' | 'view_request_approval';

export interface MasterAccessRule {
  master_type: MasterType;
  entity_code: string;
  role: string;
  permission: MasterAccessPermission;
  field_overrides?: { field: string; permission: 'edit' | 'view' }[];
}

const STORAGE_KEY = 'erp_master_access_rules';

function readRules(): MasterAccessRule[] {
  try {
    // [JWT] GET /api/master-access-matrix
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MasterAccessRule[]) : [];
  } catch {
    return [];
  }
}

function writeRules(rules: MasterAccessRule[]): void {
  try {
    // [JWT] POST /api/master-access-matrix
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch { /* quota silent */ }
}

// ─── Default seeded rules (Indian-SMB sensible defaults) ─────────────

export const DEFAULT_ACCESS_RULES: MasterAccessRule[] = [
  // HQ Finance edits master records; branches view-only by default.
  ...ALL_MASTER_TYPES.map<MasterAccessRule>((mt) => ({
    master_type: mt, entity_code: '*', role: 'hq_finance', permission: 'edit',
  })),
  ...ALL_MASTER_TYPES.map<MasterAccessRule>((mt) => ({
    master_type: mt, entity_code: '*', role: 'branch_manager', permission: 'view',
  })),
  // Project Manager: view + request-approval everywhere (cannot edit directly).
  ...ALL_MASTER_TYPES.map<MasterAccessRule>((mt) => ({
    master_type: mt, entity_code: '*', role: 'project_manager', permission: 'view_request_approval',
  })),
  // Branch Manager Customer Master per-entity TDS additive override (Indian-SMB)
  {
    master_type: 'customer', entity_code: '*', role: 'branch_manager',
    permission: 'view',
    field_overrides: [{ field: 'tds_section_override', permission: 'edit' }],
  },
];

function matchRule(
  all: MasterAccessRule[],
  master_type: MasterType,
  entity_code: string,
  role: string,
): MasterAccessRule | null {
  // Exact entity match wins over wildcard.
  const exact = all.find(
    (r) => r.master_type === master_type && r.role === role && r.entity_code === entity_code,
  );
  if (exact) return exact;
  return all.find(
    (r) => r.master_type === master_type && r.role === role && r.entity_code === '*',
  ) ?? null;
}

export function getAccess(input: {
  master_type: MasterType;
  entity_code: string;
  role: string;
}): MasterAccessPermission {
  const stored = readRules();
  const merged = [...stored, ...DEFAULT_ACCESS_RULES];
  const hit = matchRule(merged, input.master_type, input.entity_code, input.role);
  return hit ? hit.permission : 'view';
}

export function getFieldAccess(input: {
  master_type: MasterType;
  entity_code: string;
  role: string;
  field: string;
}): 'edit' | 'view' | 'view_request_approval' {
  const stored = readRules();
  const merged = [...stored, ...DEFAULT_ACCESS_RULES];
  const rule = matchRule(merged, input.master_type, input.entity_code, input.role);
  if (!rule) return 'view';
  const ov = rule.field_overrides?.find((f) => f.field === input.field);
  if (ov) return ov.permission;
  return rule.permission;
}

export function setAccessRule(rule: MasterAccessRule): void {
  const all = readRules();
  const before = all.find(
    (r) => r.master_type === rule.master_type
      && r.entity_code === rule.entity_code
      && r.role === rule.role,
  ) ?? null;
  const remaining = all.filter(
    (r) => !(r.master_type === rule.master_type
      && r.entity_code === rule.entity_code
      && r.role === rule.role),
  );
  remaining.push(rule);
  writeRules(remaining);
  logAudit({
    entityCode: rule.entity_code || 'GLOBAL',
    action: before ? 'update' : 'create',
    entityType: 'master_access_change',
    recordId: `${rule.master_type}|${rule.entity_code}|${rule.role}`,
    recordLabel: `Access ${rule.permission}: ${rule.role} → ${rule.master_type} @ ${rule.entity_code}`,
    beforeState: before ? { ...before } : null,
    afterState: { ...rule },
    reason: null,
    sourceModule: 'mca-roc',
  });
}

export function listAccessRules(): MasterAccessRule[] {
  return [...readRules(), ...DEFAULT_ACCESS_RULES];
}

export function clearAccessRules(): void {
  writeRules([]);
}
