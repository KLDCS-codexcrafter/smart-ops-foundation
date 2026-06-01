/**
 * @file        src/lib/field-lock-metadata-engine.ts
 * @sibling     NEW @ Sprint 98 · Arc 0 Master Data Foundation Block 3
 * @realizes    Group-master field governance · per (master_type, field_path) rule
 *              declaring lock-mode = 'locked' | 'overrideable' | 'request_approval'.
 *              Meaningful regardless of storage model (DP-PH6-NEW-24): governs
 *              what a sibling entity is allowed to do with a shared/group master.
 * @reads-from  audit-trail-engine (USE-SITE) · master-replication-engine (types only)
 * @sprint      Sprint 98 · T-Phase-6.A.0.3
 * [JWT] Phase 8: GET/PUT /api/field-lock-rules · POST /api/field-lock-rules/request
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { registerAuditEntityType } from '@/lib/comply360-audit-trail-aggregator-engine';
import type { MasterType } from '@/lib/master-replication-engine';

export const READS_FROM = {
  engines: ['audit-trail-engine', 'master-replication-engine'],
  storage_keys: ['erp_field_lock_rules_global'],
} as const;

registerAuditEntityType({
  id: 'field_lock_rule_change',
  module: 'mca-roc',
  label: 'Field Lock Rule Change',
});

export type LockMode = 'locked' | 'overrideable' | 'request_approval';

export interface FieldLockRule {
  id: string;
  master_type: MasterType;
  field_path: string;          // dot-path e.g. 'gstin' or 'address.line1'
  field_label: string;
  mode: LockMode;
  reason?: string;
  updated_at: string;
  updated_by: string | null;
}

export interface OverrideAttempt {
  allowed: boolean;
  requires_approval: boolean;
  reason: string;
}

const STORE_KEY = 'erp_field_lock_rules_global';

const safeRead = <T,>(key: string, fallback: T): T => {
  try {
    // [JWT] GET /api/field-lock-rules
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
};

const safeWrite = (key: string, val: unknown): void => {
  try {
    // [JWT] PUT /api/field-lock-rules
    localStorage.setItem(key, JSON.stringify(val));
  } catch { /* quota silent */ }
};

const newRuleId = (): string =>
  `flr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// ─── Seed defaults · Indian compliance-critical fields ────────────────
const DEFAULT_RULES: ReadonlyArray<Omit<FieldLockRule, 'id' | 'updated_at' | 'updated_by'>> = [
  { master_type: 'customer', field_path: 'gstin', field_label: 'GSTIN', mode: 'locked',
    reason: 'GSTIN is statutory identity · cannot be overridden per entity' },
  { master_type: 'customer', field_path: 'pan', field_label: 'PAN', mode: 'locked',
    reason: 'PAN is statutory identity' },
  { master_type: 'vendor', field_path: 'gstin', field_label: 'GSTIN', mode: 'locked',
    reason: 'GSTIN is statutory identity' },
  { master_type: 'vendor', field_path: 'msme_udyam', field_label: 'Udyam Registration', mode: 'overrideable',
    reason: 'May be re-classified at branch level' },
  { master_type: 'ledger', field_path: 'parent_group', field_label: 'Parent Group', mode: 'request_approval',
    reason: 'Re-grouping affects financial statements · CFO approval required' },
  { master_type: 'item', field_path: 'hsn_code', field_label: 'HSN Code', mode: 'request_approval',
    reason: 'HSN reclassification affects GST rate · tax-head approval required' },
  { master_type: 'item', field_path: 'uom', field_label: 'Base UOM', mode: 'locked',
    reason: 'Base UOM change breaks stock continuity' },
  { master_type: 'voucher_type', field_path: 'base_voucher_type', field_label: 'Base Voucher Type', mode: 'locked',
    reason: 'Base type drives posting logic · cannot diverge across entities' },
  { master_type: 'stock_group', field_path: 'is_taxable', field_label: 'Taxable Flag', mode: 'request_approval',
    reason: 'Tax-flag flip affects all child items' },
];

export function loadFieldLockRules(): FieldLockRule[] {
  const existing = safeRead<FieldLockRule[] | null>(STORE_KEY, null);
  if (existing && existing.length > 0) return existing;
  const now = new Date().toISOString();
  const seeded: FieldLockRule[] = DEFAULT_RULES.map((r) => ({
    ...r, id: newRuleId(), updated_at: now, updated_by: 'system',
  }));
  safeWrite(STORE_KEY, seeded);
  return seeded;
}

export function getRule(
  master_type: MasterType, field_path: string,
): FieldLockRule | null {
  return loadFieldLockRules().find(
    (r) => r.master_type === master_type && r.field_path === field_path,
  ) ?? null;
}

export function upsertRule(input: {
  rule: Omit<FieldLockRule, 'id' | 'updated_at'> & { id?: string };
  actor: string;
  entity_code: string;
}): FieldLockRule {
  const rules = loadFieldLockRules();
  const now = new Date().toISOString();
  const existing = input.rule.id
    ? rules.find((r) => r.id === input.rule.id)
    : rules.find((r) => r.master_type === input.rule.master_type && r.field_path === input.rule.field_path);

  const before = existing ? { ...existing } : null;
  const next: FieldLockRule = existing
    ? { ...existing, ...input.rule, id: existing.id, updated_at: now, updated_by: input.actor }
    : { ...input.rule, id: newRuleId(), updated_at: now, updated_by: input.actor } as FieldLockRule;

  const written = existing
    ? rules.map((r) => (r.id === existing.id ? next : r))
    : [...rules, next];
  safeWrite(STORE_KEY, written);

  logAudit({
    entityCode: input.entity_code,
    action: existing ? 'update' : 'create',
    entityType: 'field_lock_rule_change',
    recordId: next.id,
    recordLabel: `${next.master_type}.${next.field_path} · ${next.mode}`,
    beforeState: before as Record<string, unknown> | null,
    afterState: { ...next } as unknown as Record<string, unknown>,
    sourceModule: 'field-lock-metadata-engine',
  });

  return next;
}

export function deleteRule(input: {
  rule_id: string; actor: string; entity_code: string;
}): boolean {
  const rules = loadFieldLockRules();
  const found = rules.find((r) => r.id === input.rule_id);
  if (!found) return false;
  safeWrite(STORE_KEY, rules.filter((r) => r.id !== input.rule_id));
  logAudit({
    entityCode: input.entity_code,
    action: 'cancel',
    entityType: 'field_lock_rule_change',
    recordId: found.id,
    recordLabel: `${found.master_type}.${found.field_path} · deleted`,
    beforeState: { ...found } as unknown as Record<string, unknown>,
    afterState: null,
    sourceModule: 'field-lock-metadata-engine',
  });
  return true;
}

/** Decision oracle for callers attempting to override a group-master field. */
export function evaluateOverride(input: {
  master_type: MasterType; field_path: string;
}): OverrideAttempt {
  const rule = getRule(input.master_type, input.field_path);
  if (!rule) {
    return { allowed: true, requires_approval: false, reason: 'No rule · default permissive' };
  }
  switch (rule.mode) {
    case 'locked':
      return { allowed: false, requires_approval: false,
        reason: rule.reason ?? 'Field is locked at group level' };
    case 'overrideable':
      return { allowed: true, requires_approval: false,
        reason: rule.reason ?? 'Per-entity override permitted' };
    case 'request_approval':
      return { allowed: false, requires_approval: true,
        reason: rule.reason ?? 'Override requires approval' };
  }
}

export function _clearFieldLockRulesForTests(): void {
  try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
}
