/**
 * StoreHubPage.tsx — Module-based Shell · Indigo-600 accent
 * Sprint T-Phase-1.2.6f-d-2-card7-7-pre-1 · Block D · D-379
 *
 * UPGRADE from D-298 thin tabs card to module-based Shell matching DispatchHubPage
 * (Card #6) pattern. Existing 3 panels (Stock Check, Reorder Suggestions, Demand
 * Forecast) preserved as modules · 3 NEW transaction modules added (Stock Issue
 * Entry/Register, Receipt Ack). store-hub-engine.ts NOT modified.
 */
import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Warehouse } from 'lucide-react';
import { StoreHubSidebar, type StoreHubModule } from './StoreHubSidebar';
import {
  StockCheckPanel, ReorderSuggestionsPanel, DemandForecastPanel,
} from './StoreHubPanels';
import { StockIssueEntryPanel } from './transactions/StockIssueEntry';
import { StockIssueRegisterPanel } from './transactions/StockIssueRegister';
import { StockReceiptAckPanel } from './transactions/StockReceiptAck';
import { CycleCountStatusPanel } from './reports/CycleCountStatus';
import { StoreHubWelcomePanel } from './StoreHubWelcome';

function WelcomePanel(): JSX.Element {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Warehouse className="h-6 w-6 text-indigo-600" /> Store Hub
        </h1>
        <p className="text-sm text-muted-foreground">
          Department-level Stores console · Stock Issue · Receipt Ack · Live reports
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Get started</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Use the sidebar to issue stock to a department, acknowledge inward receipts
          into Stores, or browse live stock balance and reorder reports.
        </CardContent>
      </Card>
    </div>
  );
}

function renderModule(
  mod: StoreHubModule,
  onModuleChange: (m: StoreHubModule) => void,
): React.ReactElement {
  switch (mod) {
    case 'sh-welcome':                  return <WelcomePanel />;
    case 'sh-r-welcome':                return <StoreHubWelcomePanel onModuleChange={onModuleChange} />;
    case 'sh-r-stock-check':            return <StockCheckPanel />;
    case 'sh-r-reorder-suggestions':    return <ReorderSuggestionsPanel />;
    case 'sh-r-demand-forecast':        return <DemandForecastPanel />;
    case 'sh-r-cycle-count-status':     return <CycleCountStatusPanel />;
    case 'sh-t-stock-issue-entry':      return <StockIssueEntryPanel onModuleChange={onModuleChange} />;
    case 'sh-t-stock-issue-register':   return <StockIssueRegisterPanel onModuleChange={onModuleChange} />;
    case 'sh-t-receipt-ack':            return <StockReceiptAckPanel />;
    default:                            return <StoreHubWelcomePanel onModuleChange={onModuleChange} />;
  }
}

export default function StoreHubPage(): JSX.Element {
  const [activeModule, setActiveModule] = useState<StoreHubModule>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('sh-')) return hash as StoreHubModule;
    return 'sh-r-welcome';
  });

  useEffect(() => {
    if (activeModule !== 'sh-r-welcome') {
      window.history.replaceState(null, '', `#${activeModule}`);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [activeModule]);

  return (
    <SidebarProvider defaultOpen>
      <StoreHubSidebar activeModule={activeModule} onModuleChange={setActiveModule} />
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
