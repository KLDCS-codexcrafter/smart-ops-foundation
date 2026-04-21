/**
 * card-entitlement-engine.ts — Pure entitlement resolution
 * NO React, NO localStorage (read/write moved to the hook).
 */

import type {
  CardId, CardEntitlement, UserEntitlementProfile, UserRole,
  EntitlementStatus, ActionVerb, AuthScope,
} from '@/types/card-entitlement';
import { ROLE_DEFAULT_CARDS } from '@/types/card-entitlement';

export function isSuperAdminRole(role: UserRole): boolean {
  return role === 'super_admin' || role === 'tenant_admin';
}

/** Resolve which cards this user can access. Returns sorted CardId[]. */
export function resolveAllowedCards(
  profile: UserEntitlementProfile,
  tenantEntitlements: CardEntitlement[],
): CardId[] {
  const activeCards = new Set(
    tenantEntitlements
      .filter(e => e.status === 'active' || e.status === 'trial')
      .map(e => e.card_id),
  );

  if (isSuperAdminRole(profile.role)) {
    return Array.from(activeCards).sort();
  }

  const roleDefault = new Set(ROLE_DEFAULT_CARDS[profile.role]);
  profile.explicit_allow.forEach(c => roleDefault.add(c));
  profile.explicit_deny.forEach(c => roleDefault.delete(c));

  return Array.from(roleDefault)
    .filter(c => activeCards.has(c))
    .sort();
}

export function getCardStatus(
  cardId: CardId,
  tenantEntitlements: CardEntitlement[],
): EntitlementStatus {
  const e = tenantEntitlements.find(x => x.card_id === cardId);
  return e?.status ?? 'locked';
}

export function canAccessCard(
  cardId: CardId,
  profile: UserEntitlementProfile,
  tenantEntitlements: CardEntitlement[],
): { allowed: boolean; reason: string | null } {
  const allowed = resolveAllowedCards(profile, tenantEntitlements);
  if (allowed.includes(cardId)) return { allowed: true, reason: null };

  const status = getCardStatus(cardId, tenantEntitlements);
  if (status === 'locked')   return { allowed: false, reason: 'Not included in your plan' };
  if (status === 'expired') return { allowed: false, reason: 'Subscription expired' };
  if (status === 'add_on_available') return { allowed: false, reason: 'Available as add-on' };
  return { allowed: false, reason: 'Your role does not include this card' };
}

/** Demo seeder for first-run. Called by the hook on empty localStorage. */
export function seedDemoEntitlements(tenantId: string): CardEntitlement[] {
  const now = new Date().toISOString();
  const one = (card_id: CardId, status: EntitlementStatus = 'active'): CardEntitlement => ({
    tenant_id: tenantId, card_id, status, plan_tier: 'growth',
    effective_from: now, effective_until: null,
    trial_days_remaining: status === 'trial' ? 28 : null,
    feature_flags: [], notes: '', created_at: now, updated_at: now,
  });
  return [
    one('command-center'), one('finecore'), one('salesx'),
    one('distributor-hub'), one('receivx'), one('peoplepay'),
    one('insightx'),
    one('payout', 'trial'),
    one('procure360', 'add_on_available'),
    one('inventory-hub', 'add_on_available'),
    one('customer-hub', 'locked'),
    one('qulicheak', 'locked'),
    one('gateflow', 'locked'),
    one('production', 'locked'),
    one('maintainpro', 'locked'),
    one('requestx', 'locked'),
    one('backoffice', 'locked'),
    one('servicedesk', 'locked'),
  ];
}

export function seedDemoProfile(tenantId: string, userId: string): UserEntitlementProfile {
  const now = new Date().toISOString();
  return {
    user_id: userId, tenant_id: tenantId,
    role: 'tenant_admin',
    explicit_allow: [], explicit_deny: [],
    updated_at: now,
  };
}

/**
 * canPerformAction — Phase 1 skeleton. Returns role-based boolean.
 * Full rule logic (maker-checker, scope, policy) arrives in Sprint A-4.
 *
 * For Sprint A-3.1 this is a light wrapper around canAccessCard + role category.
 */
export function canPerformAction(
  profile: UserEntitlementProfile,
  action: ActionVerb,
  resource: { cardId: CardId },
  _scope?: AuthScope,
): { allowed: boolean; reason: string | null } {
  const cardAccess = canAccessCard(resource.cardId, profile, []);
  if (!cardAccess.allowed) return cardAccess;

  // Super admins can do anything
  if (isSuperAdminRole(profile.role)) return { allowed: true, reason: null };

  // view_only auditor: read actions only
  const readOnlyActions: ActionVerb[] = [
    'view', 'list', 'export', 'report.view', 'audit.view', 'master.view',
  ];
  if (profile.role === 'view_only' && !readOnlyActions.includes(action)) {
    return { allowed: false, reason: 'View-only role' };
  }

  // Phase 1: all other roles pass if they have card access
  return { allowed: true, reason: null };
}
