/**
 * @file        src/apps/erp/configs/engineeringx-shell-config.ts
 * @purpose     Canonical Shell config for EngineeringX · 9th card on Shell pattern at v21
 * @who         Engineering Lead · all departments
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.10 EngineeringX Foundation · Q-LOCK-4a + Q-LOCK-6a · Block D.2
 * @iso         ISO 25010 Maintainability · Usability
 * @whom        Audit Owner
 * @decisions   D-250 (Shell pattern lock · FR-58) · D-NEW-CC keyboard namespace 'e *'
 * @disciplines FR-30 · FR-58
 * @reuses      @/shell/types ShellConfig · engineeringx-sidebar-config (sibling)
 * @[JWT]       N/A (config only)
 */
import type { ShellConfig } from '@/shell/types';
import { engineeringxSidebarItems } from './engineeringx-sidebar-config';

export const engineeringxShellConfig: ShellConfig = {
  product: {
    id: 'erp',
    name: 'Operix ERP — EngineeringX',
    code: 'EX',
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
    items: engineeringxSidebarItems,
    collapsible: true,
    defaultCollapsed: false,
    width: 280,
    grouping: 'sections',
  },
  routing: {
    landingRoute: '/erp/engineeringx',
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
