import { describe, it, expect, beforeEach } from 'vitest';
import {
  closeProductionForFY,
  snapshotProductionWIPAtFYEnd,
  freezeOpenVariancesAtFYEnd,
  generateOpeningWIPForNextFY,
  listFYClosureSummaries,
} from '@/lib/fy-close-engine';
import { buildFiscalYear, writeFiscalYears } from '@/lib/fiscal-year-engine';

// Sprint T-Phase-3.PROD-FIX-A · PASS 2B-ii · ST17
// Note: freezeProductionVariance signature is (entityCode, poId, user) per
// production-variance-engine.ts:348 (corrected from earlier spec).
describe('fy-close-engine · Sprint 58 PASS 2B-ii ST17', () => {
  const E = 'TEST';
  const user = { id: 'u1', name: 'Test User' };

  beforeEach(() => {
    localStorage.clear();
  });

  it('snapshotProductionWIPAtFYEnd creates fy_end_manual triggered snapshot', () => {
    const snapshot = snapshotProductionWIPAtFYEnd(E, 'FY-2024-25', user);
    expect(snapshot.trigger).toBe('fy_end_manual');
    expect(snapshot.fiscal_year_id).toBe('FY-2024-25');
  });

  it('freezeOpenVariancesAtFYEnd returns count (0 if no variances exist)', () => {
    const count = freezeOpenVariancesAtFYEnd(E, user);
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('generateOpeningWIPForNextFY returns taggedPOIds array', () => {
    const result = generateOpeningWIPForNextFY(E, 'FY-2024-25', 'wipr-test');
    expect(Array.isArray(result.taggedPOIds)).toBe(true);
  });

  it('closeProductionForFY orchestrates all 3 sub-operations + records summary', () => {
    const fy = buildFiscalYear(2024, 4);
    fy.id = 'FY-2024-25';
    writeFiscalYears(E, [fy]);
    const summary = closeProductionForFY(E, 'FY-2024-25', user);
    expect(summary.entity_code).toBe(E);
    expect(summary.fiscal_year_id).toBe('FY-2024-25');
    expect(summary.closed_by).toEqual(user);
    expect(summary.wip_snapshot_id).toBeDefined();
    expect(summary.id).toMatch(/^fyc-/);
  });

  it('closeProductionForFY throws when FY not found', () => {
    expect(() => closeProductionForFY(E, 'FY-NONEXIST', user)).toThrow();
  });

  it('listFYClosureSummaries returns persisted closures after orchestration', () => {
    const fy = buildFiscalYear(2024, 4);
    fy.id = 'FY-2024-25';
    writeFiscalYears(E, [fy]);
    closeProductionForFY(E, 'FY-2024-25', user);
    const summaries = listFYClosureSummaries(E);
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries[0].fiscal_year_id).toBe('FY-2024-25');
  });
});
