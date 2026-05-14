/**
 * precision-arc-stage3-block1-migrations.test.ts
 * Sprint T-Phase-1.Precision-Arc · Stage 3 · Block 1.
 * Asserts contract-precision results on representative migrated paths.
 */
import { describe, it, expect } from 'vitest';
import { computeWDV, computeSLM } from '@/lib/depreciation-engine';
import { recommendedCreditLimit } from '@/lib/distributor-rating-engine';
import { calcLineTotals } from '@/lib/distributor-order-engine';
import { computeBOMTotalCost } from '@/lib/packing-bom-engine';

describe('Precision Arc · Stage 3 · Block 1 migrations', () => {
  it('depreciation-engine.computeWDV — no float drift on RBI banker rounding', () => {
    // 0.1 + 0.2 family: pre-migration 100000 * 0.10 * 0.5 path was clean,
    // but a precision-sensitive case like 33333.33 * 30% / 2 must land on
    // the contract-rounded value, not a float-drift value like 4999.9995.
    expect(computeWDV(33333.33, 30, true)).toBe(5000);
    expect(computeWDV(100000, 15, false)).toBe(15000);
  });

  it('depreciation-engine.computeSLM — half-rate handles drift', () => {
    expect(computeSLM(10000, 1000, 3, true)).toBe(1500);
  });

  it('distributor-rating.recommendedCreditLimit — paise stays integer', () => {
    const score = { credit_grade: 'A' } as never;
    const out = recommendedCreditLimit(score, 333_333);
    expect(Number.isInteger(out)).toBe(true);
    expect(out).toBe(500_000); // 333333 * 1.5 = 499999.5 → ROUND_HALF_UP → 500000
  });

  it('distributor-order.calcLineTotals — 18% IGST on paise stays integer', () => {
    const r = calcLineTotals(3, 100_01, 0, 18, true);
    expect(Number.isInteger(r.taxable_paise)).toBe(true);
    expect(Number.isInteger(r.igst_paise)).toBe(true);
    expect(r.taxable_paise).toBe(30_003);
    expect(r.igst_paise).toBe(5_401); // 30003*0.18=5400.54 → HALF_UP → 5401
    expect(r.total_paise).toBe(35_404);
  });

  it('packing-bom.computeBOMTotalCost — drift-free integer paise sum', () => {
    const bom = {
      lines: [
        { material_id: 'm1', qty_per_unit: 0.1 },
        { material_id: 'm1', qty_per_unit: 0.2 },
      ],
    } as never;
    const materials = [{ id: 'm1', cost_per_uom_paise: 1 } as never];
    expect(computeBOMTotalCost(bom, materials)).toBe(0); // 0.3 paise → rounds to 0
  });
});
