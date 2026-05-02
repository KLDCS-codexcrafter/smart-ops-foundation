/**
 * drill-context.ts — Cross-panel drill navigation context
 *
 * Sprint T-Phase-1.2.6b-rpt · Card #2.6 sub-sprint 3 of 6 · Q2-c hybrid routing
 *
 * Reports drill in-panel for levels 1-2 (breadcrumb trail). At level 3 they
 * navigate cross-panel to existing registers/details with pre-applied
 * filters carried in DrillNavigationContext.
 *
 * Pragmatic filter contract: any field a register's existing UI doesn't
 * support natively is applied via a memoized rows filter on mount.
 */

import type { InventoryHubModule } from '@/pages/erp/inventory/InventoryHubSidebar.types';

export interface InventoryDrillFilter {
  itemId?: string;
  godownId?: string;
  departmentCode?: string;
  projectCentreId?: string;
  vendorId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  /** absolute variance threshold (₹) — register highlights / filters at >= */
  varianceThreshold?: number;
  /** Human label rendered in the drill-source banner. */
  sourceLabel?: string;
}

export interface DrillNavigationContext {
  fromModule: InventoryHubModule;
  fromLabel: string;
  filter?: InventoryDrillFilter;
}

/** Pure helper · merge a partial filter onto an existing context. */
export function withFilter(
  ctx: DrillNavigationContext,
  filter: InventoryDrillFilter,
): DrillNavigationContext {
  return { ...ctx, filter: { ...(ctx.filter ?? {}), ...filter } };
}
