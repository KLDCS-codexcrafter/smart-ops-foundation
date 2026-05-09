/**
 * @file        src/pages/erp/store-hub/reports/StockMovementRegister.tsx
 * @purpose     Thin Store Hub wrapper of Inventory Hub's ItemMovementHistoryReportPanel ·
 *              department-scoped via existing entity_code filter · ZERO duplication of
 *              SD-9 inventory data per D-387 thin-pass-through pattern.
 * @who         Store Keeper · Department Head
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.6.α-b-Department-Stores-Closeout · Block C · Q-LOCK-9c revised
 * @iso         ISO 9001:2015 Clause 8.5.2 traceability · ISO 25010 Maintainability
 * @whom        Audit Owner
 * @decisions   D-387 (SD-9 thin-pass-through · ZERO TOUCH on Inventory Hub) ·
 *              Q-LOCK-9c revised (port 2 of 3 reports · skip Reorder Alerts redundant)
 * @disciplines FR-19 (sibling consumption) · FR-30
 * @reuses      @/pages/erp/inventory/reports/ItemMovementHistoryReport
 * @[JWT]       reads via ItemMovementHistoryReportPanel · localStorage entity-scoped
 */
import { ItemMovementHistoryReportPanel } from '@/pages/erp/inventory/reports/ItemMovementHistoryReport';

export function StockMovementRegisterPanel(): JSX.Element {
  return <ItemMovementHistoryReportPanel />;
}

export default StockMovementRegisterPanel;
