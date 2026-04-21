/**
 * command-center-shell-config.ts — Complete ShellConfig for Command Center
 *
 * Command Center is internal ERP, not a separate product. It uses the 'erp' product id
 * with indigo accent. Unlike standalone cards, it uses moduleId-based navigation
 * (internal module switching) rather than route-based.
 */

import type { ShellConfig } from '@/shell/types';
import { commandCenterSidebarItems } from './command-center-sidebar-config';

export const commandCenterShellConfig: ShellConfig = {
  product: {
    id: 'erp',
    name: 'Operix ERP — Command Center',
    code: 'CC',
    version: '1.0.0',
  },
  theme: {
    accent: 'indigo',
    mode: 'auto',
  },
  header: {
    logo: { src: '/operix-logo.svg', alt: 'Operix' },
    breadcrumb: true,
    chips: [
      { type: 'entity-selector' },
      { type: 'financial-year' },
      { type: 'tally-sync-status', condition: 'accounting_mode==tally_bridge' },
    ],
    showSearch: true,
    showNotifications: true,
    showAppSwitcher: true,
    showProfileMenu: true,
  },
  sidebar: {
    items: commandCenterSidebarItems,
    collapsible: true,
    defaultCollapsed: false,
    width: 280,
    grouping: 'sections',
  },
  routing: {
    landingRoute: '/erp/command-center',
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
