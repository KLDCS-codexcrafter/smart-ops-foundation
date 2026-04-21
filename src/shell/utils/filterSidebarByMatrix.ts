/**
 * filterSidebarByMatrix — filter sidebar items by user's authorization matrix
 *
 * PURPOSE  Renders only items the current user is permitted to access.
 * INPUT    SidebarItem[] + UserEntitlementProfile + tenant CardEntitlement[]
 * OUTPUT   SidebarItem[] with inaccessible items removed
 * DEPENDENCIES card-entitlement-engine
 * TALLY-ON-TOP BEHAVIOR  Not chip-related; sidebar items hide regardless of accounting mode.
 * SPEC DOC  Operix_Authorization_Matrix.xlsx Sheet 9
 */

import type { SidebarItem } from '../types';
import type { UserEntitlementProfile, CardEntitlement } from '@/types/card-entitlement';
import { canAccessCard } from '@/lib/card-entitlement-engine';

export function filterSidebarByMatrix(
  items: SidebarItem[],
  profile: UserEntitlementProfile,
  tenantEntitlements: CardEntitlement[],
): SidebarItem[] {
  return items
    .map((item): SidebarItem | null => {
      // Recurse into children first
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterSidebarByMatrix(item.children, profile, tenantEntitlements);
        if (filteredChildren.length === 0 && item.type === 'group') return null;
        return { ...item, children: filteredChildren };
      }

      // Check access
      const hideIfDenied = item.hideIfDenied !== false; // default true
      if (!hideIfDenied) return item;

      if (!item.requiredCards || item.requiredCards.length === 0) return item;

      const hasAccess = item.requiredCards.some(cardId =>
        canAccessCard(cardId, profile, tenantEntitlements).allowed,
      );

      return hasAccess ? item : null;
    })
    .filter((x): x is SidebarItem => x !== null);
}
