/**
 * @file        src/apps/erp/configs/requestx-shell-config.ts
 * @purpose     Canonical Shell config for RequestX (Internal request hub) · canonical Shell adoption
 * @who         All department staff · HOD · Purchase team · Finance · Top management
 * @when        2026-05-18
 * @sprint      T-Phase-1.D-RequestX-Shell-Migration · Q-LOCK 5th FR-81 application
 * @iso         ISO 25010 Maintainability · Usability
 * @whom        Audit Owner
 * @decisions   D-250 (Shell pattern lock · FR-58) · FR-81 canonical sibling pattern adoption (5th application)
 * @disciplines FR-30 · FR-58 · FR-81
 * @reuses      @/shell/types ShellConfig · requestx-sidebar-config (sibling)
 * @[JWT]       N/A (config only)
 *
 * Theme accent: 'rose' · empirically unused across 11 sibling Shell configs ·
 *   warm tone fits intake/request semantic · pairs with 'amber' (Procure360) procurement family.
 */
import type { ShellConfig } from '@/shell/types';
import { requestxSidebarItems } from './requestx-sidebar-config';

export const requestxShellTitle = 'RequestX';

export const requestxShellConfig: ShellConfig & { title: string } = {
  title: requestxShellTitle,
  product: { id: 'erp', name: 'Operix ERP — RequestX', code: 'RX', version: '1.0.0' },
  theme: { accent: 'rose', mode: 'auto' },
  header: {
    logo: { src: '/operix-logo.svg', alt: 'Operix' },
    breadcrumb: true,
    chips: [{ type: 'entity-selector' }, { type: 'branch-selector' }, { type: 'financial-year' }],
    showSearch: true,
    showNotifications: true,
    showAppSwitcher: true,
    showProfileMenu: true,
  },
  sidebar: { items: requestxSidebarItems, collapsible: true, defaultCollapsed: false, width: 280, grouping: 'sections' },
  routing: { landingRoute: '/erp/requestx', notFoundRoute: '/erp/404', permissionDeniedRoute: '/erp/403' },
  behaviour: { keyboardShortcuts: true, commandPalette: true, recentActivityDrawer: true, guidedTour: true, languages: ['en-IN'] },
};
