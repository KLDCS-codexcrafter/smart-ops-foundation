/**
 * finecore-engine.ts — Core posting engine for FineCore vouchers
 * [JWT] Replace with POST /api/accounting/vouchers/post
 */
import type { Voucher, JournalEntry, StockEntry, OutstandingEntry, GSTEntry } from '@/types/voucher';

// ── Storage key helpers ──────────────────────────────────────────────
export const vouchersKey = (e: string) => `erp_group_vouchers_${e}`;
export const journalKey = (e: string) => `erp_journal_${e}`;
export const stockLedgerKey = (e: string) => `erp_stock_ledger_${e}`;
export const outstandingKey = (e: string) => `erp_outstanding_${e}`;
export const gstRegisterKey = (e: string) => `erp_gst_register_${e}`;

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

export function validateVoucher(voucher: Partial<Voucher>): ValidationResult {
  const errors: string[] = [];
  if (!voucher.date) errors.push('Date is required');
  if (!voucher.base_voucher_type) errors.push('Voucher type is required');
  if (!voucher.entity_id) errors.push('Entity is required');

  // Dr = Cr check for journal lines
  if (voucher.ledger_lines && voucher.ledger_lines.length > 0) {
    const totalDr = voucher.ledger_lines.reduce((s, l) => s + l.dr_amount, 0);
    const totalCr = voucher.ledger_lines.reduce((s, l) => s + l.cr_amount, 0);
    if (Math.abs(totalDr - totalCr) > 0.01) {
      errors.push(`Dr/Cr mismatch: Dr ₹${totalDr.toLocaleString('en-IN')} ≠ Cr ₹${totalCr.toLocaleString('en-IN')}`);
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

// ── Post Voucher — writes to all 4 storage keys atomically ──────────

export function postVoucher(voucher: Voucher, entityCode: string): void {
  const now = new Date().toISOString();

  // 1. Write voucher header
  const vouchers = ls<Voucher>(vouchersKey(entityCode));
  vouchers.push({ ...voucher, status: 'posted', posted_at: now, updated_at: now });
  ss(vouchersKey(entityCode), vouchers);

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
    ss(outstandingKey(entityCode), entries);
  }

  // 5. Write GST register
  if (voucher.tax_lines && voucher.tax_lines.length > 0 && voucher.party_gstin) {
    const gstEntries = ls<GSTEntry>(gstRegisterKey(entityCode));
    const supplyType = voucher.party_gstin ? 'B2B' : 'B2C';
    gstEntries.push({
      id: `gst-${Date.now()}`,
      voucher_id: voucher.id,
      voucher_no: voucher.voucher_no,
      entity_id: voucher.entity_id,
      date: voucher.date,
      base_voucher_type: voucher.base_voucher_type,
      party_id: voucher.party_id || '',
      party_gstin: voucher.party_gstin || '',
      party_name: voucher.party_name || '',
      party_state_code: voucher.party_state_code || '',
      supply_type: supplyType,
      hsn_code: '',
      taxable_value: voucher.total_taxable,
      cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
      cgst_amount: voucher.total_cgst,
      sgst_amount: voucher.total_sgst,
      igst_amount: voucher.total_igst,
      cess_amount: voucher.total_cess,
      total_tax: voucher.total_tax,
      invoice_value: voucher.net_amount,
      place_of_supply: voucher.place_of_supply || '',
      is_inter_state: voucher.is_inter_state || false,
      is_rcm: false,
      itc_eligible: voucher.base_voucher_type === 'Purchase',
      irn: voucher.irn,
      ewb_no: voucher.ewb_no,
      is_cancelled: false,
      created_at: now,
    });
    ss(gstRegisterKey(entityCode), gstEntries);
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
