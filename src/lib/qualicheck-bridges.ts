/**
 * @file src/lib/qualicheck-bridges.ts
 * @purpose Inbound listener (auto-create NCR from Procure360 QA handoff) +
 *          outbound emit (apply QA outcome to Procure360 vendor scoring on close)
 *          · zero touches to Procure360 code (FR-19 sibling)
 * @who Lovable on behalf of Operix Founder
 * @when 2026-05-08
 * @sprint T-Phase-1.A.5.a-bis-QualiCheck-NCR-Foundation
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
export function mountQualiCheckBridges(): () => void {
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

/**
 * α-c-T2 · D-NEW-BV · CAPA event payloads MUST include entity_code; receivers
 * drop the row when entity_code missing (no silent sentinel writes · FR-50).
 * vendor_id is OPTIONAL on capa events (only set when CAPA's related_party_id known).
 * Receiver records ledger row only when BOTH entity_code AND vendor_id present.
 */
export interface CapaQaEventPayload {
  capa_id: string;
  ncr_id: string;
  entity_code: string;
  vendor_id?: string;
}

export function subscribeQaForVendorScoring(): () => void {
  if (typeof window === 'undefined') return () => { /* noop */ };

  const onQaOutcomeApplied = (e: Event): void => {
    const detail = (e as CustomEvent<QaOutcomePayload>).detail;
    if (!detail?.vendor_id || !detail.entity_code) return;
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

  const recordCapaOutcome = (detail: CapaQaEventPayload | undefined, effective: boolean): void => {
    if (!detail?.ncr_id) return;
    if (!detail.entity_code) return;          // D-NEW-BV · drop missing-entity events
    if (!detail.vendor_id) return;            // D-NEW-BV · no sentinel rows · vendor unknown ⇒ skip
    appendVendorQaDim({
      vendor_id: detail.vendor_id,
      ncr_id: detail.ncr_id,
      severity: 'minor',
      delta: 0,
      applied_at: new Date().toISOString(),
      capa_effective: effective,
      entity_code: detail.entity_code,
    });
  };

  const onCapaEffective = (e: Event): void =>
    recordCapaOutcome((e as CustomEvent<CapaQaEventPayload>).detail, true);
  const onCapaIneffective = (e: Event): void =>
    recordCapaOutcome((e as CustomEvent<CapaQaEventPayload>).detail, false);

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

/**
 * α-c · Block G · D-NEW-BS · MTC ↔ Production Confirmation observability bridge.
 *
 * Read-only consumer of the canonical PC localStorage ledger
 * (productionConfirmationsKey · `erp_production_confirmations_${entityCode}`).
 * Returns PC docs whose lines reference a given heat_no — used by MtcRegister to
 * surface "this material was consumed in PC-x" linkage. ZERO touches to
 * production-confirmation-engine (FR-19 sibling) · pure read.
 *
 * @[JWT] reads erp_production_confirmations_${entityCode}
 */
export interface PcMatch {
  pc_id: string;
  doc_no: string;
  confirmation_date: string;
  status: string;
  heat_no: string;
}

export function findPcMatchesForHeat(entityCode: string, heatNo: string | null | undefined): PcMatch[] {
  if (!heatNo || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`erp_production_confirmations_${entityCode}`);
    if (!raw) return [];
    const list = JSON.parse(raw) as Array<{
      id: string; doc_no: string; status: string; confirmation_date: string;
      lines?: Array<{ heat_no?: string | null }>;
    }>;
    const matches: PcMatch[] = [];
    for (const pc of list) {
      const lineHeats = (pc.lines ?? []).map((l) => l.heat_no).filter(Boolean) as string[];
      if (lineHeats.includes(heatNo)) {
        matches.push({
          pc_id: pc.id,
          doc_no: pc.doc_no,
          confirmation_date: pc.confirmation_date,
          status: pc.status,
          heat_no: heatNo,
        });
      }
    }
    return matches;
  } catch {
    return [];
  }
}

/**
 * α-d-1 · Q-LOCK-4 Path B · D-NEW-CF · Read-only consumer that surfaces JobCards
 * created in response to a given NCR (rework_qty>0 AND source_ncr_id===ncrId).
 * Zero touches to job-card-engine (FR-19 sibling).
 *
 * @[JWT] reads erp_job_cards_${entityCode}
 */
export interface ReworkJobCardMatch {
  id: string;
  job_card_no: string;
  rework_qty: number;
  started_at: string | null;
  status: string;
  source_ncr_id: string;
}

export function findReworkJobCardsForNcr(
  entityCode: string,
  ncrId: string | null | undefined,
): ReworkJobCardMatch[] {
  if (!ncrId || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`erp_job_cards_${entityCode}`);
    if (!raw) return [];
    const list = JSON.parse(raw) as Array<{
      id: string; doc_no: string; rework_qty?: number;
      source_ncr_id?: string | null; actual_start?: string | null; status: string;
    }>;
    const out: ReworkJobCardMatch[] = [];
    for (const jc of list) {
      if ((jc.rework_qty ?? 0) > 0 && jc.source_ncr_id === ncrId) {
        out.push({
          id: jc.id,
          job_card_no: jc.doc_no,
          rework_qty: jc.rework_qty ?? 0,
          started_at: jc.actual_start ?? null,
          status: jc.status,
          source_ncr_id: ncrId,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

