/**
 * command-palette-registry.ts — Action + route index for the palette
 * Pure module. No React.
 */

import type { CardId } from '@/types/card-entitlement';

export type CommandAction =
  | 'navigate_card'      // go to a card
  | 'navigate_module'    // go to a specific module inside a card
  | 'open_master'        // jump to a master (Customer, PriceList etc.)
  | 'open_recent';       // re-open a recent activity item

export interface CommandEntry {
  id: string;
  label: string;
  keywords: string;
  card_id: CardId;
  action: CommandAction;
  target_route?: string;
  target_module_id?: string;
  icon?: string;
  subtitle?: string;
}

/** Seed with card-level entries. Modules can expand via augment(). */
export const BASE_COMMANDS: CommandEntry[] = [
  // Cards
  { id: 'open-cc',   label: 'Open Command Center',    keywords: 'command center cc masters foundation',
    card_id: 'command-center', action: 'navigate_card', target_route: '/erp/command-center' },
  { id: 'open-sx',   label: 'Open SalesX Hub',        keywords: 'sales sx crm pipeline enquiry',
    card_id: 'salesx', action: 'navigate_card', target_route: '/erp/salesx' },
  { id: 'open-dh',   label: 'Open Distributor Hub',   keywords: 'distributor dealer tier',
    card_id: 'distributor-hub', action: 'navigate_card', target_route: '/erp/distributor-hub' },
  { id: 'open-fc',   label: 'Open Fin Core',          keywords: 'finecore accounting ledger voucher',
    card_id: 'finecore', action: 'navigate_card', target_route: '/erp/finecore' },
  { id: 'open-rx',   label: 'Open ReceivX',           keywords: 'receivx collection outstanding dunning',
    card_id: 'receivx', action: 'navigate_card', target_route: '/erp/receivx' },
  { id: 'open-pp',   label: 'Open PeoplePay',         keywords: 'payroll hr employee attendance',
    card_id: 'peoplepay', action: 'navigate_card', target_route: '/erp/pay-hub' },
  { id: 'open-ix',   label: 'Open InsightX',          keywords: 'insights analytics reports',
    card_id: 'insightx', action: 'navigate_card', target_route: '/erp/insightx' },

  // Masters quick jumps (via Command Center — source of truth)
  { id: 'm-customer', label: 'Customer Master',        keywords: 'customer party ledger',
    card_id: 'command-center', action: 'open_master', target_route: '/erp/command-center#crm-customer',
    subtitle: 'CC' },
  { id: 'm-vendor',   label: 'Vendor Master',          keywords: 'vendor supplier party',
    card_id: 'command-center', action: 'open_master', target_route: '/erp/command-center#crm-vendor',
    subtitle: 'CC' },
  { id: 'm-sales-hier', label: 'Sales Hierarchy',      keywords: 'sales org hierarchy team',
    card_id: 'command-center', action: 'open_master', target_route: '/erp/command-center#sales-hierarchy',
    subtitle: 'CC' },
  { id: 'm-sam-person', label: 'SAM Persons',          keywords: 'salesman agent broker receiver',
    card_id: 'command-center', action: 'open_master', target_route: '/erp/command-center#sales-sam-person',
    subtitle: 'CC' },
  { id: 'm-territory',  label: 'Territory Master',     keywords: 'territory geo region',
    card_id: 'command-center', action: 'open_master', target_route: '/erp/command-center#sales-territory',
    subtitle: 'CC' },
  { id: 'm-beat',       label: 'Beat Routes',          keywords: 'beat route field visit',
    card_id: 'command-center', action: 'open_master', target_route: '/erp/command-center#sales-beat-route',
    subtitle: 'CC' },
  { id: 'm-price-list', label: 'Price Lists',          keywords: 'price list tier rate',
    card_id: 'command-center', action: 'open_master', target_route: '/erp/command-center#distributor-price-list',
    subtitle: 'CC' },
  { id: 'm-dist-hier',  label: 'Distribution Hierarchy', keywords: 'distributor hierarchy tree stockist retailer',
    card_id: 'command-center', action: 'open_master', target_route: '/erp/command-center#distributor-hierarchy',
    subtitle: 'CC' },

  // Common distributor-hub deep modules
  { id: 'dh-disputes',    label: 'Review Disputes',       keywords: 'dispute short supply damaged',
    card_id: 'distributor-hub', action: 'navigate_module', target_route: '/erp/distributor-hub#dh-t-disputes' },
  { id: 'dh-credit',      label: 'Credit Approvals',      keywords: 'credit limit approval',
    card_id: 'distributor-hub', action: 'navigate_module', target_route: '/erp/distributor-hub#dh-t-credit-approvals' },
  { id: 'dh-intimations', label: 'Verify Intimations',    keywords: 'intimation payment verify',
    card_id: 'distributor-hub', action: 'navigate_module', target_route: '/erp/distributor-hub#dh-t-intimations' },
  { id: 'dh-broadcast',   label: 'Fire Broadcast',        keywords: 'broadcast message whatsapp distributor',
    card_id: 'distributor-hub', action: 'navigate_module', target_route: '/erp/distributor-hub#dh-t-broadcast' },
];

/** Simple fuzzy match — substring across label + keywords. Score = earliest match index. */
export interface ScoredEntry { entry: CommandEntry; score: number; }

export function matchCommands(
  query: string, entries: CommandEntry[],
  allowedCards: Set<string>, max: number = 20,
): ScoredEntry[] {
  const q = query.trim().toLowerCase();
  const scored: ScoredEntry[] = [];
  for (const e of entries) {
    if (!allowedCards.has(e.card_id)) continue;
    if (!q) {
      scored.push({ entry: e, score: 1000 });
      continue;
    }
    const hay = (e.label + ' ' + e.keywords).toLowerCase();
    const idx = hay.indexOf(q);
    if (idx >= 0) scored.push({ entry: e, score: idx });
  }
  return scored.sort((a, b) => a.score - b.score).slice(0, max);
}
