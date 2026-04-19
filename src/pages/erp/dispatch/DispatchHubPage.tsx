/**
 * DispatchHubPage.tsx — Card shell · Blue-600 accent
 * Sprint 15a. Mirrors CustomerHubPage pattern with full Stage 3b hooks.
 */

import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DispatchHubSidebar, type DispatchHubModule } from './DispatchHubSidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { logAudit } from '@/lib/card-audit-engine';
import { recordActivity } from '@/lib/cross-card-activity-engine';
import { rememberModule } from '@/lib/breadcrumb-memory';

import { DispatchHubWelcomePanel } from './DispatchHubWelcome';
import { LRTrackerPanel } from './transactions/LRTracker';
import { LRUpdatePanel } from './transactions/LRUpdate';
import { DispatchExceptionsPanel } from './transactions/DispatchExceptions';
import { PackingSlipPrintPanel } from './transactions/PackingSlipPrint';

function ComingSoonPanel({ module }: { module: DispatchHubModule }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <p className="text-lg font-semibold">Coming Soon</p>
      <p className="text-sm mt-1">{module}</p>
    </div>
  );
}

function renderModule(
  mod: DispatchHubModule,
  onModuleChange: (m: DispatchHubModule) => void,
): React.ReactElement {
  switch (mod) {
    case 'dh-welcome':              return <DispatchHubWelcomePanel onModuleChange={onModuleChange} />;
    case 'dh-t-lr-tracker':         return <LRTrackerPanel onModuleChange={onModuleChange} />;
    case 'dh-t-lr-update':          return <LRUpdatePanel onModuleChange={onModuleChange} />;
    case 'dh-t-packing-slip-print': return <PackingSlipPrintPanel />;
    case 'dh-t-exceptions':         return <DispatchExceptionsPanel />;
    default: return <ComingSoonPanel module={mod} />;
  }
}

export default function DispatchHubPage() {
  const [activeModule, setActiveModule] = useState<DispatchHubModule>(() => {
    const hash = window.location.hash.replace('#', '').split('?')[0];
    if (hash.startsWith('dh-')) return hash as DispatchHubModule;
    return 'dh-welcome';
  });

  const { entityCode, userId } = useCardEntitlement();

  useEffect(() => {
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'dispatch-hub' as never, action: 'card_open',
    });
  }, [entityCode, userId]);

  useEffect(() => {
    rememberModule('dispatch-hub' as never, activeModule);
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'dispatch-hub' as never, moduleId: activeModule,
      action: 'module_open',
    });
    recordActivity(entityCode, userId, {
      card_id: 'dispatch-hub' as never, kind: 'module',
      ref_id: activeModule,
      title: `Dispatch Hub · ${activeModule}`,
      subtitle: null,
      deep_link: `/erp/dispatch#${activeModule}`,
    });
  }, [activeModule, entityCode, userId]);

  // Hash sync (preserve query string for dh-t-lr-update?dln=...)
  useEffect(() => {
    const search = window.location.hash.includes('?')
      ? '?' + window.location.hash.split('?').slice(1).join('?')
      : '';
    if (activeModule !== 'dh-welcome') {
      window.history.replaceState(null, '', `#${activeModule}${search}`);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [activeModule]);

  return (
    <SidebarProvider defaultOpen>
      <DispatchHubSidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
      />
      <SidebarInset>
        <ERPHeader />
        <ScrollArea className="flex-1 h-[calc(100vh-var(--erp-header-height,112px))]">
          <div className="p-4 md:p-6 animate-fade-in">
            {renderModule(activeModule, setActiveModule)}
          </div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
