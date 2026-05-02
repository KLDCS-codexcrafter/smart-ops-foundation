/**
 * @file     use-last-voucher-engine.ts — OOB-1 "Use Last Voucher" engine
 * @sprint   T-Phase-1.2.6e-tally-1 · Q3-b · copies header + line items
 * @purpose  Operator clicks "Use Last [vendor/customer]" button on a transaction
 *           form · system finds the most recent same-type same-party voucher and
 *           returns its header + line items pre-cleared of fields that should NOT
 *           be copied (id, voucher_no, dates, status, voucher_hash, etc.)
 *
 *   70% time saved on routine entries · Tally-Prime "Duplicate Voucher" parity.
 *
 *   [JWT] GET /api/{record-type}?entityCode=...&party=...&latest=1
 */

const NON_COPYABLE_FIELDS = new Set([
  'id',
  'voucher_no', 'grn_no', 'memo_no', 'quotation_no', 'rtv_no', 'count_no', 'min_no', 'ce_no',
  'voucher_hash',
  'created_by', 'created_at', 'updated_by', 'updated_at',
  'posted_at', 'cancelled_at', 'cancel_reason',
  'multi_source_refs',
  'pod_reference', 'received_at', 'received_by',
  'is_billed', 'invoice_voucher_id', 'invoice_voucher_no',
  'invoice_posted_at', 'acknowledged_at', 'acknowledged_by',
  'dispatched_at', 'shipped_at', 'delivered_at',
  'effective_date',
  'status',
  'reference_no',
  'superseded_by', 'version',
  // line-id duplication is acceptable; new IDs minted on save in each form
]);

const DATE_FIELDS_BY_TYPE: Record<string, string[]> = {
  grn:                  ['receipt_date', 'invoice_received_at', 'created_at'],
  quotation:            ['quotation_date', 'valid_until_date', 'revision_date'],
  supply_request_memo:  ['memo_date', 'expected_dispatch_date'],
  invoice_memo:         ['memo_date', 'invoice_date'],
  delivery_memo:        ['memo_date', 'expected_delivery_date'],
  rtv:                  ['rtv_date'],
  consumption_entry:    ['entry_date', 'consumption_date'],
  material_issue_note:  ['issue_date'],
  cycle_count:          ['count_date'],
  secondary_sales:      ['sale_date'],
  sample_outward_memo:  ['memo_date'],
  demo_outward_memo:    ['memo_date'],
};

const PARTY_FIELD_BY_TYPE: Record<string, string> = {
  grn:                  'vendor_id',
  quotation:            'customer_id',
  supply_request_memo:  'customer_id',
  invoice_memo:         'customer_id',
  delivery_memo:        'customer_id',
  rtv:                  'vendor_id',
  consumption_entry:    'department_code',
  material_issue_note:  'to_godown_id',
  cycle_count:          'godown_id',
  secondary_sales:      'distributor_id',
  sample_outward_memo:  'recipient_id',
  demo_outward_memo:    'recipient_id',
};

const STORAGE_KEYS: Record<string, (e: string) => string> = {
  grn:                  e => `erp_grns_${e}`,
  quotation:            e => `erp_quotations_${e}`,
  supply_request_memo:  e => `erp_supply_request_memos_${e}`,
  invoice_memo:         e => `erp_invoice_memos_${e}`,
  delivery_memo:        e => `erp_delivery_memos_${e}`,
  rtv:                  e => `erp_rtvs_${e}`,
  consumption_entry:    e => `erp_consumption_entries_${e}`,
  material_issue_note:  e => `erp_material_issue_notes_${e}`,
  cycle_count:          e => `erp_cycle_counts_${e}`,
  secondary_sales:      e => `erp_secondary_sales_${e}`,
  sample_outward_memo:  e => `erp_sample_outward_memos_${e}`,
  demo_outward_memo:    e => `erp_demo_outward_memos_${e}`,
};

/** Find the most recent voucher of given type for a given party. */
export function findLastVoucher(
  entityCode: string,
  recordType: string,
  partyValue: string | null,
): Record<string, unknown> | null {
  const keyFn = STORAGE_KEYS[recordType];
  if (!keyFn) return null;
  try {
    const records: Array<Record<string, unknown>> = JSON.parse(
      localStorage.getItem(keyFn(entityCode)) || '[]'
    );
    const partyField = PARTY_FIELD_BY_TYPE[recordType];
    const filtered = partyValue
      ? records.filter(r => r[partyField] === partyValue && r.status !== 'cancelled')
      : records.filter(r => r.status !== 'cancelled');
    if (filtered.length === 0) return null;

    const dateFields = DATE_FIELDS_BY_TYPE[recordType] ?? ['created_at'];
    filtered.sort((a, b) => {
      const ad = String(a[dateFields[0]] ?? a.created_at ?? '');
      const bd = String(b[dateFields[0]] ?? b.created_at ?? '');
      return bd.localeCompare(ad);
    });
    return filtered[0];
  } catch {
    return null;
  }
}

/** Strip non-copyable fields from a record · returns clean form-ready object. */
export function stripForUseLast(record: Record<string, unknown>, recordType: string): Record<string, unknown> {
  const dateFields = DATE_FIELDS_BY_TYPE[recordType] ?? [];
  const stripped = { ...record };
  for (const f of NON_COPYABLE_FIELDS) delete stripped[f];
  for (const f of dateFields) delete stripped[f];
  return stripped;
}

/** All-in-one helper: find last voucher for party + return form-ready data. */
export function getUseLastData(
  entityCode: string,
  recordType: string,
  partyValue: string | null,
): { found: boolean; data: Record<string, unknown> | null; sourceLabel: string | null } {
  const last = findLastVoucher(entityCode, recordType, partyValue);
  if (!last) return { found: false, data: null, sourceLabel: null };
  const data = stripForUseLast(last, recordType);
  const noField = Object.keys(last).find(k => /^[a-z_]+_no$/.test(k)) ?? 'voucher_no';
  const dateField = (DATE_FIELDS_BY_TYPE[recordType] ?? ['created_at'])[0];
  const sourceLabel = `${last[noField] ?? ''} · ${last[dateField] ?? ''}`;
  return { found: true, data, sourceLabel };
}
