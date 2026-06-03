/**
 * @file        src/pages/erp/insightx/InsightXPage.tsx
 * @page        Landing surface + module-switch host for the InsightX self-owned card.
 * @sprint      Sprint 130 · T-Phase-7.D.3.1 · 🌟 ARC D.3 OPENER · DP-D3-1
 * @decisions   InsightX becomes ACTIVE and self-owned (own shell · NOT CC-shell borrow ·
 *              the FP&A lesson applied · set right from the start).
 */
import { useState, useCallback } from 'react';
import { Shell } from '@/shell';
import { insightxShellConfig } from '@/apps/erp/configs/insightx-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { SidebarItem } from '@/shell/types';
import type { InsightXModule } from './InsightXSidebar.types';

import InsightXOverviewPage from '@/features/insightx-overview/InsightXOverviewPage';

const KNOWN_MODULES = new Set<InsightXModule>(['ix-overview']);

export default function InsightXPage() {
  const { profile, entitlements } = useCardEntitlement();
  const [activeModule, setActiveModule] = useState<InsightXModule>('ix-overview');

  const handleSidebarItemClick = useCallback((item: SidebarItem) => {
    const id = (item.moduleId ?? item.id) as string;
    if (KNOWN_MODULES.has(id as InsightXModule)) {
      setActiveModule(id as InsightXModule);
    }
  }, []);

  const renderModule = () => {
    switch (activeModule) {
      case 'ix-overview':
      default:
        return <InsightXOverviewPage />;
    }
  };

  return (
    <Shell
      config={insightxShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      breadcrumbs={[
        { label: 'ERP', href: '/erp/dashboard' },
        { label: 'InsightX' },
      ]}
      onSidebarItemClick={handleSidebarItemClick}
    >
      {renderModule()}
    </Shell>
  );
}
