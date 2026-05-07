/**
 * @file        gateflow-shell-config.ts
 * @purpose     Complete ShellConfig for GateFlow card · gate management UI shell
 * @who         Operations · Security guards · Gatekeepers · Dispatch supervisors
 * @when        Phase 1.A.1.pre · GateFlow Shell Migration sprint
 * @sprint      T-Phase-1.A.1.pre-GateFlow-Shell-Migration
 * @iso         Maintainability · Usability · Compatibility (ISO 25010)
 * @decisions   D-250 (Shell pattern lock · FR-58) · D-NEW-A (GateFlow adopts CC Shell pattern · 2nd card)
 * @reuses      @/shell/types ShellConfig · gateflow-sidebar-config (sibling)
 * @[JWT]       N/A (config only · no API)
 *
 * GateFlow uses 'erp' product id with cyan accent (Operations lane border-l-cyan-500
 * in Dashboard.tsx). Module-based navigation (internal switching) like CC ·
 * NOT route-based per-module.
 *
 * 2nd card to adopt the canonical Shell pattern (after Command Center).
 * Sets the template for all 31 future card migrations.
 */

import type { ShellConfig } from '@/shell/types';
import { gateflowSidebarItems } from './gateflow-sidebar-config';

export const gateflowShellConfig: ShellConfig = {
  product: {
    id: 'erp',
    name: 'Operix ERP — GateFlow',
    code: 'GF',
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
      { type: 'financial-year' },
      { type: 'tally-sync-status', condition: 'accounting_mode==tally_bridge' },
    ],
    showSearch: true,
    showNotifications: true,
    showAppSwitcher: true,
    showProfileMenu: true,
  },
  sidebar: {
    items: gateflowSidebarItems,
    collapsible: true,
    defaultCollapsed: false,
    width: 280,
    grouping: 'sections',
  },
  routing: {
    landingRoute: '/erp/gateflow',
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
