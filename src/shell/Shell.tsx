/**
 * Shell — ONE Shell component for all Operix products
 *
 * PURPOSE
 * Single layout component. Provides Header + Sidebar + Content.
 * Every product passes its own ShellConfig. Structure is identical.
 *
 * INPUT
 * - config: ShellConfig
 * - children: ReactNode (the routed page content)
 * - userProfile: UserEntitlementProfile (for matrix filtering)
 * - tenantEntitlements: CardEntitlement[]
 * - breadcrumbs?: BreadcrumbEntry[] (optional header breadcrumb)
 *
 * OUTPUT
 * - Rendered shell with filtered sidebar + header + scrollable content area
 *
 * DEPENDENCIES
 * - shadcn SidebarProvider + SidebarInset
 * - ShellThemeProvider
 * - ShellSidebar
 * - ShellHeader (wraps ERPHeader in Sprint A-3.1)
 * - filterSidebarByMatrix, filterChipsByMatrix utilities
 *
 * TALLY-ON-TOP BEHAVIOR
 * - accounting_mode context flag drives chip filtering
 *   (e.g., tally-sync-status chip only when accounting_mode=tally_bridge)
 *
 * SPEC DOC
 * /docs/Operix_ONE_Shell_Specification.xlsx
 */

import type { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShellThemeProvider } from './ShellThemeProvider';
import { ShellSidebar } from './sidebar/ShellSidebar';
import { ShellHeader } from './header/ShellHeader';
import { filterSidebarByMatrix } from './utils/filterSidebarByMatrix';
import { filterChipsByMatrix } from './utils/filterChipsByMatrix';
import type { ShellConfig, SidebarItem } from './types';
import type { BreadcrumbEntry } from '@/components/layout/ERPHeader';
import type { UserEntitlementProfile, CardEntitlement } from '@/types/card-entitlement';

interface ShellProps {
  config: ShellConfig;
  userProfile: UserEntitlementProfile;
  tenantEntitlements: CardEntitlement[];
  children: ReactNode;
  breadcrumbs?: BreadcrumbEntry[];
  lastEntryLabel?: string;
  /** Current tenant context for condition-based chip filtering */
  contextFlags?: {
    accounting_mode?: 'standalone' | 'tally_bridge';
  };
  /** Optional callback when a sidebar item is clicked */
  onSidebarItemClick?: (item: SidebarItem) => void;
}

export function Shell({
  config,
  userProfile,
  tenantEntitlements,
  children,
  breadcrumbs,
  lastEntryLabel,
  contextFlags = {},
  onSidebarItemClick,
}: ShellProps) {
  const visibleItems = filterSidebarByMatrix(
    config.sidebar.items,
    userProfile,
    tenantEntitlements,
  );

  const visibleChips = filterChipsByMatrix(
    config.header.chips,
    userProfile,
    contextFlags,
  );

  return (
    <ShellThemeProvider
      accent={config.theme.accent}
      mode={config.theme.mode}
      tenantBrand={config.theme.tenantBrand}
    >
      <SidebarProvider defaultOpen={!config.sidebar.defaultCollapsed}>
        <div className="flex min-h-svh w-full bg-background">
          <ShellSidebar items={visibleItems} onItemClick={onSidebarItemClick} />
          <SidebarInset className="flex flex-col flex-1 min-w-0">
            <ShellHeader
              breadcrumbs={breadcrumbs}
              chips={visibleChips}
              lastEntryLabel={lastEntryLabel}
            />
            <ScrollArea className="flex-1">
              <div className="p-6 max-w-7xl mx-auto">
                {children}
              </div>
            </ScrollArea>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ShellThemeProvider>
  );
}
