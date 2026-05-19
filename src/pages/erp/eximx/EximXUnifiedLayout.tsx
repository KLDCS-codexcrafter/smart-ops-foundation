/**
 * @file        src/pages/erp/eximx/EximXUnifiedLayout.tsx
 * @purpose     Layout for EximX-Unified sub-module · 3-group sidebar · all items coming_soon in EX-1
 * @sprint      T-Phase-1.EX-1-EximX-Foundation
 */
import { useState } from 'react';
import { Shell } from '@/shell';
import type { ShellConfig } from '@/shell/types';
import { eximxUnifiedSidebarItems } from '@/apps/erp/configs/eximx-unified-sidebar-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { EximXUnifiedModule } from './EximX.types';

const config: ShellConfig & { title: string } = {
  title: 'EximX · Unified',
  product: { id: 'erp', name: 'Operix ERP — EximX Unified', code: 'EXU', version: '1.0.0' },
  theme: { accent: 'violet', mode: 'auto' },
  header: {
    logo: { src: '/operix-logo.svg', alt: 'Operix' },
    breadcrumb: true,
    chips: [{ type: 'entity-selector' }, { type: 'branch-selector' }, { type: 'financial-year' }],
    showSearch: true, showNotifications: true, showAppSwitcher: true, showProfileMenu: true,
  },
  sidebar: { items: eximxUnifiedSidebarItems, collapsible: true, defaultCollapsed: false, width: 280, grouping: 'sections' },
  routing: { landingRoute: '/erp/eximx/unified', notFoundRoute: '/erp/404', permissionDeniedRoute: '/erp/403' },
  behaviour: { keyboardShortcuts: true, commandPalette: true, recentActivityDrawer: true, guidedTour: true, languages: ['en-IN'] },
};

export default function EximXUnifiedLayout(): JSX.Element {
  const [active, setActive] = useState<EximXUnifiedModule>('unified-welcome');
  const { entitlements, profile } = useCardEntitlement();

  return (
    <Shell
      config={config}
      userProfile={profile}
      tenantEntitlements={entitlements}
      onSidebarItemClick={(item) => { if (item.moduleId) setActive(item.moduleId as EximXUnifiedModule); }}
    >
      <div className="p-4 md:p-6 animate-fade-in">
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p className="text-lg font-semibold">{active}</p>
          <p className="text-sm mt-2">Unified cross-module surface · coming in EX-7c (FEMA) + EX-8 (Forex) + EX-9 (Sanctions)</p>
        </div>
      </div>
    </Shell>
  );
}
