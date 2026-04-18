/**
 * demo-transactions-salesx.ts — 60-90 days of Sales Invoices + Receipts
 * Writes to erp_group_vouchers_{e} and erp_outstanding_{e} (additive).
 * [JWT] POST /api/finecore/vouchers, POST /api/accounting/outstanding
 */
import { customersForArchetype, type DemoArchetype } from '@/data/demo-customers-vendors';
import { itemsForArchetype } from '@/data/demo-items-master';
import type { Voucher, OutstandingEntry } from '@/types/voucher';

export interface SalesXTxnResult {
  invoices: number; receipts: number; creditNotes: number; outstanding: number;
}

function dateOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}
function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function safeReadArr<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

function safeWriteArr<T>(key: string, data: T[]): void {
  // [JWT] POST /api/entity/storage/:key
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadSalesXTransactions(
  entityCode: string,
  archetype: DemoArchetype,
): SalesXTxnResult {
  const customers = customersForArchetype(archetype);
  const items = itemsForArchetype(archetype);

  // Skip if vouchers already exist for this entity
  const voucherKey = `erp_group_vouchers_${entityCode}`;
  const outstandingKey = `erp_outstanding_${entityCode}`;
  const existingVouchers = safeReadArr<Voucher>(voucherKey);
  if (existingVouchers.length > 0) {
    return { invoices: 0, receipts: 0, creditNotes: 0, outstanding: 0 };
  }

  const vouchers: Voucher[] = [];
  const outstanding: OutstandingEntry[] = [];

  // Date spread for aging buckets
  const dateBuckets: Array<{ days: number; paidPct: number }> = [
    { days: 3,   paidPct: 0.0  },
    { days: 18,  paidPct: 0.6  },
    { days: 30,  paidPct: 0.7  },
    { days: 48,  paidPct: 0.6  },
    { days: 70,  paidPct: 0.5  },
    { days: 95,  paidPct: 0.4  },
  ];

  const invoiceCount = archetype === 'trading' ? 50 : archetype === 'services' ? 32 : 42;
  let invoiceIdx = 0;
  let receiptIdx = 0;
  let creditNoteIdx = 0;

  const nowIso = new Date().toISOString();

  for (let i = 0; i < invoiceCount; i++) {
    const cust = customers[i % customers.length];
    if (!cust) continue;
    const bucket = dateBuckets[i % dateBuckets.length];
    const invDate = dateOffset(bucket.days);
    const item = items[i % items.length];
    const qty = 1 + (i % 5);
    const rate = item.rate;

    const gstRate = item.gstRate;
    const taxable = qty * rate;
    const cgst = Math.round((taxable * gstRate) / 200);
    const sgst = cgst;
    const total = taxable + cgst + sgst;

    invoiceIdx++;
    const invoiceId = `inv-${entityCode}-${invoiceIdx}`;
    const voucherNo = `SI/${entityCode}/${String(invoiceIdx).padStart(4, '0')}`;

    const invoiceVoucher: Voucher = {
      id: invoiceId,
      voucher_no: voucherNo,
      voucher_type_id: 'vt-sales-invoice',
      voucher_type_name: 'Sales Invoice',
      base_voucher_type: 'Sales',
      entity_id: entityCode,
      date: invDate,
      invoice_mode: 'item',
      party_id: cust.partyCode,
      party_code: cust.partyCode,
      party_name: cust.partyName,
      ledger_lines: [],
      inventory_lines: [],
      tax_lines: [],
      gross_amount: taxable,
      total_discount: 0,
      total_taxable: taxable,
      total_cgst: cgst,
      total_sgst: sgst,
      total_igst: 0,
      total_cess: 0,
      total_tax: cgst + sgst,
      round_off: 0,
      net_amount: total,
      tds_applicable: false,
      narration: `Demo invoice for ${cust.partyName}`,
      terms_conditions: '',
      payment_enforcement: '',
      payment_instrument: '',
      from_ledger_name: '',
      to_ledger_name: '',
      from_godown_name: '',
      to_godown_name: '',
      status: 'posted',
      is_cancelled: false,
      created_by: 'demo-seeder',
      created_at: nowIso,
      updated_at: nowIso,
    } as Voucher;
    vouchers.push(invoiceVoucher);

    const dueDate = addDays(invDate, cust.creditDays);
    const isPaid = Math.random() < bucket.paidPct;
    const isPartial = !isPaid && Math.random() < 0.2;
    const settled = isPaid ? total : isPartial ? Math.round(total * 0.5) : 0;
    const pending = total - settled;

    const osEntry: OutstandingEntry = {
      id: `os-${invoiceId}`,
      entity_id: entityCode,
      party_id: cust.partyCode,
      party_code: cust.partyCode,
      party_name: cust.partyName,
      party_type: 'debtor',
      voucher_id: invoiceId,
      voucher_no: voucherNo,
      voucher_date: invDate,
      base_voucher_type: 'Sales',
      original_amount: total,
      pending_amount: pending,
      due_date: dueDate,
      credit_days: cust.creditDays,
      currency: 'INR',
      settled_amount: settled,
      settlement_refs: [],
      status: isPaid ? 'settled' : isPartial ? 'partial' : 'open',
      created_at: nowIso,
      updated_at: nowIso,
    };
    outstanding.push(osEntry);

    if (settled > 0) {
      receiptIdx++;
      const recDate = addDays(invDate, Math.min(cust.creditDays, 25));
      const receiptId = `rec-${entityCode}-${receiptIdx}`;
      const receiptNo = `RV/${entityCode}/${String(receiptIdx).padStart(4, '0')}`;
      const receiptVoucher: Voucher = {
        id: receiptId,
        voucher_no: receiptNo,
        voucher_type_id: 'vt-receipt',
        voucher_type_name: 'Receipt',
        base_voucher_type: 'Receipt',
        entity_id: entityCode,
        date: recDate,
        party_id: cust.partyCode,
        party_code: cust.partyCode,
        party_name: cust.partyName,
        ledger_lines: [],
        inventory_lines: [],
        tax_lines: [],
        gross_amount: settled,
        total_discount: 0,
        total_taxable: settled,
        total_cgst: 0,
        total_sgst: 0,
        total_igst: 0,
        total_cess: 0,
        total_tax: 0,
        round_off: 0,
        net_amount: settled,
        tds_applicable: false,
        narration: `Receipt against ${voucherNo}`,
        terms_conditions: '',
        payment_enforcement: '',
        payment_instrument: '',
        from_ledger_name: '',
        to_ledger_name: '',
        from_godown_name: '',
        to_godown_name: '',
        status: 'posted',
        is_cancelled: false,
        created_by: 'demo-seeder',
        created_at: nowIso,
        updated_at: nowIso,
      } as Voucher;
      vouchers.push(receiptVoucher);
    }

    // Sprinkle credit notes
    if (i % 12 === 0 && i > 0) {
      creditNoteIdx++;
      const cnId = `cn-${entityCode}-${creditNoteIdx}`;
      const cnNo = `CN/${entityCode}/${String(creditNoteIdx).padStart(4, '0')}`;
      const cnAmt = Math.round(total * 0.05);
      const cnVoucher: Voucher = {
        id: cnId,
        voucher_no: cnNo,
        voucher_type_id: 'vt-credit-note',
        voucher_type_name: 'Credit Note',
        base_voucher_type: 'Credit Note',
        entity_id: entityCode,
        date: addDays(invDate, 5),
        party_id: cust.partyCode,
        party_code: cust.partyCode,
        party_name: cust.partyName,
        ledger_lines: [],
        inventory_lines: [],
        tax_lines: [],
        gross_amount: cnAmt,
        total_discount: 0,
        total_taxable: cnAmt,
        total_cgst: 0,
        total_sgst: 0,
        total_igst: 0,
        total_cess: 0,
        total_tax: 0,
        round_off: 0,
        net_amount: cnAmt,
        tds_applicable: false,
        narration: `Credit note for ${voucherNo}`,
        terms_conditions: '',
        payment_enforcement: '',
        payment_instrument: '',
        from_ledger_name: '',
        to_ledger_name: '',
        from_godown_name: '',
        to_godown_name: '',
        status: 'posted',
        is_cancelled: false,
        created_by: 'demo-seeder',
        created_at: nowIso,
        updated_at: nowIso,
      } as Voucher;
      vouchers.push(cnVoucher);
    }
  }

  safeWriteArr(voucherKey, vouchers);
  safeWriteArr(outstandingKey, outstanding);

  return {
    invoices: invoiceIdx, receipts: receiptIdx, creditNotes: creditNoteIdx,
    outstanding: outstanding.length,
  };
}
