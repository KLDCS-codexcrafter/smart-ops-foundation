/**
 * useCardEntitlement — React hook exposing entitlement state
 * Seeds demo data on first run. Used by DepartmentSwitcher + every
 * Stage 3b feature that scopes by allowed cards.
 */

import { useMemo } from 'react';
import type {
  CardId, CardEntitlement, UserEntitlementProfile,
} from '@/types/card-entitlement';
import {
  cardEntitlementsKey, userEntitlementProfileKey,
} from '@/types/card-entitlement';
import {
  resolveAllowedCards, getCardStatus, canAccessCard,
  seedDemoEntitlements, seedDemoProfile,
} from '@/lib/card-entitlement-engine';

function getCurrentUserId(): string {
  try {
    // [JWT] GET /api/auth/me
    const raw = localStorage.getItem('4ds_login_credential');
    if (!raw) return 'demo-user';
    const parsed = JSON.parse(raw);
    return parsed.value ?? 'demo-user';
  } catch { return 'demo-user'; }
}

function getActiveEntityCode(): string {
  try {
    const raw = localStorage.getItem('active_entity_code');
    return raw ?? 'SMRT';
  } catch { return 'SMRT'; }
}

export function useCardEntitlement() {
  const entityCode = getActiveEntityCode();
  const userId = getCurrentUserId();

  const { entitlements, profile } = useMemo(() => {
    // [JWT] GET /api/tenant/entitlements, GET /api/user/entitlement-profile
    let entitlementsRaw: CardEntitlement[] = [];
    let profileRaw: UserEntitlementProfile | null = null;

    try {
      const er = localStorage.getItem(cardEntitlementsKey(entityCode));
      entitlementsRaw = er ? JSON.parse(er) : [];
    } catch { /* ignore */ }

    try {
      const pr = localStorage.getItem(userEntitlementProfileKey(entityCode, userId));
      profileRaw = pr ? JSON.parse(pr) : null;
    } catch { /* ignore */ }

    if (entitlementsRaw.length === 0) {
      entitlementsRaw = seedDemoEntitlements(entityCode);
      try {
        // [JWT] POST /api/tenant/entitlements/seed
        localStorage.setItem(cardEntitlementsKey(entityCode),
          JSON.stringify(entitlementsRaw));
      } catch { /* ignore */ }
    }
    if (!profileRaw) {
      profileRaw = seedDemoProfile(entityCode, userId);
      try {
        // [JWT] POST /api/user/entitlement-profile/seed
        localStorage.setItem(
          userEntitlementProfileKey(entityCode, userId),
          JSON.stringify(profileRaw),
        );
      } catch { /* ignore */ }
    }

    return { entitlements: entitlementsRaw, profile: profileRaw };
  }, [entityCode, userId]);

  const allowedCards = useMemo(() =>
    resolveAllowedCards(profile, entitlements),
    [profile, entitlements],
  );

  return {
    entitlements, profile, allowedCards,
    getStatus: (cardId: CardId) => getCardStatus(cardId, entitlements),
    canAccess: (cardId: CardId) => canAccessCard(cardId, profile, entitlements),
    role: profile.role,
    userId,
    entityCode,
  };
}
