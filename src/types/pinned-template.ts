/**
 * PinnedTemplate — Sprint T-Phase-2.7-e · OOB-10
 *
 * Stores reusable voucher patterns. Q3-b: full clone including line items WITH qty/rate.
 * Q4-d: soft limit · sorted by most-recently-used.
 *
 * [JWT] Phase 2: /api/templates/voucher
 */

export interface PinnedTemplateLineItem {
  item_name: string;
  item_id?: string | null;
  qty: number;
  rate: number;
  uom?: string;
  hsn_sac_code?: string | null;
  description?: string | null;
}

export interface PinnedTemplate {
  id: string;
  entity_id: string;
  template_name: string;
  voucher_type_id: string;
  voucher_type_name: string;

  party_id: string | null;
  party_name: string | null;
  party_type: 'customer' | 'vendor' | 'both' | null;

  line_items: PinnedTemplateLineItem[];

  narration?: string | null;
  reference_no?: string | null;

  use_count: number;
  last_used_at: string;

  pinned_by: string;
  pinned_at: string;
  updated_at: string;
}

export const pinnedTemplatesKey = (entityCode: string): string =>
  `pinned_templates_v1_${entityCode}`;

export const PINNED_TEMPLATES_WIDGET_LIMIT = 20;
