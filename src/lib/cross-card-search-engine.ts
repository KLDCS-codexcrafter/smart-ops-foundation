/**
 * cross-card-search-engine.ts — Build a flat searchable index across cards
 * Pure module. Reads localStorage synchronously and returns matches.
 */

import type { CardId } from '@/types/card-entitlement';

export interface SearchHit {
  id: string;
  card_id: CardId;
  kind: 'customer' | 'vendor' | 'voucher' | 'distributor' | 'item' | 'order' | 'invoice';
  title: string;
  subtitle?: string;
  deep_link: string;
  score: number;
}

interface IndexSource {
  key: string;
  card_id: CardId;
  kind: SearchHit['kind'];
  titleField: string;
  subtitleField?: string;
  linkTemplate: string;
}

const SOURCES: IndexSource[] = [
  { key: 'erp_group_customer_master', card_id: 'command-center', kind: 'customer',
    titleField: 'partyName', subtitleField: 'partyCode',
    linkTemplate: '/erp/command-center#crm-customer' },
  { key: 'erp_group_vendor_master', card_id: 'command-center', kind: 'vendor',
    titleField: 'partyName', subtitleField: 'partyCode',
    linkTemplate: '/erp/command-center#crm-vendor' },
  { key: 'erp_distributors_SMRT', card_id: 'distributor-hub', kind: 'distributor',
    titleField: 'legal_name', subtitleField: 'partner_code',
    linkTemplate: '/erp/distributor-hub' },
  { key: 'erp_group_vouchers_SMRT', card_id: 'finecore', kind: 'voucher',
    titleField: 'voucher_no', subtitleField: 'party_name',
    linkTemplate: '/erp/finecore' },
  { key: 'erp_inventory_items', card_id: 'inventory-hub', kind: 'item',
    titleField: 'item_name', subtitleField: 'item_code',
    linkTemplate: '/erp/command-center#inventory-items' },
];

export function searchAcrossCards(
  query: string, allowedCards: Set<string>, max: number = 30,
): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const src of SOURCES) {
    if (!allowedCards.has(src.card_id)) continue;
    try {
      const raw = localStorage.getItem(src.key);
      if (!raw) continue;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) continue;
      for (const row of list as Record<string, unknown>[]) {
        const title = String(row[src.titleField] ?? '').toLowerCase();
        const subtitle = String(row[src.subtitleField ?? ''] ?? '').toLowerCase();
        const hay = title + ' ' + subtitle;
        const idx = hay.indexOf(q);
        if (idx < 0) continue;
        hits.push({
          id: String(row.id ?? row[src.titleField] ?? Math.random()),
          card_id: src.card_id, kind: src.kind,
          title: String(row[src.titleField] ?? '—'),
          subtitle: src.subtitleField ? String(row[src.subtitleField] ?? '') : undefined,
          deep_link: src.linkTemplate,
          score: idx,
        });
      }
    } catch { /* ignore */ }
  }
  return hits.sort((a, b) => a.score - b.score).slice(0, max);
}
