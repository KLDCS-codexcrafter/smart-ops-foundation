/**
 * DistributorHubPage.tsx — Main Distributor Hub card container
 * Mirrors PayHubPage and SalesXPage. Indigo-600 accent.
 *
 * This is the TENANT-INTERNAL hub (for tenant ops/sales/MD to manage
 * their distributor programme). The DISTRIBUTOR PORTAL (for distributor
 * users logging in from outside) is separate at /erp/distributor/* and
 * uses DistributorLayout — untouched by this refactor.
 */
import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DistributorHubSidebar, type DistributorHubModule } from './DistributorHubSidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { logAudit } from '@/lib/card-audit-engine';
import { recordActivity } from '@/lib/cross-card-activity-engine';
import { rememberModule } from '@/lib/breadcrumb-memory';
import { GuidedTourOverlay } from '@/components/layout/GuidedTourOverlay';

// Welcome page
import { DistributorHubWelcomePanel } from './DistributorHubWelcome';

// Absorbed modules (keep their Panel exports working untouched)
import { DistributorHubPanel } from '@/pages/erp/distributor/DistributorHub';
import { DistributorHierarchyMasterPanel } from '@/pages/erp/distributor/DistributorHierarchyMaster';
import { CreditApprovalQueuePanel } from '@/pages/erp/distributor/CreditApprovalQueue';
import { DistributorDisputeQueuePanel } from '@/pages/erp/distributor/DistributorDisputeQueue';
import { DistributorIntimationQueuePanel } from '@/pages/erp/finecore/DistributorIntimationQueue';
import { DistributorBroadcastPanel } from '@/pages/erp/salesx/DistributorBroadcast';

// CC replica masters (open inline inside the card shell via Panel exports)
import { CustomerMasterPanel } from '@/pages/erp/masters/CustomerMaster';
import { PriceListManagerPanel } from '@/pages/erp/inventory/PriceListManager';

// Sprint 11b — new transaction modules + populated reports
import { StockOutWarningsPanel } from './transactions/StockOutWarnings';
import { DistributorExcelSyncPanel } from './transactions/DistributorExcelSync';
import { DistributorRatingHubPanel } from './transactions/DistributorRatingHub';
import { EngagementReportPanel } from './reports/EngagementReport';
import { CreditUtilReportPanel } from './reports/CreditUtilReport';
import { DisputeStatsReportPanel } from './reports/DisputeStatsReport';

function ComingSoonPanel({ module }: { module: DistributorHubModule }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <p className="text-lg font-semibold">Coming Soon</p>
      <p className="text-sm mt-1">{module} — will be built in Sprint 11b or later</p>
    </div>
  );
}

function renderModule(mod: DistributorHubModule): React.ReactElement {
  switch (mod) {
    case 'dh-welcome':             return <DistributorHubWelcomePanel />;
    case 'dh-hub':                 return <DistributorHubPanel />;

    // Masters section — open CC replicas inline
    case 'dh-m-customer':          return <CustomerMasterPanel />;
    case 'dh-m-price-list':        return <PriceListManagerPanel />;
    case 'dh-m-hierarchy':         return <DistributorHierarchyMasterPanel />;

    // Transactions section — absorbed hub pages
    case 'dh-t-credit-approvals':  return <CreditApprovalQueuePanel />;
    case 'dh-t-disputes':          return <DistributorDisputeQueuePanel />;
    case 'dh-t-intimations':       return <DistributorIntimationQueuePanel />;
    case 'dh-t-broadcast':         return <DistributorBroadcastPanel />;

    // Sprint 11b — new transactions
    case 'dh-t-stock-out':         return <StockOutWarningsPanel />;
    case 'dh-t-excel-sync':        return <DistributorExcelSyncPanel />;
    case 'dh-t-ratings':           return <DistributorRatingHubPanel />;

    // Reports section — populated in Sprint 11b
    case 'dh-r-engagement':        return <EngagementReportPanel />;
    case 'dh-r-credit-util':       return <CreditUtilReportPanel />;
    case 'dh-r-dispute-stats':     return <DisputeStatsReportPanel />;

    default: return <ComingSoonPanel module={mod} />;
  }
}

export default function DistributorHubPage() {
  // Read module from URL hash so deep-links like /erp/distributor-hub#dh-t-disputes work
  const [activeModule, setActiveModule] = useState<DistributorHubModule>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('dh-')) return hash as DistributorHubModule;
    return 'dh-welcome';
  });
  const { entityCode, userId } = useCardEntitlement();

  useEffect(() => {
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'distributor-hub',
      action: 'card_open',
    });
  }, [entityCode, userId]);

  useEffect(() => {
    rememberModule('distributor-hub', activeModule);
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'distributor-hub',
      moduleId: activeModule,
      action: 'module_open',
    });
    recordActivity(entityCode, userId, {
      card_id: 'distributor-hub',
      kind: 'module',
      ref_id: activeModule,
      title: `Distributor Hub · ${activeModule}`,
      subtitle: null,
      deep_link: `/erp/distributor-hub#${activeModule}`,
    });
  }, [activeModule, entityCode, userId]);

  useEffect(() => {
    if (activeModule !== 'dh-welcome') {
      window.history.replaceState(null, '', `#${activeModule}`);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [activeModule]);

  return (
    <>
      <GuidedTourOverlay cardId='distributor-hub' />
      <SidebarProvider defaultOpen>
        <DistributorHubSidebar
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
