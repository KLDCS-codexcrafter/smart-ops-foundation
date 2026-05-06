/**
 * @file     ProductionSidebar.groups.ts
 * @sprint   T-Phase-1.3-3a-pre-1
 */
import type { ProductionModule } from './ProductionSidebar.types';

export interface ProductionGroup {
  id: string;
  label: string;
  modules: { id: ProductionModule; label: string }[];
}

export const PRODUCTION_GROUPS: ProductionGroup[] = [
  {
    id: 'transactions', label: 'Transactions',
    modules: [
      { id: 'tx-production-plan-entry', label: 'Production Plan' },
      { id: 'tx-production-order-entry', label: 'Production Order Entry' },
      { id: 'tx-material-issue', label: 'Material Issue Note' },
      { id: 'tx-production-confirmation', label: 'Production Confirmation' },
      { id: 'tx-job-work-out', label: 'Job Work Out Order' },
      { id: 'tx-job-work-receipt', label: 'Job Work Receipt' },
    ],
  },
  {
    id: 'reports', label: 'Reports',
    modules: [
      { id: 'rpt-production-order-register', label: 'Production Order Register' },
      { id: 'rpt-production-plan-register', label: 'Production Plan Register' },
      { id: 'rpt-wip', label: 'WIP Report' },
    ],
  },
];
