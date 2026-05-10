/**
 * @file        src/pages/erp/store-hub/StoreHubPage.tsx
 * @purpose     Store Hub entry shell · canonical Shell consumer · 11 modules render
 * @who         Store Keeper · Department Heads · Storekeeper Supervisor
 * @when        2026-05-09 (T1 Shell retrofit)
 * @sprint      T-Phase-1.A.9.T1 · Q-LOCK-T1-F1 · Block A.1 · Shell retrofit
 * @iso         ISO 25010 Maintainability · Usability
 * @whom        Audit Owner
 * @decisions   D-379 (module-based Shell · matches DispatchHubPage pattern) · D-250 (Shell pattern lock · FR-58) ·
 *              D-NEW-CK related (this is INTERNAL · contrast with Logistics external portal) ·
 *              Q-LOCK-T1-F1 · Shell retrofit (A.9.T1 · canonical pattern lock per FR-58)
 * @disciplines FR-30 · FR-58
 * @reuses      @/shell Shell · store-hub-shell-config · panels · transactions · reports
 * @[JWT]       Multiple via panels (see panel files for endpoints)
 */
import { useState, useEffect } from 'react';
import { Shell } from '@/shell';
import { storeHubShellConfig } from '@/apps/erp/configs/store-hub-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Warehouse } from 'lucide-react';
import type { StoreHubModule } from './StoreHubSidebar';
import {
  StockCheckPanel, ReorderSuggestionsPanel, DemandForecastPanel,
} from './StoreHubPanels';
import { StockIssueEntryPanel } from './transactions/StockIssueEntry';
import { StockIssueRegisterPanel } from './transactions/StockIssueRegister';
import { StockReceiptAckPanel } from './transactions/StockReceiptAck';
import { CycleCountStatusPanel } from './reports/CycleCountStatus';
import { StockMovementRegisterPanel } from './reports/StockMovementRegister';
import { DepartmentConsumptionSummaryPanel } from './reports/DepartmentConsumptionSummary';
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
    case 'sh-r-stock-movement-register':         return <StockMovementRegisterPanel />;
    case 'sh-r-department-consumption-summary':  return <DepartmentConsumptionSummaryPanel />;
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
  const { entitlements, profile } = useCardEntitlement();

  useEffect(() => {
    if (activeModule !== 'sh-r-welcome') {
      window.history.replaceState(null, '', `#${activeModule}`);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [activeModule]);

  return (
    <Shell
      config={storeHubShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      contextFlags={{ accounting_mode: 'standalone' }}
      onSidebarItemClick={(item) => {
        if (item.moduleId) setActiveModule(item.moduleId as StoreHubModule);
      }}
    >
      <div className="p-4 md:p-6 animate-fade-in">
        {renderModule(activeModule, setActiveModule)}
      </div>
    </Shell>
  );
}
