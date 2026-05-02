/**
 * InventoryHubPage.tsx — Inventory Hub card container (sidebar + content area)
 * Sprint T-Phase-1.2.1 · Tier 1 Card #2 sub-sprint 1/3 · mirrors ProjXPage shell pattern
 */
import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { InventoryHubSidebar } from './InventoryHubSidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InventoryHubWelcomePanel } from './InventoryHubWelcome';
import { GRNEntryPanel } from './transactions/GRNEntry';
import { MaterialIssueNotePanel } from './transactions/MaterialIssueNote';
import { ConsumptionEntryPanel } from './transactions/ConsumptionEntry';
import { StockLedgerReportPanel } from './reports/StockLedgerReport';
// Sprint T-Phase-1.2.6b · GRNRegister.tsx (legacy) kept on disk as fallback · file deletion + this comment removed in 1.2.6e governance pass
import { GRNRegisterV2Panel } from './reports/GRNRegisterV2';
import { MINRegisterPanel } from './reports/MINRegister';
import { ConsumptionRegisterPanel } from './reports/ConsumptionRegister';
import { CycleCountRegisterPanel } from './reports/CycleCountRegister';
import { RTVRegisterPanel } from './reports/RTVRegister';
import { ConsumptionSummaryReportPanel } from './reports/ConsumptionSummaryReport';
import { StorageSlipPrintPanel } from './reports/StorageSlipPrint';
import { BinSlipPrintPanel } from './reports/BinSlipPrint';
import { AgedGITReportPanel } from './reports/AgedGITReport';
import { ReorderAlertsPanel } from './ReorderAlerts';
import { ItemCraftPanel } from './ItemCraft';
import { StorageMatrixPanel } from './StorageMatrix';
import { StockMatrixPanel } from './StockMatrix';
import { HeatMasterPanel } from './HeatMaster';
import { BatchGridPanel } from './BatchGrid';
import { SerialGridPanel } from './SerialGrid';
import { BinLocationLabelsPanel } from './BinLocationLabels';
import { ReorderMatrixPanel } from './ReorderMatrix';
import { AbcClassificationMasterPanel } from './AbcClassificationMaster';
import { HazmatProfileMasterPanel } from './HazmatProfileMaster';
import { SubstituteMasterPanel } from './SubstituteMaster';
import { ReturnablePackagingMasterPanel } from './ReturnablePackagingMaster';
import { SlowMovingDeadStockReportPanel } from './reports/SlowMovingDeadStockReport';
import { CycleCountEntryPanel } from './transactions/CycleCountEntry';
import { RTVEntryPanel } from './transactions/RTVEntry';
import { BinUtilizationReportPanel } from './reports/BinUtilizationReport';
import { ItemMovementHistoryReportPanel } from './reports/ItemMovementHistoryReport';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { logAudit } from '@/lib/card-audit-engine';
import { rememberModule } from '@/lib/breadcrumb-memory';
import type { InventoryHubModule } from './InventoryHubSidebar.types';
import type { DrillNavigationContext } from '@/types/drill-context';

export default function InventoryHubPage() {
  const [activeModule, setActiveModule] = useState<InventoryHubModule>('welcome');
  // Sprint 1.2.6b-rpt · Q2-c hybrid routing — cross-panel drill context.
  const [drillContext, setDrillContext] = useState<DrillNavigationContext | null>(null);
  const { entityCode, userId } = useCardEntitlement();

  const navigateToModule = (module: InventoryHubModule, ctx?: DrillNavigationContext) => {
    setDrillContext(ctx ?? null);
    setActiveModule(module);
  };

  useEffect(() => {
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'inventory-hub',
      action: 'card_open',
    });
  }, [entityCode, userId]);

  useEffect(() => {
    rememberModule('inventory-hub', activeModule);
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'inventory-hub',
      moduleId: activeModule,
      action: 'module_open',
    });
  }, [activeModule, entityCode, userId]);

  const renderModule = () => {
    switch (activeModule) {
      case 'welcome':                return <InventoryHubWelcomePanel onNavigate={setActiveModule} />;
      case 't-grn-entry':            return <GRNEntryPanel />;
      case 't-material-issue':       return <MaterialIssueNotePanel />;
      case 't-consumption-entry':    return <ConsumptionEntryPanel />;
      case 'r-stock-ledger':         return <StockLedgerReportPanel onNavigate={navigateToModule} />;
      case 'r-grn-register':         return <GRNRegisterV2Panel initialFilter={drillContext?.filter} />;
      case 'r-min-register':         return <MINRegisterPanel initialFilter={drillContext?.filter} />;
      case 'r-consumption-register': return <ConsumptionRegisterPanel initialFilter={drillContext?.filter} />;
      case 'r-cycle-count-register': return <CycleCountRegisterPanel initialFilter={drillContext?.filter} />;
      case 'r-rtv-register':         return <RTVRegisterPanel initialFilter={drillContext?.filter} />;
      case 'r-consumption-summary':  return <ConsumptionSummaryReportPanel onNavigate={navigateToModule} />;
      case 'r-storage-slip':         return <StorageSlipPrintPanel />;
      case 'r-bin-slip':             return <BinSlipPrintPanel />;
      case 'r-aged-git':             return <AgedGITReportPanel onNavigate={navigateToModule} />;
      case 'r-reorder-alerts':       return <ReorderAlertsPanel />;
      case 'm-item-master':          return <ItemCraftPanel />;
      case 'm-godown-master':        return <StorageMatrixPanel />;
      case 'm-stock-groups':         return <StockMatrixPanel />;
      case 'm-heat-master':          return <HeatMasterPanel />;
      case 'm-batch-grid':           return <BatchGridPanel />;
      case 'm-serial-grid':          return <SerialGridPanel />;
      case 'm-bin-labels':           return <BinLocationLabelsPanel />;
      case 'm-reorder-matrix':       return <ReorderMatrixPanel />;
      case 'm-abc-classification':   return <AbcClassificationMasterPanel />;
      case 'm-hazmat-profiles':      return <HazmatProfileMasterPanel />;
      case 'm-substitute-master':    return <SubstituteMasterPanel />;
      case 'm-returnable-packaging': return <ReturnablePackagingMasterPanel />;
      case 'r-slow-moving-dead':     return <SlowMovingDeadStockReportPanel onNavigate={navigateToModule} />;
      case 't-cycle-count':          return <CycleCountEntryPanel />;
      case 't-rtv':                  return <RTVEntryPanel />;
      case 'r-bin-utilization':      return <BinUtilizationReportPanel onNavigate={navigateToModule} />;
      case 'r-item-movement':        return <ItemMovementHistoryReportPanel onNavigate={navigateToModule} initialFilter={drillContext?.filter} />;
      default:                       return <InventoryHubWelcomePanel onNavigate={setActiveModule} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <div className="flex-1 flex w-full overflow-hidden">
          <InventoryHubSidebar active={activeModule} onNavigate={setActiveModule} />
          <main className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {renderModule()}
            </ScrollArea>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
