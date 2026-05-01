/**
 * ProjXPage.tsx — ProjX card container (sidebar + content area)
 * Sprint T-Phase-1.1.2-a · Tier 1 Card #1 · mirrors FinCorePage shell pattern
 */
// i18n: Sprint T-Phase-1.2.5h-c2-fix · minimum-viable migration
import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ProjXSidebar } from './ProjXSidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProjXWelcomePanel } from './ProjXWelcome';
import { ProjectEntryPanel } from './transactions/ProjectEntry';
import { MilestoneTrackerPanel } from './transactions/MilestoneTracker';
import { ResourceAllocationPanel } from './transactions/ResourceAllocation';
import { TimeEntryCapturePanel } from './transactions/TimeEntryCapture';
import { InvoiceSchedulingPanel } from './transactions/InvoiceScheduling';
import { ProjectCentreMasterPanel } from './masters/ProjectCentreMaster';
import { ProjectPnLReportPanel } from './reports/ProjectPnLReport';
import { ResourceUtilizationReportPanel } from './reports/ResourceUtilizationReport';
import { MilestoneStatusReportPanel } from './reports/MilestoneStatusReport';
import { ProjectMarginReportPanel } from './reports/ProjectMarginReport';
import { CashFlowProjectionReportPanel } from './reports/CashFlowProjectionReport';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { logAudit } from '@/lib/card-audit-engine';
import { rememberModule } from '@/lib/breadcrumb-memory';
import type { ProjXModule } from './ProjXSidebar.types';

export default function ProjXPage() {
  const [activeModule, setActiveModule] = useState<ProjXModule>('welcome');
  const { entityCode, userId } = useCardEntitlement();

  useEffect(() => {
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'projx',
      action: 'card_open',
    });
  }, [entityCode, userId]);

  useEffect(() => {
    rememberModule('projx', activeModule);
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'projx',
      moduleId: activeModule,
      action: 'module_open',
    });
  }, [activeModule, entityCode, userId]);

  const renderModule = () => {
    switch (activeModule) {
      case 'welcome':                 return <ProjXWelcomePanel onNavigate={setActiveModule} />;
      case 't-project-entry':         return <ProjectEntryPanel />;
      case 't-milestone-tracker':     return <MilestoneTrackerPanel />;
      case 't-resource-allocation':   return <ResourceAllocationPanel />;
      case 't-time-entry':            return <TimeEntryCapturePanel />;
      case 't-invoice-scheduling':    return <InvoiceSchedulingPanel />;
      case 'm-project-centres':       return <ProjectCentreMasterPanel />;
      case 'r-project-pnl':           return <ProjectPnLReportPanel />;
      case 'r-resource-utilization':  return <ResourceUtilizationReportPanel />;
      case 'r-milestone-status':      return <MilestoneStatusReportPanel />;
      case 'r-project-margin':        return <ProjectMarginReportPanel />;
      case 'r-cash-flow-projection':  return <CashFlowProjectionReportPanel />;
      default: return <ProjXWelcomePanel onNavigate={setActiveModule} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <div className="flex-1 flex w-full overflow-hidden">
          <ProjXSidebar active={activeModule} onNavigate={setActiveModule} />
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
