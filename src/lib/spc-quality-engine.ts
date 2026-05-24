/**
 * @file     spc-quality-engine.ts
 * @sprint   T-Phase-3.PROD-3.5.PASS2 · ST6 · 34th SIBLING ⭐
 * @purpose  Statistical Process Control engine · X-bar/R charts · Nelson 8 rules · Cpk.
 *           Q-LOCK-5 Option A · Nelson rules default with config switch.
 *           Moat 20 · SPC at SMB price.
 *           FR-19 SIBLING · FR-26 entity-scoped.
 * @[JWT]    Phase 2: POST /api/spc/chart/build
 */
import type {
  SPCDataPoint,
  SPCChartConfig,
  SPCChart,
  SPCAnalysisResult,
  SPCViolation,
  NelsonRuleId,
  SPCRuleSet,
} from '@/types/spc';
import { spcChartsKey, spcDataKey } from '@/types/spc';

const lsRead = <T>(key: string, def: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : def; } catch { return def; }
};
const lsWrite = <T>(key: string, value: T): void => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
};

function computeMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function computeStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = computeMean(values);
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(computeMean(squaredDiffs));
}

export function buildSPCChart(
  config: SPCChartConfig,
  dataPoints: SPCDataPoint[],
): SPCChart {
  const values = dataPoints.map(dp => dp.value);
  return {
    config,
    data_points: dataPoints,
    mean: computeMean(values),
    std_dev: computeStdDev(values),
    computed_at: new Date().toISOString(),
  };
}

export function computeCpk(values: number[], lsl: number, usl: number): number {
  if (values.length < 2) return 0;
  const mean = computeMean(values);
  const std_dev = computeStdDev(values);
  if (std_dev === 0) return Infinity;
  const cpk_upper = (usl - mean) / (3 * std_dev);
  const cpk_lower = (mean - lsl) / (3 * std_dev);
  return Math.min(cpk_upper, cpk_lower);
}

export function computeCp(values: number[], lsl: number, usl: number): number {
  if (values.length < 2) return 0;
  const std_dev = computeStdDev(values);
  if (std_dev === 0) return Infinity;
  return (usl - lsl) / (6 * std_dev);
}

const NELSON_RULES: Record<NelsonRuleId, { description: string; severity: 'warning' | 'critical' }> = {
  nelson_1: { description: '1 point > 3σ from center line', severity: 'critical' },
  nelson_2: { description: '9 consecutive points on same side of center line', severity: 'warning' },
  nelson_3: { description: '6 consecutive points increasing or decreasing', severity: 'warning' },
  nelson_4: { description: '14 consecutive points alternating up/down', severity: 'warning' },
  nelson_5: { description: '2 of 3 consecutive points > 2σ on same side', severity: 'warning' },
  nelson_6: { description: '4 of 5 consecutive points > 1σ on same side', severity: 'warning' },
  nelson_7: { description: '15 consecutive points within 1σ (stratification)', severity: 'warning' },
  nelson_8: { description: '8 consecutive points beyond 1σ on both sides', severity: 'warning' },
};

function detectNelsonRule1(chart: SPCChart): SPCViolation[] {
  const violations: SPCViolation[] = [];
  const threshold = 3 * chart.std_dev;
  chart.data_points.forEach((dp, idx) => {
    if (Math.abs(dp.value - chart.mean) > threshold) {
      violations.push({
        rule_id: 'nelson_1',
        description: NELSON_RULES.nelson_1.description,
        data_point_indices: [idx],
        severity: NELSON_RULES.nelson_1.severity,
        detected_at: new Date().toISOString(),
      });
    }
  });
  return violations;
}

function detectNelsonRule2(chart: SPCChart): SPCViolation[] {
  const violations: SPCViolation[] = [];
  let consecutiveAbove = 0;
  let consecutiveBelow = 0;
  let aboveStart = -1;
  let belowStart = -1;
  chart.data_points.forEach((dp, idx) => {
    if (dp.value > chart.mean) {
      if (consecutiveAbove === 0) aboveStart = idx;
      consecutiveAbove++;
      consecutiveBelow = 0;
      if (consecutiveAbove === 9) {
        violations.push({
          rule_id: 'nelson_2',
          description: NELSON_RULES.nelson_2.description,
          data_point_indices: Array.from({ length: 9 }, (_, i) => aboveStart + i),
          severity: NELSON_RULES.nelson_2.severity,
          detected_at: new Date().toISOString(),
        });
      }
    } else if (dp.value < chart.mean) {
      if (consecutiveBelow === 0) belowStart = idx;
      consecutiveBelow++;
      consecutiveAbove = 0;
      if (consecutiveBelow === 9) {
        violations.push({
          rule_id: 'nelson_2',
          description: NELSON_RULES.nelson_2.description,
          data_point_indices: Array.from({ length: 9 }, (_, i) => belowStart + i),
          severity: NELSON_RULES.nelson_2.severity,
          detected_at: new Date().toISOString(),
        });
      }
    } else {
      consecutiveAbove = 0;
      consecutiveBelow = 0;
    }
  });
  return violations;
}

function detectNelsonRule3(chart: SPCChart): SPCViolation[] {
  const violations: SPCViolation[] = [];
  for (let i = 5; i < chart.data_points.length; i++) {
    const window = chart.data_points.slice(i - 5, i + 1);
    const allInc = window.every((dp, j) => j === 0 || dp.value > window[j - 1].value);
    const allDec = window.every((dp, j) => j === 0 || dp.value < window[j - 1].value);
    if (allInc || allDec) {
      violations.push({
        rule_id: 'nelson_3',
        description: NELSON_RULES.nelson_3.description,
        data_point_indices: Array.from({ length: 6 }, (_, j) => i - 5 + j),
        severity: NELSON_RULES.nelson_3.severity,
        detected_at: new Date().toISOString(),
      });
    }
  }
  return violations;
}

function detectNelsonRule5(chart: SPCChart): SPCViolation[] {
  const violations: SPCViolation[] = [];
  const sigma2_upper = chart.mean + 2 * chart.std_dev;
  const sigma2_lower = chart.mean - 2 * chart.std_dev;
  for (let i = 2; i < chart.data_points.length; i++) {
    const window = chart.data_points.slice(i - 2, i + 1);
    const aboveCount = window.filter(dp => dp.value > sigma2_upper).length;
    const belowCount = window.filter(dp => dp.value < sigma2_lower).length;
    if (aboveCount >= 2 || belowCount >= 2) {
      violations.push({
        rule_id: 'nelson_5',
        description: NELSON_RULES.nelson_5.description,
        data_point_indices: Array.from({ length: 3 }, (_, j) => i - 2 + j),
        severity: NELSON_RULES.nelson_5.severity,
        detected_at: new Date().toISOString(),
      });
    }
  }
  return violations;
}

function detectNelsonRule6(chart: SPCChart): SPCViolation[] {
  const violations: SPCViolation[] = [];
  const sigma1_upper = chart.mean + chart.std_dev;
  const sigma1_lower = chart.mean - chart.std_dev;
  for (let i = 4; i < chart.data_points.length; i++) {
    const window = chart.data_points.slice(i - 4, i + 1);
    const aboveCount = window.filter(dp => dp.value > sigma1_upper).length;
    const belowCount = window.filter(dp => dp.value < sigma1_lower).length;
    if (aboveCount >= 4 || belowCount >= 4) {
      violations.push({
        rule_id: 'nelson_6',
        description: NELSON_RULES.nelson_6.description,
        data_point_indices: Array.from({ length: 5 }, (_, j) => i - 4 + j),
        severity: NELSON_RULES.nelson_6.severity,
        detected_at: new Date().toISOString(),
      });
    }
  }
  return violations;
}

/** Rules 4, 7, 8 stubs · documented · implement in PROD-5 polish. */

export function detectViolations(chart: SPCChart, ruleSet?: SPCRuleSet): SPCViolation[] {
  const effective = ruleSet ?? chart.config.rule_set ?? 'nelson';
  const violations: SPCViolation[] = [];
  if (effective === 'nelson' || effective === 'both') {
    violations.push(...detectNelsonRule1(chart));
    violations.push(...detectNelsonRule2(chart));
    violations.push(...detectNelsonRule3(chart));
    violations.push(...detectNelsonRule5(chart));
    violations.push(...detectNelsonRule6(chart));
  }
  return violations;
}

export function analyzeSPC(chart: SPCChart): SPCAnalysisResult {
  const violations = detectViolations(chart);
  const values = chart.data_points.map(dp => dp.value);
  const cpk = computeCpk(values, chart.config.lower_spec_limit, chart.config.upper_spec_limit);
  const cp = computeCp(values, chart.config.lower_spec_limit, chart.config.upper_spec_limit);

  let trend: 'stable' | 'rising' | 'falling' | 'unstable' = 'stable';
  if (values.length >= 5) {
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = computeMean(values);
    let num = 0;
    let den = 0;
    values.forEach((y, i) => {
      num += (i - xMean) * (y - yMean);
      den += Math.pow(i - xMean, 2);
    });
    const slope = den === 0 ? 0 : num / den;
    if (slope > chart.std_dev / n) trend = 'rising';
    else if (slope < -chart.std_dev / n) trend = 'falling';
  }
  if (violations.length > values.length * 0.2) trend = 'unstable';

  const ppm = chart.std_dev === 0 ? 0 : Math.round((1 - cpk) * 1_000_000);

  return {
    chart_id: `spc-${chart.config.parameter}-${Date.now()}`,
    parameter: chart.config.parameter,
    in_control: violations.filter(v => v.severity === 'critical').length === 0,
    violations,
    cpk,
    cp,
    ppm: Math.max(0, ppm),
    trend,
    sample_count: values.length,
  };
}

export function persistSPCChart(entityCode: string, chart: SPCChart): void {
  const all = lsRead<SPCChart[]>(spcChartsKey(entityCode), []);
  all.unshift(chart);
  lsWrite(spcChartsKey(entityCode), all.slice(0, 100));
}

export function listSPCCharts(entityCode: string): SPCChart[] {
  return lsRead<SPCChart[]>(spcChartsKey(entityCode), []);
}

export function recordSPCDataPoint(entityCode: string, dp: SPCDataPoint): void {
  const all = lsRead<SPCDataPoint[]>(spcDataKey(entityCode), []);
  all.unshift(dp);
  lsWrite(spcDataKey(entityCode), all.slice(0, 10000));
}

export function listSPCDataByParameter(entityCode: string, parameter: string): SPCDataPoint[] {
  return lsRead<SPCDataPoint[]>(spcDataKey(entityCode), []).filter(dp => dp.parameter === parameter);
}
