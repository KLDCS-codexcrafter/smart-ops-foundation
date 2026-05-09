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
// α-b · Block C · CAPA lifecycle channels (in-card observability · no Procure360 touch)
const CH_CAPA_LINKED = 'capa:linked-to-ncr';
const CH_CAPA_EFFECTIVE = 'capa:effective:applied';
const CH_CAPA_INEFFECTIVE = 'capa:ineffective:reopened';

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

  // α-b Block C · in-card CAPA observability listeners · no-op pass-throughs
  // (capa-engine already records cross-card activity on closeCapa). These exist so
  // future siblings (e.g. Procure360 vendor-scoring) can subscribe without touching capa-engine.
  const capaNoop = (_e: Event): void => { /* observability hook · intentional no-op */ };

  window.addEventListener(CH_HANDOFF, handler as EventListener);
  window.addEventListener(CH_CAPA_LINKED, capaNoop as EventListener);
  window.addEventListener(CH_CAPA_EFFECTIVE, capaNoop as EventListener);
  window.addEventListener(CH_CAPA_INEFFECTIVE, capaNoop as EventListener);
  return () => {
    window.removeEventListener(CH_HANDOFF, handler as EventListener);
    window.removeEventListener(CH_CAPA_LINKED, capaNoop as EventListener);
    window.removeEventListener(CH_CAPA_EFFECTIVE, capaNoop as EventListener);
    window.removeEventListener(CH_CAPA_INEFFECTIVE, capaNoop as EventListener);
  };
}

/**
 * Outbound emit · called on NCR close when related_party_id is set.
 * Procure360's vendor-scoring engine subscribes to `qa.outcome.applied` ·
 * THIS sprint does NOT touch Procure360 code (FR-19 sibling).
 */
/**
 * α-c · Block C · D-NEW-BO · Vendor Scorecard QA dim subscription.
 * Subscribes to qa.outcome.applied + capa effective/ineffective channels and records
 * a vendor QA-dim activity row. NOTE: Procure360's vendor-scoring-engine has no public
 * `applyVendorQaDelta` mutation API today, so this subscription is observability-only:
 * the QA-dim delta is appended to a localStorage ledger that Procure360 can later
 * subscribe to (FR-19 sibling · zero touches Procure360). D-NEW-BJ adaptation #4 of 5.
 *
 * @[JWT] writes erp_vendor_qa_dim_${entityCode}
 */
export interface VendorQaDimEntry {
  vendor_id: string;
  ncr_id: string;
  severity: NcrSeverity;
  delta: number;
  applied_at: string;
  capa_effective?: boolean | null;
  entity_code: string;
}

const VENDOR_QA_DIM_KEY = (e: string): string => `erp_vendor_qa_dim_${e}`;

function appendVendorQaDim(entry: VendorQaDimEntry): void {
  if (typeof window === 'undefined') return;
  try {
    const key = VENDOR_QA_DIM_KEY(entry.entity_code);
    const raw = localStorage.getItem(key);
    const list: VendorQaDimEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift(entry);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 500)));
  } catch {
    /* silent */
  }
}

export function subscribeQaForVendorScoring(): () => void {
  if (typeof window === 'undefined') return () => { /* noop */ };

  const onQaOutcomeApplied = (e: Event): void => {
    const detail = (e as CustomEvent<QaOutcomePayload>).detail;
    if (!detail?.vendor_id) return;
    appendVendorQaDim({
      vendor_id: detail.vendor_id,
      ncr_id: detail.ncr_id,
      severity: detail.severity,
      delta: detail.quality_score_delta,
      applied_at: new Date().toISOString(),
      capa_effective: null,
      entity_code: detail.entity_code,
    });
  };

  const onCapaEffective = (e: Event): void => {
    const detail = (e as CustomEvent<{ capa_id: string; ncr_id: string }>).detail;
    if (!detail?.ncr_id) return;
    // CAPA effective · neutralize prior NCR-induced QA penalty for that NCR
    appendVendorQaDim({
      vendor_id: 'unknown',
      ncr_id: detail.ncr_id,
      severity: 'minor',
      delta: 0,
      applied_at: new Date().toISOString(),
      capa_effective: true,
      entity_code: '',
    });
  };

  const onCapaIneffective = (e: Event): void => {
    const detail = (e as CustomEvent<{ capa_id: string; ncr_id: string }>).detail;
    if (!detail?.ncr_id) return;
    appendVendorQaDim({
      vendor_id: 'unknown',
      ncr_id: detail.ncr_id,
      severity: 'minor',
      delta: 0,
      applied_at: new Date().toISOString(),
      capa_effective: false,
      entity_code: '',
    });
  };

  window.addEventListener('qa.outcome.applied', onQaOutcomeApplied);
  window.addEventListener('capa:effective:applied', onCapaEffective);
  window.addEventListener('capa:ineffective:reopened', onCapaIneffective);
  return () => {
    window.removeEventListener('qa.outcome.applied', onQaOutcomeApplied);
    window.removeEventListener('capa:effective:applied', onCapaEffective);
    window.removeEventListener('capa:ineffective:reopened', onCapaIneffective);
  };
}

export function readVendorQaDimLedger(entityCode: string): VendorQaDimEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VENDOR_QA_DIM_KEY(entityCode));
    return raw ? (JSON.parse(raw) as VendorQaDimEntry[]) : [];
  } catch {
    return [];
  }
}

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
