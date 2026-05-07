/**
 * QualiCheckPage.tsx — Sprint T-Phase-1.2.6f-d-2-card5-5-pre-1 · Block E · D-326
 * NEW /erp/qulicheak page · 5-module Foundation. Mirrors GateFlowPage (4-pre-1).
 */
import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { QualiCheckSidebar } from './QualiCheckSidebar';
import {
  QualiCheckWelcome, PendingInspectionsPanel, QualityPlansPanel,
  QualitySpecsPanel, InspectionRegisterPanel,
} from './panels';
import {
  ClosureLogPanel, VendorScorecardPanel, CoARegisterPanel,
  PendingAlertsPanel, BulkPlanAssignmentPanel,
} from './operational-panels';
import type { QualiCheckModule } from './QualiCheckSidebar.types';
import { ProductionQCPendingPanel } from './ProductionQCPendingPanel';
import { QCEntryPage } from './QCEntryPage';

export default function QualiCheckPage(): JSX.Element {
  const [active, setActive] = useState<QualiCheckModule>('welcome');
  // 🆕 Sprint 3b-pre-2 · Block J · D-635 · QC entry overlay (priority over module switch).
  const [activeInspectionId, setActiveInspectionId] = useState<string | null>(null);

  const render = (): JSX.Element => {
    if (activeInspectionId) {
      return <QCEntryPage inspectionId={activeInspectionId} onBack={() => setActiveInspectionId(null)} />;
    }
    switch (active) {
      case 'welcome':              return <QualiCheckWelcome onNavigate={setActive} />;
      case 'pending-inspections':  return <PendingInspectionsPanel />;
      case 'quality-plans':        return <QualityPlansPanel />;
      case 'quality-specs':        return <QualitySpecsPanel />;
      case 'inspection-register':  return <InspectionRegisterPanel />;
      case 'closure-log':          return <ClosureLogPanel />;
      case 'vendor-scorecard':     return <VendorScorecardPanel />;
      case 'coa-register':         return <CoARegisterPanel />;
      case 'pending-alerts':       return <PendingAlertsPanel />;
      case 'bulk-plan-assignment': return <BulkPlanAssignmentPanel />;
      case 'production-qc-pending':
        return <ProductionQCPendingPanel onOpenInspection={setActiveInspectionId} />;
      case 'qc-entry':
        return <div className="p-6 text-sm text-muted-foreground">Open a pending inspection to enter QC.</div>;
      default:
        return <div className="p-6 text-sm text-muted-foreground">Module not found.</div>;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <div className="flex-1 flex w-full overflow-hidden">
          <QualiCheckSidebar active={active} onNavigate={setActive} />
          <main className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">{render()}</ScrollArea>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
