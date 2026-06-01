/**
 * @file        src/lib/idea-7-transfer-pricing-audit-engine.ts
 * @sibling     NEW @ Sprint 99 · T-Phase-6.A.0.4 · 💡 Idea 7 · THE MOAT
 * @orchestrator Generates Section 92 Transfer-Pricing documentation for internal
 *              inter-scope pricing rules. USE-SITE READS:
 *                · internal-pricing-engine.listPricingRules
 *                · tp-benchmarking-engine.recommendALPMethod / isAboveThreshold
 *                · form-3ceb-engine.buildForm3CEBSnapshot / saveForm3CEBSnapshot
 *              Does NOT reimplement ALP / 3CEB / international filings.
 *              comply360-transfer-pricing-engine (Master File 3CEAA · CbCR ·
 *              Equalisation Levy) is a SEPARATE concern — untouched (FR-44).
 * @audit       Owns + logs `transfer_pricing_event` (module: 'mca-roc').
 * @sprint      T-Phase-6.A.0.4 · Block 3
 * [JWT] Phase 8: POST /api/tp-audit · GET /api/tp-audit
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { registerAuditEntityType } from '@/lib/comply360-audit-trail-aggregator-engine';
import {
  listPricingRules,
  computePriceForMethod,
  type InternalPricingRule,
  type PricingRuleType,
} from '@/lib/internal-pricing-engine';
import { recommendALPMethod, isAboveThreshold } from '@/lib/tp-benchmarking-engine';
import { buildForm3CEBSnapshot, saveForm3CEBSnapshot } from '@/lib/form-3ceb-engine';
import type { ALPMethod } from '@/types/transfer-pricing';

export const READS_FROM = {
  engines: [
    'internal-pricing-engine',
    'tp-benchmarking-engine',
    'form-3ceb-engine',
  ],
  storage_keys: ['erp_tp_audit_records'],
} as const;

registerAuditEntityType({
  id: 'transfer_pricing_event',
  module: 'mca-roc',
  label: 'Transfer Pricing Event (Section 92)',
});

export interface TPAuditRecord {
  tp_audit_id: string;
  pricing_rule_id: string;
  methodology: ALPMethod;
  alp_method_source: 'tp-benchmarking-engine.recommendALPMethod';
  section92_applicable: boolean;
  threshold_basis_inr: number;
  form3ceb_snapshot_id: string | null;
  committee_approval: 'pending' | 'approved' | 'rejected';
  version: number;
  rule_type: PricingRuleType;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'erp_tp_audit_records';

function readAudits(): TPAuditRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TPAuditRecord[]) : [];
  } catch { return []; }
}

function writeAudits(list: TPAuditRecord[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

/** Map an internal pricing rule_type to tp-benchmarking transaction type. */
function mapRuleTypeToTxn(
  ruleType: PricingRuleType,
): 'distribution' | 'manufacturing' | 'services' | 'intangibles' | 'integrated' {
  switch (ruleType) {
    case 'inter_branch':
    case 'inter_site':
      return 'distribution';
    case 'inter_division':
      return 'manufacturing';
    case 'inter_department':
    case 'inter_project':
      return 'services';
    case 'inter_entity':
      return 'integrated';
    default:
      return 'services';
  }
}

/** Crude threshold basis: pricing × an assumed annual transaction multiple. */
function thresholdBasis(rule: InternalPricingRule): number {
  // Use computed price × 365 as conservative annualised stand-in. Real
  // implementations would pass actual transaction volumes — kept simple to
  // avoid duplicating accounting-volume logic owned elsewhere.
  return Math.round(computePriceForMethod(rule) * 365);
}

export interface GenerateTPAuditInput {
  pricing_rule_id: string;
  entity_code?: string;
  financial_year?: string;
}

/**
 * Orchestrates ALP recommendation + Section 92 applicability + optional 3CEB
 * snapshot for inter_entity rules. Returns the persisted audit record.
 */
export function generateTPAudit(input: GenerateTPAuditInput): TPAuditRecord {
  const rule = listPricingRules({ pricing_rule_id: input.pricing_rule_id })[0];
  if (!rule) {
    throw new Error(`[idea-7] pricing rule not found: ${input.pricing_rule_id}`);
  }

  const txnType = mapRuleTypeToTxn(rule.rule_type);
  // ── USE-SITE READ: tp-benchmarking-engine ─────────────────────────
  const methodology = recommendALPMethod(txnType);
  const basis = thresholdBasis(rule);
  const section92 = isAboveThreshold(basis);

  // ── USE-SITE READ: form-3ceb-engine (only for inter_entity rules) ──
  let form3cebId: string | null = null;
  if (rule.rule_type === 'inter_entity' && section92) {
    const ec = input.entity_code || rule.from_scope.entity_id || 'UNKNOWN';
    const fy = input.financial_year || defaultFY();
    const snapshot = buildForm3CEBSnapshot(ec, fy);
    saveForm3CEBSnapshot(ec, snapshot);
    form3cebId = snapshot.id;
  }

  const all = readAudits();
  const existing = all.find((a) => a.pricing_rule_id === rule.pricing_rule_id);
  const now = new Date().toISOString();
  const record: TPAuditRecord = {
    tp_audit_id: existing?.tp_audit_id ?? `tpa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    pricing_rule_id: rule.pricing_rule_id,
    methodology,
    alp_method_source: 'tp-benchmarking-engine.recommendALPMethod',
    section92_applicable: section92,
    threshold_basis_inr: basis,
    form3ceb_snapshot_id: form3cebId,
    committee_approval: existing?.committee_approval ?? 'pending',
    version: (existing?.version ?? 0) + 1,
    rule_type: rule.rule_type,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  const next = existing
    ? all.map((a) => (a.tp_audit_id === existing.tp_audit_id ? record : a))
    : [...all, record];
  writeAudits(next);

  logAudit({
    entityCode: rule.from_scope.entity_id || 'UNKNOWN',
    action: existing ? 'update' : 'create',
    entityType: 'transfer_pricing_event',
    recordId: record.tp_audit_id,
    recordLabel: `TP-AUDIT ${methodology} · ${rule.rule_type} · rule ${rule.pricing_rule_id}`,
    beforeState: existing as unknown as Record<string, unknown> | null,
    afterState: record as unknown as Record<string, unknown>,
    sourceModule: 'idea-7-transfer-pricing-audit-engine',
  });

  return record;
}

export function listTPAudits(filter?: Partial<TPAuditRecord>): TPAuditRecord[] {
  const all = readAudits();
  if (!filter) return all;
  return all.filter((a) => {
    for (const [k, v] of Object.entries(filter)) {
      if (v === undefined) continue;
      if ((a as unknown as Record<string, unknown>)[k] !== v) return false;
    }
    return true;
  });
}

export function setCommitteeDecision(
  tp_audit_id: string,
  decision: 'approved' | 'rejected',
): TPAuditRecord {
  const all = readAudits();
  const idx = all.findIndex((a) => a.tp_audit_id === tp_audit_id);
  if (idx < 0) throw new Error(`[idea-7] TP audit not found: ${tp_audit_id}`);
  const before = all[idx];
  const updated: TPAuditRecord = {
    ...before,
    committee_approval: decision,
    updated_at: new Date().toISOString(),
  };
  const next = all.map((a, i) => (i === idx ? updated : a));
  writeAudits(next);

  logAudit({
    entityCode: 'UNKNOWN',
    action: decision === 'approved' ? 'approve' : 'reject',
    entityType: 'transfer_pricing_event',
    recordId: updated.tp_audit_id,
    recordLabel: `Committee ${decision} · rule ${updated.pricing_rule_id}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: updated as unknown as Record<string, unknown>,
    sourceModule: 'idea-7-transfer-pricing-audit-engine',
  });

  return updated;
}

function defaultFY(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const startY = now.getUTCMonth() >= 3 ? y : y - 1;
  return `FY${startY}-${String((startY + 1) % 100).padStart(2, '0')}`;
}

export function _clearTPAuditsForTests(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
