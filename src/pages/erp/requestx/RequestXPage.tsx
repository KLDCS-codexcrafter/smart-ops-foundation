/**
 * @file        RequestXPage.tsx
 * @sprint      T-Phase-1.2.6f-pre-1
 * @purpose     RequestX hub container · mirrors InventoryHubPage shell pattern.
 */
import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { RequestXSidebar } from './RequestXSidebar';
import { RequestXWelcome } from './RequestXWelcome';
import { MaterialIndentEntryPanel } from './transactions/MaterialIndentEntry';
import { ServiceRequestEntryPanel } from './transactions/ServiceRequestEntry';
import { CapitalIndentEntryPanel } from './transactions/CapitalIndentEntry';
import { IndentApprovalInboxPanel } from './transactions/IndentApprovalInbox';
import type { RequestXModule } from './RequestXSidebar.types';

export default function RequestXPage(): JSX.Element {
  const [active, setActive] = useState<RequestXModule>('welcome');

  const render = (): JSX.Element => {
    switch (active) {
      case 'welcome':              return <RequestXWelcome onNavigate={setActive} />;
      case 'tx-material-indent':   return <MaterialIndentEntryPanel />;
      case 'tx-service-request':   return <ServiceRequestEntryPanel />;
      case 'tx-capital-indent':    return <CapitalIndentEntryPanel />;
      case 'tx-approval-inbox':    return <IndentApprovalInboxPanel />;
      default:
        return <div className="p-6 text-sm text-muted-foreground">Module "{active}" lands in T-Phase-1.2.6f-pre-2.</div>;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <div className="flex-1 flex w-full overflow-hidden">
          <RequestXSidebar active={active} onNavigate={setActive} />
          <main className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">{render()}</ScrollArea>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
