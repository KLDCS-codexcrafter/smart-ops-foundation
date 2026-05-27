/**
 * @file        src/apps/erp/configs/comply360-shell-config.ts
 * @purpose     Canonical Shell config for Comply360 · 23 mega-menu sidebar
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Block 1
 * @decisions   D-250 Shell pattern · D-S69-2 23 mega-menu · FR-74 'c *' namespace
 * @iso         Usability + Maintainability
 */
import type { ShellConfig } from '@/shell/types';
import { comply360SidebarItems } from './comply360-sidebar-config';

export const comply360ShellConfig: ShellConfig = {
  product: {
    id: 'erp',
    name: 'Operix ERP — Comply360',
    code: 'C360',
    version: '1.0.0',
  },
  theme: {
    accent: 'emerald',
    mode: 'auto',
  },
  header: {
    logo: { src: '/operix-logo.svg', alt: 'Operix' },
    breadcrumb: true,
    chips: [
      { type: 'entity-selector' },
      { type: 'branch-selector' },
      { type: 'financial-year' },
    ],
    showSearch: true,
    showNotifications: true,
    showAppSwitcher: true,
    showProfileMenu: true,
  },
  sidebar: {
    items: comply360SidebarItems,
    collapsible: true,
    defaultCollapsed: false,
    width: 280,
    grouping: 'sections',
  },
  routing: {
    landingRoute: '/erp/comply360',
    notFoundRoute: '/erp/404',
    permissionDeniedRoute: '/erp/403',
  },
  behaviour: {
    keyboardShortcuts: true,
    commandPalette: true,
    recentActivityDrawer: true,
    guidedTour: true,
    languages: ['en-IN'],
  },
};
