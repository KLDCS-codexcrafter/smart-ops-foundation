/**
 * @file        src/apps/erp/configs/servicedesk-shell-config.ts
 * @purpose     Canonical Shell config for ServiceDesk · 12th card on Shell
 * @sprint      T-Phase-1.C.1a · Block F.4 · v2 spec
 * @decisions   D-250 Shell pattern · D-NEW-CC 'd *'
 * @iso        Usability + Maintainability
 */
import type { ShellConfig } from '@/shell/types';
import { servicedeskSidebarItems } from './servicedesk-sidebar-config';

export const servicedeskShellConfig: ShellConfig = {
  product: {
    id: 'erp',
    name: 'Operix ERP — ServiceDesk',
    code: 'SD',
    version: '1.0.0',
  },
  theme: {
    accent: 'amber',
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
    items: servicedeskSidebarItems,
    collapsible: true,
    defaultCollapsed: false,
    width: 280,
    grouping: 'sections',
  },
  routing: {
    landingRoute: '/erp/servicedesk',
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
