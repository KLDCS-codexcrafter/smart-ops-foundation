/**
 * @file        src/pages/erp/supplyx/SupplyXPage.tsx
 * @purpose     SupplyX entry shell · canonical Shell consumer · internal procurement read-only mirror
 * @who         Internal Procurement · Buyer · Procurement Manager
 * @when        2026-05-09 (T1 Shell retrofit)
 * @sprint      T-Phase-1.A.9.T1 · Q-LOCK-T1-F1 · Block A.2 · Shell retrofit
 * @iso         ISO 25010 Maintainability · Usability
 * @whom        Audit Owner
 * @decisions   D-282 (SupplyX as Procure360 internal mirror) · D-250 (Shell pattern lock · FR-58) ·
 *              Q-LOCK-T1-F1 · Shell retrofit (A.9.T1 · canonical pattern lock per FR-58)
 * @disciplines FR-30 · FR-58
 * @reuses      @/shell Shell · supplyx-shell-config · panels · SupplyXModule type
 * @[JWT]       N/A (page shell)
 */
import { useState } from 'react';
import { Shell } from '@/shell';
import { supplyxShellConfig } from '@/apps/erp/configs/supplyx-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  SupplyXWelcome,
  OpenRfqsPanel,
  PendingQuotationsPanel,
  PendingAwardsPanel,
} from './panels';
import type { SupplyXModule } from './SupplyXSidebar.types';

export default function SupplyXPage(): JSX.Element {
  const [active, setActive] = useState<SupplyXModule>('welcome');
  const { entitlements, profile } = useCardEntitlement();

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
    <Shell
      config={supplyxShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      contextFlags={{ accounting_mode: 'standalone' }}
      onSidebarItemClick={(item) => {
        if (item.moduleId) setActive(item.moduleId as SupplyXModule);
      }}
    >
      {render()}
    </Shell>
  );
}
