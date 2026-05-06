/**
 * @file     ProductionPage.tsx
 * @sprint   T-Phase-1.3-3a-pre-1
 */
import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ProductionSidebar } from './ProductionSidebar';
import { ProductionWelcome } from './ProductionWelcome';
import { ProductionOrderEntryPanel } from './transactions/ProductionOrderEntry';
import { MaterialIssueEntryPanel } from './transactions/MaterialIssueEntry';
import { ProductionConfirmationEntryPanel } from './transactions/ProductionConfirmationEntry';
import { JobWorkOutEntryPanel } from './transactions/JobWorkOutEntry';
import { JobWorkReceiptEntryPanel } from './transactions/JobWorkReceiptEntry';
import { ProductionOrderRegisterPanel } from './reports/ProductionOrderRegister';
import { WIPReportPanel } from './reports/WIPReport';
import type { ProductionModule } from './ProductionSidebar.types';

export default function ProductionPage(): JSX.Element {
  const [active, setActive] = useState<ProductionModule>('welcome');

  const render = (): JSX.Element => {
    switch (active) {
      case 'welcome': return <ProductionWelcome onNavigate={(m) => setActive(m as ProductionModule)} />;
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
          <ProductionSidebar active={active} onNavigate={setActive} />
          <main className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">{render()}</ScrollArea>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
