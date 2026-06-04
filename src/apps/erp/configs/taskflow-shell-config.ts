/**
 * @file        src/apps/erp/configs/taskflow-shell-config.ts
 * @purpose     TaskFlow shell config · OWN shell (NO commandCenterShellConfig borrow)
 * @sprint      Sprint 137 · T-TaskFlow-A641.1 · Phase 8 OPENER · Block 3
 * @decisions   DP-D3-1 self-owned-shell precedent · FP&A lesson applied
 *              Mirror comply360-shell-config pattern
 */
import type { ShellConfig } from '@/shell/types';
import { taskflowSidebarItems } from './taskflow-sidebar-config';

export const taskflowShellConfig: ShellConfig = {
  product: {
    id: 'erp',
    name: 'Operix ERP — TaskFlow',
    code: 'TASK',
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
    items: taskflowSidebarItems,
    collapsible: true,
    defaultCollapsed: false,
    width: 260,
    grouping: 'flat',
  },
  routing: {
    landingRoute: '/erp/taskflow',
    notFoundRoute: '/erp/404',
    permissionDeniedRoute: '/erp/403',
  },
  behaviour: {
    keyboardShortcuts: true,
    commandPalette: true,
    recentActivityDrawer: true,
    guidedTour: false,
    languages: ['en-IN'],
  },
};
