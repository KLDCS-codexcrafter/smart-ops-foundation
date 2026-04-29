/**
 * ProjXSidebar.groups.ts — module → group mapping
 * Sprint T-Phase-1.1.2-a · Sprint T-Phase-1.1.2-b activates remaining modules
 */
import type { ProjXModule } from './ProjXSidebar.types';

export const PROJX_MODULE_GROUP: Record<ProjXModule, 'transactions' | 'masters' | 'reports' | 'home'> = {
  'welcome': 'home',
  't-project-entry': 'transactions',
  't-milestone-tracker': 'transactions',
  't-resource-allocation': 'transactions',
  't-time-entry': 'transactions',
  't-invoice-scheduling': 'transactions',
  'm-project-centres': 'masters',
  'r-project-pnl': 'reports',
  'r-resource-utilization': 'reports',
  'r-milestone-status': 'reports',
  'r-project-margin': 'reports',
};
