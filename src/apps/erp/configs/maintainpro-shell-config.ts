/**
 * @file        src/apps/erp/configs/maintainpro-shell-config.ts
 * @purpose     Canonical Shell config for MaintainPro · 11th card on Shell · Q-LOCK-8
 * @who         Maintenance teams
 * @when        2026-05-12
 * @sprint      T-Phase-1.A.16a · Block C.2
 * @whom        Audit Owner
 * @decisions   D-250 Shell pattern · D-NEW-CC 'm *'
 * @disciplines FR-30 · FR-58
 * @reuses      ShellConfig from @/shell/types · maintainproSidebarItems sibling
 * @[JWT]       N/A (config only)
 */
import type { ShellConfig } from '@/shell/types';
import { maintainproSidebarItems } from './maintainpro-sidebar-config';

export const maintainproShellConfig: ShellConfig = {
  product: {
    id: 'erp',
    name: 'Operix ERP — MaintainPro',
    code: 'MP',
    version: '1.0.0',
  },
  theme: {
    accent: 'cyan',
    mode: 'auto',
  },
  header: {
    logo: { src: '/operix-logo.svg', alt: 'Operix' },
    breadcrumb: true,
    chips: [
      { type: 'entity-selector' },
      { type: 'branch-selector' },
    ],
    showSearch: true,
    showNotifications: true,
    showAppSwitcher: true,
    showProfileMenu: true,
  },
  sidebar: {
    items: maintainproSidebarItems,
    collapsible: true,
    defaultCollapsed: false,
    width: 280,
    grouping: 'sections',
  },
  routing: {
    landingRoute: '/erp/maintainpro',
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
