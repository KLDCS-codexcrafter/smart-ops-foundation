/**
 * @file        src/lib/realisation-aggregation-engine.ts
 * @purpose     D-NEW-FA · Cross-entity Realisation aggregation · pure helper
 * @sprint      T-Phase-2.B-2-EximX-MediumDNEWs · Block A
 * @decisions   Q-LOCK-3(a) helper · export-realisation-engine STAYS 0-DIFF · READ-ONLY consumer
 * @disciplines FR-30 · FR-50 · multi-tenant aggregation via useEntityList iteration · returns NEW objects via spread
 */
import type { ExportRealisation, FEMAState } from '@/types/export-realisation';
import {
  loadRealisations,
  classifyFEMAState,
  computeDaysSinceDispatch,
} from '@/lib/export-realisation-engine';

export interface EntityRealisationSummary {
  entity_id: string;
  entity_short_code: string;
  total_realisations: number;
  pending_count: number;
  overdue_count: number;
  fully_realised_count: number;
  total_pending_inr: number;
  total_realised_inr: number;
  critical_fema_count: number;
  worst_fema_state: FEMAState;
}

export interface CrossEntityRealisationReport {
  as_of_date: string;
  entities_aggregated: number;
  total_realisations_across_entities: number;
  total_pending_inr_across_entities: number;
  total_realised_inr_across_entities: number;
  critical_fema_count_across_entities: number;
  worst_fema_state_across_entities: FEMAState;
  per_entity: EntityRealisationSummary[];
}

const FEMA_SEVERITY_ORDER: Record<FEMAState, number> = {
  safe: 0,
  attention: 1,
  warning: 2,
  critical: 3,
  overdue: 4,
};

function worseOf(a: FEMAState, b: FEMAState): FEMAState {
  return FEMA_SEVERITY_ORDER[a] >= FEMA_SEVERITY_ORDER[b] ? a : b;
}

function summarizeForEntity(
  entityId: string,
  entityShortCode: string,
  realisations: readonly ExportRealisation[],
): EntityRealisationSummary {
  let pending = 0;
  let overdue = 0;
  let fullyRealised = 0;
  let pendingInr = 0;
  let realisedInr = 0;
  let criticalFema = 0;
  let worstState: FEMAState = 'safe';

  for (const r of realisations) {
    if (r.status === 'fully_realised') fullyRealised += 1;
    if (r.status === 'pending' || r.status === 'partially_realised') pending += 1;
    if (r.status === 'overdue') overdue += 1;

    if (r.outstanding_inr > 0) pendingInr += r.outstanding_inr;
    realisedInr += r.total_realised_inr;

    if (r.goods_dispatched_date && r.status !== 'fully_realised') {
      const days = computeDaysSinceDispatch(r.goods_dispatched_date);
      const femaState = classifyFEMAState(days);
      if (femaState === 'critical' || femaState === 'overdue') criticalFema += 1;
      worstState = worseOf(worstState, femaState);
    }
  }

  return {
    entity_id: entityId,
    entity_short_code: entityShortCode,
    total_realisations: realisations.length,
    pending_count: pending,
    overdue_count: overdue,
    fully_realised_count: fullyRealised,
    total_pending_inr: pendingInr,
    total_realised_inr: realisedInr,
    critical_fema_count: criticalFema,
    worst_fema_state: worstState,
  };
}

export function aggregateRealisationsAcrossEntities(
  entities: readonly { id: string; shortCode?: string }[],
): CrossEntityRealisationReport {
  const perEntity: EntityRealisationSummary[] = entities
    .filter((e) => Boolean(e.shortCode))
    .map((e) => {
      const code = e.shortCode ?? '';
      const realisations = loadRealisations(code);
      return summarizeForEntity(e.id, code, realisations);
    });

  let worst: FEMAState = 'safe';
  let criticalTotal = 0;
  let pendingInrTotal = 0;
  let realisedInrTotal = 0;
  let realisationsTotal = 0;

  for (const s of perEntity) {
    worst = worseOf(worst, s.worst_fema_state);
    criticalTotal += s.critical_fema_count;
    pendingInrTotal += s.total_pending_inr;
    realisedInrTotal += s.total_realised_inr;
    realisationsTotal += s.total_realisations;
  }

  return {
    as_of_date: new Date().toISOString().slice(0, 10),
    entities_aggregated: perEntity.length,
    total_realisations_across_entities: realisationsTotal,
    total_pending_inr_across_entities: pendingInrTotal,
    total_realised_inr_across_entities: realisedInrTotal,
    critical_fema_count_across_entities: criticalTotal,
    worst_fema_state_across_entities: worst,
    per_entity: perEntity,
  };
}
