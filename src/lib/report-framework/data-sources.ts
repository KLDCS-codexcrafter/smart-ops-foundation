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
import { loadObligations } from '@/lib/comply360-statutory-memory';
import { stockBalanceKey } from '@/types/grn';
import { consumptionEntriesKey } from '@/types/consumption';
import { purchaseOrdersKey } from '@/types/po';
import { budgetAllocationsKey } from '@/types/budget-allocation';
import { qaInspectionKey } from '@/types/qa-inspection';
import { ncrKey } from '@/types/ncr';
import { productionOrdersKey } from '@/types/production-order';
import { jobWorkOutOrdersKey } from '@/types/job-work-out-order';

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

  // ── RPT-5a · compliance % aggregate (resolves xc-compliance-pct on Role Dashboard)
  // Reuses the SAME loadObligations() the Comply360 cmp-* dashboards already read.
  registerSource({
    id: 'comply360.aggregate.compliance-pct',
    label: 'Compliance % · per module',
    card: 'comply360',
    kind: 'kpi',
    fields: [
      { key: 'module', label: 'Module', kind: 'dimension' },
      { key: 'total', label: 'Total', kind: 'measure' },
      { key: 'filed', label: 'Filed', kind: 'measure' },
      { key: 'pending', label: 'Pending', kind: 'measure' },
      { key: 'overdue', label: 'Overdue', kind: 'measure' },
      { key: 'compliance_pct', label: 'Compliance %', kind: 'measure' },
    ],
    read: (_entityCode) => {
      try {
        const obligations = loadObligations();
        const byModule = new Map<string, { total: number; filed: number; pending: number; overdue: number }>();
        for (const o of obligations) {
          const m = byModule.get(o.module) ?? { total: 0, filed: 0, pending: 0, overdue: 0 };
          m.total += 1;
          if (o.status === 'filed') m.filed += 1;
          else if (o.status === 'overdue' || o.status === 'breach') m.overdue += 1;
          else m.pending += 1;
          byModule.set(o.module, m);
        }
        const rows: Record<string, unknown>[] = [];
        for (const [module, m] of byModule.entries()) {
          rows.push({
            module,
            total: m.total,
            filed: m.filed,
            pending: m.pending,
            overdue: m.overdue,
            compliance_pct: m.total > 0 ? Math.round((m.filed / m.total) * 100) : 0,
          });
        }
        return rows.sort((a, b) =>
          String(a.module).localeCompare(String(b.module)),
        );
      } catch {
        return [];
      }
    },
  });

  // ─── RPT-5b · Inventory DSC sources ──────────────────────────────────
  // Wraps the SAME storage the wrapped Inventory pages already read.
  registerSource({
    id: 'inventory.stock-ledger',
    label: 'Inventory · Stock Ledger',
    card: 'inventory',
    kind: 'register',
    fields: [
      { key: 'item_id', label: 'Item Id', kind: 'dimension' },
      { key: 'item_name', label: 'Item', kind: 'dimension' },
      { key: 'godown_id', label: 'Godown Id', kind: 'dimension' },
      { key: 'godown_name', label: 'Godown', kind: 'dimension' },
      { key: 'qty', label: 'Qty', kind: 'measure' },
      { key: 'value', label: 'Value', kind: 'measure' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(stockBalanceKey(entityCode || 'SMRT')),
  });

  registerSource({
    id: 'inventory.consumption',
    label: 'Inventory · Consumption Entries',
    card: 'inventory',
    kind: 'register',
    fields: [
      { key: 'ce_no', label: 'CE No', kind: 'dimension' },
      { key: 'consumption_date', label: 'Date', kind: 'dimension' },
      { key: 'effective_date', label: 'Effective Date', kind: 'dimension' },
      { key: 'mode', label: 'Mode', kind: 'dimension' },
      { key: 'department_code', label: 'Department', kind: 'dimension' },
      { key: 'godown_id', label: 'Godown', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'total_value', label: 'Total Value', kind: 'measure' },
      { key: 'total_variance_value', label: 'Variance Value', kind: 'measure' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(consumptionEntriesKey(entityCode || 'SMRT'))
        .filter((c) => !(c as { is_cancelled?: boolean }).is_cancelled),
  });

  // ─── RPT-5c · Procure360 DSC sources ─────────────────────────────────
  // Wraps the SAME storage the wrapped Procure360 pages already read.
  registerSource({
    id: 'procure.purchase-orders',
    label: 'Procure · Purchase Orders',
    card: 'procure360',
    kind: 'register',
    fields: [
      { key: 'po_no', label: 'PO No', kind: 'dimension' },
      { key: 'po_date', label: 'PO Date', kind: 'dimension' },
      { key: 'vendor_id', label: 'Vendor Id', kind: 'dimension' },
      { key: 'vendor_name', label: 'Vendor', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'total_value', label: 'Total Value', kind: 'measure' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(purchaseOrdersKey(entityCode || 'SMRT')),
  });

  registerSource({
    id: 'procure.budget-utilization',
    label: 'Procure · Budget Allocations',
    card: 'procure360',
    kind: 'register',
    fields: [
      { key: 'fiscal_year', label: 'FY', kind: 'dimension' },
      { key: 'scope', label: 'Scope', kind: 'dimension' },
      { key: 'scope_ref_label', label: 'Reference', kind: 'dimension' },
      { key: 'is_active', label: 'Active', kind: 'dimension' },
      { key: 'allocated_amount', label: 'Allocated', kind: 'measure' },
      { key: 'committed_amount', label: 'Committed', kind: 'measure' },
      { key: 'consumed_amount', label: 'Consumed', kind: 'measure' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(budgetAllocationsKey(entityCode || 'SMRT'))
        .filter((b) => (b as { is_active?: boolean }).is_active !== false),
  });
  // ─── RPT-5d · QualiCheck DSC sources ─────────────────────────────────
  // Wraps the SAME storage the wrapped QualiCheck pages already read.
  registerSource({
    id: 'qualicheck.inspections',
    label: 'QualiCheck · QA Inspections',
    card: 'qualicheck',
    kind: 'register',
    fields: [
      { key: 'qa_no', label: 'QA No', kind: 'dimension' },
      { key: 'inspection_type', label: 'Type', kind: 'dimension' },
      { key: 'inspection_location', label: 'Location', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'inspector_user_id', label: 'Inspector', kind: 'dimension' },
      { key: 'inspection_date', label: 'Date', kind: 'dimension' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(qaInspectionKey(entityCode || 'SMRT')),
  });

  registerSource({
    id: 'qualicheck.ncr',
    label: 'QualiCheck · NCR',
    card: 'qualicheck',
    kind: 'register',
    fields: [
      { key: 'id', label: 'NCR Id', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'severity', label: 'Severity', kind: 'dimension' },
      { key: 'source', label: 'Source', kind: 'dimension' },
      { key: 'related_party_name', label: 'Party', kind: 'dimension' },
      { key: 'item_name', label: 'Item', kind: 'dimension' },
      { key: 'qty_affected', label: 'Qty Affected', kind: 'measure' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(ncrKey(entityCode || 'SMRT')),
  });

  // ─── RPT-6a · Production DSC sources ─────────────────────────────────
  // Wraps the SAME storage the wrapped Production pages already read.
  registerSource({
    id: 'production.orders',
    label: 'Production · Production Orders',
    card: 'production',
    kind: 'register',
    fields: [
      { key: 'doc_no', label: 'PO No', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'production_site_id', label: 'Factory', kind: 'dimension' },
      { key: 'planned_qty', label: 'Planned Qty', kind: 'measure' },
      { key: 'target_end_date', label: 'Target End', kind: 'dimension' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(productionOrdersKey(entityCode || 'SMRT')),
  });

  registerSource({
    id: 'production.jobwork',
    label: 'Production · Job-Work Out Orders',
    card: 'production',
    kind: 'register',
    fields: [
      { key: 'doc_no', label: 'JWO No', kind: 'dimension' },
      { key: 'vendor_id', label: 'Vendor', kind: 'dimension' },
      { key: 'vendor_name', label: 'Vendor Name', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'jwo_date', label: 'Date', kind: 'dimension' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(jobWorkOutOrdersKey(entityCode || 'SMRT')),
  });
}

// Auto-register on import. Idempotent — re-import is a no-op.
registerAllDataSources();
