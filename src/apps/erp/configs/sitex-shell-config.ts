/**
 * @file        src/apps/erp/configs/sitex-shell-config.ts
 * @purpose     Canonical Shell config for SiteX · 10th card on Shell pattern · Q-LOCK-9a · FR-58
 * @who         Site Manager · Site Engineer · all site-bound departments
 * @when        2026-05-11
 * @sprint      T-Phase-1.A.14 SiteX Foundation · Q-LOCK-9a + Q-LOCK-10a · Block C.2 · NEW canonical
 * @iso         ISO 25010 Maintainability · Usability
 * @whom        Audit Owner
 * @decisions   D-250 Shell pattern lock · D-NEW-CC 's *'
 * @disciplines FR-30 · FR-58 Shell pattern
 * @reuses      ShellConfig from @/shell/types · sitexSidebarItems (sibling)
 * @[JWT]       N/A (config only)
 */
import type { ShellConfig } from '@/shell/types';
import { sitexSidebarItems } from './sitex-sidebar-config';

export const sitexShellConfig: ShellConfig = {
  product: {
    id: 'erp',
    name: 'Operix ERP — SiteX',
    code: 'SX',
    version: '1.0.0',
  },
  theme: {
    accent: 'orange',
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
    items: sitexSidebarItems,
    collapsible: true,
    defaultCollapsed: false,
    width: 280,
    grouping: 'sections',
  },
  routing: {
    landingRoute: '/erp/sitex',
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
