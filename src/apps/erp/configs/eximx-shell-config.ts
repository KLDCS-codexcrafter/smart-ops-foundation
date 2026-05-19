/**
 * @file        src/apps/erp/configs/eximx-shell-config.ts
 * @purpose     Top-level EximX Shell config · routes to sub-module selector
 * @sprint      T-Phase-1.EX-1-EximX-Foundation · 7th FR-81 application
 * @decisions   v10 FINAL Q15=b sub-module split · EX-1-Q1=a path-based routing · FR-81
 */
import type { ShellConfig } from '@/shell/types';
import { eximxSidebarItems } from './eximx-sidebar-config';

export const eximxShellTitle = 'EximX';

export const eximxShellConfig: ShellConfig & { title: string } = {
  title: eximxShellTitle,
  product: { id: 'erp', name: 'Operix ERP — EximX', code: 'EX', version: '1.0.0' },
  theme: { accent: 'indigo', mode: 'auto' },
  header: {
    logo: { src: '/operix-logo.svg', alt: 'Operix' },
    breadcrumb: true,
    chips: [{ type: 'entity-selector' }, { type: 'branch-selector' }, { type: 'financial-year' }],
    showSearch: true,
    showNotifications: true,
    showAppSwitcher: true,
    showProfileMenu: true,
  },
  sidebar: { items: eximxSidebarItems, collapsible: true, defaultCollapsed: false, width: 280, grouping: 'sections' },
  routing: { landingRoute: '/erp/eximx', notFoundRoute: '/erp/404', permissionDeniedRoute: '/erp/403' },
  behaviour: { keyboardShortcuts: true, commandPalette: true, recentActivityDrawer: true, guidedTour: true, languages: ['en-IN'] },
};
