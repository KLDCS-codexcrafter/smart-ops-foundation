/**
 * @file        data-sources.ts
 * @sprint      RPT-3b · DSC seed module
 * @purpose     Side-effect: registers every DayBook source (via RPT-3a) AND
 *              4 reference register sources (Outstanding · Ledger · GST ·
 *              EximX TT-Payments) into the Data Source Catalog. Pure reads.
 *
 * Walls: NO react. Reads delegated to existing storage keys / engines.
 */

import { listDayBookSources } from './daybook-source-registry';
import { registerSource, type DataSource } from './data-source-catalog';
import { outstandingKey, gstRegisterKey, vouchersKey } from '@/lib/fincore-engine';
import { loadTTPayments } from '@/lib/tt-payment-engine';

function safeRead<T>(key: string): T[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function registerAllDataSources(): void {
  // ── DayBook sources (RPT-3a) re-projected into the DSC ────────────────
  for (const s of listDayBookSources()) {
    registerSource({
      id: `db:${s.cardId}`,
      label: s.label,
      card: s.cardId,
      kind: 'daybook',
      fields: [
        { key: 'date', label: 'Date', kind: 'dimension' },
        { key: 'time', label: 'Time', kind: 'dimension' },
        { key: 'type', label: 'Type', kind: 'dimension' },
        { key: 'reference', label: 'Reference', kind: 'dimension' },
        { key: 'party', label: 'Party', kind: 'dimension' },
        { key: 'status', label: 'Status', kind: 'dimension' },
        { key: 'module', label: 'Module', kind: 'dimension' },
        { key: 'amount', label: 'Amount', kind: 'measure' },
      ],
      read: (entityCode) =>
        s.read(entityCode) as unknown as Record<string, unknown>[],
    });
  }

  // ── reference register sources (4) ────────────────────────────────────
  const registerSources: DataSource[] = [
    {
      id: 'reg:fc-outstanding-aging',
      label: 'Outstanding Aging',
      card: 'fincore',
      kind: 'register',
      fields: [
        { key: 'party_name', label: 'Party', kind: 'dimension' },
        { key: 'bill_no', label: 'Bill No', kind: 'dimension' },
        { key: 'bill_date', label: 'Bill Date', kind: 'dimension' },
        { key: 'due_date', label: 'Due Date', kind: 'dimension' },
        { key: 'direction', label: 'Direction', kind: 'dimension' },
        { key: 'outstanding_amount', label: 'Outstanding', kind: 'measure' },
        { key: 'days_overdue', label: 'Days Overdue', kind: 'measure' },
      ],
      read: (entityCode) =>
        safeRead<Record<string, unknown>>(outstandingKey(entityCode)),
    },
    {
      id: 'reg:fc-ledger',
      label: 'Ledger Report',
      card: 'fincore',
      kind: 'register',
      fields: [
        { key: 'date', label: 'Date', kind: 'dimension' },
        { key: 'voucher_no', label: 'Voucher No', kind: 'dimension' },
        { key: 'base_voucher_type', label: 'Voucher Type', kind: 'dimension' },
        { key: 'party_name', label: 'Party', kind: 'dimension' },
        { key: 'status', label: 'Status', kind: 'dimension' },
        { key: 'net_amount', label: 'Net Amount', kind: 'measure' },
      ],
      read: (entityCode) =>
        safeRead<Record<string, unknown>>(vouchersKey(entityCode))
          .filter((v) => !(v as { is_cancelled?: boolean }).is_cancelled),
    },
    {
      id: 'reg:fc-gst-register',
      label: 'GST Register',
      card: 'fincore',
      kind: 'register',
      fields: [
        { key: 'period', label: 'Period', kind: 'dimension' },
        { key: 'gstin', label: 'GSTIN', kind: 'dimension' },
        { key: 'place_of_supply', label: 'Place of Supply', kind: 'dimension' },
        { key: 'hsn', label: 'HSN', kind: 'dimension' },
        { key: 'taxable_value', label: 'Taxable Value', kind: 'measure' },
        { key: 'igst', label: 'IGST', kind: 'measure' },
        { key: 'cgst', label: 'CGST', kind: 'measure' },
        { key: 'sgst', label: 'SGST', kind: 'measure' },
      ],
      read: (entityCode) =>
        safeRead<Record<string, unknown>>(gstRegisterKey(entityCode)),
    },
    {
      id: 'reg:ex-tt-payments',
      label: 'EximX TT Payments Register',
      card: 'eximx',
      kind: 'register',
      fields: [
        { key: 'tt_payment_no', label: 'TT No', kind: 'dimension' },
        { key: 'credited_at', label: 'Credited At', kind: 'dimension' },
        { key: 'related_foreign_vendor_id', label: 'Foreign Vendor', kind: 'dimension' },
        { key: 'currency', label: 'Currency', kind: 'dimension' },
        { key: 'fx_rate', label: 'FX Rate', kind: 'measure' },
        { key: 'total_debit_inr', label: 'Total INR', kind: 'measure' },
      ],
      read: (entityCode) =>
        loadTTPayments(entityCode) as unknown as Record<string, unknown>[],
    },
  ];

  for (const src of registerSources) registerSource(src);
}

// Auto-register on import. Idempotent — re-import is a no-op.
registerAllDataSources();
