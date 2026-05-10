/**
 * @file        src/apps/erp/configs/store-hub-shell-config.ts
 * @purpose     Canonical Shell config for Store Hub (Department Stores) · ready for Shell adoption
 * @who         Store Keeper · Department Heads · Storekeeper Supervisor
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.9 BUNDLED · Q-LOCK-7a · Block C.1
 * @iso         ISO 25010 Maintainability · Usability
 * @whom        Audit Owner
 * @decisions   D-250 (Shell pattern lock · FR-58) · D-NEW-CK related (this is INTERNAL · contrast with Logistics external portal)
 * @disciplines FR-30 · FR-58
 * @reuses      @/shell/types ShellConfig · store-hub-sidebar-config (sibling)
 * @[JWT]       N/A (config only)
 */
import type { ShellConfig } from '@/shell/types';
import { storeHubSidebarItems } from './store-hub-sidebar-config';

export const storeHubShellTitle = 'Department Stores';

export const storeHubShellConfig: ShellConfig & { title: string } = {
  title: storeHubShellTitle,
  product: { id: 'erp', name: 'Operix ERP — Department Stores', code: 'SH', version: '1.0.0' },
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
  sidebar: { items: storeHubSidebarItems, collapsible: true, defaultCollapsed: false, width: 280, grouping: 'sections' },
  routing: { landingRoute: '/erp/store-hub', notFoundRoute: '/erp/404', permissionDeniedRoute: '/erp/403' },
  behaviour: { keyboardShortcuts: true, commandPalette: true, recentActivityDrawer: true, guidedTour: true, languages: ['en-IN'] },
};
