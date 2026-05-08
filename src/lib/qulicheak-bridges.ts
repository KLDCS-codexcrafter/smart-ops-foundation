/**
 * @file src/lib/qulicheak-bridges.ts
 * @purpose Inbound listener (auto-create NCR from Procure360 QA handoff) +
 *          outbound emit (apply QA outcome to Procure360 vendor scoring on close)
 *          · zero touches to Procure360 code (FR-19 sibling)
 * @who Lovable on behalf of Operix Founder
 * @when 2026-05-08
 * @sprint T-Phase-1.A.5.a-bis-Qulicheak-NCR-Foundation
 * @iso 25010 Reliability + Functional Suitability
 * @whom Quality Inspector
 * @decisions D-NEW-AW (NCR auto-create from Procure360 listener) ·
 *            D-NEW-AX (close emits applyQaOutcome with severity-based delta)
 * @disciplines FR-19 (Sibling · zero touches Procure360) ·
 *              FR-53 (Cross-card handoff via browser CustomEvent · matches Pay Hub pattern)
 * @reuses ncr-engine.raiseNcr · browser CustomEvent (no new lib)
 * @[JWT] Pure browser pub/sub · no API surface
 *
 * NOTE on bus implementation: existing cross-card-activity-engine has only
 * record/read helpers — no event subscription. Rather than touch that engine
 * (FR-19 sibling), this file owns a minimal CustomEvent bus on `window`.
 * Procure360 outbound side will dispatchEvent on the same channels when wired.
 */
import { raiseNcr } from '@/lib/ncr-engine';
import type { NcrSeverity, NcrOutcome } from '@/types/ncr';

const CH_HANDOFF = 'qa.handoff.received';
const CH_OUTCOME = 'qa.outcome.applied';

export interface QaHandoffPayload {
  source_card: 'procure360' | 'production' | 'inventory_hub';
  voucher_id: string;
  voucher_kind: 'grn' | 'production_confirmation' | 'bill_passing_match';
  party_id?: string;
  party_name?: string;
  item_id?: string;
  item_name?: string;
  qty_affected?: number;
  variance_severity?: NcrSeverity;
  reason: string;
  actor_id: string;
  entity_code: string;
}

export interface QaOutcomePayload {
  target_card: 'procure360';
  vendor_id: string;
  ncr_id: string;
  severity: NcrSeverity;
  outcome: NcrOutcome;
  quality_score_delta: number;
  entity_code: string;
}

const QA_DELTA_BY_SEVERITY: Record<NcrSeverity, number> = {
  minor: -2,
  major: -5,
  critical: -10,
};

/**
 * Mount the inbound listener · returns unmount function.
 * Called from QualiCheckPage useEffect bootstrap.
 */
export function mountQulicheakBridges(): () => void {
  const handler = (e: Event): void => {
    const ev = e as CustomEvent<QaHandoffPayload>;
    const p = ev.detail;
    if (!p?.entity_code) return;
    const severity: NcrSeverity = p.variance_severity ?? 'major';
    raiseNcr(p.entity_code, p.actor_id, {
      entity_id: p.entity_code,
      source: 'procure360_match',
      severity,
      related_voucher_id: p.voucher_id,
      related_voucher_kind:
        p.voucher_kind === 'bill_passing_match' ? 'grn' : p.voucher_kind,
      related_party_id: p.party_id ?? null,
      related_party_name: p.party_name ?? null,
      item_id: p.item_id ?? null,
      item_name: p.item_name ?? null,
      qty_affected: p.qty_affected ?? null,
      description: `Auto-created from ${p.source_card} ${p.voucher_kind}: ${p.reason}`,
    });
  };

  window.addEventListener(CH_HANDOFF, handler as EventListener);
  return () => window.removeEventListener(CH_HANDOFF, handler as EventListener);
}

/**
 * Outbound emit · called on NCR close when related_party_id is set.
 * Procure360's vendor-scoring engine subscribes to `qa.outcome.applied` ·
 * THIS sprint does NOT touch Procure360 code (FR-19 sibling).
 */
export function emitQaOutcomeForVendor(args: {
  vendor_id: string;
  ncr_id: string;
  severity: NcrSeverity;
  outcome: NcrOutcome;
  entity_code: string;
}): void {
  if (!args.vendor_id) return;
  const payload: QaOutcomePayload = {
    target_card: 'procure360',
    vendor_id: args.vendor_id,
    ncr_id: args.ncr_id,
    severity: args.severity,
    outcome: args.outcome,
    quality_score_delta: QA_DELTA_BY_SEVERITY[args.severity],
    entity_code: args.entity_code,
  };
  window.dispatchEvent(new CustomEvent<QaOutcomePayload>(CH_OUTCOME, { detail: payload }));
}
