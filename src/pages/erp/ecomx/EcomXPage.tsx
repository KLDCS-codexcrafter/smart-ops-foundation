/**
 * @file        src/pages/erp/ecomx/EcomXPage.tsx
 * @purpose     EcomX entry shell · S153 Channel Foundation · module-switch (no per-route nesting).
 * @sprint      Sprint 153 · EcomX Channel Foundation · DP-EC-1 rename ceremony
 */
import { useState } from 'react';
import { Shell } from '@/shell';
import { ecomxShellConfig } from '@/apps/erp/configs/ecomx-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { EcomXWelcome } from './EcomXWelcome';
import { EcomXDashboardPage } from './dashboard/EcomXDashboardPage';
import { EcomXCockpitPage } from './cockpit/EcomXCockpitPage';
import { EcomXMarketplacesPage } from './marketplaces/EcomXMarketplacesPage';
import { EcomXListingsPage } from './listings/EcomXListingsPage';
import { EcomXUnmappedPage } from './unmapped/EcomXUnmappedPage';
import { EcomXImportCenterPage } from './import-center/EcomXImportCenterPage';
import { EcomXOrdersPage } from './orders/EcomXOrdersPage';
import { EcomXSettlementsPage } from './settlements/EcomXSettlementsPage';
import { EcomXReconciliationPage } from './reconciliation/EcomXReconciliationPage';
import { EcomXClaimsPage } from './claims/EcomXClaimsPage';
import { EcomXReturnsPage } from './returns/EcomXReturnsPage';
import { EcomXAllocationPage } from './allocation/EcomXAllocationPage';
import type { EcomXModule } from './EcomXSidebar.types';

export default function EcomXPage(): JSX.Element {
  const [active, setActive] = useState<EcomXModule>('welcome');
  const { entitlements, profile } = useCardEntitlement();

  const render = (): JSX.Element => {
    switch (active) {
      case 'welcome':        return <EcomXWelcome onNavigate={setActive} />;
      case 'dashboard':      return <EcomXDashboardPage />;
      case 'marketplaces':   return <EcomXMarketplacesPage />;
      case 'listings':       return <EcomXListingsPage />;
      case 'unmapped':       return <EcomXUnmappedPage />;
      case 'import-center':  return <EcomXImportCenterPage />;
      case 'orders':         return <EcomXOrdersPage />;
      case 'settlements':    return <EcomXSettlementsPage />;
      case 'reconciliation': return <EcomXReconciliationPage />;
      case 'claims':         return <EcomXClaimsPage />;
      case 'returns':        return <EcomXReturnsPage />;
      case 'allocation':     return <EcomXAllocationPage />;
      default:               return <div className="p-6 text-sm text-muted-foreground">Module not found.</div>;
    }
  };

  return (
    <Shell
      config={ecomxShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      contextFlags={{ accounting_mode: 'standalone' }}
      onSidebarItemClick={(item) => {
        if (item.moduleId) setActive(item.moduleId as EcomXModule);
      }}
    >
      {render()}
    </Shell>
  );
}
