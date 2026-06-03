/**
 * @file        src/apps/erp/configs/insightx-shell-config.ts
 * @purpose     ShellConfig for the InsightX self-owned card (the analytics capstone)
 * @sprint      Sprint 130 · T-Phase-7.D.3.1 · 🌟 ARC D.3 OPENER · DP-D3-1
 * @decisions   Mirrors Comply360 / FP&A shell configs · InsightX OWNS its shell ·
 *              NO commandCenterShellConfig borrow (the FP&A lesson · set right from start).
 */
import type { ShellConfig } from '@/shell/types';
import { insightxSidebarItems } from './insightx-sidebar-config';

export const insightxShellConfig: ShellConfig = {
  product: {
    id: 'erp',
    name: 'Operix ERP — InsightX',
    code: 'IX',
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
      { type: 'financial-year' },
    ],
    showSearch: true,
    showNotifications: true,
    showAppSwitcher: true,
    showProfileMenu: true,
  },
  sidebar: {
    items: insightxSidebarItems,
    collapsible: true,
    defaultCollapsed: false,
    width: 280,
    grouping: 'sections',
  },
  routing: {
    landingRoute: '/erp/insightx',
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
