/**
 * @file        src/lib/po-delivery-followup-engine.ts
 * @purpose     D-NEW-GB · Post-PO Late Delivery Follow-Up engine · 19th SIBLING application
 * @sprint      T-Phase-2.B-Procure360-Phase2-Polish-Part-B · Block G · founder Q4 May 22 vision
 * @decisions   Q-LOCK-9(a) · Day -7/+1/+7/+14 cascade · FR-19 SIBLING above po-management + vendor-reliability
 * @disciplines FR-19 · FR-22 · FR-26 · FR-54 CC SSOT preserved · vendor scoring delta via PUBLIC save API (engine code 0-DIFF)
 * @reuses      po-management-engine (listPurchaseOrders · 0-DIFF) ·
 *              vendor-reliability-engine (loadVendorScores · saveVendorScores · 0-DIFF on engine code)
 * @[JWT]       GET/POST /api/procure360/po-delivery-followup-cascades
 */
import type {
  PoDeliveryFollowupCascade,
  PoDeliveryFollowupStage,
} from '@/types/po-delivery-followup';
import { poDeliveryFollowupCascadesKey } from '@/types/po-delivery-followup';
import { listPurchaseOrders } from './po-management-engine';
import { loadVendorScores, saveVendorScores } from './vendor-reliability-engine';

function newId(): string {
  return `pdfc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function addDays(d: Date, days: number): string {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r.toISOString();
}

export const VENDOR_SCORING_PENALTIES = {
  late_day_7: -3, // small penalty at 1 week late
  late_day_14: -10, // large penalty at 2 weeks late
} as const;

export function loadCascades(entityCode: string): PoDeliveryFollowupCascade[] {
  try {
    const raw = localStorage.getItem(poDeliveryFollowupCascadesKey(entityCode));
    return raw ? (JSON.parse(raw) as PoDeliveryFollowupCascade[]) : [];
  } catch {
    return [];
  }
}

export function saveCascades(entityCode: string, list: PoDeliveryFollowupCascade[]): void {
  localStorage.setItem(poDeliveryFollowupCascadesKey(entityCode), JSON.stringify(list));
}

/**
 * Initiate a cascade when a PO is raised (called by PO creation handler).
 */
export function initiateCascade(
  entityCode: string,
  poId: string,
  poNumber: string,
  vendorId: string,
  vendorName: string,
  expectedDeliveryDate: Date,
): PoDeliveryFollowupCascade {
  const now = new Date();
  const cascade: PoDeliveryFollowupCascade = {
    id: newId(),
    po_id: poId,
    po_number: poNumber,
    vendor_id: vendorId,
    vendor_name: vendorName,
    entity_id: entityCode,
    expected_delivery_date: expectedDeliveryDate.toISOString(),
    day_minus_7_check_due: addDays(expectedDeliveryDate, -7),
    day_plus_1_late_due: addDays(expectedDeliveryDate, 1),
    day_plus_7_escalation_due: addDays(expectedDeliveryDate, 7),
    day_plus_14_cancel_option_due: addDays(expectedDeliveryDate, 14),
    current_stage: 'pre_delivery',
    stage_history: [{ stage: 'pre_delivery', at: now.toISOString() }],
    vendor_scoring_delta_applied: false,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const all = loadCascades(entityCode);
  saveCascades(entityCode, [...all, cascade]);
  return cascade;
}

/**
 * Apply vendor scoring delta · FR-19 SIBLING listener pattern (consumes engine PUBLIC save API).
 * vendor-reliability-engine source code stays 0-DIFF.
 */
function applyVendorScoringDelta(entityCode: string, vendorId: string, delta: number): void {
  const scores = loadVendorScores(entityCode);
  const updated = scores.map((s) => {
    if (s.related_foreign_vendor_id !== vendorId) return s;
    const newOtd = Math.max(0, Math.min(100, s.components.on_time_delivery_score + delta));
    return {
      ...s,
      components: {
        ...s.components,
        on_time_delivery_score: newOtd,
        computed_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };
  });
  saveVendorScores(entityCode, updated);
}

/**
 * Scan all active cascades · advance stage if due date passed and no GRN received.
 */
export function scanAndAdvanceCascades(
  entityCode: string,
  now: Date = new Date(),
): {
  advanced: PoDeliveryFollowupCascade[];
  escalated: PoDeliveryFollowupCascade[];
  scoring_deltas_applied: number;
} {
  const all = loadCascades(entityCode);
  const allPOs = listPurchaseOrders(entityCode);
  const advanced: PoDeliveryFollowupCascade[] = [];
  const escalated: PoDeliveryFollowupCascade[] = [];
  let deltasApplied = 0;

  const updatedList = all.map<PoDeliveryFollowupCascade>((cascade) => {
    if (cascade.current_stage === 'received' || cascade.current_stage === 'cancelled') {
      return cascade;
    }

    const po = allPOs.find((p) => p.id === cascade.po_id);

    // If PO closed/received elsewhere, close the cascade.
    if (po && (po.status === 'fully_received' || po.status === 'cancelled')) {
      const closed: PoDeliveryFollowupCascade = {
        ...cascade,
        current_stage: 'received',
        goods_received_at: now.toISOString(),
        stage_history: [
          ...cascade.stage_history,
          { stage: 'received', at: now.toISOString(), note: 'PO closed · cascade closed' },
        ],
        updated_at: now.toISOString(),
      };
      return closed;
    }

    const updated: PoDeliveryFollowupCascade = {
      ...cascade,
      stage_history: [...cascade.stage_history],
    };
    let changed = false;

    if (
      updated.current_stage === 'pre_delivery' &&
      now >= new Date(cascade.day_minus_7_check_due)
    ) {
      updated.current_stage = 'delivery_due';
      updated.stage_history.push({
        stage: 'delivery_due',
        at: now.toISOString(),
        note: 'Day -7 pre-delivery check · vendor confirmation requested',
      });
      changed = true;
    }

    if (
      updated.current_stage === 'delivery_due' &&
      now >= new Date(cascade.day_plus_1_late_due)
    ) {
      updated.current_stage = 'late_day_1';
      updated.stage_history.push({
        stage: 'late_day_1',
        at: now.toISOString(),
        note: 'Day +1 late · buyer dashboard alert + vendor reminder',
      });
      changed = true;
    }

    if (
      updated.current_stage === 'late_day_1' &&
      now >= new Date(cascade.day_plus_7_escalation_due)
    ) {
      updated.current_stage = 'late_day_7';
      updated.stage_history.push({
        stage: 'late_day_7',
        at: now.toISOString(),
        note: 'Day +7 escalation · vendor scoring -3 penalty applied',
      });
      applyVendorScoringDelta(entityCode, cascade.vendor_id, VENDOR_SCORING_PENALTIES.late_day_7);
      updated.vendor_scoring_delta_applied = true;
      updated.vendor_scoring_delta_value =
        (updated.vendor_scoring_delta_value ?? 0) + VENDOR_SCORING_PENALTIES.late_day_7;
      deltasApplied++;
      changed = true;
      escalated.push(updated);
    }

    if (
      updated.current_stage === 'late_day_7' &&
      now >= new Date(cascade.day_plus_14_cancel_option_due)
    ) {
      updated.current_stage = 'late_day_14';
      updated.stage_history.push({
        stage: 'late_day_14',
        at: now.toISOString(),
        note: 'Day +14 cancel option enabled · additional vendor scoring -10 penalty applied',
      });
      applyVendorScoringDelta(
        entityCode,
        cascade.vendor_id,
        VENDOR_SCORING_PENALTIES.late_day_14,
      );
      updated.vendor_scoring_delta_value =
        (updated.vendor_scoring_delta_value ?? 0) + VENDOR_SCORING_PENALTIES.late_day_14;
      deltasApplied++;
      changed = true;
      escalated.push(updated);
    }

    if (changed) {
      updated.updated_at = now.toISOString();
      if (
        updated.current_stage !== 'late_day_7' &&
        updated.current_stage !== 'late_day_14'
      ) {
        advanced.push(updated);
      }
      return updated;
    }
    return cascade;
  });

  saveCascades(entityCode, updatedList);
  return { advanced, escalated, scoring_deltas_applied: deltasApplied };
}

/**
 * Mark cascade resolved when GRN registered.
 */
export function markGoodsReceived(
  entityCode: string,
  cascadeId: string,
  receivedAt: Date = new Date(),
): PoDeliveryFollowupCascade | null {
  const all = loadCascades(entityCode);
  const cascade = all.find((c) => c.id === cascadeId);
  if (!cascade) return null;

  const updated: PoDeliveryFollowupCascade = {
    ...cascade,
    current_stage: 'received',
    goods_received_at: receivedAt.toISOString(),
    stage_history: [
      ...cascade.stage_history,
      { stage: 'received', at: receivedAt.toISOString(), note: 'GRN registered · cascade closed' },
    ],
    updated_at: receivedAt.toISOString(),
  };

  saveCascades(entityCode, all.map((c) => (c.id === cascadeId ? updated : c)));
  return updated;
}

/**
 * Cancel PO at Day +14 (buyer action).
 */
export function cancelPo(
  entityCode: string,
  cascadeId: string,
  reason: string,
  cancelledAt: Date = new Date(),
): PoDeliveryFollowupCascade | null {
  const all = loadCascades(entityCode);
  const cascade = all.find((c) => c.id === cascadeId);
  if (!cascade) return null;

  if (cascade.current_stage !== 'late_day_14') {
    throw new Error('PO can only be cancelled at Day +14 stage');
  }

  const updated: PoDeliveryFollowupCascade = {
    ...cascade,
    current_stage: 'cancelled',
    cancelled_at: cancelledAt.toISOString(),
    stage_history: [
      ...cascade.stage_history,
      {
        stage: 'cancelled',
        at: cancelledAt.toISOString(),
        note: `PO cancelled · reason: ${reason}`,
      },
    ],
    updated_at: cancelledAt.toISOString(),
  };

  saveCascades(entityCode, all.map((c) => (c.id === cascadeId ? updated : c)));
  return updated;
}

export function listActiveCascades(entityCode: string): PoDeliveryFollowupCascade[] {
  return loadCascades(entityCode).filter(
    (c) => c.current_stage !== 'received' && c.current_stage !== 'cancelled',
  );
}

export function listCascadesByStage(
  entityCode: string,
  stage: PoDeliveryFollowupStage,
): PoDeliveryFollowupCascade[] {
  return loadCascades(entityCode).filter((c) => c.current_stage === stage);
}

export interface PoDeliveryFollowupSummary {
  total: number;
  pre_delivery: number;
  delivery_due: number;
  late_day_1: number;
  late_day_7: number;
  late_day_14: number;
  received: number;
  cancelled: number;
  vendor_scoring_deltas_applied: number;
}

export function summarizeCascades(entityCode: string): PoDeliveryFollowupSummary {
  const all = loadCascades(entityCode);
  return {
    total: all.length,
    pre_delivery: all.filter((c) => c.current_stage === 'pre_delivery').length,
    delivery_due: all.filter((c) => c.current_stage === 'delivery_due').length,
    late_day_1: all.filter((c) => c.current_stage === 'late_day_1').length,
    late_day_7: all.filter((c) => c.current_stage === 'late_day_7').length,
    late_day_14: all.filter((c) => c.current_stage === 'late_day_14').length,
    received: all.filter((c) => c.current_stage === 'received').length,
    cancelled: all.filter((c) => c.current_stage === 'cancelled').length,
    vendor_scoring_deltas_applied: all.filter((c) => c.vendor_scoring_delta_applied).length,
  };
}
