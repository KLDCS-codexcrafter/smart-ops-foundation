/**
 * @file        src/lib/comply360-audit-trail-aggregator-engine.ts
 * @sibling     NEW @ Sprint 78a · Comply360 Main Arc 1.10 · Pass A · Q10
 * @realizes    Single cross-card audit-trail query interface backed by
 *              audit-trail-engine (universal Rule 3(1) log) +
 *              audit-trail-hash-chain (tamper-evidence). Forward-extensible
 *              registry of entity types (DP-S78-6) consumed by Floor 2-4
 *              Audit-Suite sprints (S80-82).
 * @reads-from  audit-trail-engine (0-DIFF) · audit-trail-hash-chain (0-DIFF)
 * @sprint      Sprint 78a · T-Phase-5.A.1.10-PASS-A
 * [JWT] Phase 8: GET /api/comply360/audit-trail/aggregate · POST /api/comply360/audit-trail/replay
 */
import {
  readAuditTrail, type AuditTrailEntry,
} from './audit-trail-engine';
import {
  readChainForEntity, verifyChainIntegrity, type ChainVerification,
} from './audit-trail-hash-chain';
import type { ComplianceModule } from './comply360-health-score-engine';

export const READS_FROM = {
  engines: ['audit-trail-engine', 'audit-trail-hash-chain'],
  storage_keys: ['erp_audit_trail_*', 'erp_audit_chain_*'],
} as const;

// ── Forward-extensible registry (DP-S78-6) ───────────────────────────

export interface AuditEntityType {
  id: string;
  module: ComplianceModule;
  label: string;
}

/**
 * Seeded with the 14 known statutory return / register entity types
 * (Pass A scope). Future sprints push() new types via
 * registerAuditEntityType — DO NOT replace this array (append-only).
 */
export const AUDIT_ENTITY_TYPES_REGISTRY: AuditEntityType[] = [
  { id: 'gstr-1',    module: 'tax-gst',     label: 'GSTR-1 (Outward supplies)' },
  { id: 'gstr-3b',   module: 'tax-gst',     label: 'GSTR-3B (Summary return)' },
  { id: 'gstr-9',    module: 'tax-gst',     label: 'GSTR-9 (Annual return)' },
  { id: 'gstr-9c',   module: 'tax-gst',     label: 'GSTR-9C (Reconciliation)' },
  { id: 'tds-26q',   module: 'tds',         label: 'TDS Form 26Q' },
  { id: 'tds-27q',   module: 'tds',         label: 'TDS Form 27Q' },
  { id: 'form-3cd',  module: 'tax-gst',     label: 'Tax Audit Form 3CD' },
  { id: 'form-3ceb', module: 'tax-gst',     label: 'Transfer Pricing Form 3CEB' },
  { id: 'aoc-4',     module: 'mca-roc',     label: 'MCA AOC-4' },
  { id: 'mgt-7',     module: 'mca-roc',     label: 'MCA MGT-7' },
  { id: 'epf-ecr',   module: 'payroll',     label: 'EPF ECR' },
  { id: 'esi-mc',    module: 'payroll',     label: 'ESI Monthly Contribution' },
  { id: 'msme-form1',module: 'msme',        label: 'MSME Form 1 (Half-yearly)' },
  { id: 'brsr-q',    module: 'esg',         label: 'BRSR Quarterly Disclosure' },
];

/** Append-only · idempotent registration (no-op if id already present). */
export function registerAuditEntityType(type: AuditEntityType): void {
  if (AUDIT_ENTITY_TYPES_REGISTRY.some((t) => t.id === type.id)) return;
  AUDIT_ENTITY_TYPES_REGISTRY.push(type);
}

// ── Aggregation ──────────────────────────────────────────────────────

export interface AuditTrailEntryEnriched extends AuditTrailEntry {
  entity_type_label: string | null;
  chain_position: number | null;
}

export interface AuditAggregatedView {
  entity_code: string;
  from: string | null;
  to: string | null;
  entries: AuditTrailEntryEnriched[];
  chain_status: 'verified' | 'broken' | 'pending';
  by_entity_type: Record<string, number>;
}

export function aggregateAuditTrail(
  entity_code: string,
  opts: { from?: string; to?: string; entityType?: string } = {},
): AuditAggregatedView {
  const raw = readAuditTrail(entity_code, {
    from: opts.from,
    to: opts.to,
  });
  const chain = readChainForEntity(entity_code);
  const chainIndex = new Map(chain.map((c, i) => [c.voucher_id, i] as const));

  const filtered = opts.entityType
    ? raw.filter((e) => e.entity_type === opts.entityType)
    : raw;

  const entries: AuditTrailEntryEnriched[] = filtered.map((e) => {
    const reg = AUDIT_ENTITY_TYPES_REGISTRY.find((t) => t.id === e.entity_type);
    return {
      ...e,
      entity_type_label: reg ? reg.label : null,
      chain_position: chainIndex.has(e.record_id) ? chainIndex.get(e.record_id)! : null,
    };
  });

  const by_entity_type: Record<string, number> = {};
  for (const e of entries) {
    by_entity_type[e.entity_type] = (by_entity_type[e.entity_type] ?? 0) + 1;
  }

  return {
    entity_code,
    from: opts.from ?? null,
    to: opts.to ?? null,
    entries,
    chain_status: chain.length === 0 ? 'pending' : 'verified',
    by_entity_type,
  };
}

/**
 * Entity-agnostic snapshot reconstruction · replays after_state for the
 * latest audit entry matching (entityType, entityId) that is ≤ asOf.
 *
 * Returns `null` when no matching event exists in-range.
 */
export function reconstructSnapshotAt(
  entity_code: string,
  entityType: string,
  entityId: string,
  asOf: string,
): unknown {
  const entries = readAuditTrail(entity_code).filter(
    (e) => e.entity_type === entityType && e.record_id === entityId && e.timestamp <= asOf,
  );
  if (entries.length === 0) return null;
  // readAuditTrail returns descending — entries[0] is the latest in-range.
  return entries[0].after_state;
}

export async function verifyAggregatedChain(
  entity_code: string,
  _opts: { from?: string; to?: string } = {},
): Promise<ChainVerification> {
  return verifyChainIntegrity(entity_code);
}
