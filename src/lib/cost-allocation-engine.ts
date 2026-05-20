/**
 * @file        src/lib/cost-allocation-engine.ts
 * @purpose     4-method cost allocation · consumes LandedCostConfig.defaultAllocationMethod
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method
 * @decisions   EX-4-Q4=a consumes LandedCostConfig · operator override OK
 * @disciplines FR-30 · FR-50 · FR-80 exhaustive switch on method
 */
import type { CostAllocationMethod, AllocationInputLine, AllocatedCost } from '@/types/cost-allocation';

export function computeRatios(
  lines: AllocationInputLine[],
  method: CostAllocationMethod,
): number[] {
  switch (method) {
    case 'by_value': {
      const totalValue = lines.reduce((s, l) => s + l.fob_value_inr, 0);
      return totalValue > 0 ? lines.map((l) => l.fob_value_inr / totalValue) : lines.map(() => 0);
    }
    case 'by_weight': {
      const totalWeight = lines.reduce((s, l) => s + l.gross_weight_kgs, 0);
      return totalWeight > 0 ? lines.map((l) => l.gross_weight_kgs / totalWeight) : lines.map(() => 0);
    }
    case 'by_quantity': {
      const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
      return totalQty > 0 ? lines.map((l) => l.quantity / totalQty) : lines.map(() => 0);
    }
    case 'equal': {
      const ratio = lines.length > 0 ? 1 / lines.length : 0;
      return lines.map(() => ratio);
    }
    default: {
      const _exhaustive: never = method;
      return _exhaustive;
    }
  }
}

export function allocateCosts(
  lines: AllocationInputLine[],
  totals: { freight_inr: number; insurance_inr: number; cha_port_inr: number; cfs_icd_inr: number },
  method: CostAllocationMethod,
): AllocatedCost[] {
  const ratios = computeRatios(lines, method);
  return lines.map((line, i) => {
    const ratio = ratios[i] ?? 0;
    const allocated_freight_inr = totals.freight_inr * ratio;
    const allocated_insurance_inr = totals.insurance_inr * ratio;
    const allocated_cha_port_inr = totals.cha_port_inr * ratio;
    const allocated_cfs_icd_inr = totals.cfs_icd_inr * ratio;
    const total_allocated_inr =
      allocated_freight_inr + allocated_insurance_inr + allocated_cha_port_inr + allocated_cfs_icd_inr;
    return {
      line_id: line.line_id,
      line_no: line.line_no,
      item_name: line.item_name,
      allocated_freight_inr: Number(allocated_freight_inr.toFixed(2)),
      allocated_insurance_inr: Number(allocated_insurance_inr.toFixed(2)),
      allocated_cha_port_inr: Number(allocated_cha_port_inr.toFixed(2)),
      allocated_cfs_icd_inr: Number(allocated_cfs_icd_inr.toFixed(2)),
      total_allocated_inr: Number(total_allocated_inr.toFixed(2)),
      method,
      allocation_ratio: Number(ratio.toFixed(6)),
    };
  });
}
