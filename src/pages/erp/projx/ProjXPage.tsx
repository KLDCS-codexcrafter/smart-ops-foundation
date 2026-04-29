/**
 * ProjXPage.tsx — ProjX card container (sidebar + content area)
 * Sprint T-Phase-1.1.2-a · Tier 1 Card #1 · mirrors FinCorePage shell pattern
 */
import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ProjXSidebar } from './ProjXSidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Briefcase } from 'lucide-react';
import { ProjXWelcomePanel } from './ProjXWelcome';
import { ProjectEntryPanel } from './transactions/ProjectEntry';
import { ProjectCentreMasterPanel } from './masters/ProjectCentreMaster';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { logAudit } from '@/lib/card-audit-engine';
import { rememberModule } from '@/lib/breadcrumb-memory';
import type { ProjXModule } from './ProjXSidebar.types';

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="max-w-3xl mx-auto p-12 text-center">
      <Card className="p-12">
        <Briefcase className="h-12 w-12 mx-auto mb-4 text-indigo-500/50" />
        <h2 className="text-xl font-bold mb-2">{label}</h2>
        <p className="text-sm text-muted-foreground">
          Coming in Sprint 1.1.2-b — full Project Management buildout.
        </p>
      </Card>
    </div>
  );
}

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
      case 'm-project-centres':       return <ProjectCentreMasterPanel />;
      case 't-milestone-tracker-disabled':   return <ComingSoon label="Milestone Tracker" />;
      case 't-resource-allocation-disabled': return <ComingSoon label="Resource Allocation" />;
      case 't-time-entry-disabled':          return <ComingSoon label="Time Entry" />;
      case 't-invoice-scheduling-disabled':  return <ComingSoon label="Invoice Scheduling" />;
      case 'r-project-pnl-disabled':         return <ComingSoon label="Project P&L" />;
      case 'r-resource-utilization-disabled':return <ComingSoon label="Resource Utilization" />;
      case 'r-milestone-status-disabled':    return <ComingSoon label="Milestone Status" />;
      case 'r-project-margin-disabled':      return <ComingSoon label="Project Margin" />;
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
