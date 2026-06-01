/**
 * @file        hierarchical-ledger-wiring.ts
 * @purpose     S97 T1 · Block 1 — register the two Sprint-97 engines as hooks
 *              on entity-setup-service so user-driven tier creation actually
 *              produces ledgers and DNA-inherited masters.
 *
 *              Side-effect on import: ONE-TIME hook registration. Idempotent.
 *
 * @sprint      T-Phase-6.A.0.2-T1 · S97 hotfix
 * @reads       entity-setup-service (hook registry) · hierarchical-ledger-engine ·
 *              idea-2-master-dna-engine
 *
 * @decision-§L Hooks fire ONLY for the 6 user-facing tiers; 'parent' is
 *              factory-seeded, not user-created, so it is intentionally not
 *              wired. DNA inheritance fires for subsidiary/branch only because
 *              those are the tiers that own a separate state context;
 *              divisions/departments/projects/sites inherit their parent
 *              entity's state implicitly.
 */
import {
  onTierScopeRegistered,
  type TierScopeRegisteredHook,
} from '@/lib/entity-setup-service';
import {
  createTierLedgers,
  type HierarchyTier,
} from '@/lib/hierarchical-ledger-engine';
import { inheritWithDna } from '@/lib/idea-2-master-dna-engine';

let WIRED = false;
const unsubscribers: Array<() => void> = [];

const USER_TIERS: HierarchyTier[] = [
  'subsidiary', 'branch', 'division', 'department', 'project', 'site',
];

const DNA_TIERS: HierarchyTier[] = ['subsidiary', 'branch'];

/** Hook: auto-create hierarchical ledgers when a tier is registered. */
const ledgerHook: TierScopeRegisteredHook = (payload) => {
  if (!USER_TIERS.includes(payload.tier as HierarchyTier)) return;
  createTierLedgers({
    tier: payload.tier as HierarchyTier,
    scope_id: payload.scope_id,
    scope_name: payload.scope_name,
    parent_scope: payload.parent_scope as
      | { tier: HierarchyTier; id: string }
      | undefined,
    cost_centre: payload.tier === 'project' ? payload.cost_centre : undefined,
    entity_code: payload.entity_code,
  });
};

/** Hook: cascade Master DNA inheritance for tier scopes that own state. */
const dnaHook: TierScopeRegisteredHook = (payload) => {
  if (!DNA_TIERS.includes(payload.tier as HierarchyTier)) return;
  if (!payload.target_state_code) return;
  inheritWithDna({
    master_type: 'entity',
    source_snapshot: { id: payload.scope_id, name: payload.scope_name },
    target_state_code: payload.target_state_code,
    target_entity: payload.entity_code,
  });
};

/**
 * Idempotently install both hooks. Returns a teardown for tests.
 * Importing this module once at app root (main.tsx) auto-installs.
 */
export function wireHierarchicalLedgerHooks(): () => void {
  if (WIRED) return () => { /* already wired */ };
  WIRED = true;
  unsubscribers.push(onTierScopeRegistered(ledgerHook));
  unsubscribers.push(onTierScopeRegistered(dnaHook));
  return () => {
    while (unsubscribers.length) {
      const off = unsubscribers.pop();
      try { off?.(); } catch { /* ignore */ }
    }
    WIRED = false;
  };
}

/** Test-only: rewire hooks (after _clearHierarchicalLedgerTreeForTests). */
export function _resetHierarchicalLedgerWiringForTests(): void {
  while (unsubscribers.length) {
    const off = unsubscribers.pop();
    try { off?.(); } catch { /* ignore */ }
  }
  WIRED = false;
}

// Auto-wire on module import (side effect).
wireHierarchicalLedgerHooks();
