/**
 * @file        procure360-shell-config.ts
 * @purpose     Complete ShellConfig for Procure360 Hub card · 4th card on canonical Shell pattern
 * @who         Procurement department · cross-dept consumers
 * @when        Phase 1.A.3.a · Procure360 Shell Migration sprint
 * @sprint      T-Phase-1.A.3.a-Procure360-Shell-Migration
 * @iso         Maintainability · Compatibility (ISO 25010)
 * @decisions   D-250 (Shell pattern lock · FR-58) · D-NEW-AC (Procure360 = 4th card adoption)
 * @reuses      @/shell/types ShellConfig · procure360-sidebar-config (sibling)
 * @[JWT]       N/A (config only)
 */

import type { ShellConfig } from '@/shell/types';
import { procure360SidebarItems } from './procure360-sidebar-config';

export const procure360ShellConfig: ShellConfig = {
  product: {
    id: 'erp',
    name: 'Operix ERP — Procure 360',
    code: 'P360',
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
      { type: 'financial-year' },
      { type: 'tally-sync-status', condition: 'accounting_mode==tally_bridge' },
    ],
    showSearch: true,
    showNotifications: true,
    showAppSwitcher: true,
    showProfileMenu: true,
  },
  sidebar: {
    items: procure360SidebarItems,
    collapsible: true,
    defaultCollapsed: false,
    width: 280,
    grouping: 'sections',
  },
  routing: {
    landingRoute: '/erp/procure-hub',
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
