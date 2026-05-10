/**
 * @file        qualicheck-shell-config.ts
 * @purpose     Complete ShellConfig for QualiCheck (QualiCheck) card · QA UI shell
 * @who         Quality Inspector · QA Manager · Vendor Manager
 * @when        Phase 1.A.5.a · QualiCheck Shell Migration sprint
 * @sprint      T-Phase-1.A.5.a-QualiCheck-Shell-Migration
 * @iso         Maintainability · Usability · Compatibility (ISO 25010)
 * @decisions   D-250 (Shell pattern lock · FR-58) · D-NEW-AY (Outcome C split) ·
 *              D-NEW-AZ (Shell adoption · 5th card to migrate)
 * @reuses      @/shell/types ShellConfig · qualicheck-sidebar-config (sibling)
 * @[JWT]       N/A (config only · no API)
 *
 * QualiCheck uses 'erp' product id with violet accent (Quality lane).
 * Module-based navigation (internal switching) like CC/GateFlow ·
 * NOT route-based per-module.
 */
import type { ShellConfig } from '@/shell/types';
import { qualicheckSidebarItems } from './qualicheck-sidebar-config';

export const qualicheckShellConfig: ShellConfig = {
  product: {
    id: 'erp',
    name: 'Operix ERP — QualiCheck',
    code: 'QC',
    version: '1.0.0',
  },
  theme: {
    accent: 'violet',
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
    items: qualicheckSidebarItems,
    collapsible: true,
    defaultCollapsed: false,
    width: 280,
    grouping: 'sections',
  },
  routing: {
    landingRoute: '/erp/qualicheck',
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
