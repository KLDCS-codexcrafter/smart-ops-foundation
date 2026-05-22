/**
 * @file        src/pages/erp/store-hub/reports/DepartmentConsumptionSummary.tsx
 * @purpose     Thin Store Hub wrapper of Inventory Hub's ConsumptionSummaryReportPanel ·
 *              department-scoped · ZERO duplication of SD-9 inventory data per D-387.
 * @who         Store Keeper · Department Head
 * @when        2026-05-09 · updated 2026-05-22 (D-NEW-FO drill button additive · wrapper-level)
 * @sprint      T-Phase-2.A-DepartmentStore-Phase2-Expansion · Block B
 * @decisions   D-387 (SD-9 thin-pass-through · ZERO TOUCH on Inventory Hub) ·
 *              Q-LOCK-4(a) drill deep-link via wrapper · ConsumptionSummaryReportPanel stays 0-DIFF
 * @disciplines FR-19 (sibling consumption) · FR-30
 * @reuses      @/pages/erp/inventory/reports/ConsumptionSummaryReport
 * @[JWT]       reads via ConsumptionSummaryReportPanel · localStorage entity-scoped
 */
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { ConsumptionSummaryReportPanel } from '@/pages/erp/inventory/reports/ConsumptionSummaryReport';

export function DepartmentConsumptionSummaryPanel(): JSX.Element {
  const month = new Date().toISOString().slice(0, 7);
  return (
    <div className="space-y-3">
      <div className="flex justify-end px-6 pt-4">
        <Link to={`/erp/main-store-hub/consumption-register?month=${month}`}>
          <Button size="sm" variant="outline" className="h-7 text-xs">
            Drill: Consumption Register <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>
      <ConsumptionSummaryReportPanel />
    </div>
  );
}

export default DepartmentConsumptionSummaryPanel;
