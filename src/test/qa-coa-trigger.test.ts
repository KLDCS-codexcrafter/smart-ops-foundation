/**
 * @file     qa-coa-trigger.test.ts
 * @sprint   T-Phase-1.3-3b-pre-3 · Block L · D-650 · Q59=c per-scenario CoA
 */
import { describe, it, expect } from 'vitest';
import { shouldAutoGenerateCoA } from '@/lib/qa-coa-trigger';
import type { QaInspectionRecord } from '@/types/qa-inspection';
import {
  DEFAULT_PRODUCTION_CONFIG, type ProductionConfig,
} from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';

function ins(qcScenario: string | null, status: QaInspectionRecord['status'] = 'passed'): QaInspectionRecord {
  const r: QaInspectionRecord = {
    id: 'qa-t', qa_no: 'QA/T/0001',
    bill_id: 'b', bill_no: 'B', git_id: null, po_id: 'p', po_no: 'P',
    entity_id: 'E', branch_id: null, inspector_user_id: 'u', inspection_date: '2026-05-05',
    inspection_location: 'F', lines: [], status, notes: '',
    created_at: '', updated_at: '',
  };
  return { ...r, ...(qcScenario !== null ? { qc_scenario: qcScenario } : {}) } as QaInspectionRecord;
}

const cfgOn: ProductionConfig = { ...DEFAULT_PRODUCTION_CONFIG, enableCoAAutoGeneration: true };
const cfgOff: ProductionConfig = { ...DEFAULT_PRODUCTION_CONFIG, enableCoAAutoGeneration: false };

describe('qa-coa-trigger · Q59=c · 3b-pre-3', () => {
  it('Test 4 · export_oriented + PASS · auto = true', () => {
    expect(shouldAutoGenerateCoA(ins('export_oriented'), cfgOn)).toBe(true);
  });

  it('Test 5 · third_party_agency + PASS · auto = true', () => {
    expect(shouldAutoGenerateCoA(ins('third_party_agency'), cfgOn)).toBe(true);
  });

  it('Test 6 · internal_dept + PASS · auto = false (manual button)', () => {
    expect(shouldAutoGenerateCoA(ins('internal_dept'), cfgOn)).toBe(false);
    // master toggle off blocks all
    expect(shouldAutoGenerateCoA(ins('export_oriented'), cfgOff)).toBe(false);
    // FAIL never auto
    expect(shouldAutoGenerateCoA(ins('export_oriented', 'failed'), cfgOn)).toBe(false);
  });
});
