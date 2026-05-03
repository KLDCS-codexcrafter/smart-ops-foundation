/**
 * SupplyXPage.tsx — Sprint T-Phase-1.2.6f-b-2-fix-2 · Block O · D-282
 * Internal procurement-side dashboard · mirrors Procure360Page shell.
 */
import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { SupplyXSidebar } from './SupplyXSidebar';
import {
  SupplyXWelcome,
  OpenRfqsPanel,
  PendingQuotationsPanel,
  PendingAwardsPanel,
} from './panels';
import type { SupplyXModule } from './SupplyXSidebar.types';

export default function SupplyXPage(): JSX.Element {
  const [active, setActive] = useState<SupplyXModule>('welcome');

  const render = (): JSX.Element => {
    switch (active) {
      case 'welcome':             return <SupplyXWelcome onNavigate={setActive} />;
      case 'open-rfqs':           return <OpenRfqsPanel />;
      case 'pending-quotations':  return <PendingQuotationsPanel />;
      case 'pending-awards':      return <PendingAwardsPanel />;
      default:                    return <div className="p-6 text-sm text-muted-foreground">Module not found.</div>;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <div className="flex-1 flex w-full overflow-hidden">
          <SupplyXSidebar active={active} onNavigate={setActive} />
          <main className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">{render()}</ScrollArea>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
