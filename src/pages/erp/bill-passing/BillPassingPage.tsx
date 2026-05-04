/**
 * BillPassingPage.tsx — Sprint T-Phase-1.2.6f-c-2 · Block B
 * NEW /erp/bill-passing page · 4-module layout · Mirrors Procure360Page pattern (D-250).
 */
import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { BillPassingSidebar } from './BillPassingSidebar';
import {
  BillPassingWelcome, PendingBillsPanel, MatchReviewPanel, ApprovedForFcpiPanel,
} from './panels';
import { BillPassingRegisterPanel } from './BillPassingRegisterPanel';
import { RateContractListPanel } from './RateContractListPanel';
import type { BillPassingModule } from './BillPassingSidebar.types';

export default function BillPassingPage(): JSX.Element {
  const [active, setActive] = useState<BillPassingModule>('welcome');

  const render = (): JSX.Element => {
    switch (active) {
      case 'welcome':                return <BillPassingWelcome onNavigate={setActive} />;
      case 'pending-bills':          return <PendingBillsPanel />;
      case 'match-review':           return <MatchReviewPanel />;
      case 'approved-for-fcpi':      return <ApprovedForFcpiPanel />;
      case 'bill-passing-register':  return <BillPassingRegisterPanel />;
      case 'rate-contract-list':     return <RateContractListPanel />;
      default:                       return <div className="p-6 text-sm text-muted-foreground">Module not found.</div>;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <div className="flex-1 flex w-full overflow-hidden">
          <BillPassingSidebar active={active} onNavigate={setActive} />
          <main className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">{render()}</ScrollArea>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
