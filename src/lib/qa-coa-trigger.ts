/**
 * @file     qa-coa-trigger.ts
 * @sprint   T-Phase-1.3-3b-pre-3 · Block C · D-641
 * @purpose  Q59=c · Per-scenario CoA auto-generation rule.
 *
 * - export_oriented + third_party_agency → CoA REQUIRED · auto-generate on PASS
 * - internal_dept + customer_inspection → optional · manual button
 */
import type { QaInspectionRecord } from '@/types/qa-inspection';
import type { ProductionConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type { QCScenario } from '@/types/production-order';
import { generateAndCacheCoA } from './qa-coa-print-engine';

function getScenario(inspection: QaInspectionRecord): QCScenario | null {
  // qc_scenario propagated additively from production transactions (not declared on
  // base QaInspectionRecord type · matches PerScenarioSection access pattern).
  const raw = (inspection as unknown as { qc_scenario?: QCScenario | null }).qc_scenario;
  return raw ?? null;
}

export function shouldAutoGenerateCoA(
  inspection: QaInspectionRecord,
  productionConfig: ProductionConfig,
): boolean {
  if (!productionConfig.enableCoAAutoGeneration) return false;
  if (inspection.status !== 'passed') return false;

  const scenario = getScenario(inspection);
  return scenario === 'export_oriented' || scenario === 'third_party_agency';
}

export interface CoATriggerResult {
  triggered: boolean;
  reason: string;
  coa_url?: string | null;
}

export function triggerCoAIfApplicable(
  inspection: QaInspectionRecord,
  productionConfig: ProductionConfig,
  entityCode: string,
): CoATriggerResult {
  if (!shouldAutoGenerateCoA(inspection, productionConfig)) {
    return {
      triggered: false,
      reason: `qc_scenario=${getScenario(inspection) ?? 'null'} · Q59=c rule: not auto-generated`,
    };
  }

  const result = generateAndCacheCoA(inspection.id, entityCode);
  return {
    triggered: result.ok,
    reason: result.ok
      ? `Auto-generated (Q59=c · ${getScenario(inspection)})`
      : 'CoA generation failed',
    coa_url: result.coa_url,
  };
}
