/**
 * @file     qa-pareto-engine.ts
 * @sprint   T-Phase-1.3-3b-pre-3 · Block B · D-640
 * @purpose  Q60=c · 4 polymorphic Pareto grouping modes · cumulative_pct after sort.
 */
import type { QaInspectionRecord } from '@/types/qa-inspection';
import type { ParetoBin, ParetoData, ParetoGroupingMode, QCTrendPoint } from '@/types/qc-dashboard-mode';

function isFinalized(s: QaInspectionRecord['status']): boolean {
  return s === 'passed' || s === 'failed' || s === 'partial_pass';
}

export function computeParetoData(
  inspections: QaInspectionRecord[],
  mode: ParetoGroupingMode,
): ParetoData {
  const groups = new Map<string, { label: string; pass: number; fail: number }>();

  for (const ins of inspections) {
    if (!isFinalized(ins.status)) continue;

    if (mode === 'per_parameter') {
      for (const line of ins.lines) {
        const params = line.inspection_parameters ?? {};
        for (const [key, value] of Object.entries(params)) {
          if (!value) continue;
          const passed = value === 'pass' || value === 'ok' || value === 'true';
          const g = groups.get(key) ?? { label: key, pass: 0, fail: 0 };
          if (passed) g.pass += 1; else g.fail += 1;
          groups.set(key, g);
        }
      }
    } else if (mode === 'per_item') {
      for (const line of ins.lines) {
        const k = line.item_id;
        const g = groups.get(k) ?? { label: line.item_name ?? k, pass: 0, fail: 0 };
        g.pass += line.qty_passed;
        g.fail += line.qty_failed;
        groups.set(k, g);
      }
    } else if (mode === 'per_machine') {
      if (!ins.machine_id) continue;
      const km = ins.machine_id;
      const gm = groups.get(km) ?? { label: km, pass: 0, fail: 0 };
      if (ins.status === 'passed') gm.pass += 1; else gm.fail += 1;
      groups.set(km, gm);
    } else if (mode === 'per_inspector') {
      if (!ins.inspector_user_id) continue;
      const ki = ins.inspector_user_id;
      const gi = groups.get(ki) ?? { label: ki, pass: 0, fail: 0 };
      if (ins.status === 'passed') gi.pass += 1; else gi.fail += 1;
      groups.set(ki, gi);
    }
  }

  const bins: ParetoBin[] = Array.from(groups.entries()).map(([key, g]) => ({
    key,
    label: g.label,
    fail_count: g.fail,
    total_count: g.pass + g.fail,
    fail_rate_pct: g.pass + g.fail > 0 ? Math.round((g.fail / (g.pass + g.fail)) * 1000) / 10 : 0,
  }));
  bins.sort((a, b) => b.fail_count - a.fail_count);

  const totalFailures = bins.reduce((s, b) => s + b.fail_count, 0);
  let cumulative = 0;
  for (const bin of bins) {
    cumulative += bin.fail_count;
    bin.cumulative_pct = totalFailures > 0 ? Math.round((cumulative / totalFailures) * 1000) / 10 : 0;
  }

  const totalInspections = bins.reduce((s, b) => s + b.total_count, 0);

  return {
    bins,
    total_inspections: totalInspections,
    total_failures: totalFailures,
    overall_fail_rate_pct: totalInspections > 0 ? Math.round((totalFailures / totalInspections) * 1000) / 10 : 0,
    grouping_mode: mode,
  };
}

export function computeQCTrend(
  inspections: QaInspectionRecord[],
  daysBack: number = 30,
): QCTrendPoint[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const dailyMap = new Map<string, { pass: number; fail: number }>();

  for (const ins of inspections) {
    if (!isFinalized(ins.status)) continue;
    const date = (ins.inspection_date ?? '').slice(0, 10);
    if (!date || date < cutoffStr) continue;

    const day = dailyMap.get(date) ?? { pass: 0, fail: 0 };
    if (ins.status === 'passed') day.pass += 1;
    else if (ins.status === 'failed') day.fail += 1;
    else {
      // partial_pass · count both
      day.pass += 1;
    }
    dailyMap.set(date, day);
  }

  return Array.from(dailyMap.entries())
    .map(([date, d]) => ({
      date,
      pass_count: d.pass,
      fail_count: d.fail,
      total_count: d.pass + d.fail,
      pass_rate_pct: d.pass + d.fail > 0 ? Math.round((d.pass / (d.pass + d.fail)) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
