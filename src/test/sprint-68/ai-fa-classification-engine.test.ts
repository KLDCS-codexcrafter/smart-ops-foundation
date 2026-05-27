/**
 * Sprint 68 FAR-4 · Block 16 · ai-fa-classification-engine smoke tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  classifyFA,
  acceptSuggestion,
  teachModel,
  detectCustodianDrift,
} from '@/lib/ai-fa-classification-engine';
import type { AssetUnitRecord, IoTSignal } from '@/types/fixed-asset';

const STUB_REC = { asset_id: 'a1', custodian_employee_id: 'e1' } as unknown as AssetUnitRecord;

describe('ai-fa-classification-engine · keyword classifier', () => {
  beforeEach(() => localStorage.clear());

  it('classifies CNC machine into PLANT_MACHINERY with non-zero confidence', () => {
    const r = classifyFA('Brand-new CNC lathe machine for press shop');
    expect(r.suggested_category).toBe('PLANT_MACHINERY');
    expect(r.confidence).toBeGreaterThan(0);
  });

  it('returns UNCLASSIFIED for empty description', () => {
    const r = classifyFA('');
    expect(r.suggested_category).toBe('UNCLASSIFIED');
    expect(r.confidence).toBe(0);
  });

  it('classifies invoice line-items array', () => {
    const r = classifyFA('Asset', ['Dell laptop 14-inch', 'wireless mouse']);
    expect(r.suggested_category).toBe('COMPUTERS_PERIPHERALS');
  });

  it('teachModel adds keyword that classifier picks up', () => {
    teachModel('TOOLS_DIES_FIXTURES', 'sprint68-custom-die');
    const r = classifyFA('Procured sprint68-custom-die for stamping');
    expect(r.suggested_category).toBe('TOOLS_DIES_FIXTURES');
  });

  it('acceptSuggestion returns record with ai_classification fields', () => {
    const out = acceptSuggestion(STUB_REC, 'OFFICE_EQUIPMENT', 0.82);
    expect(out.ai_classification_suggestion).toBe('OFFICE_EQUIPMENT');
    expect(out.ai_classification_confidence).toBeCloseTo(0.82);
  });

  it('detectCustodianDrift returns insufficient-signals path for empty signals', () => {
    const drift = detectCustodianDrift(STUB_REC, [] as IoTSignal[]);
    expect(drift.is_drift).toBe(false);
    expect(drift.drift_score).toBe(0);
  });
});
