/**
 * @file        src/lib/idea-2-master-dna-engine.ts
 * @sibling     NEW @ Sprint 97 · T-Phase-6.A.0.2 · 💡 Idea 2
 * @realizes    State-aware master inheritance. When a master (party / ledger /
 *              tax / logistic) is replicated to a new branch / subsidiary, the
 *              engine auto-adjusts state-coupled fields to the target state:
 *              GST state code, TDS section context, place-of-supply, and a
 *              state-to-state logistic rate default.
 *
 *              Logistic rate matrix helper is not present in the repo at S97;
 *              we ship a deterministic state-distance-bucket DEFAULT and §L-flag
 *              it in the close summary (Q-LOCK S97-3).
 *
 * @reads-from  india-geography (states · USE-SITE READ)
 *              compliance-seed-data (TDS_SECTIONS · USE-SITE READ)
 *              master-replication-engine (MasterType · sibling pattern)
 * @sprint      Sprint 97 · T-Phase-6.A.0.2
 * [JWT] Phase 8: POST /api/master-dna/inherit
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { registerAuditEntityType } from '@/lib/comply360-audit-trail-aggregator-engine';
import { indianStates } from '@/data/india-geography';
import { TDS_SECTIONS } from '@/data/compliance-seed-data';

export const READS_FROM = {
  engines: ['india-geography', 'compliance-seed-data', 'master-replication-engine'],
  storage_keys: ['erp_audit_trail_*'],
} as const;

// ─── Q-LOCK S97-5 · Register the owned audit entity type under 'mca-roc' ───
registerAuditEntityType({
  id: 'master_dna_inheritance',
  module: 'mca-roc',
  label: 'Master DNA Inheritance Event',
});

// ─── Contract ──────────────────────────────────────────────────────────

export interface DnaAdjustment {
  field: string;
  from: unknown;
  to: unknown;
  reason: string;
}

export interface DnaInheritanceResult {
  master_type: string;
  source_master_key: string;
  target_entity: string;
  adjustments: DnaAdjustment[];
  resolved_state: { code: string; name: string; gstStateCode: string } | null;
}

export interface InheritWithDnaInput {
  master_type: string;
  source_snapshot: Record<string, unknown>;
  /** ISO state code from india-geography.indianStates[].code, e.g. 'KA'. */
  target_state_code: string;
  target_entity: string;
  /** Optional pre-resolved source-state for logistic-matrix distance bucket. */
  source_state_code?: string;
}

// ─── State + TDS resolvers ─────────────────────────────────────────────

function resolveState(code: string) {
  return indianStates.find((s) => s.code === code) ?? null;
}

/**
 * Pick a sensible TDS section for the master. Today this is a deterministic
 * routing by master_type. The §L decision flag documents that S97 does not
 * fork the TDS section per-state (no state-rate variance exists in the
 * seed); future state-specific surcharge logic plugs in here.
 */
function pickTdsSection(master_type: string): string | null {
  const routing: Record<string, string> = {
    vendor: '194C',
    customer: '194Q',
    contractor: '194C',
    professional: '194J(b)',
    rent_landlord: '194I(b)',
    logistic: '194C',
  };
  const code = routing[master_type] ?? null;
  if (!code) return null;
  return TDS_SECTIONS.find((s) => s.sectionCode === code)?.sectionCode ?? null;
}

/**
 * Deterministic state-to-state logistic rate default. Same-state = 0
 * (intra-state local), neighbours = 1, far = 2. §L-flagged as a stub default
 * until a real state-distance matrix lands.
 */
function defaultLogisticRate(source: string | undefined, target: string): number {
  if (!source || source === target) return 0;
  // Deterministic bucket by gstStateCode arithmetic distance.
  const a = resolveState(source);
  const b = resolveState(target);
  if (!a || !b) return 2;
  const delta = Math.abs(Number(a.gstStateCode) - Number(b.gstStateCode));
  if (delta <= 3) return 1;
  return 2;
}

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Inherit a source master into the target entity with state-aware DNA
 * auto-adjustments. Pure function — does NOT persist the target master;
 * callers persist via master-replication-engine.replicateToAllEntities.
 */
export function inheritWithDna(input: InheritWithDnaInput): DnaInheritanceResult {
  const adjustments: DnaAdjustment[] = [];
  const targetState = resolveState(input.target_state_code);

  // 1. GST state code · place-of-supply
  if (targetState) {
    const srcGst = input.source_snapshot.gst_state_code;
    if (srcGst !== targetState.gstStateCode) {
      adjustments.push({
        field: 'gst_state_code',
        from: srcGst ?? null,
        to: targetState.gstStateCode,
        reason: `Target state ${targetState.name} (${targetState.code})`,
      });
    }
    const srcPos = input.source_snapshot.place_of_supply;
    if (srcPos !== targetState.code) {
      adjustments.push({
        field: 'place_of_supply',
        from: srcPos ?? null,
        to: targetState.code,
        reason: 'Place-of-supply pre-fills to target state',
      });
    }
  }

  // 2. TDS section
  const tds = pickTdsSection(input.master_type);
  if (tds) {
    const srcTds = input.source_snapshot.tds_section;
    if (srcTds !== tds) {
      adjustments.push({
        field: 'tds_section',
        from: srcTds ?? null,
        to: tds,
        reason: `Default TDS section for master_type='${input.master_type}'`,
      });
    }
  }

  // 3. Logistic rate (state-to-state) — §L STUB DEFAULT
  if (input.master_type === 'logistic') {
    const rate = defaultLogisticRate(input.source_state_code, input.target_state_code);
    const srcRate = input.source_snapshot.state_rate_bucket;
    if (srcRate !== rate) {
      adjustments.push({
        field: 'state_rate_bucket',
        from: srcRate ?? null,
        to: rate,
        reason: 'Deterministic state-distance bucket (S97 §L stub default; matrix helper deferred)',
      });
    }
  }

  const result: DnaInheritanceResult = {
    master_type: input.master_type,
    source_master_key: String(input.source_snapshot.id ?? input.source_snapshot.code ?? ''),
    target_entity: input.target_entity,
    adjustments,
    resolved_state: targetState
      ? { code: targetState.code, name: targetState.name, gstStateCode: targetState.gstStateCode }
      : null,
  };

  // Audit (owns)
  logAudit({
    entityCode: input.target_entity,
    action: 'create',
    entityType: 'master_dna_inheritance',
    recordId: `${input.master_type}:${result.source_master_key}->${input.target_entity}`,
    recordLabel: `${input.master_type} inherited into ${input.target_entity} (${targetState?.name ?? input.target_state_code})`,
    beforeState: input.source_snapshot,
    afterState: { adjustments } as Record<string, unknown>,
    reason: null,
    sourceModule: 'master-data-foundation',
  });

  return result;
}
