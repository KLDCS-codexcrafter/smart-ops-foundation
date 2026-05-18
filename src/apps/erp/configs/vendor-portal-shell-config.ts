/**
 * @file        src/apps/erp/configs/vendor-portal-shell-config.ts
 * @purpose     Canonical Shell config for Vendor Portal (tenant-internal · D-282-REV)
 * @sprint      T-Phase-1.A.1-VendorPortal-Foundation · 6th FR-81 application
 * @decisions   D-250 · D-NEW-DN · D-282-REV · FR-81
 */
import type { ShellConfig } from '@/shell/types';
import { vendorPortalSidebarItems } from './vendor-portal-sidebar-config';

export const vendorPortalShellTitle = 'Vendor Portal';

export const vendorPortalShellConfig: ShellConfig & { title: string } = {
  title: vendorPortalShellTitle,
  product: { id: 'erp', name: 'Operix ERP — Vendor Portal', code: 'VP', version: '1.0.0' },
  theme: { accent: 'slate', mode: 'auto' },
  header: {
    logo: { src: '/operix-logo.svg', alt: 'Operix' },
    breadcrumb: true,
    chips: [{ type: 'entity-selector' }, { type: 'branch-selector' }, { type: 'financial-year' }],
    showSearch: true,
    showNotifications: true,
    showAppSwitcher: true,
    showProfileMenu: true,
  },
  sidebar: { items: vendorPortalSidebarItems, collapsible: true, defaultCollapsed: false, width: 280, grouping: 'sections' },
  routing: { landingRoute: '/erp/vendor-portal', notFoundRoute: '/erp/404', permissionDeniedRoute: '/erp/403' },
  behaviour: { keyboardShortcuts: true, commandPalette: true, recentActivityDrawer: true, guidedTour: true, languages: ['en-IN'] },
};
