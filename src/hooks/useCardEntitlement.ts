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
    return raw ?? '';
  } catch { return ''; }
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

    // T-Phase-1.A.2.b-T1 · Migrate stale 'locked' status for gateflow/production
    // T-Phase-1.A.3.b-T1 · Migrate stale 'add_on_available' or 'locked' status for procure360
    // (All three flipped to active per Phase 1.A milestones. New installs get fresh seed.)
    let migrated = false;
    for (const ent of entitlementsRaw) {
      const gfProd =
        (ent.card_id === 'gateflow' || ent.card_id === 'production') &&
        ent.status === 'locked';
      const procure360 =
        ent.card_id === 'procure360' &&
        (ent.status === 'add_on_available' || ent.status === 'locked');
      // T-Phase-1.A.5.a-bis-T2 · D-NEW-BB · Migrate stale 'locked' for qualicheck
      const qualicheck =
        ent.card_id === 'qualicheck' &&
        (ent.status === 'add_on_available' || ent.status === 'locked');
      if (gfProd || procure360 || qualicheck) {
        ent.status = 'active';
        ent.updated_at = new Date().toISOString();
        migrated = true;
      }
    }
    if (migrated) {
      try {
        localStorage.setItem(cardEntitlementsKey(entityCode), JSON.stringify(entitlementsRaw));
      } catch { /* ignore */ }
    }

    // T-Phase-1.A.9 BUNDLED · D-NEW-BB · Q-LOCK-11a
    // Atomic dispatch ID swap migration: old 'dispatch-hub' (= Logistics) → 'logistics' ·
    // old 'dispatch-ops' (= Dispatch Hub internal) → 'dispatch-hub'.
    // Idempotent · matches qualicheck A.5 institutional pattern.
    try {
      const oldHubKey = `erp_card_entitlements_old_dispatch-hub_${entityCode}`;
      void oldHubKey; // reserved for backwards-compat read fallback (Phase 2)
      // For per-card key migration the legacy keys may not exist if entitlements live
      // inside a single aggregate list (cardEntitlementsKey). The aggregate list above
      // already carries all entries, so per-card migration is a no-op for that storage
      // model. The block is preserved here for parity with qualicheck A.5 pattern and to
      // catch any per-card stale keys that future code may write.
      const legacyOpsKey = `erp_card_entitlements_dispatch-ops`;
      const legacyHubKey = `erp_card_entitlements_dispatch-hub`;
      const newLogisticsKey = `erp_card_entitlements_logistics`;
      const opsVal = localStorage.getItem(legacyOpsKey);
      const hubVal = localStorage.getItem(legacyHubKey);
      // Step 1 · save old dispatch-hub (Logistics data) → logistics key (don't overwrite if already set)
      if (hubVal !== null && localStorage.getItem(newLogisticsKey) === null) {
        localStorage.setItem(newLogisticsKey, hubVal);
      }
      // Step 2 · move old dispatch-ops → dispatch-hub (which now represents internal Dispatch Hub)
      if (opsVal !== null) {
        localStorage.setItem(legacyHubKey, opsVal);
        localStorage.removeItem(legacyOpsKey);
      }
    } catch {
      // localStorage unavailable (SSR · private browsing)
    }

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
