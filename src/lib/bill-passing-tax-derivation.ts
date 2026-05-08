/**
 * @file        bill-passing-tax-derivation.ts
 * @purpose     Thin facade · consumes finance-pi-bridge for GST/TDS/RCM derivation.
 *              Single entrypoint `deriveAllTaxes` for engine + UI · no parallel types.
 * @who         Procurement · Bill Passing engine · UI tax chips · reports
 * @when        Sprint T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring · Block A
 * @sprint      T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring
 * @iso         25010 · Maintainability · single source of truth
 * @decisions   D-NEW-AI (cached tax derivation · wired) · D-NEW-AL (T-fix · consume bridge proper)
 * @reuses      finance-pi-bridge.computeGstBreakdown · computeTds · computeRcm
 * @[JWT]       n/a (pure compute · delegates to bridge)
 */

import type { BillPassingLine, BillPassingRecord } from '@/types/bill-passing';
import {
  computeGstBreakdown,
  computeTds,
  computeRcm,
} from './finance-pi-bridge';

export type { GstBreakdown, TdsBreakdown, RcmBreakdown } from './finance-pi-bridge';
import type { GstBreakdown, TdsBreakdown, RcmBreakdown } from './finance-pi-bridge';

/**
 * Derive GST · TDS · RCM in one call · paise-precise via bridge functions.
 * `billRecord` is forwarded to RCM detection · only `vendor_gstin` is read today
 * (bridge contract may evolve · this wrapper insulates callers).
 */
export function deriveAllTaxes(
  lines: BillPassingLine[],
  vendorGstin: string,
  entityGstin: string,
  billRecord: BillPassingRecord,
  tdsSection: string = '194Q',
): { gst: GstBreakdown; tds: TdsBreakdown; rcm: RcmBreakdown } {
  const gst = computeGstBreakdown(lines, vendorGstin, entityGstin);
  const tds = computeTds(gst.basic, tdsSection);
  const rcm = computeRcm(billRecord);
  return { gst, tds, rcm };
}
