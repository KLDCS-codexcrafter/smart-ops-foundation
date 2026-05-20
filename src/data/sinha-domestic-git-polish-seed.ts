/**
 * @file        src/data/sinha-domestic-git-polish-seed.ts
 * @purpose     2 domestic GIT polish examples · proves Q9 git-landed-cost-bridge wiring
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method
 */
import type { CostAllocationMethod } from '@/types/cost-allocation';

export interface DomesticGITPolishDemo {
  demo_id: string;
  git_id: string;
  git_no: string;
  freight_inr: number;
  insurance_inr: number;
  cha_port_inr: number;
  method: CostAllocationMethod;
  notes: string;
}

export const SINHA_DOMESTIC_GIT_POLISH_DEMOS: DomesticGITPolishDemo[] = [
  {
    demo_id: 'dgp-001',
    git_id: 'git-sinha-domestic-001',
    git_no: 'GIT-SINHA-2026-D-001',
    freight_inr: 15000,
    insurance_inr: 2000,
    cha_port_inr: 5000,
    method: 'by_value',
    notes: 'Domestic GIT of TMT bars from local supplier · 5-line PO · by_value allocation',
  },
  {
    demo_id: 'dgp-002',
    git_id: 'git-sinha-domestic-002',
    git_no: 'GIT-SINHA-2026-D-002',
    freight_inr: 8000,
    insurance_inr: 1200,
    cha_port_inr: 0,
    method: 'by_weight',
    notes: 'Domestic GIT of steel coils · weight-heavy cargo · by_weight allocation preferred',
  },
];
