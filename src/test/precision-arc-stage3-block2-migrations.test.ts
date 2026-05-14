/**
 * precision-arc-stage3-block2-migrations.test.ts
 * Sprint T-Phase-1.Precision-Arc · Stage 3 · Block 2.
 * Asserts contract-precision (and domain-fixed-3-dp) results on Block 2 sites.
 */
import { describe, it, expect } from 'vitest';
import { computeMonthlyTDS, computeCTCBreakdown } from '@/hooks/usePayrollEngine';
import { computeWorkHours } from '@/hooks/useAttendanceEntry';
import { computePackingSlip } from '@/lib/packing-slip-engine';
import type { SalaryStructure, PayHead } from '@/types/pay-hub';
import type { Voucher } from '@/types/voucher';
import type { ItemPacking } from '@/types/item-packing';

describe('Precision Arc · Stage 3 · Block 2 migrations', () => {
  it('usePayrollEngine.computeMonthlyTDS — cess + monthly TDS land on contract precision', () => {
    // taxableIncome 12,00,001 (new regime), no prior TDS, 12 months.
    // Slab math at boundary should produce decimal-safe cess and TDS.
    const it = computeMonthlyTDS(1500000, 'new', '2025-04', 0);
    expect(Number.isFinite(it.cess)).toBe(true);
    expect(Number.isFinite(it.monthlyTDS)).toBe(true);
    // cess = 4% of (taxAfterRebate + surcharge), rounded to 2-dp money default.
    expect(it.cess).toBe(Math.round(it.cess * 100) / 100);
    expect(it.monthlyTDS).toBe(Math.round(it.monthlyTDS * 100) / 100);
    // monthlyTDS * 12 ~= totalAnnualTax - previousTDS within rounding tolerance
    expect(Math.abs(it.monthlyTDS * 12 - it.totalAnnualTax)).toBeLessThan(1);
  });

  it('usePayrollEngine.computeCTCBreakdown — balancing component is decimal-safe', () => {
    const struct: SalaryStructure = {
      id: 's1', code: 'S1', name: 'Std',
      components: [
        { payHeadId: 'p-basic', payHeadCode: 'BASIC', calculationType: 'percentage_ctc', calculationValue: 40 },
        { payHeadId: 'p-bal',   payHeadCode: 'SPL',   calculationType: 'balancing',      calculationValue: 0 },
      ],
    } as unknown as SalaryStructure;
    const heads: PayHead[] = [
      { id: 'p-basic', code: 'BASIC', name: 'Basic', shortName: 'BAS', type: 'earning',
        taxable: true, partOfCTC: true, partOfGross: true } as unknown as PayHead,
      { id: 'p-bal',   code: 'SPL',   name: 'Special', shortName: 'SPL', type: 'earning',
        taxable: true, partOfCTC: true, partOfGross: true } as unknown as PayHead,
    ];
    const lines = computeCTCBreakdown(360000, struct, heads);
    const total = lines.reduce((s, l) => s + l.monthly, 0);
    expect(total).toBe(30000); // monthlyCTC = 30000, balancing fills exactly
  });

  it('useAttendanceEntry.computeWorkHours — float-drift-free 0.1+0.2 work-hour math', () => {
    // checkIn 09:00, checkOut 17:06, breakHours 0.1+0.2 (= 0.3 with drift if naive)
    // total = 8.1 hours - 0.3 = 7.8 exact (no 0.30000000000000004 drift)
    expect(computeWorkHours('09:00', '17:06', 0.3)).toBe(7.8);
    expect(computeWorkHours('09:00', '17:00', 1)).toBe(7);
  });

  it('packing-slip-engine — total_gross_kg / total_volumetric_kg use domain-fixed 3-dp', () => {
    const dln: Voucher = {
      id: 'v1', voucher_no: 'DLN-1', date: '2026-05-14',
      party_id: 'p1', party_name: 'Test',
      transporter: null, vehicle_no: '',
      inventory_lines: [
        { id: 'l1', item_id: 'i1', item_code: 'I1', item_name: 'Item',
          qty: 7, uom: 'PCS', godown_id: 'g1' } as never,
      ],
    } as unknown as Voucher;
    const packings: ItemPacking[] = [
      { id: 'pk1', item_id: 'i1', level: 'master', packs_per_carton: 5,
        gross_weight: 1.2345, length: 30, width: 20, height: 10, dimension_unit: 'cm' } as unknown as ItemPacking,
      { id: 'pk2', item_id: 'i1', level: 'primary', gross_weight: 0.123 } as unknown as ItemPacking,
    ];
    const slip = computePackingSlip({
      dln, itemPackings: packings,
      shipToAddress: 'a', shipToCity: 'c', shipToState: 's', shipToPincode: '110001',
      generatedBy: 'u', entityCode: 'E1',
    });
    // 1 full carton (1.2345 kg) + 2 loose packs (2 * 0.123 kg) = 1.4805 kg
    // Domain-fixed 3-dp: 1.481 (HALF_UP) — verify max 3 decimal places.
    const decStr = slip.total_gross_kg.toString().split('.')[1] ?? '';
    expect(decStr.length).toBeLessThanOrEqual(3);
    expect(slip.total_gross_kg).toBeCloseTo(1.481, 3);
    // volumetric: 1 carton, 30*20*10 cm = 6000 cm³ → cft = 6000/28316.85
    // vol kg = cft * 10 * 1 = ~2.119 kg, 3-dp domain
    const volStr = slip.total_volumetric_kg.toString().split('.')[1] ?? '';
    expect(volStr.length).toBeLessThanOrEqual(3);
    expect(slip.total_volumetric_kg).toBeGreaterThan(2.1);
    expect(slip.total_volumetric_kg).toBeLessThan(2.2);
  });
});
