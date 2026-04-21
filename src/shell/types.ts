/**
 * ONE Shell type definitions
 *
 * PURPOSE
 * Single source of truth for Shell component contracts. Every product config
 * conforms to ShellConfig. Every sidebar item conforms to SidebarItem.
 * Every chip conforms to HeaderChip.
 *
 * INPUT
 * - None (type definitions only)
 *
 * OUTPUT
 * - ShellConfig, SidebarItem, HeaderChip, ProductId, ThemeAccent types
 *
 * DEPENDENCIES
 * - @/types/card-entitlement (CardId, ActionVerb, UserRole)
 * - lucide-react (LucideIcon type)
 *
 * TALLY-ON-TOP BEHAVIOR
 * - Chips can declare condition based on accounting_mode (e.g., tally-sync-status only visible when accounting_mode=tally_bridge)
 *
 * SPEC DOC
 * /docs/Operix_ONE_Shell_Specification.xlsx
 */

import type { LucideIcon } from 'lucide-react';
import type { CardId, ActionVerb, UserRole } from '@/types/card-entitlement';

export type ProductId =
  | 'erp' | 'tower' | 'bridge' | 'partner'
  | 'customer' | 'logistic-portal' | 'welcome' | 'mobile';

export type ThemeAccent =
  | 'indigo' | 'cyan' | 'emerald' | 'amber'
  | 'rose' | 'violet' | 'slate';

export interface LogoConfig {
  src: string;
  alt: string;
  /** Optional href override — defaults to routing.landingRoute */
  href?: string;
}

export interface TenantBrand {
  accent?: string;          // HSL override
  logoOverride?: string;    // URL override
  companyName?: string;
}

export type HeaderChipType =
  // Identity
  | 'tenant-selector' | 'entity-selector' | 'branch-selector'
  | 'territory-selector' | 'godown-selector'
  // Time
  | 'financial-year' | 'payroll-period' | 'billing-period'
  // Status
  | 'tally-sync-status' | 'bridge-sync-status' | 'gst-filing-status'
  | 'statutory-filing-status' | 'period-lock-status' | 'sla-timer'
  | 'msme-status'
  // Environment
  | 'environment-selector' | 'feature-flags' | 'impersonation-status'
  // Commercial
  | 'price-list-active' | 'user-count-active'
  // Mobile
  | 'geo-location' | 'sync-status';

export interface HeaderChip {
  type: HeaderChipType;
  /** Optional condition expression — e.g. 'accounting_mode==tally_bridge' */
  condition?: string;
  /** Optional min role to view — defaults to all */
  requiredRole?: UserRole[];
}

export type SidebarItemType = 'group' | 'item' | 'divider';

export interface SidebarItem {
  id: string;
  type: SidebarItemType;
  label: string;
  icon?: LucideIcon;

  /** For type='item' — route to navigate to */
  route?: string;
  /** For internal module switching (Command Center pattern) */
  moduleId?: string;

  /** Optional display extras */
  badge?: string | number;
  badgeColor?: 'red' | 'amber' | 'green' | 'blue' | 'gray';
  newBadge?: boolean;
  comingSoon?: boolean;

  /** Access control — from Authorization Matrix */
  requiredCards?: CardId[];
  requiredActions?: ActionVerb[];
  /** When true, hide the item if the user cannot access. Default true. */
  hideIfDenied?: boolean;

  /** Hierarchy */
  children?: SidebarItem[];
  collapsibleByDefault?: boolean;

  /** Behaviour */
  keyboard?: string;
  onClick?: () => void;

  /** Accessibility */
  ariaLabel?: string;
}

export interface ShellConfig {
  product: {
    id: ProductId;
    name: string;
    code: string;
    version: string;
  };

  theme: {
    accent: ThemeAccent;
    mode: 'light' | 'dark' | 'auto';
    tenantBrand?: TenantBrand;
  };

  header: {
    logo: LogoConfig;
    breadcrumb: boolean;
    chips: HeaderChip[];
    showSearch: boolean;
    showNotifications: boolean;
    showAppSwitcher: boolean;
    showProfileMenu: boolean;
  };

  sidebar: {
    items: SidebarItem[];
    collapsible: boolean;
    defaultCollapsed: boolean;
    width: number;
    grouping: 'lanes' | 'flat' | 'sections';
  };

  routing: {
    landingRoute: string;
    notFoundRoute: string;
    permissionDeniedRoute: string;
  };

  behaviour: {
    keyboardShortcuts: boolean;
    commandPalette: boolean;
    recentActivityDrawer: boolean;
    guidedTour: boolean;
    languages: string[];
  };
}
