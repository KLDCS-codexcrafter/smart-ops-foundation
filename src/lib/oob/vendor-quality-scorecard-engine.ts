/**
 * @file        vendor-quality-scorecard-engine.ts
 * @sprint      T-Phase-1.2.6f-d-2-card5-5-pre-2 · Block D · D-340 (Q3=a)
 * @purpose     OOB-58 Vendor Quality Scorecard · 5-metric pure-query thin-wrapper.
 *              Mirrors contract-expiry-alerts D-291 OOB-54 thin-wrapper precedent.
 *              NO new storage · all metrics computed from existing QaInspection records.
 * @disciplines pure function · no useMemo · no [tick, setTick] anti-pattern
 * @[JWT]       GET /api/qa/vendor-scorecard
 */

import { listQaInspections } from '@/lib/qa-inspection-engine';
import type { QaInspectionRecord } from '@/types/qa-inspection';

export interface VendorScorecardMetrics {
  vendor_id: string;
  vendor_name: string;
  total_inspections: number;
  total_qty_inspected: number;
  total_qty_passed: number;
  total_qty_failed: number;
  acceptance_rate_pct: number;
  rejection_rate_pct: number;
  critical_defect_rate_pct: number;
  avg_external_lab_tat_days: number | null;
  sample_bulk_discrepancy_count: number;
}

const pct = (n: number, d: number): number =>
  d === 0 ? 0 : Math.round((n / d) * 1000) / 10;

export function computeVendorScorecard(entityCode: string): VendorScorecardMetrics[] {
  const all = listQaInspections(entityCode);
  const byVendor = new Map<string, QaInspectionRecord[]>();

  for (const ins of all) {
    const vid = ins.vendor_id ?? null;
    if (!vid) continue;
    const arr = byVendor.get(vid) ?? [];
    arr.push(ins);
    byVendor.set(vid, arr);
  }

  const out: VendorScorecardMetrics[] = [];
  for (const [vid, list] of byVendor.entries()) {
    const vname = list[0]?.vendor_name ?? 'Unknown';
    let totalInspected = 0, totalPassed = 0, totalFailed = 0;
    let critTotal = 0, critFailed = 0;
    let labTatSum = 0, labTatCount = 0;
    let discrepancyCount = 0;

    for (const ins of list) {
      const line = ins.lines?.[0];
      if (line) {
        totalInspected += line.qty_inspected ?? 0;
        totalPassed += line.qty_passed ?? 0;
        totalFailed += line.qty_failed ?? 0;
      }
      const params = ins.parameter_results ?? {};
      for (const result of Object.values(params)) {
        critTotal++;
        if (typeof result === 'string' && result === 'fail') critFailed++;
      }
      if (ins.inspection_authority === 'external_lab'
          && ins.external_lab_sample_sent_date && ins.external_lab_report_received_date) {
        const sent = new Date(ins.external_lab_sample_sent_date).getTime();
        const received = new Date(ins.external_lab_report_received_date).getTime();
        if (!Number.isNaN(sent) && !Number.isNaN(received) && received >= sent) {
          labTatSum += (received - sent) / (1000 * 60 * 60 * 24);
          labTatCount++;
        }
      }
      if ((line?.qty_sample ?? 0) > 0 && (line?.qty_failed ?? 0) > 0) discrepancyCount++;
    }

    out.push({
      vendor_id: vid,
      vendor_name: vname,
      total_inspections: list.length,
      total_qty_inspected: totalInspected,
      total_qty_passed: totalPassed,
      total_qty_failed: totalFailed,
      acceptance_rate_pct: pct(totalPassed, totalInspected),
      rejection_rate_pct: pct(totalFailed, totalInspected),
      critical_defect_rate_pct: pct(critFailed, critTotal),
      avg_external_lab_tat_days: labTatCount > 0
        ? Math.round((labTatSum / labTatCount) * 10) / 10
        : null,
      sample_bulk_discrepancy_count: discrepancyCount,
    });
  }

  return out.sort((a, b) => a.acceptance_rate_pct - b.acceptance_rate_pct);
}
