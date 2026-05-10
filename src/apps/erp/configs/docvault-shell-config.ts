/**
 * @file        src/apps/erp/configs/docvault-shell-config.ts
 * @purpose     Canonical Shell config for DocVault · ready for Shell adoption
 * @who         Document Controller · all departments
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.9 BUNDLED · Q-LOCK-7a · Block C.3
 * @iso         ISO 25010 Maintainability · Usability
 * @whom        Audit Owner
 * @decisions   D-250 (Shell pattern lock · FR-58) · D-NEW-CC keyboard namespace 'd *'
 * @disciplines FR-30 · FR-58
 * @reuses      @/shell/types ShellConfig · docvault-sidebar-config (sibling)
 * @[JWT]       N/A (config only)
 */
import type { ShellConfig } from '@/shell/types';
import { docVaultSidebarItems } from './docvault-sidebar-config';

export const docvaultShellTitle = 'DocVault';

export const docvaultShellConfig: ShellConfig & { title: string } = {
  title: docvaultShellTitle,
  product: { id: 'erp', name: 'Operix ERP — DocVault', code: 'DV', version: '1.0.0' },
  theme: { accent: 'violet', mode: 'auto' },
  header: {
    logo: { src: '/operix-logo.svg', alt: 'Operix' },
    breadcrumb: true,
    chips: [{ type: 'entity-selector' }, { type: 'branch-selector' }, { type: 'financial-year' }],
    showSearch: true,
    showNotifications: true,
    showAppSwitcher: true,
    showProfileMenu: true,
  },
  sidebar: { items: docVaultSidebarItems, collapsible: true, defaultCollapsed: false, width: 280, grouping: 'sections' },
  routing: { landingRoute: '/erp/docvault', notFoundRoute: '/erp/404', permissionDeniedRoute: '/erp/403' },
  behaviour: { keyboardShortcuts: true, commandPalette: true, recentActivityDrawer: true, guidedTour: true, languages: ['en-IN'] },
};
