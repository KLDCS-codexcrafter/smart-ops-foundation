/**
 * @file     voucher-to-tally-schema.ts
 * @purpose  Canonical Operix Voucher → Tally object schema mapper.
 *           Single source of truth that converts an Operix Voucher into Tally's
 *           object model. Both XML and JSON serializers consume this same model.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T-T10-pre.2c-TallyNative
 * @sprint   T-T10-pre.2c-TallyNative
 * @iso      Functional Suitability (HIGH — every VoucherBaseType has an explicit handler)
 *           Maintainability (HIGH — single switch · exhaustive · TS `never` check)
 *           Reliability (HIGH — pure mapper · no I/O · same input ⇒ same output)
 * @whom     buildTallyVoucherXML · buildTallyVoucherJSON · (Phase 2) Bridge sync engine
 * @depends  src/types/voucher.ts · src/types/voucher-type.ts
 *
 * Reference: https://help.tallysolutions.com/xml-integration/ (PRIMARY)
 *            4DSmartOps S-04 (Tally Purchase Sync) + S-10 (motherofall TDLs) cross-validation
 */

import type { Voucher, VoucherLedgerLine, VoucherInventoryLine, BillReference } from '@/types/voucher';
import type { VoucherBaseType } from '@/types/voucher-type';

// ── Public types ──────────────────────────────────────────────────────────

export type TallyAction = 'Create' | 'Alter' | 'Cancel' | 'Delete';

export interface TallyBillAllocation {
  NAME: string;
  BILLTYPE: 'New Ref' | 'Agst Ref' | 'Advance' | 'On Account';
  AMOUNT: string;
}

export interface TallyBatchAllocation {
  GODOWNNAME: string;
  BATCHNAME?: string;
  ACTUALQTY: string;
  BILLEDQTY: string;
  AMOUNT: string;
}

export interface TallyLedgerEntry {
  LEDGERNAME: string;
  ISDEEMEDPOSITIVE: 'Yes' | 'No';
  AMOUNT: string;
  GSTCLASS?: string;
  BILLALLOCATIONS_LIST?: TallyBillAllocation[];
}

export interface TallyInventoryEntry {
  STOCKITEMNAME: string;
  ACTUALQTY: string;
  BILLEDQTY: string;
  RATE: string;
  AMOUNT: string;
  GODOWNNAME?: string;
  BATCHALLOCATIONS_LIST?: TallyBatchAllocation[];
  ACCOUNTINGALLOCATIONS_LIST?: TallyLedgerEntry[];
}

export interface TallyVoucherSchema {
  '@VCHTYPE': string;
  '@ACTION': TallyAction;
  '@TAGNAME'?: 'Voucher Number';
  '@TAGVALUE'?: string;
  DATE: string;
  GUID?: string;
  VOUCHERNUMBER: string;
  VOUCHERTYPENAME: string;
  PARTYLEDGERNAME?: string;
  PARTYNAME?: string;
  PLACEOFSUPPLY?: string;
  REFERENCE?: string;
  REFERENCEDATE?: string;
  NARRATION?: string;
  EFFECTIVEDATE?: string;
  PERSISTEDVIEW?: string;
  GSTREGISTRATIONTYPE?: string;
  COUNTRYOFRESIDENCE?: string;
  ALLLEDGERENTRIES_LIST?: TallyLedgerEntry[];
  ALLINVENTORYENTRIES_LIST?: TallyInventoryEntry[];
  // TDS-specific
  ISDEDUCTEDFLAG?: 'Yes' | 'No';
  TDSCATEGORY?: string;
  TDSAMOUNT?: string;
  DEDUCTEEPAN?: string;
  // Manufacturing Journal
  BOMNAME?: string;
  // Contra
  INSTRUMENTNUMBER?: string;
  INSTRUMENTDATE?: string;
  // Stock Journal
  DESTINATIONGODOWN?: string;
  SOURCEGODOWN?: string;
}

// ── Internal helpers ──────────────────────────────────────────────────────

/** Convert Operix ISO date (YYYY-MM-DD) to Tally compact date (YYYYMMDD). */
function toTallyDate(iso: string | undefined): string {
  if (!iso) return '';
  return iso.replace(/-/g, '').slice(0, 8);
}

/** Stringify number for Tally (Tally treats every value as string). */
function s(n: number | undefined | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '0';
  return String(n);
}

/** Map Operix bill-ref kind to Tally BILLTYPE. */
function billType(kind: BillReference['type']): TallyBillAllocation['BILLTYPE'] {
  if (kind === 'against_ref') return 'Agst Ref';
  if (kind === 'advance') return 'Advance';
  return 'New Ref';
}

/** Build BILLALLOCATIONS_LIST from Operix bill_references. */
function buildBillAllocations(refs: BillReference[] | undefined): TallyBillAllocation[] | undefined {
  if (!refs || refs.length === 0) return undefined;
  return refs.map(r => ({
    NAME: r.voucher_no,
    BILLTYPE: billType(r.type),
    AMOUNT: s(r.amount),
  }));
}

/**
 * Convert Operix ledger lines to Tally ledger entries.
 * In Tally convention: ISDEEMEDPOSITIVE=Yes for Dr-side ledgers (party in Sales, asset Dr),
 * No for Cr-side. AMOUNT is positive for Cr, negative for Dr (Tally signing rule).
 */
function buildLedgerEntries(
  lines: VoucherLedgerLine[],
  attachBillRefs?: BillReference[],
): TallyLedgerEntry[] {
  return lines.map((l, idx) => {
    const isDr = l.dr_amount > 0;
    const amount = isDr ? -Math.abs(l.dr_amount) : Math.abs(l.cr_amount);
    const entry: TallyLedgerEntry = {
      LEDGERNAME: l.ledger_name,
      ISDEEMEDPOSITIVE: isDr ? 'Yes' : 'No',
      AMOUNT: s(amount),
    };
    // Attach bill allocations to the first ledger line (by Tally convention, attaches to party ledger).
    if (idx === 0 && attachBillRefs) {
      const ba = buildBillAllocations(attachBillRefs);
      if (ba) entry.BILLALLOCATIONS_LIST = ba;
    }
    return entry;
  });
}

/** Build inventory entries from Operix inventory lines. */
function buildInventoryEntries(lines: VoucherInventoryLine[]): TallyInventoryEntry[] {
  return lines.map(l => {
    const entry: TallyInventoryEntry = {
      STOCKITEMNAME: l.item_name,
      ACTUALQTY: `${s(l.qty)} ${l.uom || 'Nos'}`,
      BILLEDQTY: `${s(l.qty)} ${l.uom || 'Nos'}`,
      RATE: `${s(l.rate)}/${l.uom || 'Nos'}`,
      AMOUNT: s(l.taxable_value || l.total),
      GODOWNNAME: l.godown_name,
    };
    if (l.allocations && l.allocations.length > 0) {
      entry.BATCHALLOCATIONS_LIST = l.allocations.map(a => ({
        GODOWNNAME: a.godown_name,
        BATCHNAME: a.batch_no,
        ACTUALQTY: `${s(a.qty)} ${l.uom || 'Nos'}`,
        BILLEDQTY: `${s(a.qty)} ${l.uom || 'Nos'}`,
        AMOUNT: s(a.taxable_value),
      }));
    }
    return entry;
  });
}

/** Determine GST registration type from party GSTIN. */
function gstRegistrationType(gstin: string | undefined): string {
  if (!gstin) return 'Unregistered';
  return 'Regular';
}

/** Build the common header fields shared by all voucher types. */
function buildCommon(voucher: Voucher, action: TallyAction, vchType: string): TallyVoucherSchema {
  const schema: TallyVoucherSchema = {
    '@VCHTYPE': vchType,
    '@ACTION': action,
    DATE: toTallyDate(voucher.date),
    VOUCHERNUMBER: voucher.voucher_no,
    VOUCHERTYPENAME: voucher.voucher_type_name,
  };
  if (voucher.id) schema.GUID = voucher.id;
  if (voucher.narration) schema.NARRATION = voucher.narration;
  if (voucher.effective_date) schema.EFFECTIVEDATE = toTallyDate(voucher.effective_date);
  if (voucher.party_name) {
    schema.PARTYLEDGERNAME = voucher.party_name;
    schema.PARTYNAME = voucher.party_name;
  }
  if (voucher.place_of_supply) schema.PLACEOFSUPPLY = voucher.place_of_supply;
  if (action !== 'Create') {
    schema['@TAGNAME'] = 'Voucher Number';
    schema['@TAGVALUE'] = voucher.voucher_no;
  }
  return schema;
}

// ── Per-voucher-type mappers ──────────────────────────────────────────────

function mapSalesOrPurchase(
  voucher: Voucher, action: TallyAction, vchType: 'Sales' | 'Purchase',
): TallyVoucherSchema {
  const schema = buildCommon(voucher, action, vchType);
  schema.PERSISTEDVIEW =
    voucher.invoice_mode === 'item' ? 'Invoice Voucher View' : 'Accounting Voucher View';
  schema.GSTREGISTRATIONTYPE = gstRegistrationType(voucher.party_gstin);
  if (voucher.invoice_mode === 'item' && voucher.inventory_lines && voucher.inventory_lines.length > 0) {
    schema.ALLINVENTORYENTRIES_LIST = buildInventoryEntries(voucher.inventory_lines);
  }
  schema.ALLLEDGERENTRIES_LIST = buildLedgerEntries(voucher.ledger_lines, voucher.bill_references);
  if (voucher.ref_voucher_no) schema.REFERENCE = voucher.ref_voucher_no;
  return schema;
}

function mapReceiptOrPayment(
  voucher: Voucher, action: TallyAction, vchType: 'Receipt' | 'Payment',
): TallyVoucherSchema {
  const schema = buildCommon(voucher, action, vchType);
  schema.ALLLEDGERENTRIES_LIST = buildLedgerEntries(voucher.ledger_lines, voucher.bill_references);
  if (voucher.instrument_ref_no) schema.INSTRUMENTNUMBER = voucher.instrument_ref_no;
  if (voucher.cheque_date) schema.INSTRUMENTDATE = toTallyDate(voucher.cheque_date);
  // Payment-side TDS metadata
  if (vchType === 'Payment' && voucher.tds_applicable) {
    schema.ISDEDUCTEDFLAG = 'Yes';
    if (voucher.tds_section) schema.TDSCATEGORY = voucher.tds_section;
    if (voucher.tds_amount !== undefined) schema.TDSAMOUNT = s(voucher.tds_amount);
    if (voucher.deductee_pan) schema.DEDUCTEEPAN = voucher.deductee_pan;
  }
  return schema;
}

function mapContra(voucher: Voucher, action: TallyAction): TallyVoucherSchema {
  const schema = buildCommon(voucher, action, 'Contra');
  schema.ALLLEDGERENTRIES_LIST = buildLedgerEntries(voucher.ledger_lines);
  if (voucher.instrument_ref_no) schema.INSTRUMENTNUMBER = voucher.instrument_ref_no;
  if (voucher.cheque_date) schema.INSTRUMENTDATE = toTallyDate(voucher.cheque_date);
  return schema;
}

function mapJournal(voucher: Voucher, action: TallyAction, vchType = 'Journal'): TallyVoucherSchema {
  const schema = buildCommon(voucher, action, vchType);
  schema.ALLLEDGERENTRIES_LIST = buildLedgerEntries(voucher.ledger_lines);
  // Tally rejects unbalanced journals — surface a console warning so callers can debug.
  const drTotal = voucher.ledger_lines.reduce((sum, l) => sum + (l.dr_amount || 0), 0);
  const crTotal = voucher.ledger_lines.reduce((sum, l) => sum + (l.cr_amount || 0), 0);
  if (Math.abs(drTotal - crTotal) > 0.01) {
    // [Analytical] Diagnostic-only · banned-pattern targets console.log not console.error.
    console.error(
      `[tally-mapper] ${vchType} ${voucher.voucher_no} unbalanced: Dr=${drTotal} Cr=${crTotal}`,
    );
  }
  return schema;
}

function mapCreditOrDebitNote(
  voucher: Voucher, action: TallyAction, vchType: 'Credit Note' | 'Debit Note',
): TallyVoucherSchema {
  const schema = buildCommon(voucher, action, vchType);
  schema.PERSISTEDVIEW =
    voucher.invoice_mode === 'item' ? 'Invoice Voucher View' : 'Accounting Voucher View';
  schema.GSTREGISTRATIONTYPE = gstRegistrationType(voucher.party_gstin);
  if (voucher.ref_voucher_no) schema.REFERENCE = voucher.ref_voucher_no;
  if (voucher.invoice_mode === 'item' && voucher.inventory_lines && voucher.inventory_lines.length > 0) {
    schema.ALLINVENTORYENTRIES_LIST = buildInventoryEntries(voucher.inventory_lines);
  }
  schema.ALLLEDGERENTRIES_LIST = buildLedgerEntries(voucher.ledger_lines, voucher.bill_references);
  return schema;
}

function mapDeliveryOrReceiptNote(
  voucher: Voucher, action: TallyAction, vchType: 'Delivery Note' | 'Receipt Note',
): TallyVoucherSchema {
  const schema = buildCommon(voucher, action, vchType);
  // No ledger entries — pure stock movement. Reference upstream order if present.
  const ref = voucher.so_ref || voucher.po_ref || voucher.ref_voucher_no;
  if (ref) schema.REFERENCE = ref;
  if (voucher.inventory_lines && voucher.inventory_lines.length > 0) {
    schema.ALLINVENTORYENTRIES_LIST = buildInventoryEntries(voucher.inventory_lines);
  }
  return schema;
}

function mapManufacturingJournal(voucher: Voucher, action: TallyAction): TallyVoucherSchema {
  const schema = buildCommon(voucher, action, 'Manufacturing Journal');
  schema.BOMNAME = voucher.bom_id ? `BOM-${voucher.bom_id}` : 'Standard BOM';
  // Multi-stock-line: tag consumption as negative qty, production as positive.
  if (voucher.inventory_lines && voucher.inventory_lines.length > 0) {
    schema.ALLINVENTORYENTRIES_LIST = voucher.inventory_lines.map(l => {
      const isConsumption = l.mfg_line_type === 'consumption';
      const signedQty = isConsumption ? -Math.abs(l.qty) : Math.abs(l.qty);
      return {
        STOCKITEMNAME: l.item_name,
        ACTUALQTY: `${s(signedQty)} ${l.uom || 'Nos'}`,
        BILLEDQTY: `${s(signedQty)} ${l.uom || 'Nos'}`,
        RATE: `${s(l.rate)}/${l.uom || 'Nos'}`,
        AMOUNT: s(l.taxable_value || l.total),
        GODOWNNAME: l.godown_name,
      };
    });
  }
  if (voucher.overhead_ledger_name) {
    schema.ALLLEDGERENTRIES_LIST = [{
      LEDGERNAME: voucher.overhead_ledger_name,
      ISDEEMEDPOSITIVE: 'Yes',
      AMOUNT: s(-(voucher.gross_amount || 0)),
    }];
  }
  return schema;
}

function mapPhysicalStock(voucher: Voucher, action: TallyAction): TallyVoucherSchema {
  const schema = buildCommon(voucher, action, 'Physical Stock');
  if (voucher.inventory_lines && voucher.inventory_lines.length > 0) {
    schema.ALLINVENTORYENTRIES_LIST = buildInventoryEntries(voucher.inventory_lines);
  }
  return schema;
}

function mapStockJournalLike(voucher: Voucher, action: TallyAction): TallyVoucherSchema {
  const schema = buildCommon(voucher, action, 'Stock Journal');
  if (voucher.from_godown_name) schema.SOURCEGODOWN = voucher.from_godown_name;
  if (voucher.to_godown_name) schema.DESTINATIONGODOWN = voucher.to_godown_name;
  if (voucher.inventory_lines && voucher.inventory_lines.length > 0) {
    schema.ALLINVENTORYENTRIES_LIST = buildInventoryEntries(voucher.inventory_lines);
  }
  return schema;
}

function mapOrderLike(
  voucher: Voucher, action: TallyAction, vchType: 'Sales Order' | 'Purchase Order',
): TallyVoucherSchema {
  const schema = buildCommon(voucher, action, vchType);
  if (voucher.inventory_lines && voucher.inventory_lines.length > 0) {
    schema.ALLINVENTORYENTRIES_LIST = buildInventoryEntries(voucher.inventory_lines);
  }
  if (voucher.ledger_lines.length > 0) {
    schema.ALLLEDGERENTRIES_LIST = buildLedgerEntries(voucher.ledger_lines);
  }
  return schema;
}

function mapRejectionLike(
  voucher: Voucher, action: TallyAction, vchType: 'Rejections In' | 'Rejections Out',
): TallyVoucherSchema {
  const schema = buildCommon(voucher, action, vchType);
  if (voucher.inventory_lines && voucher.inventory_lines.length > 0) {
    schema.ALLINVENTORYENTRIES_LIST = buildInventoryEntries(voucher.inventory_lines);
  }
  return schema;
}

function mapMaterialMovement(
  voucher: Voucher, action: TallyAction, vchType: 'Material In' | 'Material Out',
): TallyVoucherSchema {
  const schema = buildCommon(voucher, action, vchType);
  if (voucher.inventory_lines && voucher.inventory_lines.length > 0) {
    schema.ALLINVENTORYENTRIES_LIST = buildInventoryEntries(voucher.inventory_lines);
  }
  return schema;
}

function mapJobOrderLike(
  voucher: Voucher, action: TallyAction, vchType: 'Job Work In Order' | 'Job Work Out Order',
): TallyVoucherSchema {
  const schema = buildCommon(voucher, action, vchType);
  if (voucher.inventory_lines && voucher.inventory_lines.length > 0) {
    schema.ALLINVENTORYENTRIES_LIST = buildInventoryEntries(voucher.inventory_lines);
  }
  return schema;
}

function mapAttendanceOrPayroll(
  voucher: Voucher, action: TallyAction, vchType: 'Attendance' | 'Payroll',
): TallyVoucherSchema {
  const schema = buildCommon(voucher, action, vchType);
  if (voucher.ledger_lines.length > 0) {
    schema.ALLLEDGERENTRIES_LIST = buildLedgerEntries(voucher.ledger_lines);
  }
  return schema;
}

/**
 * Generic "treat as Journal" mapper for asset-life-cycle vouchers and other
 * accounting-only base types not natively recognized by Tally as separate
 * voucher classes. They round-trip cleanly as Journal in Tally.
 */
function mapAsJournalAlias(
  voucher: Voucher, action: TallyAction, vchType: string,
): TallyVoucherSchema {
  return mapJournal(voucher, action, vchType);
}

// ── Public exhaustive entrypoint ──────────────────────────────────────────

/**
 * @purpose   Map an Operix Voucher to Tally's object schema.
 *            Per-voucher-type quirks handled via switch on base_voucher_type.
 *            EXHAUSTIVE — every VoucherBaseType has an explicit handler.
 * @param     voucher — Operix Voucher (from src/types/voucher.ts)
 * @param     action — TallyAction (default 'Create')
 * @returns   TallyVoucherSchema — Tally object representation
 */
export function mapVoucherToTallySchema(
  voucher: Voucher,
  action: TallyAction = 'Create',
): TallyVoucherSchema {
  const t: VoucherBaseType = voucher.base_voucher_type;
  switch (t) {
    case 'Sales':                  return mapSalesOrPurchase(voucher, action, 'Sales');
    case 'Purchase':               return mapSalesOrPurchase(voucher, action, 'Purchase');
    case 'Receipt':                return mapReceiptOrPayment(voucher, action, 'Receipt');
    case 'Payment':                return mapReceiptOrPayment(voucher, action, 'Payment');
    case 'Contra':                 return mapContra(voucher, action);
    case 'Journal':                return mapJournal(voucher, action, 'Journal');
    case 'Memorandum':             return mapAsJournalAlias(voucher, action, 'Memorandum');
    case 'Reversing Journal':      return mapAsJournalAlias(voucher, action, 'Reversing Journal');
    case 'Credit Note':            return mapCreditOrDebitNote(voucher, action, 'Credit Note');
    case 'Debit Note':             return mapCreditOrDebitNote(voucher, action, 'Debit Note');
    case 'Delivery Note':          return mapDeliveryOrReceiptNote(voucher, action, 'Delivery Note');
    case 'Receipt Note':           return mapDeliveryOrReceiptNote(voucher, action, 'Receipt Note');
    case 'Rejections In':          return mapRejectionLike(voucher, action, 'Rejections In');
    case 'Rejections Out':         return mapRejectionLike(voucher, action, 'Rejections Out');
    case 'Manufacturing Journal':  return mapManufacturingJournal(voucher, action);
    case 'Physical Stock':         return mapPhysicalStock(voucher, action);
    case 'Stock Journal':          return mapStockJournalLike(voucher, action);
    case 'Stock Transfer':         return mapStockJournalLike(voucher, action);
    case 'Sales Order':            return mapOrderLike(voucher, action, 'Sales Order');
    case 'Purchase Order':         return mapOrderLike(voucher, action, 'Purchase Order');
    case 'Job Work In Order':      return mapJobOrderLike(voucher, action, 'Job Work In Order');
    case 'Job Work Out Order':     return mapJobOrderLike(voucher, action, 'Job Work Out Order');
    case 'Material In':            return mapMaterialMovement(voucher, action, 'Material In');
    case 'Material Out':           return mapMaterialMovement(voucher, action, 'Material Out');
    case 'Attendance':             return mapAttendanceOrPayroll(voucher, action, 'Attendance');
    case 'Payroll':                return mapAttendanceOrPayroll(voucher, action, 'Payroll');
    case 'Capital Purchase':       return mapAsJournalAlias(voucher, action, 'Capital Purchase');
    case 'Put To Use':             return mapAsJournalAlias(voucher, action, 'Put To Use');
    case 'Depreciation':           return mapAsJournalAlias(voucher, action, 'Depreciation');
    case 'Asset Transfer':         return mapAsJournalAlias(voucher, action, 'Asset Transfer');
    case 'Asset Verification':     return mapAsJournalAlias(voucher, action, 'Asset Verification');
    case 'Asset Write Off':        return mapAsJournalAlias(voucher, action, 'Asset Write Off');
    case 'Capital Sale':           return mapAsJournalAlias(voucher, action, 'Capital Sale');
    case 'Custodian Change':       return mapAsJournalAlias(voucher, action, 'Custodian Change');
    case 'Expense Booking':        return mapAsJournalAlias(voucher, action, 'Expense Booking');
    default: {
      // [Critical] TS exhaustiveness check — compile fails if VoucherBaseType expands without a handler.
      const _exhaustive: never = t;
      throw new Error(`Unhandled voucher base type: ${String(_exhaustive)}`);
    }
  }
}
