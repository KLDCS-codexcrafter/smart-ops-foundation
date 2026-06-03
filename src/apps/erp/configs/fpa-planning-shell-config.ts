/**
 * @file        src/apps/erp/configs/fpa-planning-shell-config.ts
 * @purpose     ShellConfig for the FP&A / Planning self-owned card
 * @sprint      Sprint 124 · T-Phase-7.D.1.5 · Block 2 · A1
 * @decisions   A1 — FP&A is a self-owned card, mirrors Comply360 shell config.
 */
import type { ShellConfig } from '@/shell/types';
import { fpaPlanningSidebarItems } from './fpa-planning-sidebar-config';

export const fpaPlanningShellConfig: ShellConfig = {
  product: {
    id: 'erp',
    name: 'Operix ERP — FP&A / Planning',
    code: 'FPA',
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
      { type: 'financial-year' },
    ],
    showSearch: true,
    showNotifications: true,
    showAppSwitcher: true,
    showProfileMenu: true,
  },
  sidebar: {
    items: fpaPlanningSidebarItems,
    collapsible: true,
    defaultCollapsed: false,
    width: 280,
    grouping: 'sections',
  },
  routing: {
    landingRoute: '/erp/fpa-planning',
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
