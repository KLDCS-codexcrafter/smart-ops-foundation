/**
 * finecore-engine.ts — Core posting engine for FineCore vouchers
 * [JWT] Replace with POST /api/accounting/vouchers/post
 */
import Decimal from 'decimal.js';
import type { Voucher, JournalEntry, StockEntry, OutstandingEntry, GSTEntry } from '@/types/voucher';
import type { RCMEntry, TDSDeductionEntry, AdvanceEntry, TDSReceivableEntry } from '@/types/compliance';
import { rcmEntriesKey, tdsDeductionsKey, advancesKey, tdsReceivableKey } from '@/types/compliance';
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey, IT_ACT_RATES } from '@/types/fixed-asset';
import { mapUOMtoUQC } from '@/lib/uqcMap';
import { eventBus } from './event-bus';
import { loadTenantConfig } from './tenant-config-engine';
import { isPeriodLocked, periodLockMessage } from './period-lock-engine';
// [T-T8.0-OrgTagFoundation] Auto-tag derived metadata · enables 5-tier slicing without voucher.ts schema change.
import { tagVoucher, getOperatorContext } from './voucher-org-tag-engine';

// ── Storage key helpers ──────────────────────────────────────────────
export const vouchersKey = (e: string) => `erp_group_vouchers_${e}`;
export const journalKey = (e: string) => `erp_journal_${e}`;
export const stockLedgerKey = (e: string) => `erp_stock_ledger_${e}`;
export const outstandingKey = (e: string) => `erp_outstanding_${e}`;
export const gstRegisterKey = (e: string) => `erp_gst_register_${e}`;
export const ledgerDefsKey = (e: string) => `erp_group_ledger_definitions_${e}`;

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function ss<T>(key: string, data: T[]): void {
  // [JWT] POST /api/entity/storage/:key
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Validation ───────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Narrow projection of a ledger definition row used by the engine when
 * resolving GST / RCM / TDS attributes. Real LedgerDefinition lives in
 * the masters layer; we only need this subset here.
 */
interface LedgerDefRef {
  id: string;
  name?: string;
  isItcEligible?: boolean;
  isRcmApplicable?: boolean;
  rcmSection?: string;
  isTdsApplicable?: boolean;
}

export function validateVoucher(voucher: Partial<Voucher>): ValidationResult {
  const errors: string[] = [];
  if (!voucher.date) errors.push('Date is required');
  if (!voucher.base_voucher_type) errors.push('Voucher type is required');
  if (!voucher.entity_id) errors.push('Entity is required');

  // PERIOD LOCK CHECK (T-H1.5-Z-Z3 · additive only · graceful degradation)
  if (voucher.date && voucher.entity_id) {
    if (isPeriodLocked(voucher.date, voucher.entity_id)) {
      const msg = periodLockMessage(voucher.date, voucher.entity_id);
      if (msg) errors.push(msg);
    }
  }

  // Sprint T-Phase-1.2.5h-a · Voucher balance enforcement (audit H-3)
  // Tally-classic rule: voucher must be balanced (sum_dr === sum_cr) before save.
  // Tolerance ₹0.01 absorbs unavoidable Decimal rounding without masking real errors.
  if (voucher.ledger_lines && voucher.ledger_lines.length > 0) {
    const totalDr = voucher.ledger_lines
      .reduce((s, l) => s.plus(new Decimal(l.dr_amount ?? 0)), new Decimal(0));
    const totalCr = voucher.ledger_lines
      .reduce((s, l) => s.plus(new Decimal(l.cr_amount ?? 0)), new Decimal(0));
    if (totalDr.minus(totalCr).abs().greaterThan(0.01)) {
      errors.push(`Voucher not balanced: Dr ₹${totalDr.toFixed(2)} ≠ Cr ₹${totalCr.toFixed(2)} (diff ₹${totalDr.minus(totalCr).abs().toFixed(2)})`);
    }
  }
  // Also accept generic { lines: [{debit, credit}] } shape used by some callers/tests.
  const genericLines = (voucher as Partial<Voucher> & { lines?: Array<{ debit?: number; credit?: number }> }).lines;
  if (genericLines && genericLines.length > 0 && (!voucher.ledger_lines || voucher.ledger_lines.length === 0)) {
    let totalDr = new Decimal(0);
    let totalCr = new Decimal(0);
    for (const ln of genericLines) {
      if (typeof ln.debit === 'number' && ln.debit > 0) totalDr = totalDr.plus(ln.debit);
      if (typeof ln.credit === 'number' && ln.credit > 0) totalCr = totalCr.plus(ln.credit);
    }
    if (totalDr.minus(totalCr).abs().greaterThan(0.01)) {
      errors.push(`Voucher not balanced: Dr ₹${totalDr.toFixed(2)} ≠ Cr ₹${totalCr.toFixed(2)} (diff ₹${totalDr.minus(totalCr).abs().toFixed(2)})`);
    }
  }

  // Allocation qty integrity (Sprint T10-pre.0)
  const allocCheck = validateAllocations(voucher);
  errors.push(...allocCheck.errors);

  return { valid: errors.length === 0, errors };
}

/**
 * Validates that the sum of allocations equals the line qty for every
 * inventory line that has populated allocations[]. Lines without
 * allocations[] are skipped (legacy / single-allocation lines).
 */
export function validateAllocations(voucher: Partial<Voucher>): ValidationResult {
  const errors: string[] = [];
  if (!voucher.inventory_lines || voucher.inventory_lines.length === 0) {
    return { valid: true, errors: [] };
  }
  for (const line of voucher.inventory_lines) {
    if (!line.allocations || line.allocations.length === 0) continue;
    const sum = line.allocations
      .reduce((s, a) => s.plus(new Decimal(a.qty ?? 0)), new Decimal(0));
    const lineQty = new Decimal(line.qty ?? 0);
    if (!sum.minus(lineQty).abs().lessThanOrEqualTo('0.001')) {
      errors.push(
        `Line "${line.item_name}": allocation qty ${sum.toFixed(3)} ≠ line qty ${lineQty.toFixed(3)}`,
      );
    }
  }
  return { valid: errors.length === 0, errors };
}

// ── Voucher Number Generation ────────────────────────────────────────

export function generateVoucherNo(prefix: string, entityCode: string): string {
  const key = `erp_voucher_seq_${prefix}_${entityCode}`;
  // [JWT] GET /api/accounting/voucher-types/:id/next-number
  const raw = localStorage.getItem(key);
  const seq = raw ? parseInt(raw, 10) + 1 : 1;
  // [JWT] PATCH /api/accounting/voucher-types/:id/sequence
  localStorage.setItem(key, String(seq));
  const fy = getFY();
  return `${prefix}/${fy}/${String(seq).padStart(4, '0')}`;
}

function getFY(): string {
  const now = new Date();
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${String(y).slice(2)}-${String(y + 1).slice(2)}`;
}

/**
 * Sprint T-Phase-1.2.5h-a · Public FY accessor for tests + entity cleanup utilities.
 * Indian fiscal-year window: Apr 1 - Mar 31.
 */
export function getCurrentFY(): string { return getFY(); }

// ── Document Number Generation (ADVP, ADVR, etc.) ────────────────────
/**
 * Centralized doc-number generator. Format: `PREFIX/FY/NNNN` (e.g. `SO/24-25/0001`).
 * Storage key: `erp_doc_seq_${prefix}_${entityCode}` — sequence is per-entity, per-prefix.
 *
 * Sprint T-Phase-1.1.2-d: Union extended to consolidate memo + ProjX doc numbering.
 * Migrated callers: SupplyRequestMemo (SRQM), InvoiceMemo (IM), SampleOutwardMemo (SOM),
 * DemoOutwardMemo (DOM), SalesReturnMemo (SRM), projx-engine.nextProjectCode (PRJ).
 *
 * Excluded by design:
 *  - PCT (project centres): PCT-NNNN has no FY component — stays local in useProjectCentres.
 *  - MILESTONE: keyed by (entity, project) two-arg — stays local in project-milestone types.
 */
export function generateDocNo(
  prefix:
    | 'PR' | 'RFQ' | 'PO' | 'SO'
    | 'ADVP' | 'ADVR'
    | 'LEAD' | 'ENQ' | 'PF'
    | 'SRM' | 'SRQM' | 'IM' | 'SOM' | 'DOM'
    | 'PRJ' | 'PCT' | 'TE'
    // Sprint T-Phase-1.2.1 · Inventory Hub
    | 'GRN' // GRN — Goods Receipt Note (Inventory Hub)
    // Sprint T-Phase-1.2.2 · Material Issue Note + Consumption Entry
    | 'MIN' // MIN — Material Issue Note (godown-to-godown transfer)
    | 'CE'  // CE  — Consumption Entry (job/overhead/site material consumption)
    // Sprint T-Phase-1.2.4 · GRN multi-variant doc-no sequences
    | 'DGRN'   // Domestic GRN
    | 'IGRN'   // Import GRN
    | 'SCGRN'  // Subcontract GRN
    // Sprint T-Phase-1.2.6 · Cycle Count + RTV
    | 'PSV'    // Physical Stock Voucher (Cycle Count)
    | 'RJO',   // Rejections Out (Return to Vendor)
  entityCode: string,
): string {
  const key = `erp_doc_seq_${prefix}_${entityCode}`;
  // [JWT] GET /api/procurement/sequences/:prefix/:entityCode
  const raw = localStorage.getItem(key);
  const seq = raw ? parseInt(raw, 10) + 1 : 1;
  // [JWT] PATCH /api/procurement/sequences/:prefix/:entityCode
  localStorage.setItem(key, String(seq));
  const fy = getFY();
  return `${prefix}/${fy}/${String(seq).padStart(4, '0')}`;
}

// ── TDS Helper Functions ─────────────────────────────────────────────
export function getQuarter(date: string): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  const m = new Date(date).getMonth() + 1;
  if (m >= 4 && m <= 6) return 'Q1';
  if (m >= 7 && m <= 9) return 'Q2';
  if (m >= 10 && m <= 12) return 'Q3';
  return 'Q4';
}

export function getAssessmentYear(date: string): string {
  const y = new Date(date);
  const yr = y.getMonth() >= 3 ? y.getFullYear() : y.getFullYear() - 1;
  return `${yr + 1}-${String(yr + 2).slice(2)}`;
}

function getAdvanceTDSAlreadyDeducted(partyId: string, _invoiceId: string, entityCode: string): number {
  // [JWT] GET /api/compliance/advances?party&type=vendor
  const advances = ls<AdvanceEntry>(advancesKey(entityCode));
  return advances
    .filter(a => a.party_id === partyId && a.tds_amount > 0 && a.status !== 'cancelled')
    .reduce((s, a) => s + a.tds_balance, 0);
}

// ── Supply type detection ────────────────────────────────────────────
function resolveSupplyType(voucher: Voucher, _entityGSTIN: string): GSTEntry['supply_type'] {
  const partyReg = voucher.party_registration_type ?? 'regular';
  const partyCountry = voucher.party_country ?? 'IN';
  if (partyCountry !== 'IN') {
    return voucher.party_lut_number ? 'EXP_WP' : 'EXP_WOP';
  }
  if (partyReg === 'sez') {
    return voucher.party_lut_number ? 'SEZWP' : 'SEZWOP';
  }
  if (!voucher.party_gstin && voucher.is_inter_state === false) return 'B2BUR';
  if (voucher.party_gstin) return 'B2B';
  return 'B2C';
}

// ── Post Voucher — writes to all 4 storage keys atomically ──────────

export function postVoucher(voucher: Voucher, entityCode: string): void {
  const now = new Date().toISOString();

  // 1. Write voucher header
  const vouchers = ls<Voucher>(vouchersKey(entityCode));
  vouchers.push({ ...voucher, status: 'posted', posted_at: now, updated_at: now });
  ss(vouchersKey(entityCode), vouchers);

  // [T-T8.0-OrgTagFoundation] Auto-tag · ensures both useVouchers and direct postVoucher paths populate metadata.
  tagVoucher(voucher.id, getOperatorContext(voucher.entity_id, voucher.department_id));

  // 2. Write journal lines
  if (voucher.ledger_lines && voucher.ledger_lines.length > 0) {
    const entries = ls<JournalEntry>(journalKey(entityCode));
    for (const line of voucher.ledger_lines) {
      entries.push({
        id: `je-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        voucher_id: voucher.id,
        voucher_no: voucher.voucher_no,
        base_voucher_type: voucher.base_voucher_type,
        entity_id: voucher.entity_id,
        date: voucher.date,
        ledger_id: line.ledger_id,
        ledger_code: line.ledger_code,
        ledger_name: line.ledger_name,
        ledger_group_code: line.ledger_group_code,
        dr_amount: line.dr_amount,
        cr_amount: line.cr_amount,
        narration: line.narration || voucher.narration,
        bill_ref: line.bill_ref,
        party_id: voucher.party_id,
        is_cancelled: false,
        created_at: now,
      });
    }
    ss(journalKey(entityCode), entries);
  }

  // 3. Write stock entries
  if (voucher.inventory_lines && voucher.inventory_lines.length > 0) {
    const stocks = ls<StockEntry>(stockLedgerKey(entityCode));
    const isOutward = ['Sales', 'Delivery Note', 'Credit Note'].includes(voucher.base_voucher_type);
    for (const line of voucher.inventory_lines) {
      stocks.push({
        id: `se-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        voucher_id: voucher.id,
        voucher_no: voucher.voucher_no,
        base_voucher_type: voucher.base_voucher_type,
        entity_id: voucher.entity_id,
        date: voucher.date,
        item_id: line.item_id,
        item_code: line.item_code,
        item_name: line.item_name,
        godown_id: line.godown_id,
        godown_name: line.godown_name,
        batch_id: line.batch_id,
        serial_id: line.serial_id,
        inward_qty: isOutward ? 0 : line.qty,
        outward_qty: isOutward ? line.qty : 0,
        rate: line.rate,
        value: line.qty * line.rate,
        uom: line.uom,
        is_cancelled: false,
        created_at: now,
      });
    }
    ss(stockLedgerKey(entityCode), stocks);
  }

  // 4. Write outstanding entry (for invoices)
  const outstandingTypes = ['Sales', 'Purchase', 'Debit Note', 'Credit Note'];
  if (outstandingTypes.includes(voucher.base_voucher_type) && voucher.party_id) {
    const entries = ls<OutstandingEntry>(outstandingKey(entityCode));

    // Credit Note: reduce the original Sales outstanding by CN amount
    let creditNoteSettled = false;
    if (voucher.base_voucher_type === 'Credit Note' && voucher.ref_voucher_no) {
      const origIdx = entries.findIndex(
        o => o.voucher_no === voucher.ref_voucher_no &&
          o.base_voucher_type === 'Sales' &&
          o.status !== 'cancelled',
      );
      if (origIdx >= 0) {
        const orig = { ...entries[origIdx] };
        const reductionDec = Decimal.min(
          new Decimal(voucher.net_amount ?? 0),
          new Decimal(orig.pending_amount ?? 0),
        );
        const reduction = reductionDec.toNumber();
        orig.settled_amount = new Decimal(orig.settled_amount ?? 0)
          .plus(reductionDec).toDecimalPlaces(2).toNumber();
        orig.pending_amount = new Decimal(orig.pending_amount ?? 0)
          .minus(reductionDec).toDecimalPlaces(2).toNumber();
        orig.settlement_refs = [
          ...orig.settlement_refs,
          { voucher_id: voucher.id, amount: reduction, date: voucher.date },
        ];
        orig.status = new Decimal(orig.pending_amount).lessThanOrEqualTo('0.01') ? 'settled' : 'partial';
        orig.updated_at = now;
        entries[origIdx] = orig;
        creditNoteSettled = true;
      }
    }

    // Push outstanding entry — but NOT for Credit Notes that already settled above
    const skipOutstandingPush = voucher.base_voucher_type === 'Credit Note' && creditNoteSettled;

    if (!skipOutstandingPush) {
      entries.push({
        id: `os-${Date.now()}`,
        entity_id: voucher.entity_id,
        party_id: voucher.party_id!,
        party_code: voucher.party_code || '',
        party_name: voucher.party_name || '',
        party_type: ['Sales', 'Debit Note'].includes(voucher.base_voucher_type) ? 'debtor' : 'creditor',
        voucher_id: voucher.id,
        voucher_no: voucher.voucher_no,
        voucher_date: voucher.date,
        base_voucher_type: voucher.base_voucher_type,
        original_amount: voucher.net_amount,
        pending_amount: voucher.net_amount,
        due_date: voucher.date,
        credit_days: 30,
        currency: 'INR',
        settled_amount: 0,
        settlement_refs: [],
        status: 'open',
        created_at: now,
        updated_at: now,
      });
    }
    ss(outstandingKey(entityCode), entries);
  }

  // 5. Write GST register
  if (voucher.tax_lines && voucher.tax_lines.length > 0) {
    const gstEntries = ls<GSTEntry>(gstRegisterKey(entityCode));
    const supplyType = resolveSupplyType(voucher, entityCode);

    if (voucher.invoice_mode === 'item' && voucher.inventory_lines?.length) {
      // One GSTEntry per inventory line
      for (const line of voucher.inventory_lines) {
        if (line.taxable_value <= 0) continue;
        // [JWT] GET /api/accounting/ledger-definitions
        const ldefs = ls<LedgerDefRef>(ledgerDefsKey(entityCode));
        const salesLedger = ldefs.find((l) =>
          voucher.ledger_lines?.some(ll => ll.ledger_id === l.id));
        gstEntries.push({
          id: `gst-${Date.now()}-${line.id}`,
          voucher_id: voucher.id, voucher_no: voucher.voucher_no,
          entity_id: voucher.entity_id, date: voucher.date,
          base_voucher_type: voucher.base_voucher_type,
          party_id: voucher.party_id || '', party_gstin: voucher.party_gstin || '',
          party_name: voucher.party_name || '', party_state_code: voucher.party_state_code || '',
          supply_type: supplyType,
          hsn_code: line.hsn_sac_code,
          qty: line.qty,
          uqc: mapUOMtoUQC(line.uom),
          taxable_value: line.taxable_value,
          cgst_rate: line.cgst_rate, sgst_rate: line.sgst_rate,
          igst_rate: line.igst_rate, cess_rate: line.cess_rate,
          cgst_amount: line.cgst_amount, sgst_amount: line.sgst_amount,
          igst_amount: line.igst_amount, cess_amount: line.cess_amount,
          total_tax: new Decimal(line.cgst_amount ?? 0)
            .plus(new Decimal(line.sgst_amount ?? 0))
            .plus(new Decimal(line.igst_amount ?? 0))
            .plus(new Decimal(line.cess_amount ?? 0))
            .toDecimalPlaces(2).toNumber(),
          invoice_value: line.total,
          place_of_supply: voucher.place_of_supply || '',
          is_inter_state: voucher.is_inter_state || false,
          is_rcm: salesLedger?.isRcmApplicable || false,
          itc_eligible: salesLedger?.isItcEligible ?? (voucher.base_voucher_type === 'Purchase'),
          itc_reversal: 0,
          rcm_section: salesLedger?.rcmSection ?? '',
          irn: voucher.irn, ewb_no: voucher.ewb_no,
          line_item_id: line.id,
          is_cancelled: false, created_at: now,
        });
      }
    } else {
      // Accounting mode — one entry per voucher
      gstEntries.push({
        id: `gst-${Date.now()}`,
        voucher_id: voucher.id, voucher_no: voucher.voucher_no,
        entity_id: voucher.entity_id, date: voucher.date,
        base_voucher_type: voucher.base_voucher_type,
        party_id: voucher.party_id || '', party_gstin: voucher.party_gstin || '',
        party_name: voucher.party_name || '', party_state_code: voucher.party_state_code || '',
        supply_type: supplyType,
        hsn_code: '',
        uqc: 'NOS',
        taxable_value: voucher.total_taxable,
        cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
        cgst_amount: voucher.total_cgst, sgst_amount: voucher.total_sgst,
        igst_amount: voucher.total_igst, cess_amount: voucher.total_cess,
        total_tax: voucher.total_tax,
        invoice_value: voucher.net_amount,
        place_of_supply: voucher.place_of_supply || '',
        is_inter_state: voucher.is_inter_state || false,
        is_rcm: false,
        itc_eligible: voucher.base_voucher_type === 'Purchase',
        itc_reversal: 0,
        irn: voucher.irn, ewb_no: voucher.ewb_no,
        is_cancelled: false, created_at: now,
      });
    }
    // [JWT] POST /api/accounting/gst-register
    ss(gstRegisterKey(entityCode), gstEntries);

    // 5b. Write RCM entries if is_rcm
    const rcmLines = gstEntries.filter(e => e.is_rcm && !e.is_cancelled && e.voucher_id === voucher.id);
    if (rcmLines.length > 0) {
      // [JWT] POST /api/compliance/rcm-entries
      const rcmStore = ls<RCMEntry>(rcmEntriesKey(entityCode));
      rcmLines.forEach(line => rcmStore.push({
        id: `rcm-${Date.now()}-${line.id}`,
        voucher_id: voucher.id, voucher_no: voucher.voucher_no,
        entity_id: entityCode, date: voucher.date,
        party_name: voucher.party_name || '',
        party_gstin: voucher.party_gstin || '',
        rcm_section: (line.rcm_section as RCMEntry['rcm_section']) || 'section_9_3',
        taxable_value: line.taxable_value,
        cgst_amount: line.cgst_amount, sgst_amount: line.sgst_amount,
        igst_amount: line.igst_amount, cess_amount: line.cess_amount,
        status: 'open', created_at: now,
      }));
      // [JWT] POST /api/compliance/rcm-entries
      ss(rcmEntriesKey(entityCode), rcmStore);
    }
  }

  // 6. Write TDS Deduction Entry
  if (voucher.tds_applicable && (voucher.tds_amount ?? 0) > 0) {
    const tdsStore = ls<TDSDeductionEntry>(tdsDeductionsKey(entityCode));
    const quarter = getQuarter(voucher.date);
    const isPayment = voucher.base_voucher_type === 'Payment';
    const advanceTDS = getAdvanceTDSAlreadyDeducted(voucher.party_id ?? '', voucher.id, entityCode);
    // [JWT] GET /api/accounting/ledger-definitions
    const ldefs = ls<LedgerDefRef>(ledgerDefsKey(entityCode));
    const expLedger = ldefs.find((l) => voucher.ledger_lines?.some(ll => ll.ledger_id === l.id && l.isTdsApplicable));
    tdsStore.push({
      id: `tds-${Date.now()}`,
      entity_id: entityCode,
      source_voucher_id: voucher.id, source_voucher_no: voucher.voucher_no,
      source_voucher_type: voucher.base_voucher_type as 'Purchase' | 'Payment' | 'Journal',
      party_id: voucher.party_id ?? '', party_name: voucher.party_name ?? '',
      party_pan: voucher.deductee_pan ?? '',
      deductee_type: voucher.deductee_type ?? 'company',
      tds_section: voucher.tds_section ?? '',
      nature_of_payment: expLedger?.name ?? '',
      tds_rate: voucher.tds_rate ?? 0,
      gross_amount: voucher.gross_amount,
      advance_tds_already: advanceTDS,
      net_tds_amount: new Decimal(voucher.tds_amount ?? 0).minus(new Decimal(advanceTDS ?? 0)).toDecimalPlaces(2).toNumber(),
      date: voucher.date,
      quarter, assessment_year: getAssessmentYear(voucher.date),
      status: isPayment ? 'posted' : 'open',
      created_at: now,
    });
    // [JWT] POST /api/compliance/tds-deductions
    ss(tdsDeductionsKey(entityCode), tdsStore);
  }

  // 7. Write Advance Entry for advance payments/receipts
  const isAdvance = voucher.bill_references?.some(b => b.type === 'advance');
  if (isAdvance) {
    const advStore = ls<AdvanceEntry>(advancesKey(entityCode));
    const isVendorAdvance = voucher.base_voucher_type === 'Payment';
    const refNo = generateDocNo(isVendorAdvance ? 'ADVP' : 'ADVR', entityCode);
    advStore.push({
      id: `adv-${Date.now()}`, advance_ref_no: refNo,
      entity_id: entityCode,
      party_type: isVendorAdvance ? 'vendor' : 'customer',
      party_id: voucher.party_id ?? '', party_name: voucher.party_name ?? '',
      date: voucher.date,
      source_voucher_id: voucher.id, source_voucher_no: voucher.voucher_no,
      po_ref: voucher.po_ref ?? '', so_ref: '',
      advance_amount: voucher.gross_amount,
      tds_amount: voucher.tds_amount ?? 0,
      net_amount: voucher.net_amount,
      adjustments: [],
      balance_amount: voucher.gross_amount,
      tds_balance: voucher.tds_amount ?? 0,
      status: 'open',
      tds_status: (voucher.tds_amount ?? 0) > 0 ? 'deducted_inline' : 'na',
      created_at: now, updated_at: now,
    });
    // [JWT] POST /api/compliance/advances
    ss(advancesKey(entityCode), advStore);
  }

  // 8. Write TDS Receivable entries (for Receipt vouchers with customer TDS deduction)
  if (voucher.base_voucher_type === 'Receipt' && voucher.tds_receivable_lines?.length) {
    const rcvStore = ls<TDSReceivableEntry>(tdsReceivableKey(entityCode));
    for (const line of voucher.tds_receivable_lines) {
      rcvStore.push({
        id: `tdsrcv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        entity_id: entityCode,
        voucher_id: voucher.id, voucher_no: voucher.voucher_no,
        customer_id: voucher.party_id ?? "",
        customer_name: voucher.party_name ?? "",
        customer_pan: voucher.deductee_pan ?? "",
        customer_tan: line.customer_tan,
        tds_section: line.tds_section,
        invoice_ref: line.invoice_ref,
        invoice_date: line.invoice_date,
        amount_received: line.gross_amount,
        tds_amount: line.tds_amount,
        net_received: line.net_amount,
        date: voucher.date,
        quarter: getQuarter(voucher.date),
        assessment_year: getAssessmentYear(voucher.date),
        match_status: "unmatched",
        status: "open",
        created_at: now,
      });
    }
    // [JWT] POST /api/compliance/tds-receivable
    ss(tdsReceivableKey(entityCode), rcvStore);
  }

  // 9. Write Asset Unit records (Capital Purchase only)
  if (voucher.base_voucher_type === 'Capital Purchase' && voucher.asset_unit_lines?.length) {
    // [JWT] GET /api/fixed-assets/units
    const units = ls<AssetUnitRecord>(faUnitsKey(entityCode));
    for (const line of voucher.asset_unit_lines) {
      for (let i = 0; i < line.asset_id_count; i++) {
        const seq = line.asset_id_from + i;
        const asset_id = `${line.asset_id_prefix}/${line.asset_id_suffix}/${String(seq).padStart(3, '0')}`;
        units.push({
          id: `fau-${Date.now()}-${i}`,
          entity_id: entityCode,
          item_id: line.item_id, item_name: line.item_name,
          ledger_definition_id: line.ledger_definition_id,
          ledger_name: '',
          asset_id, asset_id_prefix: line.asset_id_prefix,
          asset_id_suffix: line.asset_id_suffix, asset_id_seq: seq,
          gross_block_cost: line.cost_per_unit,
          salvage_value: line.salvage_value,
          accumulated_depreciation: 0,
          net_book_value: line.cost_per_unit,
          opening_wdv: line.cost_per_unit,
          purchase_date: voucher.date,
          put_to_use_date: line.put_to_use_date ?? '',
          it_act_block: line.it_act_block,
          it_act_depr_rate: IT_ACT_RATES[line.it_act_block],
          location: line.location, department: line.department,
          custodian_name: line.custodian_name,
          status: line.put_to_use_date ? 'active' : 'cwip',
          capital_purchase_voucher_id: voucher.id,
          created_at: now, updated_at: now,
        });
      }
    }
    // [JWT] POST /api/fixed-assets/units
    ss(faUnitsKey(entityCode), units);
  }

  // 10. Emit voucher.posted event (Sprint T10-pre.1a) — non-fatal
  try {
    const config = loadTenantConfig(entityCode);
    eventBus.emit('voucher.posted', {
      voucher_id: voucher.id,
      voucher_no: voucher.voucher_no,
      voucher_type: voucher.base_voucher_type,
      entity_code: entityCode,
      accounting_mode: config.accounting_mode,
      actor_id: voucher.created_by || 'system',
      timestamp: new Date().toISOString(),
      amount: voucher.net_amount,
      meta: {
        party_name: voucher.party_name,
        party_id: voucher.party_id,
      },
    });
  } catch (err) {
    console.error('[finecore-engine] event emit failed (non-fatal):', err);
  }
}

// ── Cancel Voucher — reversal entries ────────────────────────────────

export function cancelVoucher(voucherId: string, entityCode: string, reason: string): void {
  const now = new Date().toISOString();

  // Mark voucher as cancelled
  const vouchers = ls<Voucher>(vouchersKey(entityCode));
  const idx = vouchers.findIndex(v => v.id === voucherId);
  if (idx === -1) return;
  vouchers[idx] = { ...vouchers[idx], status: 'cancelled', is_cancelled: true, cancel_reason: reason, updated_at: now };
  ss(vouchersKey(entityCode), vouchers);

  // Mark journal entries
  const journals = ls<JournalEntry>(journalKey(entityCode));
  const updated = journals.map(j => j.voucher_id === voucherId ? { ...j, is_cancelled: true } : j);
  ss(journalKey(entityCode), updated);

  // Mark stock entries
  const stocks = ls<StockEntry>(stockLedgerKey(entityCode));
  const updStocks = stocks.map(s => s.voucher_id === voucherId ? { ...s, is_cancelled: true } : s);
  ss(stockLedgerKey(entityCode), updStocks);

  // Mark outstanding
  const outstanding = ls<OutstandingEntry>(outstandingKey(entityCode));
  const updOut = outstanding.map(o => o.voucher_id === voucherId ? { ...o, status: 'cancelled' as const, updated_at: now } : o);
  ss(outstandingKey(entityCode), updOut);

  // Mark GST
  const gst = ls<GSTEntry>(gstRegisterKey(entityCode));
  const updGst = gst.map(g => g.voucher_id === voucherId ? { ...g, is_cancelled: true } : g);
  ss(gstRegisterKey(entityCode), updGst);

  // Check if cancelled voucher is an RCM JV — if so, reset linked RCM entry to "open"
  // [JWT] PATCH /api/compliance/rcm-entries/:id
  const rcmStore = ls<RCMEntry>(rcmEntriesKey(entityCode));
  const linkedRCM = rcmStore.find(r => r.rcm_jv_id === voucherId);
  if (linkedRCM) {
    linkedRCM.status = 'open';
    linkedRCM.rcm_jv_id = undefined;
    linkedRCM.rcm_jv_no = undefined;
    linkedRCM.posted_at = undefined;
    linkedRCM.cancelled_at = now;
    linkedRCM.cancel_reason = reason;
    // [JWT] PATCH /api/compliance/rcm-entries/:id
    ss(rcmEntriesKey(entityCode), rcmStore);
  }
  // If cancelling the original purchase voucher, also cascade-cancel its RCM entries
  const ownRCM = rcmStore.filter(r => r.voucher_id === voucherId && r.status !== 'cancelled');
  if (ownRCM.length > 0) {
    ownRCM.forEach(r => { r.status = 'cancelled'; r.cancelled_at = now; r.cancel_reason = 'Source voucher cancelled'; });
    ss(rcmEntriesKey(entityCode), rcmStore);
  }

  // TDS cascade: if cancelled voucher was a TDS JV → reset linked entry to "open"
  const tdsStore = ls<TDSDeductionEntry>(tdsDeductionsKey(entityCode));
  const linkedTDS = tdsStore.find(t => t.tds_jv_id === voucherId);
  if (linkedTDS) {
    linkedTDS.status = 'open';
    linkedTDS.tds_jv_id = undefined; linkedTDS.tds_jv_no = undefined;
    // [JWT] PATCH /api/compliance/tds-deductions/:id
    ss(tdsDeductionsKey(entityCode), tdsStore);
  }
  // If source voucher cancelled, cascade-cancel its TDS entries
  const ownTDS = tdsStore.filter(t => t.source_voucher_id === voucherId && t.status !== 'cancelled');
  if (ownTDS.length > 0) {
    ownTDS.forEach(t => { t.status = 'cancelled'; });
    ss(tdsDeductionsKey(entityCode), tdsStore);
  }
  // Advance cascade: cancel linked AdvanceEntry if source voucher cancelled
  const advStore = ls<AdvanceEntry>(advancesKey(entityCode));
  const ownAdv = advStore.find(a => a.source_voucher_id === voucherId);
  if (ownAdv) {
    ownAdv.status = 'cancelled'; ownAdv.updated_at = now;
    // [JWT] PATCH /api/compliance/advances/:id
    ss(advancesKey(entityCode), advStore);
  }

  // TDS Receivable cascade
  const rcvStore = ls<TDSReceivableEntry>(tdsReceivableKey(entityCode));
  // If cancelled voucher is a TDS Receivable JV → reset linked entries to "open"
  const linkedRcv = rcvStore.filter(r => r.jv_id === voucherId);
  if (linkedRcv.length > 0) {
    linkedRcv.forEach(r => {
      r.status = "open"; r.jv_id = undefined; r.jv_no = undefined;
    });
    // [JWT] PATCH /api/compliance/tds-receivable/:id
    ss(tdsReceivableKey(entityCode), rcvStore);
  }
  // If source Receipt is cancelled → cancel its TDS receivable entries
  const ownRcv = rcvStore.filter(r => r.voucher_id === voucherId && r.status !== "cancelled");
  if (ownRcv.length > 0) {
    ownRcv.forEach(r => { r.status = "cancelled"; });
    // [JWT] PATCH /api/compliance/tds-receivable/:id
    ss(tdsReceivableKey(entityCode), rcvStore);
  }

  // FA cascade: when a Capital Purchase is cancelled, mark AssetUnitRecords as written_off
  const cancelledVoucher = vouchers[idx];
  if (cancelledVoucher.base_voucher_type === 'Capital Purchase') {
    // [JWT] GET /api/fixed-assets/units
    const faUnits = ls<AssetUnitRecord>(faUnitsKey(entityCode));
    let changed = false;
    for (const u of faUnits) {
      if (u.capital_purchase_voucher_id === voucherId && u.accumulated_depreciation === 0) {
        u.status = 'written_off'; u.updated_at = now; changed = true;
      }
    }
    if (changed) {
      // [JWT] PATCH /api/fixed-assets/units
      ss(faUnitsKey(entityCode), faUnits);
    }
  }

  // Emit voucher.cancelled event (Sprint T10-pre.1a) — non-fatal
  try {
    const config = loadTenantConfig(entityCode);
    const cancelled = vouchers[idx];
    eventBus.emit('voucher.cancelled', {
      voucher_id: cancelled.id,
      voucher_no: cancelled.voucher_no,
      voucher_type: cancelled.base_voucher_type,
      entity_code: entityCode,
      accounting_mode: config.accounting_mode,
      actor_id: 'system',
      timestamp: now,
      amount: cancelled.net_amount,
      reason,
      meta: {},
    });
  } catch (err) {
    console.error('[finecore-engine] cancel event emit failed (non-fatal):', err);
  }
}

// ── Template variable resolver ───────────────────────────────────────

export interface PartyMasterRef {
  creditDays?: number;
}

export interface EntityProfileRef {
  legalEntityName: string;
  city: string;
}

export function resolveVars(
  form: Partial<Voucher>,
  partyMaster: PartyMasterRef | null,
  entityProfile: EntityProfileRef | null,
  currentUserName: string
): Record<string, string> {
  const dueDate = partyMaster && form.date
    ? new Date(new Date(form.date).getTime() + (partyMaster.creditDays || 30) * 86400000)
        .toLocaleDateString('en-IN')
    : '';
  return {
    party:        form.party_name        ?? '',
    voucher_no:   form.voucher_no        ?? '(auto on save)',
    amount:       form.net_amount != null
                    ? '₹' + form.net_amount.toLocaleString('en-IN') : '',
    date:         form.date
                    ? new Date(form.date).toLocaleDateString('en-IN') : '',
    due_date:     dueDate,
    ref_no:       form.ref_voucher_no    ?? form.vendor_bill_no ?? '',
    our_company:  entityProfile?.legalEntityName ?? '',
    our_city:     entityProfile?.city    ?? '',
    mode:         form.payment_instrument ?? '',
    credit_days:  String(partyMaster?.creditDays ?? 30),
    from_ledger:  form.from_ledger_name  ?? '',
    to_ledger:    form.to_ledger_name    ?? '',
    from_godown:  form.from_godown_name  ?? '',
    to_godown:    form.to_godown_name    ?? '',
    salesperson:  currentUserName,
  };
}
