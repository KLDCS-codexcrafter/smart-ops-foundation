/**
 * @file        src/types/cost-allocation.ts
 * @purpose     4-method cost allocation · consumes LandedCostConfig.defaultAllocationMethod
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method
 * @decisions   EX-4-Q4=a engine consumes LandedCostConfig · per-GIT override allowed
 * @disciplines FR-30 · FR-50 · FR-80 exhaustive switch
 */

export type CostAllocationMethod = 'by_value' | 'by_weight' | 'by_quantity' | 'equal';

export const COST_ALLOCATION_DESCRIPTIONS: Record<CostAllocationMethod, string> = {
  by_value: 'Distribute costs proportional to line FOB value · highest value lines absorb most cost',
  by_weight: 'Distribute costs proportional to gross weight · heavy lines absorb most cost',
  by_quantity: 'Distribute costs proportional to qty units · high-volume lines absorb most cost',
  equal: 'Distribute costs equally across all lines · uniform per-line absorption',
};

export interface AllocationInputLine {
  line_id: string;
  line_no: number;
  item_name: string;
  fob_value_inr: number;
  gross_weight_kgs: number;
  quantity: number;
}

export interface AllocatedCost {
  line_id: string;
  line_no: number;
  item_name: string;

  allocated_freight_inr: number;
  allocated_insurance_inr: number;
  allocated_cha_port_inr: number;
  allocated_cfs_icd_inr: number;
  total_allocated_inr: number;

  method: CostAllocationMethod;
  allocation_ratio: number;
}
