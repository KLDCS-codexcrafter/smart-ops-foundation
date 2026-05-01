/**
 * InventoryHubSidebar.types.ts — Module union for Inventory Hub card
 * Sprint T-Phase-1.2.1 · Tier 1 Card #2 sub-sprint 1/3
 * Sprint T-Phase-1.2.2 · Activated MIN + Consumption Entry + Consumption Summary
 */
export type InventoryHubModule =
  | 'welcome'
  | 't-grn-entry'
  | 't-material-issue'
  | 't-consumption-entry'
  | 'r-stock-ledger'
  | 'r-reorder-alerts'
  | 'r-grn-register'
  | 'r-consumption-summary'
  | 'r-storage-slip'
  | 'r-bin-slip'
  | 'm-item-master'
  | 'm-godown-master'
  | 'm-stock-groups'
  // Sprint T-Phase-1.2.3 · Traceability masters
  | 'm-heat-master'
  | 'm-batch-grid'
  | 'm-serial-grid'
  | 'm-bin-labels'
  // Sprint T-Phase-1.2.3-fix · Multi-godown reorder matrix
  | 'm-reorder-matrix';
