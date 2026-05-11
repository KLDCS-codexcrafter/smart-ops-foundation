/**
 * @file        src/pages/erp/sitex/SiteXPage.tsx
 * @purpose     SiteX main page · Shell pattern · activeModule switch · matches A.13 EngineeringXPage precedent
 * @sprint      T-Phase-1.A.14 SiteX Foundation · Q-LOCK-9a + Q-LOCK-13a · Block D.1 · Shell migration · A.14 ONLY exception
 * @decisions   D-250 Shell pattern lock · FR-58 · D-NEW-CC 's *' · D-NEW-CT 17th canonical · D-NEW-CU POSSIBLE
 */
import { useState } from 'react';
import { Shell } from '@/shell';
import { sitexShellConfig } from '@/apps/erp/configs/sitex-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { SiteXModule } from './SiteXSidebar.types';
import { SiteXWelcome } from './SiteXWelcome';
import { SiteList } from './transactions/SiteList';

export default function SiteXPage(): JSX.Element {
  const [activeModule, setActiveModule] = useState<SiteXModule>('welcome');
  const { entitlements, profile } = useCardEntitlement();

  const renderModule = (): JSX.Element => {
    switch (activeModule) {
      case 'welcome':   return <SiteXWelcome onNavigate={setActiveModule} />;
      case 'site-list': return <SiteList onNavigate={setActiveModule} />;
      // A.15 modules wired here as registers/transactions/closeout land
      default:          return <SiteXWelcome onNavigate={setActiveModule} />;
    }
  };

  return (
    <Shell
      config={sitexShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      breadcrumbs={[{ label: 'ERP', href: '/erp/dashboard' }, { label: 'SiteX' }]}
      onSidebarItemClick={(item) => {
        if (item.moduleId) setActiveModule(item.moduleId as SiteXModule);
      }}
    >
      {renderModule()}
    </Shell>
  );
}
