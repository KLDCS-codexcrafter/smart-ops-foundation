/**
 * @file        src/pages/erp/insightx/InsightXPage.tsx
 * @page        Landing surface + module-switch host for the InsightX self-owned card.
 * @sprint      Sprint 130 · S131 (+cockpit/viewer) · S132 (+lens-explorer/drill-to-root)
 */
import { useState, useCallback } from 'react';
import { Shell } from '@/shell';
import { insightxShellConfig } from '@/apps/erp/configs/insightx-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { SidebarItem } from '@/shell/types';
import type { InsightXModule } from './InsightXSidebar.types';

import InsightXOverviewPage from '@/features/insightx-overview/InsightXOverviewPage';
import InsightXCockpitPage from '@/features/insightx-cockpit/InsightXCockpitPage';
import ReportViewerPage from '@/features/insightx-report-viewer/ReportViewerPage';
import LensExplorerPage from '@/features/insightx-lens-explorer/LensExplorerPage';
import DrillToRootPage from '@/features/insightx-drill-to-root/DrillToRootPage';
import OperixScorePage from '@/features/insightx-operix-score/OperixScorePage';

const KNOWN_MODULES = new Set<InsightXModule>([
  'ix-overview',
  'ix-cockpit',
  'ix-viewer',
  'ix-lens-explorer',
  'ix-drill-to-root',
  'ix-operix-score',
]);

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
      case 'ix-cockpit':
        return <InsightXCockpitPage />;
      case 'ix-viewer':
        return <ReportViewerPage />;
      case 'ix-lens-explorer':
        return <LensExplorerPage />;
      case 'ix-drill-to-root':
        return <DrillToRootPage />;
      case 'ix-operix-score':
        return <OperixScorePage />;
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
