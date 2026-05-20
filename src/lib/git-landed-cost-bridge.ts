/**
 * @file        src/lib/git-landed-cost-bridge.ts
 * @purpose     Domestic GIT polish · bridge helper · consumes existing GitStage1Record + LandedCostConfig · git-engine.ts 0-diff
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method
 * @decisions   EX-4-Q9=b bridge helper · D-284 ZERO TOUCH preserved · git-engine.ts 0-diff
 * @disciplines FR-30 · FR-50 · D-284 invariant honored
 */
import type { GitStage1Record } from '@/types/git';
import type { CostAllocationMethod, AllocationInputLine } from '@/types/cost-allocation';
import { allocateCosts } from '@/lib/cost-allocation-engine';

export function enhanceGitWithLandedCost(
  git: GitStage1Record,
  freight_inr: number,
  insurance_inr: number,
  cha_port_inr: number,
  method: CostAllocationMethod = 'by_value',
): {
  git_id: string;
  git_no: string;
  allocation_method: CostAllocationMethod;
  per_line_allocations: ReturnType<typeof allocateCosts>;
  total_landed_inr: number;
} {
  const inputLines: AllocationInputLine[] = git.lines.map((l, i) => ({
    line_id: l.id,
    line_no: i + 1,
    item_name: l.item_name,
    fob_value_inr: l.qty_accepted,
    gross_weight_kgs: l.qty_accepted,
    quantity: l.qty_accepted,
  }));

  const allocations = allocateCosts(
    inputLines,
    { freight_inr, insurance_inr, cha_port_inr, cfs_icd_inr: 0 },
    method,
  );
  const total_landed_inr = allocations.reduce((s, a) => s + a.total_allocated_inr, 0);

  return {
    git_id: git.id,
    git_no: git.git_no,
    allocation_method: method,
    per_line_allocations: allocations,
    total_landed_inr: Number(total_landed_inr.toFixed(2)),
  };
}

export function getAvailableAllocationMethods(): CostAllocationMethod[] {
  return ['by_value', 'by_weight', 'by_quantity', 'equal'];
}
