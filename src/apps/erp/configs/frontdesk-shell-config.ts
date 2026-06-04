/**
 * @file        src/apps/erp/configs/frontdesk-shell-config.ts
 * @purpose     Canonical Shell config for FrontDesk MVP.
 * @sprint      Sprint 145 · T-FrontDesk-A6F.1 · Pillar A.6-F · Block 4
 * @decisions   D-250 Shell pattern lock · FR-58 · D-NEW-CC keyboard 'f *'.
 * @reuses      @/shell/types ShellConfig · frontdesk-sidebar-config (sibling).
 * @[JWT]       N/A (config only)
 */
import type { ShellConfig } from '@/shell/types';
import { frontdeskSidebarItems } from './frontdesk-sidebar-config';

export const frontdeskShellTitle = 'FrontDesk';

export const frontdeskShellConfig: ShellConfig & { title: string } = {
  title: frontdeskShellTitle,
  product: { id: 'erp', name: 'Operix ERP — FrontDesk', code: 'FD', version: '1.0.0' },
  theme: { accent: 'cyan', mode: 'auto' },
  header: {
    logo: { src: '/operix-logo.svg', alt: 'Operix' },
    breadcrumb: true,
    chips: [{ type: 'entity-selector' }, { type: 'branch-selector' }],
    showSearch: true,
    showNotifications: true,
    showAppSwitcher: true,
    showProfileMenu: true,
  },
  sidebar: { items: frontdeskSidebarItems, collapsible: true, defaultCollapsed: false, width: 260, grouping: 'sections' },
  routing: { landingRoute: '/erp/frontdesk', notFoundRoute: '/erp/404', permissionDeniedRoute: '/erp/403' },
  behaviour: { keyboardShortcuts: true, commandPalette: true, recentActivityDrawer: true, guidedTour: true, languages: ['en-IN'] },
};
