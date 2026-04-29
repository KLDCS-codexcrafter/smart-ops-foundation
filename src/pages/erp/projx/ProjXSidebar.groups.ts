/**
 * ProjXSidebar.groups.ts — module → group mapping
 * Sprint T-Phase-1.1.2-a
 */
import type { ProjXModule } from './ProjXSidebar.types';

export const PROJX_MODULE_GROUP: Record<ProjXModule, 'transactions' | 'masters' | 'reports' | 'home'> = {
  'welcome': 'home',
  't-project-entry': 'transactions',
  't-milestone-tracker-disabled': 'transactions',
  't-resource-allocation-disabled': 'transactions',
  't-time-entry-disabled': 'transactions',
  't-invoice-scheduling-disabled': 'transactions',
  'm-project-centres': 'masters',
  'r-project-pnl-disabled': 'reports',
  'r-resource-utilization-disabled': 'reports',
  'r-milestone-status-disabled': 'reports',
  'r-project-margin-disabled': 'reports',
};
