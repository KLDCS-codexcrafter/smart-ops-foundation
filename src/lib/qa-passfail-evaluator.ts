/**
 * @file     qa-passfail-evaluator.ts
 * @sprint   T-Phase-1.3-3b-pre-2 · Block B · D-627
 * @purpose  Q54=a polymorphic Pass/Fail evaluation (3 modes · single SoT).
 */
import type { QaInspectionRecord } from '@/types/qa-inspection';
import type { ItemQCParam } from '@/types/item-qc-param';
import type { PassFailMode, PassFailResult } from '@/types/qc-entry-mode';
import { round2 } from '@/lib/decimal-helpers';

export function evaluatePassFail(
  inspection: QaInspectionRecord,
  mode: PassFailMode,
  itemQCParams: ItemQCParam[],
): PassFailResult {
  switch (mode) {
    case 'per_param_and': return evaluatePerParamAnd(inspection);
    case 'weighted_score': return evaluateWeightedScore(inspection, itemQCParams);
    case 'per_param_or': return evaluatePerParamOr(inspection);
  }
}

function evaluatePerParamAnd(inspection: QaInspectionRecord): PassFailResult {
  const failedLines = inspection.lines.filter(l => l.qty_failed > 0);
  const overall: 'pass' | 'fail' = failedLines.length === 0 ? 'pass' : 'fail';
  const reasons: string[] = [];
  if (overall === 'fail') {
    reasons.push(`${failedLines.length} line(s) with failures`);
    for (const l of failedLines) {
      if (l.failure_reason) reasons.push(`${l.item_name}: ${l.failure_reason}`);
    }
  } else {
    reasons.push('All lines passed (per_param_and)');
  }
  return { overall, mode: 'per_param_and', reasons, failed_lines_count: failedLines.length };
}

function evaluateWeightedScore(
  inspection: QaInspectionRecord,
  itemQCParams: ItemQCParam[],
): PassFailResult {
  let totalWeight = 0;
  let weightedPass = 0;
  const failedCritical: string[] = [];

  for (const line of inspection.lines) {
    const total = line.qty_passed + line.qty_failed;
    if (total === 0) continue;
    const itemParams = itemQCParams.filter(p => p.item_id === line.item_id);
    const hasCritical = itemParams.some(p => p.is_critical);
    const weight = hasCritical ? 2 : 1;
    const passRate = line.qty_passed / total;
    weightedPass += passRate * weight;
    totalWeight += weight;
    if (hasCritical && line.qty_failed > 0) failedCritical.push(line.item_name);
  }

  const score = totalWeight > 0 ? round2((weightedPass / totalWeight) * 100) : 0;
  const overall: 'pass' | 'fail' = score >= 80 ? 'pass' : 'fail';
  const reasons: string[] = [`Weighted score: ${score}% (threshold 80%)`];
  if (failedCritical.length > 0) reasons.push(`Critical failures: ${failedCritical.join(', ')}`);

  return {
    overall,
    mode: 'weighted_score',
    reasons,
    weighted_score: score,
    failed_critical_params: failedCritical,
  };
}

function evaluatePerParamOr(inspection: QaInspectionRecord): PassFailResult {
  const passedLines = inspection.lines.filter(l => l.qty_passed > 0);
  const overall: 'pass' | 'fail' = passedLines.length > 0 ? 'pass' : 'fail';
  const reasons: string[] = [];
  if (overall === 'pass') {
    reasons.push(`${passedLines.length} line(s) passed (lenient mode)`);
  } else {
    reasons.push('No lines passed inspection (per_param_or)');
  }
  return { overall, mode: 'per_param_or', reasons, passed_lines_count: passedLines.length };
}
