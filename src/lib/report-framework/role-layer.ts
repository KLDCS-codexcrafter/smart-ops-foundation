/**
 * @file        role-layer.ts
 * @purpose     RPT-4 · Role-layer derivation engine.
 *              Pure, React-free, write-free. Composes with the EXISTING
 *              UserRole + ROLE_DEFAULT_CARDS from card-entitlement.ts.
 * @sprint      RPT-4 · Role-Layer Auto-Derivation + Role Dashboard
 * @[JWT]       N/A — pure derivation
 *
 * Read-only-lock: this file has ZERO react imports, ZERO browser-storage
 * writes, ZERO post/save/write helpers. Same lock as the rest of core/.
 */

import type { UserRole, CardId } from '@/types/card-entitlement';
import { ROLE_DEFAULT_CARDS } from '@/types/card-entitlement';
import { listKpis, type KpiDefinition } from './kpi-registry';

export type RoleLayer = 'operator' | 'manager' | 'management';

const LAYER_RANK: Record<RoleLayer, number> = {
  operator: 1,
  manager: 2,
  management: 3,
};

export function layerCeilingFor(role: UserRole): RoleLayer {
  if (role === 'view_only') return 'operator';
  if (role === 'tenant_admin' || role === 'super_admin') return 'management';
  return 'manager';
}

export function clampLayer(requested: RoleLayer, ceiling: RoleLayer): RoleLayer {
  return LAYER_RANK[requested] <= LAYER_RANK[ceiling] ? requested : ceiling;
}

/** Prefix → card-id map. xc-* is treated as the special "cross-card" section. */
const KPI_PREFIX_TO_CARD: Record<string, CardId | 'cross-card'> = {
  fc: 'fincore',
  ex: 'eximx',
  cmp: 'comply360',
  rx: 'receivx',
  po: 'payout',
  bp: 'bill-passing',
  ar: 'receivx',
  ap: 'payout',
};

const CARD_DISPLAY_NAMES: Record<string, string> = {
  fincore: 'FinCore',
  eximx: 'EximX',
  comply360: 'Comply360',
  receivx: 'ReceivX',
  payout: 'PayOut',
  'bill-passing': 'Bill Passing',
  'cross-card': 'Org Overview',
};

function cardForKpi(kpi: KpiDefinition): CardId | 'cross-card' | null {
  const prefix = kpi.id.split('-')[0];
  if (prefix === 'xc') return 'cross-card';
  return KPI_PREFIX_TO_CARD[prefix] ?? null;
}

export interface RoleDashboardSection {
  cardId: string;
  cardName: string;
  kpis: KpiDefinition[];
}

export interface RoleDashboardConfig {
  layer: RoleLayer;
  sections: RoleDashboardSection[];
}

/**
 * Pure derivation. Given a role, requested layer and the entitled card-ids,
 * returns the section list (cross-card first when present at management).
 *
 * Rules:
 *  - effectiveLayer = clamp(requested, layerCeilingFor(role))
 *  - cards = ROLE_DEFAULT_CARDS[role] ∩ entitledCards (per-card sections)
 *  - per KPI: include when kpi.layers (default = all 3) contains effectiveLayer
 *  - xc-* (cross-card) only at management layer, leading "Org Overview" section
 */
export function deriveRoleDashboard(
  role: UserRole,
  layer: RoleLayer,
  entitledCards: string[],
): RoleDashboardConfig {
  const ceiling = layerCeilingFor(role);
  const effective = clampLayer(layer, ceiling);

  const allowedRoleCards = new Set<string>(
    (ROLE_DEFAULT_CARDS[role] ?? []) as readonly string[],
  );
  const entitled = new Set(entitledCards);

  const sectionMap = new Map<string, KpiDefinition[]>();
  for (const kpi of listKpis()) {
    const layers = kpi.layers ?? (['operator', 'manager', 'management'] as RoleLayer[]);
    if (!layers.includes(effective)) continue;

    const cardId = cardForKpi(kpi);
    if (!cardId) continue;

    if (cardId === 'cross-card') {
      if (effective !== 'management') continue;
    } else {
      if (!allowedRoleCards.has(cardId)) continue;
      if (!entitled.has(cardId)) continue;
    }
    const arr = sectionMap.get(cardId) ?? [];
    arr.push(kpi);
    sectionMap.set(cardId, arr);
  }

  const sections: RoleDashboardSection[] = [];
  // Lead with Org Overview when present
  const xc = sectionMap.get('cross-card');
  if (xc) {
    sections.push({
      cardId: 'cross-card',
      cardName: CARD_DISPLAY_NAMES['cross-card'],
      kpis: xc,
    });
  }
  for (const [cardId, kpis] of sectionMap.entries()) {
    if (cardId === 'cross-card') continue;
    sections.push({
      cardId,
      cardName: CARD_DISPLAY_NAMES[cardId] ?? cardId,
      kpis,
    });
  }
  return { layer: effective, sections };
}
