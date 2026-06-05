/**
 * @file        src/apps/erp/configs/webstorex-shell-config.ts
 * @purpose     Canonical Shell config for WebStoreX PIM + Catalog.
 * @sprint      Sprint 149 · T-WebStoreX-A11.1
 */
import type { ShellConfig } from '@/shell/types';
import { webstorexSidebarItems } from './webstorex-sidebar-config';

export const webstorexShellTitle = 'WebStoreX';

export const webstorexShellConfig: ShellConfig & { title: string } = {
  title: webstorexShellTitle,
  product: { id: 'erp', name: 'Operix ERP — WebStoreX', code: 'WSX', version: '1.0.0' },
  theme: { accent: 'amber', mode: 'auto' },
  header: {
    logo: { src: '/operix-logo.svg', alt: 'Operix' },
    breadcrumb: true,
    chips: [{ type: 'entity-selector' }, { type: 'branch-selector' }],
    showSearch: true,
    showNotifications: true,
    showAppSwitcher: true,
    showProfileMenu: true,
  },
  sidebar: { items: webstorexSidebarItems, collapsible: true, defaultCollapsed: false, width: 240, grouping: 'sections' },
  routing: { landingRoute: '/erp/webstorex', notFoundRoute: '/erp/404', permissionDeniedRoute: '/erp/403' },
  behaviour: { keyboardShortcuts: true, commandPalette: true, recentActivityDrawer: true, guidedTour: true, languages: ['en-IN'] },
};
