/**
 * demo-transactions-salesx.ts — 60-90 days of Sales Invoices + Receipts
 * Writes to erp_group_vouchers_{e} and erp_outstanding_{e} (additive).
 * [JWT] POST /api/finecore/vouchers, POST /api/accounting/outstanding
 */
import { customersForArchetype, type DemoArchetype } from '@/data/demo-customers-vendors';
import { itemsForArchetype } from '@/data/demo-items-master';

interface VoucherStub {
  id: string; voucher_no: string; voucher_type: string;
  voucher_date: string; party_id: string; party_name: string;
  total_amount: number; status: 'posted' | 'draft';
  is_cancelled: boolean; salesman_id: string | null;
  agent_id: string | null;
  lines: Array<{ item_code: string; item_name: string; qty: number; rate: number; amount: number }>;
}

interface OutstandingStub {
  id: string; entity_id: string; party_id: string; party_name: string;
  party_type: 'debtor' | 'creditor';
  voucher_id: string; voucher_no: string; voucher_date: string;
  due_date: string; original_amount: number;
  settled_amount: number; pending_amount: number;
  status: 'open' | 'partial' | 'settled' | 'cancelled';
  settlement_refs: Array<{ voucher_id: string; amount: number; date: string }>;
  created_at: string; updated_at: string;
}

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
  const existingVouchers = safeReadArr<VoucherStub>(voucherKey);
  if (existingVouchers.length > 0) {
    return { invoices: 0, receipts: 0, creditNotes: 0, outstanding: 0 };
  }

  const vouchers: VoucherStub[] = [];
  const outstanding: OutstandingStub[] = [];

  // Date spread for aging buckets
  const dateBuckets: Array<{ days: number; paidPct: number }> = [
    { days: 3,   paidPct: 0.0  },  // newest unpaid
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

  for (let i = 0; i < invoiceCount; i++) {
    const cust = customers[i % customers.length];
    if (!cust) continue;
    const bucket = dateBuckets[i % dateBuckets.length];
    const invDate = dateOffset(bucket.days);
    const item = items[i % items.length];
    const qty = 1 + (i % 5);
    const rate = item.rate;
    const lineAmount = qty * rate;
    const total = Math.round(lineAmount * (1 + item.gstRate / 100));

    invoiceIdx++;
    const invoiceId = `inv-${entityCode}-${invoiceIdx}`;
    const voucherNo = `SI/${entityCode}/${String(invoiceIdx).padStart(4, '0')}`;

    vouchers.push({
      id: invoiceId, voucher_no: voucherNo, voucher_type: 'sales_invoice',
      voucher_date: invDate, party_id: cust.partyCode, party_name: cust.partyName,
      total_amount: total, status: 'posted', is_cancelled: false,
      salesman_id: null, agent_id: null,
      lines: [{ item_code: item.itemCode, item_name: item.itemName, qty, rate, amount: lineAmount }],
    });

    const dueDate = addDays(invDate, cust.creditDays);
    const isPaid = Math.random() < bucket.paidPct;
    const isPartial = !isPaid && Math.random() < 0.2;
    const settled = isPaid ? total : isPartial ? Math.round(total * 0.5) : 0;
    const pending = total - settled;

    outstanding.push({
      id: `os-${invoiceId}`, entity_id: entityCode, party_id: cust.partyCode,
      party_name: cust.partyName, party_type: 'debtor',
      voucher_id: invoiceId, voucher_no: voucherNo, voucher_date: invDate,
      due_date: dueDate, original_amount: total,
      settled_amount: settled, pending_amount: pending,
      status: isPaid ? 'settled' : isPartial ? 'partial' : 'open',
      settlement_refs: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });

    if (settled > 0) {
      receiptIdx++;
      const recDate = addDays(invDate, Math.min(cust.creditDays, 25));
      vouchers.push({
        id: `rec-${entityCode}-${receiptIdx}`,
        voucher_no: `RV/${entityCode}/${String(receiptIdx).padStart(4, '0')}`,
        voucher_type: 'receipt', voucher_date: recDate,
        party_id: cust.partyCode, party_name: cust.partyName,
        total_amount: settled, status: 'posted', is_cancelled: false,
        salesman_id: null, agent_id: null, lines: [],
      });
    }

    // Sprinkle credit notes
    if (i % 12 === 0 && i > 0) {
      creditNoteIdx++;
      vouchers.push({
        id: `cn-${entityCode}-${creditNoteIdx}`,
        voucher_no: `CN/${entityCode}/${String(creditNoteIdx).padStart(4, '0')}`,
        voucher_type: 'credit_note', voucher_date: addDays(invDate, 5),
        party_id: cust.partyCode, party_name: cust.partyName,
        total_amount: Math.round(total * 0.05), status: 'posted', is_cancelled: false,
        salesman_id: null, agent_id: null, lines: [],
      });
    }
  }

  safeWriteArr(voucherKey, vouchers);
  safeWriteArr(outstandingKey, outstanding);

  return {
    invoices: invoiceIdx, receipts: receiptIdx, creditNotes: creditNoteIdx,
    outstanding: outstanding.length,
  };
}
