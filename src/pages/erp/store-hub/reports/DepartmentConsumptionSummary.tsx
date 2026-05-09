/**
 * @file        src/pages/erp/store-hub/reports/DepartmentConsumptionSummary.tsx
 * @purpose     Thin Store Hub wrapper of Inventory Hub's ConsumptionSummaryReportPanel ·
 *              department-scoped · ZERO duplication of SD-9 inventory data per D-387.
 * @who         Store Keeper · Department Head
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.6.α-b-Department-Stores-Closeout · Block C · Q-LOCK-9c revised
 * @iso         ISO 9001:2015 Clause 8.5.2 traceability · ISO 25010 Maintainability
 * @whom        Audit Owner
 * @decisions   D-387 (SD-9 thin-pass-through · ZERO TOUCH on Inventory Hub) ·
 *              Q-LOCK-9c revised (port 2 of 3 reports · skip Reorder Alerts redundant)
 * @disciplines FR-19 (sibling consumption) · FR-30
 * @reuses      @/pages/erp/inventory/reports/ConsumptionSummaryReport
 * @[JWT]       reads via ConsumptionSummaryReportPanel · localStorage entity-scoped
 */
import { ConsumptionSummaryReportPanel } from '@/pages/erp/inventory/reports/ConsumptionSummaryReport';

export function DepartmentConsumptionSummaryPanel(): JSX.Element {
  return <ConsumptionSummaryReportPanel />;
}

export default DepartmentConsumptionSummaryPanel;
