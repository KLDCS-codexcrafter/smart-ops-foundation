/**
 * @file        src/apps/erp/configs/supplyx-shell-config.ts
 * @purpose     Canonical Shell config for SupplyX · ready for Shell adoption
 * @who         Internal Procurement · Buyer · Procurement Manager
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.9 BUNDLED · Q-LOCK-7a · Block C.2
 * @iso         ISO 25010 Maintainability · Usability
 * @whom        Audit Owner
 * @decisions   D-250 (Shell pattern lock · FR-58) · D-NEW-CK related (this is INTERNAL mirror)
 * @disciplines FR-30 · FR-58
 * @reuses      @/shell/types ShellConfig · supplyx-sidebar-config (sibling)
 * @[JWT]       N/A (config only)
 */
import type { ShellConfig } from '@/shell/types';
import { supplyXSidebarItems } from './supplyx-sidebar-config';

export const supplyxShellTitle = 'SupplyX';

export const supplyxShellConfig: ShellConfig & { title: string } = {
  title: supplyxShellTitle,
  product: { id: 'erp', name: 'Operix ERP — SupplyX', code: 'SX', version: '1.0.0' },
  theme: { accent: 'emerald', mode: 'auto' },
  header: {
    logo: { src: '/operix-logo.svg', alt: 'Operix' },
    breadcrumb: true,
    chips: [{ type: 'entity-selector' }, { type: 'branch-selector' }, { type: 'financial-year' }],
    showSearch: true,
    showNotifications: true,
    showAppSwitcher: true,
    showProfileMenu: true,
  },
  sidebar: { items: supplyXSidebarItems, collapsible: true, defaultCollapsed: false, width: 280, grouping: 'sections' },
  routing: { landingRoute: '/erp/supplyx', notFoundRoute: '/erp/404', permissionDeniedRoute: '/erp/403' },
  behaviour: { keyboardShortcuts: true, commandPalette: true, recentActivityDrawer: true, guidedTour: true, languages: ['en-IN'] },
};
