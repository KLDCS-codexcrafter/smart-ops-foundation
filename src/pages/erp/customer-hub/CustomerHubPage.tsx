/**
 * CustomerHubPage.tsx — Main Customer Hub card container
 * Sprint 13a. Teal-500 accent. Mirrors DistributorHubPage pattern.
 * Stage 3b audit + activity + breadcrumb wired automatically.
 */

import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { CustomerHubSidebar, type CustomerHubModule } from './CustomerHubSidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { logAudit } from '@/lib/card-audit-engine';
import { recordActivity } from '@/lib/cross-card-activity-engine';
import { rememberModule } from '@/lib/breadcrumb-memory';
import { GuidedTourOverlay } from '@/components/layout/GuidedTourOverlay';

// Welcome page
import { CustomerHubWelcomePanel } from './CustomerHubWelcome';

// Masters (CC replicas — absorbed inline)
import { CustomerMasterPanel } from '@/pages/erp/masters/CustomerMaster';
import { CustomerSegmentMasterPanel } from '@/pages/erp/masters/CustomerSegmentMaster';

// Sprint 13b will add transaction panels (Catalog, Cart, Orders).
// Sprint 13c will add reward + social proof + analytics panels.
// All 'Sprint 13b' / 'Sprint 13c' badged entries render ComingSoonPanel for now.

function ComingSoonPanel({ module }: { module: CustomerHubModule }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <p className="text-lg font-semibold">Coming Soon</p>
      <p className="text-sm mt-1">{module} — Sprint 13b or 13c</p>
    </div>
  );
}

function renderModule(mod: CustomerHubModule): React.ReactElement {
  switch (mod) {
    case 'ch-welcome':              return <CustomerHubWelcomePanel />;
    case 'ch-m-customer':           return <CustomerMasterPanel />;
    case 'ch-m-segment':            return <CustomerSegmentMasterPanel />;
    // Everything else is Sprint 13b / 13c
    default: return <ComingSoonPanel module={mod} />;
  }
}

export default function CustomerHubPage() {
  const [activeModule, setActiveModule] = useState<CustomerHubModule>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('ch-')) return hash as CustomerHubModule;
    return 'ch-welcome';
  });

  const { entityCode, userId } = useCardEntitlement();

  // Stage 3b — log card_open once on mount
  useEffect(() => {
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'customer-hub', action: 'card_open',
    });
  }, [entityCode, userId]);

  // Stage 3b — on every module change: breadcrumb + audit + activity
  useEffect(() => {
    rememberModule('customer-hub', activeModule);
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'customer-hub', moduleId: activeModule,
      action: 'module_open',
    });
    recordActivity(entityCode, userId, {
      card_id: 'customer-hub', kind: 'module',
      ref_id: activeModule,
      title: `Customer Hub · ${activeModule}`,
      subtitle: null,
      deep_link: `/erp/customer-hub#${activeModule}`,
    });
  }, [activeModule, entityCode, userId]);

  // Hash sync
  useEffect(() => {
    if (activeModule !== 'ch-welcome') {
      window.history.replaceState(null, '', `#${activeModule}`);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [activeModule]);

  return (
    <>
      <GuidedTourOverlay cardId="customer-hub" />
      <SidebarProvider defaultOpen>
        <CustomerHubSidebar
          activeModule={activeModule}
          onModuleChange={setActiveModule}
        />
        <SidebarInset>
          <ERPHeader />
          <ScrollArea className="flex-1 h-[calc(100vh-var(--erp-header-height,112px))]">
            <div className="p-4 md:p-6 animate-fade-in">
              {renderModule(activeModule)}
            </div>
          </ScrollArea>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
