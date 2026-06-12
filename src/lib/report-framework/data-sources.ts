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
import { materialIndentsKey } from '@/types/material-indent';
import { serviceRequestsKey } from '@/types/service-request';
import { capitalIndentsKey } from '@/types/capital-indent';
import { stockIssuesKey } from '@/types/stock-issue';
import { stockReceiptAcksKey } from '@/types/stock-receipt-ack';
import { ordersKey } from '@/types/order';
import { quotationsKey } from '@/types/quotation';
import { projectsKey } from '@/types/projx/project';
import { projectMilestonesKey } from '@/types/projx/project-milestone';
import { distributorOrdersKey } from '@/types/distributor-order';
import { customerOrdersKey } from '@/types/customer-order';
import { ecOrdersKey } from '@/types/ecomx';
import { serviceTicketKey } from '@/types/service-ticket';
import { amcRecordKey } from '@/types/servicedesk';
import { dispatchReceiptsKey } from '@/types/dispatch-receipt';
import { inwardReceiptsKey } from '@/types/inward-receipt';
import { fdPartyContactsKey } from '@/types/frontdesk';
import { payrollRunsKey } from '@/types/payroll-run';
import { tfSLAKey } from '@/lib/taskflow-governance-engine';
import { getMSMEBreaches } from '@/lib/msme-43bh-engine';

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
    card: 'inventory-hub',
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
    card: 'inventory-hub',
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

  // ─── RPT-6b · 4 RequestX + Store-hub sources (read-only wrappers of existing keys) ───
  registerSource({
    id: 'requestx.indents',
    label: 'RequestX · Indents (material + service + capital)',
    card: 'requestx',
    kind: 'register',
    fields: [
      { key: 'voucher_no', label: 'Voucher', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'originating_department_name', label: 'Department', kind: 'dimension' },
      { key: 'date', label: 'Date', kind: 'dimension' },
      { key: 'total_estimated_value', label: 'Estimated Value', kind: 'measure' },
    ],
    read: (entityCode) => {
      const ec = entityCode || 'SMRT';
      const all: Array<Record<string, unknown>> = [];
      all.push(...safeRead<Record<string, unknown>>(materialIndentsKey(ec)));
      all.push(...safeRead<Record<string, unknown>>(serviceRequestsKey(ec)));
      all.push(...safeRead<Record<string, unknown>>(capitalIndentsKey(ec)));
      return all;
    },
  });

  registerSource({
    id: 'requestx.po-conversion',
    label: 'RequestX · PO conversion mix (indent → PO)',
    card: 'requestx',
    kind: 'register',
    fields: [
      { key: 'voucher_no', label: 'Voucher', kind: 'dimension' },
      { key: 'status', label: 'PO Status', kind: 'dimension' },
      { key: 'originating_department_name', label: 'Department', kind: 'dimension' },
    ],
    read: (entityCode) => {
      const ec = entityCode || 'SMRT';
      const all: Array<Record<string, unknown>> = [];
      all.push(...safeRead<Record<string, unknown>>(materialIndentsKey(ec)));
      all.push(...safeRead<Record<string, unknown>>(serviceRequestsKey(ec)));
      all.push(...safeRead<Record<string, unknown>>(capitalIndentsKey(ec)));
      return all;
    },
  });

  registerSource({
    id: 'storehub.issues',
    label: 'Store Hub · Stock Issues',
    card: 'store-hub',
    kind: 'register',
    fields: [
      { key: 'issue_no', label: 'Issue No', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'department_name', label: 'Department', kind: 'dimension' },
      { key: 'issue_date', label: 'Date', kind: 'dimension' },
      { key: 'total_value', label: 'Value', kind: 'measure' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(stockIssuesKey(entityCode || 'SMRT')),
  });

  registerSource({
    id: 'storehub.movement',
    label: 'Store Hub · Stock Movement (issues + receipt acks)',
    card: 'store-hub',
    kind: 'register',
    fields: [
      { key: 'doc_no', label: 'Doc No', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'date', label: 'Date', kind: 'dimension' },
    ],
    read: (entityCode) => {
      const ec = entityCode || 'SMRT';
      const all: Array<Record<string, unknown>> = [];
      all.push(...safeRead<Record<string, unknown>>(stockIssuesKey(ec)));
      all.push(...safeRead<Record<string, unknown>>(stockReceiptAcksKey(ec)));
      return all;
    },
  });

  // ─── RPT-6c · 5 small-cards sources (read-only wrappers) ───
  registerSource({
    id: 'engineeringx.drawings',
    label: 'EngineeringX · Drawings',
    card: 'engineeringx',
    kind: 'register',
    fields: [
      { key: 'id', label: 'Drawing ID', kind: 'dimension' },
      { key: 'title', label: 'Title', kind: 'dimension' },
      { key: 'current_version', label: 'Version', kind: 'dimension' },
      { key: 'created_at', label: 'Created', kind: 'dimension' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(`erp_documents_${entityCode || 'SMRT'}`)
        .filter((d) => (d as { kind?: string }).kind === 'drawing'),
  });

  registerSource({
    id: 'sitex.dpr',
    label: 'SiteX · DPRs + Snags',
    card: 'sitex',
    kind: 'register',
    fields: [
      { key: 'site_id', label: 'Site', kind: 'dimension' },
      { key: 'report_date', label: 'Date', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
    ],
    read: (entityCode) => {
      const ec = entityCode || 'SMRT';
      const all: Array<Record<string, unknown>> = [];
      all.push(...safeRead<Record<string, unknown>>(`erp_dprs_${ec}`));
      all.push(...safeRead<Record<string, unknown>>(`erp_snags_${ec}`));
      return all;
    },
  });

  registerSource({
    id: 'maintainpro.tickets',
    label: 'MaintainPro · Internal Tickets + Breakdowns',
    card: 'maintainpro',
    kind: 'register',
    fields: [
      { key: 'category', label: 'Category', kind: 'dimension' },
      { key: 'severity', label: 'Severity', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'originating_department_id', label: 'Department', kind: 'dimension' },
    ],
    read: (entityCode) => {
      const ec = entityCode || 'DEMO';
      const all: Array<Record<string, unknown>> = [];
      all.push(...safeRead<Record<string, unknown>>(`erp_internal_tickets_${ec}`));
      all.push(...safeRead<Record<string, unknown>>(`erp_breakdown_reports_${ec}`));
      all.push(...safeRead<Record<string, unknown>>(`erp_fire_safety_equipment_${ec}`));
      return all;
    },
  });

  registerSource({
    id: 'vendorportal.msme',
    label: 'VendorPortal · MSME 43BH breaches',
    card: 'vendor-portal',
    kind: 'register',
    fields: [
      { key: 'vendor_name', label: 'Vendor', kind: 'dimension' },
      { key: 'invoice_no', label: 'Invoice', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'unpaid_amount', label: 'Unpaid ₹', kind: 'measure' },
      { key: 'days_overdue', label: 'Days Overdue', kind: 'measure' },
    ],
    read: (entityCode) => {
      try {
        return getMSMEBreaches(entityCode || 'SMRT') as unknown as Record<string, unknown>[];
      } catch { return []; }
    },
  });

  registerSource({
    id: 'logistic.shipments',
    label: 'Logistic · LR Acceptances',
    card: 'logistics',
    kind: 'register',
    fields: [
      { key: 'dln_voucher_no', label: 'LR No', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(`erp_lr_acceptances_${entityCode || 'SMRT'}`),
  });

  // ─── RPT-7a · 2 SalesX sources (read-only wrappers) ───
  registerSource({
    id: 'salesx.orders',
    label: 'SalesX · Sales Orders',
    card: 'salesx',
    kind: 'register',
    fields: [
      { key: 'order_no', label: 'Order No', kind: 'dimension' },
      { key: 'party_name', label: 'Customer', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'date', label: 'Date', kind: 'dimension' },
      { key: 'net_amount', label: 'Net Amount', kind: 'measure' },
    ],
    read: (entityCode) => {
      const ec = entityCode || 'SMRT';
      return safeRead<Record<string, unknown>>(ordersKey(ec))
        .filter((o) => (o as { base_voucher_type?: string }).base_voucher_type === 'Sales Order');
    },
  });

  registerSource({
    id: 'salesx.pipeline',
    label: 'SalesX · Quotation Pipeline',
    card: 'salesx',
    kind: 'register',
    fields: [
      { key: 'quotation_no', label: 'Quotation No', kind: 'dimension' },
      { key: 'customer_name', label: 'Customer', kind: 'dimension' },
      { key: 'quotation_stage', label: 'Stage', kind: 'dimension' },
      { key: 'quotation_date', label: 'Date', kind: 'dimension' },
      { key: 'total_amount', label: 'Total', kind: 'measure' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(quotationsKey(entityCode || 'SMRT')),
  });

  // ─── RPT-7b · 2 ProjX sources (read-only wrappers · reuse existing storage keys) ───
  registerSource({
    id: 'projx.projects',
    label: 'ProjX · Projects',
    card: 'projx',
    kind: 'register',
    fields: [
      { key: 'project_no', label: 'Project No', kind: 'dimension' },
      { key: 'project_name', label: 'Project', kind: 'dimension' },
      { key: 'customer_name', label: 'Customer', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'start_date', label: 'Start', kind: 'dimension' },
      { key: 'current_contract_value', label: 'Contract ₹', kind: 'measure' },
      { key: 'billed_to_date', label: 'Billed ₹', kind: 'measure' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(projectsKey(entityCode || 'SMRT')),
  });

  registerSource({
    id: 'projx.financials',
    label: 'ProjX · Milestone Financials',
    card: 'projx',
    kind: 'register',
    fields: [
      { key: 'milestone_no', label: 'Milestone No', kind: 'dimension' },
      { key: 'milestone_name', label: 'Milestone', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'target_date', label: 'Target Date', kind: 'dimension' },
      { key: 'invoice_amount', label: 'Invoice ₹', kind: 'measure' },
      { key: 'invoice_pct', label: 'Invoice %', kind: 'measure' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(projectMilestonesKey(entityCode || 'SMRT')),
  });

  // ─── RPT-7c · 3 sources (Distributor + Customer + EcomX · read-only) ───
  registerSource({
    id: 'distributor.orders',
    label: 'Distributor · Orders',
    card: 'distributor-hub',
    kind: 'register',
    fields: [
      { key: 'order_no', label: 'Order No', kind: 'dimension' },
      { key: 'partner_name', label: 'Distributor', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'submitted_at', label: 'Submitted', kind: 'dimension' },
      { key: 'grand_total_paise', label: 'Grand Total ₹ (paise)', kind: 'measure' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(distributorOrdersKey(entityCode || 'SMRT')),
  });

  registerSource({
    id: 'customer.insights',
    label: 'Customer · Insights (orders + master)',
    card: 'customer-hub',
    kind: 'register',
    fields: [
      { key: 'customer_id', label: 'Customer Id', kind: 'dimension' },
      { key: 'customer_name', label: 'Customer', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'placed_at', label: 'Placed', kind: 'dimension' },
      { key: 'net_payable_paise', label: 'Net Payable ₹ (paise)', kind: 'measure' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(customerOrdersKey(entityCode || 'SMRT')),
  });

  registerSource({
    id: 'ecomx.orders',
    label: 'EcomX · Marketplace Orders',
    card: 'ecomx',
    kind: 'register',
    fields: [
      { key: 'marketplaceOrderId', label: 'Order No', kind: 'dimension' },
      { key: 'marketplaceId', label: 'Marketplace', kind: 'dimension' },
      { key: 'layer', label: 'Layer', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'orderDate', label: 'Date', kind: 'dimension' },
      { key: 'grossAmount', label: 'Gross ₹', kind: 'measure' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(ecOrdersKey(entityCode || 'SMRT')),
  });

  // ─── RPT-8a · 4 sources (ServiceDesk + Dispatch · read-only wrappers) ───
  registerSource({
    id: 'servicedesk.tickets',
    label: 'ServiceDesk · Service Tickets',
    card: 'servicedesk',
    kind: 'register',
    fields: [
      { key: 'ticket_no', label: 'Ticket No', kind: 'dimension' },
      { key: 'channel', label: 'Channel', kind: 'dimension' },
      { key: 'severity', label: 'Severity', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'raised_at', label: 'Raised', kind: 'dimension' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(serviceTicketKey(entityCode || 'OPRX')),
  });

  registerSource({
    id: 'servicedesk.amc',
    label: 'ServiceDesk · AMC Records',
    card: 'servicedesk',
    kind: 'register',
    fields: [
      { key: 'amc_code', label: 'AMC Code', kind: 'dimension' },
      { key: 'customer_id', label: 'Customer', kind: 'dimension' },
      { key: 'oem_name', label: 'OEM', kind: 'dimension' },
      { key: 'contract_end', label: 'Contract End', kind: 'dimension' },
      { key: 'risk_bucket', label: 'Risk', kind: 'dimension' },
      { key: 'contract_value_paise', label: 'Contract ₹ (paise)', kind: 'measure' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(amcRecordKey(entityCode || 'OPRX')),
  });

  registerSource({
    id: 'dispatch.shipments',
    label: 'Dispatch · Shipment Receipts',
    card: 'dispatch-hub',
    kind: 'register',
    fields: [
      { key: 'receipt_no', label: 'Receipt No', kind: 'dimension' },
      { key: 'customer_name', label: 'Customer', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'delivery_date', label: 'Delivery Date', kind: 'dimension' },
      { key: 'total_delivered', label: 'Delivered', kind: 'measure' },
      { key: 'total_damage', label: 'Damage', kind: 'measure' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(dispatchReceiptsKey(entityCode || 'SMRT')),
  });

  registerSource({
    id: 'dispatch.inward',
    label: 'Dispatch · Inward Receipts',
    card: 'dispatch-hub',
    kind: 'register',
    fields: [
      { key: 'receipt_no', label: 'Receipt No', kind: 'dimension' },
      { key: 'vendor_name', label: 'Vendor', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'arrival_date', label: 'Arrival', kind: 'dimension' },
      { key: 'total_lines', label: 'Lines', kind: 'measure' },
      { key: 'quarantine_lines', label: 'Quarantine Lines', kind: 'measure' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(inwardReceiptsKey(entityCode || 'SMRT')),
  });

  // ─── RPT-8b · 4 sources (FrontDesk + TaskFlow + DocVault + Pay-hub · read-only wrappers) ───
  // payhub.payroll wraps the SAME storage the pay-hub workflow modules already read.
  registerSource({
    id: 'frontdesk.contacts',
    label: 'FrontDesk · Party Contacts',
    card: 'frontdesk',
    kind: 'register',
    fields: [
      { key: 'partyId', label: 'Party', kind: 'dimension' },
      { key: 'name', label: 'Contact', kind: 'dimension' },
      { key: 'designation', label: 'Designation', kind: 'dimension' },
      { key: 'isPrimary', label: 'Primary', kind: 'dimension' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(fdPartyContactsKey(entityCode || 'SMRT')),
  });

  registerSource({
    id: 'taskflow.tasks',
    label: 'TaskFlow · SLA Rules',
    card: 'taskflow',
    kind: 'register',
    fields: [
      { key: 'id', label: 'Rule Id', kind: 'dimension' },
      { key: 'name', label: 'Name', kind: 'dimension' },
      { key: 'category', label: 'Category', kind: 'dimension' },
      { key: 'priority', label: 'Priority', kind: 'dimension' },
      { key: 'isActive', label: 'Active', kind: 'dimension' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(tfSLAKey(entityCode || 'SMRT')),
  });

  registerSource({
    id: 'docvault.documents',
    label: 'DocVault · Documents',
    card: 'docvault',
    kind: 'register',
    fields: [
      { key: 'id', label: 'Doc Id', kind: 'dimension' },
      { key: 'title', label: 'Title', kind: 'dimension' },
      { key: 'document_type', label: 'Type', kind: 'dimension' },
      { key: 'originating_department_id', label: 'Discipline', kind: 'dimension' },
      { key: 'current_version', label: 'Version', kind: 'dimension' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(`erp_documents_${entityCode || 'SMRT'}`),
  });

  registerSource({
    id: 'payhub.payroll',
    label: 'Pay-hub · Payroll Runs',
    card: 'peoplepay',
    kind: 'register',
    fields: [
      { key: 'payPeriod', label: 'Period', kind: 'dimension' },
      { key: 'status', label: 'Status', kind: 'dimension' },
      { key: 'totalEmployees', label: 'Employees', kind: 'measure' },
      { key: 'totalNet', label: 'Net ₹', kind: 'measure' },
    ],
    read: (entityCode) =>
      safeRead<Record<string, unknown>>(payrollRunsKey(entityCode || 'SMRT')),
  });
}

// Auto-register on import. Idempotent — re-import is a no-op.
registerAllDataSources();
