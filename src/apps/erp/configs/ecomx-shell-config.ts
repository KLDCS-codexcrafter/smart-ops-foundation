/**
 * @file        src/apps/erp/configs/ecomx-shell-config.ts
 * @purpose     Canonical Shell config for EcomX Channel Foundation.
 * @sprint      Sprint 153 · EcomX Channel Foundation · DP-EC-1 rename ceremony
 */
import type { ShellConfig } from '@/shell/types';
import { ecomxSidebarItems } from './ecomx-sidebar-config';

export const ecomxShellTitle = 'EcomX';

export const ecomxShellConfig: ShellConfig & { title: string } = {
  title: ecomxShellTitle,
  product: { id: 'erp', name: 'Operix ERP — EcomX', code: 'ECX', version: '1.0.0' },
  theme: { accent: 'violet', mode: 'auto' },
  header: {
    logo: { src: '/operix-logo.svg', alt: 'Operix' },
    breadcrumb: true,
    chips: [{ type: 'entity-selector' }, { type: 'branch-selector' }],
    showSearch: true,
    showNotifications: true,
    showAppSwitcher: true,
    showProfileMenu: true,
  },
  sidebar: { items: ecomxSidebarItems, collapsible: true, defaultCollapsed: false, width: 240, grouping: 'sections' },
  routing: { landingRoute: '/erp/ecomx', notFoundRoute: '/erp/404', permissionDeniedRoute: '/erp/403' },
  behaviour: { keyboardShortcuts: true, commandPalette: true, recentActivityDrawer: true, guidedTour: true, languages: ['en-IN'] },
};
