/**
 * @file     ProductionPage.tsx
 * @sprint   T-Phase-1.3-3a-pre-1
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ProductionSidebar } from './ProductionSidebar';
import { ProductionWelcome } from './ProductionWelcome';
import { ProductionOrderEntryPanel } from './transactions/ProductionOrderEntry';
import { ProductionPlanEntryPanel } from './transactions/ProductionPlanEntry';
import { MaterialIssueEntryPanel } from './transactions/MaterialIssueEntry';
import { ProductionConfirmationEntryPanel } from './transactions/ProductionConfirmationEntry';
import { JobWorkOutEntryPanel } from './transactions/JobWorkOutEntry';
import { JobWorkReceiptEntryPanel } from './transactions/JobWorkReceiptEntry';
import { ProductionOrderRegisterPanel } from './reports/ProductionOrderRegister';
import { WIPReportPanel } from './reports/WIPReport';
import type { ProductionModule } from './ProductionSidebar.types';

export default function ProductionPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = (searchParams.get('m') as ProductionModule | null) ?? 'welcome';
  const [active, setActive] = useState<ProductionModule>(initial);

  useEffect(() => {
    const m = searchParams.get('m') as ProductionModule | null;
    if (m && m !== active) setActive(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const navigate = (m: ProductionModule) => {
    setActive(m);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('m', m);
      return next;
    }, { replace: true });
  };

  const render = (): JSX.Element => {
    switch (active) {
      case 'welcome': return <ProductionWelcome onNavigate={(m) => navigate(m as ProductionModule)} />;
      case 'tx-production-order-entry': return <ProductionOrderEntryPanel />;
      case 'tx-material-issue': return <MaterialIssueEntryPanel />;
      case 'tx-production-confirmation': return <ProductionConfirmationEntryPanel />;
      case 'tx-job-work-out': return <JobWorkOutEntryPanel />;
      case 'tx-job-work-receipt': return <JobWorkReceiptEntryPanel />;
      case 'rpt-production-order-register': return <ProductionOrderRegisterPanel />;
      case 'rpt-wip': return <WIPReportPanel />;
      default: return <div className="p-6 text-sm text-muted-foreground">Module not found.</div>;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <div className="flex-1 flex w-full overflow-hidden">
          <ProductionSidebar active={active} onNavigate={navigate} />
          <main className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">{render()}</ScrollArea>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
