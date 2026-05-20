/**
 * @file        src/pages/erp/eximx/EximXImportLayout.tsx
 * @purpose     Layout for EximX-Import sub-module · 6-group sidebar · IEC Master active
 * @sprint      T-Phase-1.EX-1-EximX-Foundation
 */
import { useState, useEffect } from 'react';
import { Shell } from '@/shell';
import type { ShellConfig } from '@/shell/types';
import { eximxImportSidebarItems } from '@/apps/erp/configs/eximx-import-sidebar-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { IECMaster } from './masters/IECMaster';
import { CustomsTariffHeadMaster } from './masters/CustomsTariffHeadMaster';
import { FTAPreferenceTable } from './masters/FTAPreferenceTable';
import { PortExtensionEditor } from './masters/PortExtensionEditor';
import { seedSinhaEximX } from '@/data/sinha-eximx-seed';
import type { EximXImportModule } from './EximX.types';

const config: ShellConfig & { title: string } = {
  title: 'EximX · Import',
  product: { id: 'erp', name: 'Operix ERP — EximX Import', code: 'EXI', version: '1.0.0' },
  theme: { accent: 'amber', mode: 'auto' },
  header: {
    logo: { src: '/operix-logo.svg', alt: 'Operix' },
    breadcrumb: true,
    chips: [{ type: 'entity-selector' }, { type: 'branch-selector' }, { type: 'financial-year' }],
    showSearch: true, showNotifications: true, showAppSwitcher: true, showProfileMenu: true,
  },
  sidebar: { items: eximxImportSidebarItems, collapsible: true, defaultCollapsed: false, width: 280, grouping: 'sections' },
  routing: { landingRoute: '/erp/eximx/import', notFoundRoute: '/erp/404', permissionDeniedRoute: '/erp/403' },
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

export default function EximXImportLayout(): JSX.Element {
  const [active, setActive] = useState<EximXImportModule>('import-welcome');
  const { entitlements, profile } = useCardEntitlement();

  useEffect(() => { seedSinhaEximX(); }, []);

  return (
    <Shell
      config={config}
      userProfile={profile}
      tenantEntitlements={entitlements}
      onSidebarItemClick={(item) => { if (item.moduleId) setActive(item.moduleId as EximXImportModule); }}
    >
      <div className="p-4 md:p-6 animate-fade-in">
        {active === 'iec-master' && <IECMaster />}
        {active === 'cth-master' && <CustomsTariffHeadMaster />}
        {active === 'fta-preference' && <FTAPreferenceTable />}
        {active === 'port-extension' && <PortExtensionEditor />}
        {active === 'import-welcome' && <ComingSoon label="Import Welcome (EX-6)" />}
        {!['iec-master', 'cth-master', 'fta-preference', 'port-extension', 'import-welcome'].includes(active) && (
          <ComingSoon label={active} />
        )}
      </div>
    </Shell>
  );
}
