/**
 * InventoryHubSidebar.groups.ts — module → group mapping
 * Sprint T-Phase-1.2.1 · Tier 1 Card #2 sub-sprint 1/3
 */
import type { InventoryHubModule } from './InventoryHubSidebar.types';

export const INVENTORY_MODULE_GROUP: Record<
  InventoryHubModule,
  'transactions' | 'masters' | 'reports' | 'home'
> = {
  'welcome': 'home',
  't-grn-entry': 'transactions',
  't-material-issue-disabled': 'transactions',
  't-consumption-disabled': 'transactions',
  'r-stock-ledger': 'reports',
  'r-reorder-alerts': 'reports',
  'r-grn-register': 'reports',
  'r-consumption-disabled': 'reports',
  'm-item-master': 'masters',
  'm-godown-master': 'masters',
  'm-stock-groups': 'masters',
};
