/**
 * filterChipsByMatrix — filter header chips by role + condition
 *
 * PURPOSE  Renders only chips relevant to the user + current tenant context.
 * INPUT    HeaderChip[] + UserEntitlementProfile + contextFlags
 * OUTPUT   HeaderChip[] filtered
 * DEPENDENCIES  none (pure)
 * TALLY-ON-TOP BEHAVIOR  contextFlags.accounting_mode drives 'tally-sync-status' chip visibility.
 * SPEC DOC Operix_Authorization_Matrix.xlsx Sheet 8
 */

import type { HeaderChip } from '../types';
import type { UserEntitlementProfile } from '@/types/card-entitlement';

interface ContextFlags {
  accounting_mode?: 'standalone' | 'tally_bridge';
}

export function filterChipsByMatrix(
  chips: HeaderChip[],
  profile: UserEntitlementProfile,
  context: ContextFlags,
): HeaderChip[] {
  return chips.filter(chip => {
    // Role check
    if (chip.requiredRole && chip.requiredRole.length > 0) {
      if (!chip.requiredRole.includes(profile.role)) return false;
    }

    // Condition evaluation (Phase 1: simple equality checks only)
    if (chip.condition) {
      const match = chip.condition.match(/^(\w+)==(.+)$/);
      if (match) {
        const [, key, expected] = match;
        const actual = (context as Record<string, string | undefined>)[key];
        if (actual !== expected) return false;
      }
    }

    return true;
  });
}
