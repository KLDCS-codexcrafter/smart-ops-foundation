/**
 * wms2-block-behavioral.test.ts — Sprint WMS2 · behavioral (≥20 it())
 *
 * House posture: real engine reads/writes against jsdom localStorage;
 * fresh namespace per test. Canon-5 EximX read-only proof = assert the
 * import/BoE keys are NEVER written during generateAsnFromImportPO.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  createAsn,
  generateAsnFromImportPO,
  markAsnArrived,
  linkAsnToInwardReceipt,
  suggestBins,
  recordPlacement,
  getPutawayQueue,
  getShelfView,
  getPutawaySummary,
  listAsns,
  listPlacements,
} from '@/lib/wms-putaway-engine';
import {
  asnRecordsKey,
  binPlacementsKey,
} from '@/types/wms-putaway';
import { ordersKey, type Order } from '@/types/order';
import { classifyOrderSource } from '@/lib/wms-pick-pack-engine';
import { itemLocationsKey, type ItemLocation } from '@/types/item-location';
import { inwardReceiptsKey, type InwardReceipt } from '@/types/inward-receipt';
import { importPOKey, type ImportPurchaseOrder } from '@/types/import-purchase-order';
import { billOfEntryKey } from '@/types/bill-of-entry';
import type { BinLabel } from '@/types/bin-label';
import { getDefaultPolicyForRecordType } from '@/lib/record-retention-policy-engine';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';

const E = 'WMS2T';

function seedBins(bins: BinLabel[]): void {
  localStorage.setItem('erp_bin_labels', JSON.stringify(bins));
}
function seedItemLocations(locs: ItemLocation[]): void {
  localStorage.setItem(itemLocationsKey(E), JSON.stringify(locs));
}
function seedGodowns(): void {
  localStorage.setItem('erp_godowns', JSON.stringify([
    { id: 'g1', code: 'G1', name: 'Main', ownership_type: 'own_own_stock', country: 'IN', status: 'active', created_at: '', updated_at: '' },
  ]));
}
function seedInward(ir: Partial<InwardReceipt>): InwardReceipt {
  const rec: InwardReceipt = {
    id: ir.id ?? 'ir-1',
    entity_id: E,
    receipt_no: ir.receipt_no ?? 'IR/26-27/0001',
    status: ir.status ?? 'released',
    po_id: null, po_no: null, gate_entry_id: null, gate_entry_no: null,
    vendor_id: 'v1', vendor_name: 'Vendor One',
    vendor_invoice_no: null, vendor_invoice_date: null,
    vehicle_no: null, lr_no: null, driver_name: null, driver_mobile: null,
    arrival_date: '2026-06-07', arrival_time: '10:00',
    received_by_id: 'u1', received_by_name: 'U One',
    godown_id: 'g1', godown_name: 'Main',
    lines: ir.lines ?? [{
      id: 'irl-1', item_id: 'ITM-1', item_code: 'ITM-1', item_name: 'Widget',
      uom: 'NOS', expected_qty: 10, received_qty: 10,
      batch_no: null, heat_no: null, qa_plan_id: null,
      routing_decision: 'auto_release', routing_reason: 'ok',
    }],
    total_lines: 1, quarantine_lines: 0, released_lines: 1, rejected_lines: 0,
    grn_id: null, grn_no: null, qa_inspection_ids: [],
    narration: '',
    created_at: '', updated_at: '', released_at: '', cancelled_at: '',
  };
  localStorage.setItem(inwardReceiptsKey(E), JSON.stringify([rec]));
  return rec;
}

beforeEach(() => {
  localStorage.clear();
  seedGodowns();
});

// ── 1-5 · ASN basics
describe('WMS2 · ASN basics', () => {
  it('createAsn persists with floor fields', () => {
    const a = createAsn(E, {
      source: 'manual', expected_date: '2026-06-07',
      lines: [{ item_id: 'ITM-1', item_name: 'W', qty_expected: 5 }],
    });
    expect(a.created_by).toBeTruthy();
    expect(a.retention_policy).toBe('operational_log_only');
    expect(listAsns(E)).toHaveLength(1);
  });

  it('markAsnArrived flips expected → arrived only', () => {
    const a = createAsn(E, { source: 'manual', expected_date: '2026-06-07', lines: [{ item_id: 'I', item_name: 'X', qty_expected: 1 }] });
    const arrived = markAsnArrived(E, a.id);
    expect(arrived?.status).toBe('arrived');
    expect(markAsnArrived(E, a.id)).toBeNull(); // can't re-arrive
  });

  it('linkAsnToInwardReceipt sets received + no duplicate IR', () => {
    const ir = seedInward({});
    const a = createAsn(E, { source: 'manual', expected_date: '2026-06-07', lines: [{ item_id: 'I', item_name: 'X', qty_expected: 1 }] });
    markAsnArrived(E, a.id);
    const linked = linkAsnToInwardReceipt(E, a.id, ir.id);
    expect(linked?.status).toBe('received');
    expect(linked?.inward_receipt_no).toBe(ir.receipt_no);
    const stored = JSON.parse(localStorage.getItem(inwardReceiptsKey(E))!);
    expect(stored).toHaveLength(1); // not duplicated
  });

  it('linkAsnToInwardReceipt returns null when IR missing', () => {
    const a = createAsn(E, { source: 'manual', expected_date: '2026-06-07', lines: [{ item_id: 'I', item_name: 'X', qty_expected: 1 }] });
    expect(linkAsnToInwardReceipt(E, a.id, 'missing')).toBeNull();
  });

  it('ASN carries fiscal_year_id', () => {
    const a = createAsn(E, { source: 'manual', expected_date: '2026-06-07', lines: [{ item_id: 'I', item_name: 'X', qty_expected: 1 }] });
    expect(a.fiscal_year_id).toMatch(/^FY-\d{4}-\d{2}$/);
  });
});

// ── 6-8 · Canon-5 EximX read-only
describe('WMS2 · Canon-5 EximX read-only', () => {
  it('generateAsnFromImportPO reads importPOKey and produces eximx_import ASN', () => {
    const po: ImportPurchaseOrder = {
      id: 'ipo-1', po_number: 'IPO-001', entity_id: E, status: 'approved',
      po_date: '2026-06-01', expected_delivery: '2026-06-15',
      iec_id: 'iec', foreign_vendor_id: 'fv', currency_code: 'USD',
      booking_rate: 83, customs_valuation_rate_estimate: null, rate_ladder: [],
      incoterm: 'FOB' as never, load_port_code: 'X', discharge_port_code: 'Y',
      form_15ca_seed: { requires_form_15ca: false, form_15ca_ref: null, form_15cb_ref: null, form_15ca_filed_at: null },
      rms_declaration_id: null,
      lines: [
        { id: 'l1', line_no: 1, item_id: 'ITM-1', item_name: 'Widget', qty: 100, uom: 'NOS',
          rate_foreign_currency: 1, basic_value_foreign: 100, cth_code: '', country_of_origin: 'CN',
          fta_agreement: null, estimated_bcd_rate: 0, estimated_igst_rate: 0, notes: '' },
      ],
      total_basic_value_foreign: 100, estimated_landed_inr: 8300,
      created_at: '', updated_at: '', created_by: 'u',
    };
    localStorage.setItem(importPOKey(E), JSON.stringify([po]));
    const asn = generateAsnFromImportPO(E, 'ipo-1');
    expect(asn?.source).toBe('eximx_import');
    expect(asn?.source_ref_id).toBe('ipo-1');
    expect(asn?.lines).toHaveLength(1);
  });

  it('Canon-5 proof: EximX keys are NEVER written during ASN generation', () => {
    const importKey = importPOKey(E);
    const boeKey = billOfEntryKey(E);
    const po = { id: 'ipo-x', po_number: 'IPO-X', entity_id: E, status: 'approved',
      po_date: '2026-06-01', expected_delivery: '2026-06-15',
      iec_id: '', foreign_vendor_id: '', currency_code: 'USD', booking_rate: 83,
      customs_valuation_rate_estimate: null, rate_ladder: [],
      incoterm: 'FOB' as never, load_port_code: '', discharge_port_code: '',
      form_15ca_seed: { requires_form_15ca: false, form_15ca_ref: null, form_15cb_ref: null, form_15ca_filed_at: null },
      rms_declaration_id: null,
      lines: [{ id: 'l', line_no: 1, item_id: 'I', item_name: 'X', qty: 1, uom: 'NOS',
        rate_foreign_currency: 1, basic_value_foreign: 1, cth_code: '', country_of_origin: 'CN',
        fta_agreement: null, estimated_bcd_rate: 0, estimated_igst_rate: 0, notes: '' }],
      total_basic_value_foreign: 1, estimated_landed_inr: 83,
      created_at: '', updated_at: '', created_by: 'u' } as ImportPurchaseOrder;
    localStorage.setItem(importKey, JSON.stringify([po]));
    const beforeImport = localStorage.getItem(importKey);
    const beforeBoe = localStorage.getItem(boeKey);
    generateAsnFromImportPO(E, 'ipo-x');
    expect(localStorage.getItem(importKey)).toBe(beforeImport); // unchanged
    expect(localStorage.getItem(boeKey)).toBe(beforeBoe); // unchanged (still null)
  });

  it('generateAsnFromImportPO returns null for unknown PO', () => {
    expect(generateAsnFromImportPO(E, 'missing')).toBeNull();
  });
});

// ── 9-13 · Suggestion ladder (honest three-step)
describe('WMS2 · Suggestion ladder', () => {
  it('① ItemLocation home beats ② items_assigned', () => {
    seedBins([
      { id: 'b-home', godown_id: 'g1', godown_name: 'Main', location_code: 'A-1',
        location_type: 'storage', barcode_type: 'QR', status: 'active', printed: false,
        items_assigned: [], capacity: 100, created_at: '', updated_at: '' },
      { id: 'b-assigned', godown_id: 'g1', godown_name: 'Main', location_code: 'B-2',
        location_type: 'storage', barcode_type: 'QR', status: 'active', printed: false,
        items_assigned: ['ITM-1'], capacity: 100, created_at: '', updated_at: '' },
    ]);
    seedItemLocations([
      { id: 'il-1', item_id: 'ITM-1', location_type: 'inward', godown_id: 'g1', godown_name: 'Main',
        bin_id: 'b-home', bin_name: 'A-1', created_at: '', updated_at: '' },
    ]);
    const s = suggestBins(E, 'ITM-1', 'g1');
    expect(s[0].basis).toBe('item_location_home');
    expect(s[0].bin_label_id).toBe('b-home');
    expect(s.some((x) => x.basis === 'bin_items_assigned')).toBe(true);
  });

  it('② items_assigned beats ③ capacity_headroom', () => {
    seedBins([
      { id: 'b-assigned', godown_id: 'g1', godown_name: 'Main', location_code: 'B-2',
        location_type: 'storage', barcode_type: 'QR', status: 'active', printed: false,
        items_assigned: ['ITM-1'], capacity: 100, created_at: '', updated_at: '' },
      { id: 'b-headroom', godown_id: 'g1', godown_name: 'Main', location_code: 'C-3',
        location_type: 'storage', barcode_type: 'QR', status: 'active', printed: false,
        items_assigned: [], capacity: 100, created_at: '', updated_at: '' },
    ]);
    const s = suggestBins(E, 'ITM-1', 'g1');
    expect(s[0].basis).toBe('bin_items_assigned');
  });

  it('③ capacity-null bins are SKIPPED at headroom step', () => {
    seedBins([
      { id: 'b-unmeasured', godown_id: 'g1', godown_name: 'Main', location_code: 'U-1',
        location_type: 'storage', barcode_type: 'QR', status: 'active', printed: false,
        items_assigned: [], capacity: null, created_at: '', updated_at: '' },
    ]);
    const s = suggestBins(E, 'ITM-NEW', 'g1');
    expect(s).toHaveLength(1);
    expect(s[0].basis).toBe('none');
  });

  it('empty ladder returns single basis=none entry (never fabricated)', () => {
    seedBins([]);
    const s = suggestBins(E, 'ITM-Z', 'g1');
    expect(s).toHaveLength(1);
    expect(s[0].basis).toBe('none');
    expect(s[0].bin_label_id).toBeUndefined();
  });

  it('three suggestions can stack in priority order', () => {
    seedBins([
      { id: 'b-h', godown_id: 'g1', godown_name: 'M', location_code: 'H',
        location_type: 'storage', barcode_type: 'QR', status: 'active', printed: false,
        items_assigned: [], capacity: 100, created_at: '', updated_at: '' },
      { id: 'b-a', godown_id: 'g1', godown_name: 'M', location_code: 'A',
        location_type: 'storage', barcode_type: 'QR', status: 'active', printed: false,
        items_assigned: ['ITM-1'], capacity: 100, created_at: '', updated_at: '' },
      { id: 'b-c', godown_id: 'g1', godown_name: 'M', location_code: 'C',
        location_type: 'storage', barcode_type: 'QR', status: 'active', printed: false,
        items_assigned: [], capacity: 100, created_at: '', updated_at: '' },
    ]);
    seedItemLocations([
      { id: 'il', item_id: 'ITM-1', location_type: 'inward', godown_id: 'g1', godown_name: 'M',
        bin_id: 'b-h', bin_name: 'H', created_at: '', updated_at: '' },
    ]);
    const s = suggestBins(E, 'ITM-1', 'g1');
    expect(s.map((x) => x.basis)).toEqual(['item_location_home', 'bin_items_assigned', 'capacity_headroom']);
  });
});

// ── 14-16 · Placement
describe('WMS2 · Placement', () => {
  it('records placement with basis on every row + floor fields', () => {
    const ir = seedInward({});
    const p = recordPlacement(E, {
      inward_receipt_id: ir.id, item_id: 'ITM-1', item_name: 'W', qty_placed: 5,
      godown_id: 'g1', suggestion_basis: 'manual',
    });
    expect(p?.suggestion_basis).toBe('manual');
    expect(p?.created_by).toBeTruthy();
    expect(p?.retention_policy).toBe('operational_log_only');
    expect(listPlacements(E)).toHaveLength(1);
  });

  it('rejects bin that does not belong to the godown', () => {
    seedBins([{ id: 'b-1', godown_id: 'gOTHER', godown_name: 'O', location_code: 'X',
      location_type: 'storage', barcode_type: 'QR', status: 'active', printed: false,
      created_at: '', updated_at: '' }]);
    const ir = seedInward({});
    const p = recordPlacement(E, {
      inward_receipt_id: ir.id, item_id: 'ITM-1', item_name: 'W', qty_placed: 5,
      godown_id: 'g1', bin_label_id: 'b-1', suggestion_basis: 'manual',
    });
    expect(p).toBeNull();
  });

  it('rejects placement with missing inward receipt', () => {
    const p = recordPlacement(E, {
      inward_receipt_id: 'nope', item_id: 'I', item_name: 'X', qty_placed: 1,
      godown_id: 'g1', suggestion_basis: 'manual',
    });
    expect(p).toBeNull();
  });
});

// ── 17-19 · Queue + Shelf
describe('WMS2 · Queue + Shelf View', () => {
  it('putaway queue subtracts placed qty', () => {
    const ir = seedInward({});
    expect(getPutawayQueue(E)).toHaveLength(1);
    recordPlacement(E, { inward_receipt_id: ir.id, item_id: 'ITM-1', item_name: 'Widget',
      qty_placed: 4, godown_id: 'g1', suggestion_basis: 'manual' });
    const q = getPutawayQueue(E);
    expect(q[0].qty_placed).toBe(4);
    expect(q[0].qty_pending).toBe(6);
  });

  it('shelf view reports unplaced bins honestly as empty', () => {
    seedBins([
      { id: 'b1', godown_id: 'g1', godown_name: 'M', location_code: 'A1',
        location_type: 'storage', barcode_type: 'QR', status: 'active', printed: false,
        capacity: 50, created_at: '', updated_at: '' },
    ]);
    const view = getShelfView(E, 'g1');
    expect(view[0].empty).toBe(true);
    expect(view[0].placed_qty).toBe(0);
  });

  it('shelf view aggregates placements per bin', () => {
    seedBins([
      { id: 'b1', godown_id: 'g1', godown_name: 'M', location_code: 'A1',
        location_type: 'storage', barcode_type: 'QR', status: 'active', printed: false,
        capacity: 50, created_at: '', updated_at: '' },
    ]);
    const ir = seedInward({});
    recordPlacement(E, { inward_receipt_id: ir.id, item_id: 'ITM-1', item_name: 'Widget',
      qty_placed: 7, godown_id: 'g1', bin_label_id: 'b1', suggestion_basis: 'manual' });
    const view = getShelfView(E, 'g1');
    expect(view[0].placed_qty).toBe(7);
    expect(view[0].items).toHaveLength(1);
  });
});

// ── 20-22 · Floor + retention + summary
describe('WMS2 · Floor + retention + summary', () => {
  it('retention mapping for asn + bin-placement → operational_log_only', () => {
    expect(getDefaultPolicyForRecordType('asn')).toBe('operational_log_only');
    expect(getDefaultPolicyForRecordType('bin-placement')).toBe('operational_log_only');
  });

  it('summary aggregates ASN counts + queue + placements', () => {
    seedInward({});
    createAsn(E, { source: 'manual', expected_date: '2026-06-07',
      lines: [{ item_id: 'I', item_name: 'X', qty_expected: 1 }] });
    const s = getPutawaySummary(E);
    expect(s.asn.expected).toBe(1);
    expect(s.putaway_pending_lines).toBe(1);
  });

  it('ASN + placement stores use namespaced keys', () => {
    createAsn(E, { source: 'manual', expected_date: '2026-06-07',
      lines: [{ item_id: 'I', item_name: 'X', qty_expected: 1 }] });
    expect(localStorage.getItem(asnRecordsKey(E))).toBeTruthy();
    expect(asnRecordsKey(E)).toBe(`erp_wms_asn_${E}`);
    expect(binPlacementsKey(E)).toBe(`erp_wms_bin_placements_${E}`);
  });
});

// ── 23-25 · WMS2 rider · Order.source
describe('WMS2 · Order.source rider', () => {
  it('W1 sniffer prefers Order.source over narration', () => {
    const o: Order = {
      id: 'o', order_no: 'SO/1', base_voucher_type: 'Sales Order', entity_id: E,
      date: '2026-06-07', party_id: 'p', party_name: 'P', lines: [],
      gross_amount: 0, total_tax: 0, net_amount: 0,
      narration: 'EcomX · whatever', terms_conditions: '', status: 'open',
      created_at: '', updated_at: '',
      source: 'salesx',
    };
    // Field wins over narration prefix
    expect(classifyOrderSource(o)).toBe('salesx');
  });

  it('W1 sniffer falls back to narration for legacy rows (no source field)', () => {
    const o: Order = {
      id: 'o', order_no: 'SO/1', base_voucher_type: 'Sales Order', entity_id: E,
      date: '2026-06-07', party_id: 'p', party_name: 'P', lines: [],
      gross_amount: 0, total_tax: 0, net_amount: 0,
      narration: 'WebStoreX order · schemes: none', terms_conditions: '', status: 'open',
      created_at: '', updated_at: '',
    };
    expect(classifyOrderSource(o)).toBe('webstorex');
  });

  it('ecomx-engine birth-site plants source: ecomx', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/lib/ecomx-engine.ts'), 'utf-8');
    expect(src).toMatch(/source:\s*'ecomx'/);
  });

  it('webstorex-order-engine birth-site plants source: webstorex', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/lib/webstorex-order-engine.ts'), 'utf-8');
    expect(src).toMatch(/source:\s*'webstorex'/);
  });
});

// ── 26-29 · §H import-shape guards + history seeding
describe('WMS2 · §H guards + institutional', () => {
  it('BinLabel + ItemLocation + Godown stay read-only (no writes from putaway engine)', () => {
    const before = {
      bins: localStorage.getItem('erp_bin_labels'),
      locs: localStorage.getItem(itemLocationsKey(E)),
      gods: localStorage.getItem('erp_godowns'),
    };
    seedInward({});
    suggestBins(E, 'ITM-1', 'g1');
    recordPlacement(E, { inward_receipt_id: 'ir-1', item_id: 'ITM-1', item_name: 'W',
      qty_placed: 1, godown_id: 'g1', suggestion_basis: 'manual' });
    expect(localStorage.getItem('erp_bin_labels')).toBe(before.bins);
    expect(localStorage.getItem(itemLocationsKey(E))).toBe(before.locs);
    expect(localStorage.getItem('erp_godowns')).toBe(before.gods);
  });

  it('sprint-history contains WMS2 row', () => {
    const row = SPRINTS.find((s) => String(s.sprintNumber) === 'WMS2');
    expect(row).toBeTruthy();
    expect(row!.newSiblings).toContain('wms-putaway-engine');
    expect(row!.predecessorSha).toBe('cf8a409d');
  });

  it('WMS1 row headSha is flipped to cf8a409d at WMS2 close', () => {
    const row = SPRINTS.find((s) => String(s.sprintNumber) === 'WMS1');
    expect(row?.headSha).toBe('cf8a409d');
  });

  it('sibling-register lists wms-putaway-engine', () => {
    expect(SIBLINGS.some((s) => s.id === 'wms-putaway-engine')).toBe(true);
  });
});
