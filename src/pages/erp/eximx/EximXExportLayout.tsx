/**
 * @file        src/pages/erp/eximx/EximXExportLayout.tsx
 * @purpose     Layout for EximX-Export sub-module · 7-group sidebar · LUT Master active
 * @sprint      T-Phase-1.EX-1-EximX-Foundation
 */
import { useState, useEffect } from 'react';
import { Shell } from '@/shell';
import type { ShellConfig } from '@/shell/types';
import { eximxExportSidebarItems } from '@/apps/erp/configs/eximx-export-sidebar-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { LUTMaster } from './masters/LUTMaster';
import { seedSinhaEximX } from '@/data/sinha-eximx-seed';
import type { EximXExportModule } from './EximX.types';

const config: ShellConfig & { title: string } = {
  title: 'EximX · Export',
  product: { id: 'erp', name: 'Operix ERP — EximX Export', code: 'EXE', version: '1.0.0' },
  theme: { accent: 'emerald', mode: 'auto' },
  header: {
    logo: { src: '/operix-logo.svg', alt: 'Operix' },
    breadcrumb: true,
    chips: [{ type: 'entity-selector' }, { type: 'branch-selector' }, { type: 'financial-year' }],
    showSearch: true, showNotifications: true, showAppSwitcher: true, showProfileMenu: true,
  },
  sidebar: { items: eximxExportSidebarItems, collapsible: true, defaultCollapsed: false, width: 280, grouping: 'sections' },
  routing: { landingRoute: '/erp/eximx/export', notFoundRoute: '/erp/404', permissionDeniedRoute: '/erp/403' },
  behaviour: { keyboardShortcuts: true, commandPalette: true, recentActivityDrawer: true, guidedTour: true, languages: ['en-IN'] },
};

function ComingSoon({ label }: { label: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <p className="text-lg font-semibold">{label}</p>
      <p className="text-sm mt-2">Coming in subsequent EX-2 through EX-12 sprints</p>
    </div>
  );
}

export default function EximXExportLayout(): JSX.Element {
  const [active, setActive] = useState<EximXExportModule>('export-welcome');
  const { entitlements, profile } = useCardEntitlement();

  useEffect(() => { seedSinhaEximX(); }, []);

  return (
    <Shell
      config={config}
      userProfile={profile}
      tenantEntitlements={entitlements}
      onSidebarItemClick={(item) => { if (item.moduleId) setActive(item.moduleId as EximXExportModule); }}
    >
      <div className="p-4 md:p-6 animate-fade-in">
        {active === 'lut-master' && <LUTMaster />}
        {active === 'export-welcome' && <ComingSoon label="Export Welcome (EX-7a)" />}
        {!['lut-master', 'export-welcome'].includes(active) && <ComingSoon label={active} />}
      </div>
    </Shell>
  );
}
