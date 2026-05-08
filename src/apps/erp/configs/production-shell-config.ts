/**
 * @file        production-shell-config.ts
 * @purpose     Complete ShellConfig for Production Hub card · 8-stage shopfloor + Job Work UI shell
 * @who         Operations · Production planners · Shop floor supervisors · QC · Job-work coordinators
 * @when        Phase 1.A.2.a · Production Structural sprint
 * @sprint      T-Phase-1.A.2.a-Production-Structural
 * @iso         Maintainability · Usability · Compatibility (ISO 25010)
 * @decisions   D-250 (Shell pattern lock · FR-58) · D-NEW-I (Production = 3rd card adoption)
 * @reuses      @/shell/types ShellConfig · production-sidebar-config (sibling)
 * @[JWT]       N/A (config only)
 */

import type { ShellConfig } from '@/shell/types';
import { productionSidebarItems } from './production-sidebar-config';

export const productionShellConfig: ShellConfig = {
  product: {
    id: 'erp',
    name: 'Operix ERP — Production',
    code: 'PROD',
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
    items: productionSidebarItems,
    collapsible: true,
    defaultCollapsed: false,
    width: 280,
    grouping: 'sections',
  },
  routing: {
    landingRoute: '/erp/production',
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
