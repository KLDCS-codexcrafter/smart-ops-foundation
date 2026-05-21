/**
 * InventoryHubSidebar.groups.ts — module → group mapping
 * Sprint T-Phase-1.2.1 · Tier 1 Card #2 sub-sprint 1/3
 * Sprint T-Phase-1.2.2 · Activated MIN + Consumption Entry + Consumption Summary
 * Sprint T-Phase-1.2.6b · UTS register modules
 */
import type { InventoryHubModule } from './InventoryHubSidebar.types';

export const INVENTORY_MODULE_GROUP: Record<
  InventoryHubModule,
  'transactions' | 'masters' | 'reports' | 'home'
> = {
  'welcome': 'home',
  't-grn-entry': 'transactions',
  't-material-issue': 'transactions',
  't-consumption-entry': 'transactions',
  't-cycle-count': 'transactions',
  't-rtv': 'transactions',
  'r-stock-ledger': 'reports',
  'r-reorder-alerts': 'reports',
  'r-grn-register': 'reports',
  'r-consumption-summary': 'reports',
  'r-storage-slip': 'reports',
  'r-bin-slip': 'reports',
  'r-aged-git': 'reports',
  'r-slow-moving-dead': 'reports',
  'r-bin-utilization': 'reports',
  'r-item-movement': 'reports',
  'r-min-register': 'reports',
  'r-consumption-register': 'reports',
  'r-cycle-count-register': 'reports',
  'r-rtv-register': 'reports',
  'm-item-master': 'masters',
  'm-godown-master': 'masters',
  'm-stock-groups': 'masters',
  'm-heat-master': 'masters',
  'm-batch-grid': 'masters',
  'm-serial-grid': 'masters',
  'm-bin-labels': 'masters',
  'm-reorder-matrix': 'masters',
  'm-abc-classification': 'masters',
  'm-hazmat-profiles': 'masters',
  'm-substitute-master': 'masters',
  'm-returnable-packaging': 'masters',
};
