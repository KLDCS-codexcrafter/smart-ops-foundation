/**
 * @file        src/lib/procure-capex-fa-cascade-engine.ts
 * @purpose     CAPEX PO → GRN → FA cascade · auto-creates draft Capital Purchase voucher + AssetUnitRecords · 28th SIBLING ⭐
 * @sprint      T-Phase-2.HK-6 · Theme 2 v2 · Q-LOCK-4 v2 B-3 · Q-LOCK-17(i)
 * @decisions   D-NEW · per Path A 50-year-architect Decision LOCKED May 23 + RAT-2 ratified
 * @disciplines FR-19 SIBLING (single-source: Procure360 CAPEX flow) · FR-26 entity-scoped
 *              · D-127/128a 139 ABSOLUTE: reuses canonical vt-capital-purchase ONLY
 * @closes      LEAK-2 root + GAP-19
 * @reuses      fincore-engine (postVoucher · generateVoucherNo · fyForDate)
 * @[JWT]       Phase 2: POST /api/procure-capex-fa-cascade/grn-to-fa
 */

import type { Voucher } from '@/types/voucher';
import type { AssetUnitRecord, ITActBlock } from '@/types/fixed-asset';
import { faUnitsKey, IT_ACT_RATES } from '@/types/fixed-asset';
import { postVoucher, generateVoucherNo } from './fincore-engine';

// ============================================================================
// TYPES
// ============================================================================

export interface CAPEXGRNCascadeEvent {
  type: 'procure360:grn.capex_received';
  entity_id: string;
  po_id: string;
  grn_id: string;
  capital_indent_id: string;
  capital_indent_line_id: string;
  vendor_id: string;
  vendor_name: string;
  received_qty: number;
  received_value: number;            // total received value (rate × qty)
  item_id: string;
  item_name: string;
  ledger_definition_id: string;      // PPE GL ledger
  ledger_name: string;
  asset_id_prefix: string;           // e.g. 'PPE'
  it_act_block: ITActBlock;
  cwip_account_id: string;           // CWIP suspense ledger
  put_to_use_date?: string;          // if set · status='active' · else 'cwip'
  location?: string;
  department?: string;
  custodian_name?: string;
  emitted_at: string;
}

export interface CAPEXCascadeResult {
  capital_purchase_voucher_id: string;
  asset_unit_ids: string[];
  cwip_voucher_id: string | null;
}

const newId = (p: string): string =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ============================================================================
// I/O helpers
// ============================================================================

function readFAUnits(entityCode: string): AssetUnitRecord[] {
  try {
    // [JWT] GET /api/fa-units?entityCode=...
    const raw = localStorage.getItem(faUnitsKey(entityCode));
    return raw ? (JSON.parse(raw) as AssetUnitRecord[]) : [];
  } catch { return []; }
}

function writeFAUnits(entityCode: string, list: AssetUnitRecord[]): void {
  try {
    // [JWT] POST /api/fa-units
    localStorage.setItem(faUnitsKey(entityCode), JSON.stringify(list));
  } catch { /* quota */ }
}

function fyTag(dateISO: string): string {
  // FY runs Apr–Mar · "25-26" format used in asset_id_suffix
  const d = new Date(dateISO + 'T00:00:00');
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const start = m >= 4 ? y : y - 1;
  const yy = (n: number) => String(n).slice(-2);
  return `${yy(start)}-${yy(start + 1)}`;
}

function nextAssetSeq(units: AssetUnitRecord[], prefix: string, suffix: string): number {
  const matching = units.filter(u => u.asset_id_prefix === prefix && u.asset_id_suffix === suffix);
  const maxSeq = matching.reduce((m, u) => Math.max(m, u.asset_id_seq), 0);
  return maxSeq + 1;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Pre-flight check before triggering cascade · returns reasons if blocked.
 * (Caller is expected to load CapitalIndent + GRN externally; this engine
 *  remains stateless about Procure360 schema · operates on cascade event payload.)
 */
export function checkCAPEXCascadeReadiness(
  entityCode: string,
  event: Pick<CAPEXGRNCascadeEvent, 'capital_indent_id' | 'grn_id' | 'received_qty' | 'received_value'>,
): { allowed: boolean; reason: string | null } {
  if (event.received_qty <= 0) return { allowed: false, reason: 'Received qty must be > 0' };
  if (event.received_value <= 0) return { allowed: false, reason: 'Received value must be > 0' };
  if (!entityCode) return { allowed: false, reason: 'Entity code required' };
  return { allowed: true, reason: null };
}

/**
 * On CAPEX GRN posting · creates:
 *   1. N AssetUnitRecord rows (one per received qty)
 *   2. 1 draft Capital Purchase voucher (canonical vt-capital-purchase)
 *   3. (optional) CWIP voucher if put_to_use_date not set
 *
 * D-127/128a 139 ABSOLUTE invariant preserved · no new voucher types created.
 */
export function cascadeCAPEXGRNToFA(
  entityCode: string,
  event: CAPEXGRNCascadeEvent,
): CAPEXCascadeResult {
  const readiness = checkCAPEXCascadeReadiness(entityCode, event);
  if (!readiness.allowed) throw new Error(readiness.reason ?? 'Cascade blocked');

  const now = new Date().toISOString();
  const date = event.emitted_at.slice(0, 10);
  const suffix = fyTag(date);
  const costPerUnit = event.received_value / event.received_qty;
  const itActRate = IT_ACT_RATES[event.it_act_block];

  // -------- 1. Create AssetUnitRecord rows --------
  const existing = readFAUnits(entityCode);
  let seq = nextAssetSeq(existing, event.asset_id_prefix, suffix);
  const newUnits: AssetUnitRecord[] = [];
  const newIds: string[] = [];

  for (let i = 0; i < event.received_qty; i++) {
    const id = newId('fau');
    const assetId = `${event.asset_id_prefix}/${suffix}/${String(seq).padStart(3, '0')}`;
    seq++;
    newUnits.push({
      id,
      entity_id: entityCode,
      item_id: event.item_id,
      item_name: event.item_name,
      ledger_definition_id: event.ledger_definition_id,
      ledger_name: event.ledger_name,
      asset_id: assetId,
      asset_id_prefix: event.asset_id_prefix,
      asset_id_suffix: suffix,
      asset_id_seq: seq - 1,
      gross_block_cost: costPerUnit,
      salvage_value: 0,
      accumulated_depreciation: 0,
      net_book_value: costPerUnit,
      opening_wdv: costPerUnit,
      purchase_date: date,
      put_to_use_date: event.put_to_use_date ?? '',
      it_act_block: event.it_act_block,
      it_act_depr_rate: itActRate,
      location: event.location ?? '',
      department: event.department ?? '',
      custodian_name: event.custodian_name ?? '',
      status: event.put_to_use_date ? 'active' : 'cwip',
      capital_purchase_voucher_id: '', // back-linked below
      created_at: now,
      updated_at: now,
    });
    newIds.push(id);
  }

  // -------- 2. Create draft Capital Purchase voucher --------
  const voucherId = newId('vch-cp');
  const voucherNo = generateVoucherNo('CP', entityCode);
  const voucher: Voucher = {
    id: voucherId,
    voucher_no: voucherNo,
    voucher_type_id: 'vt-capital-purchase',
    voucher_type_name: 'Capital Purchase',
    base_voucher_type: 'Capital Purchase',
    entity_id: entityCode,
    date,
    party_id: event.vendor_id,
    party_name: event.vendor_name,
    ledger_lines: [
      {
        id: newId('vll'),
        ledger_id: event.put_to_use_date ? event.ledger_definition_id : event.cwip_account_id,
        ledger_name: event.put_to_use_date ? event.ledger_name : 'CWIP - Suspense',
        dr_amount: event.received_value,
        cr_amount: 0,
        narration: `${event.put_to_use_date ? 'PPE' : 'CWIP'} · ${event.item_name} × ${event.received_qty}`,
      },
      {
        id: newId('vll'),
        ledger_id: 'vendor-payable',
        ledger_name: `${event.vendor_name} - Payable`,
        dr_amount: 0,
        cr_amount: event.received_value,
        narration: `Vendor payable for CAPEX GRN ${event.grn_id}`,
      },
    ],
    gross_amount: event.received_value,
    total_discount: 0,
    total_taxable: event.received_value,
    total_cgst: 0,
    total_sgst: 0,
    total_igst: 0,
    total_cess: 0,
    total_tax: 0,
    round_off: 0,
    net_amount: event.received_value,
    tds_applicable: false,
    narration: `CAPEX GRN cascade · PO ${event.po_id} · GRN ${event.grn_id} · ${event.received_qty} × ${event.item_name}`,
    terms_conditions: '',
    payment_enforcement: '',
    payment_instrument: '',
    status: 'draft',
  } as Voucher;

  postVoucher(voucher, entityCode);

  // Back-link capital_purchase_voucher_id on AssetUnitRecords
  for (const u of newUnits) u.capital_purchase_voucher_id = voucherId;
  writeFAUnits(entityCode, [...existing, ...newUnits]);

  // -------- 3. CWIP marker · returned id same as CP voucher when status='cwip' --------
  const cwipVoucherId = event.put_to_use_date ? null : voucherId;

  return {
    capital_purchase_voucher_id: voucherId,
    asset_unit_ids: newIds,
    cwip_voucher_id: cwipVoucherId,
  };
}

/**
 * Flip CWIP → active · creates Put-To-Use voucher (canonical vt-put-to-use exists per D-127).
 * Used when site engineer confirms commissioning post-GRN.
 */
export function putToUseAssetUnit(
  entityCode: string,
  assetUnitId: string,
  putToUseDate: string,
): { asset_unit_id: string; put_to_use_voucher_id: string } {
  const units = readFAUnits(entityCode);
  const idx = units.findIndex(u => u.id === assetUnitId);
  if (idx < 0) throw new Error(`AssetUnitRecord ${assetUnitId} not found`);
  const unit = units[idx];
  if (unit.status === 'active') {
    return { asset_unit_id: assetUnitId, put_to_use_voucher_id: '' };
  }

  units[idx] = {
    ...unit,
    status: 'active',
    put_to_use_date: putToUseDate,
    updated_at: new Date().toISOString(),
  };
  writeFAUnits(entityCode, units);

  const voucherId = newId('vch-ptu');
  const voucherNo = generateVoucherNo('PTU', entityCode);
  const voucher: Voucher = {
    id: voucherId,
    voucher_no: voucherNo,
    voucher_type_id: 'vt-put-to-use',
    voucher_type_name: 'Put To Use',
    base_voucher_type: 'Put To Use',
    entity_id: entityCode,
    date: putToUseDate,
    ledger_lines: [
      {
        id: newId('vll'),
        ledger_id: unit.ledger_definition_id,
        ledger_name: unit.ledger_name,
        dr_amount: unit.gross_block_cost,
        cr_amount: 0,
        narration: `Put to use: ${unit.asset_id}`,
      },
      {
        id: newId('vll'),
        ledger_id: 'cwip-suspense',
        ledger_name: 'CWIP - Suspense',
        dr_amount: 0,
        cr_amount: unit.gross_block_cost,
        narration: `Capitalised from CWIP: ${unit.asset_id}`,
      },
    ],
    gross_amount: unit.gross_block_cost,
    total_discount: 0,
    total_taxable: unit.gross_block_cost,
    total_cgst: 0,
    total_sgst: 0,
    total_igst: 0,
    total_cess: 0,
    total_tax: 0,
    round_off: 0,
    net_amount: unit.gross_block_cost,
    tds_applicable: false,
    narration: `Put to use · ${unit.asset_id} · ${unit.item_name}`,
    terms_conditions: '',
    payment_enforcement: '',
    payment_instrument: '',
    status: 'draft',
  } as Voucher;

  postVoucher(voucher, entityCode);
  return { asset_unit_id: assetUnitId, put_to_use_voucher_id: voucherId };
}
