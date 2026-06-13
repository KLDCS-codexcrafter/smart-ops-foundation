/**
 * @file        src/data/demo-transactions-finance-procurement.ts
 * @sprint      W1C-7b · T-W1C7b-Demo-Txns-Finance · Wave-1 Close Arc
 * @purpose     Demo transaction seed for the financial/procurement cluster:
 *              PayOut · BillPassing · EximX · Procure360 · Comply360 · VendorPortal.
 *
 *              Every row is written to the EXACT storage key the card's own
 *              register/engine reads, and in the SAME shape the engine's
 *              create/save path produces — so they round-trip cleanly through
 *              the real read path (listBillPassing/listAdvances/etc.) and
 *              the registers + reports + prints render truthfully.
 *
 *              ZERO new engines · ZERO new SIBLINGs · ZERO writes outside
 *              the demo seed scope. Every id is prefixed `demo-w1c7b-` so
 *              purgeDemoData clears the entire cluster.
 *
 *              Referential chain:
 *                  PO(demo-w1c7b-po-1)
 *                    └─► GRN(demo-w1c7b-grn-1)
 *                          └─► BillPassing(demo-w1c7b-bp-1)
 *                                 └─► VendorPaymentBatch(demo-w1c7b-pb-1)
 *                                       └─► references the same bill/PO.
 *
 * [JWT] Replace localStorage calls with REST endpoints per the per-engine
 *       contracts (POST /api/bill-passing, POST /api/procure360/po, ...).
 */
import type { BillPassingRecord } from '@/types/bill-passing';
import { billPassingKey } from '@/types/bill-passing';
import type { PurchaseOrderRecord } from '@/types/po';
import { purchaseOrdersKey } from '@/types/po';
import type { GRN } from '@/types/grn';
import { grnsKey } from '@/types/grn';
import type { VendorPaymentBatch } from '@/types/vendor-payment-batch';
import { vendorPaymentBatchKey } from '@/types/vendor-payment-batch';
import type { VendorAdvance } from '@/types/vendor-advance';
import { vendorAdvancesKey } from '@/types/vendor-advance';
import type { EBRC, EDPMSDeclaration } from '@/types/ebrc-edpms';
import { ebrcKey, edpmsKey } from '@/types/ebrc-edpms';
import type { VendorActivity } from '@/types/vendor-portal';
import { vendorActivityKey } from '@/types/vendor-portal';

import { applyDemoSeed as applyComply360DemoSeed } from '@/lib/comply360-demo-seed-engine';

const NOW = '2026-04-15T10:00:00.000Z';
const FY = 'FY-2026-27';

const id = (suffix: string): string => `demo-w1c7b-${suffix}`;

// ────────────────────────────────────────────────────────────────────────
// Procure360 — Purchase Orders
// ────────────────────────────────────────────────────────────────────────
function buildPurchaseOrders(entityCode: string): PurchaseOrderRecord[] {
  return [
    {
      id: id('po-1'),
      po_no: 'PO/26-27/0001',
      po_date: '2026-04-02',
      entity_id: entityCode,
      branch_id: null, division_id: null, department_id: null, cost_center_id: null,
      source_quotation_id: '', source_enquiry_id: '',
      vendor_id: id('vendor-delta'),
      vendor_name: 'Delta Suppliers Pvt Ltd',
      lines: [{
        id: id('po-1-l1'), line_no: 1,
        item_id: id('item-steel-coil'), item_name: 'CR Steel Coil 1.2mm',
        qty: 5000, uom: 'KG', rate: 62,
        basic_value: 310000, tax_pct: 18, tax_value: 55800,
        amount_after_tax: 365800, qty_received: 5000,
      }],
      total_basic_value: 310000, total_tax_value: 55800, total_after_tax: 365800,
      expected_delivery_date: '2026-04-12',
      delivery_address: 'Main Plant · Pune',
      approved_by_user_id: 'demo-user-procmgr',
      approved_at: '2026-04-02T12:00:00.000Z',
      status: 'fully_received',
      followups: [],
      notes: 'Demo seed · referenced by demo GRN + BillPassing + PaymentBatch.',
      created_at: NOW, updated_at: NOW,
    },
    {
      id: id('po-2'),
      po_no: 'PO/26-27/0002',
      po_date: '2026-04-08',
      entity_id: entityCode,
      branch_id: null, division_id: null, department_id: null, cost_center_id: null,
      source_quotation_id: '', source_enquiry_id: '',
      vendor_id: id('vendor-gamma'),
      vendor_name: 'Gamma Chemicals Ltd',
      lines: [{
        id: id('po-2-l1'), line_no: 1,
        item_id: id('item-cleaning'), item_name: 'Industrial Cleaning Concentrate',
        qty: 200, uom: 'LTR', rate: 320,
        basic_value: 64000, tax_pct: 18, tax_value: 11520,
        amount_after_tax: 75520, qty_received: 0,
      }],
      total_basic_value: 64000, total_tax_value: 11520, total_after_tax: 75520,
      expected_delivery_date: '2026-04-20',
      delivery_address: 'Main Plant · Pune',
      approved_by_user_id: null, approved_at: null,
      status: 'approved',
      followups: [],
      notes: 'Demo seed · open PO awaiting receipt.',
      created_at: NOW, updated_at: NOW,
    },
  ];
}

// ────────────────────────────────────────────────────────────────────────
// Procure360/Inventory — GRN (links to PO above)
// ────────────────────────────────────────────────────────────────────────
function buildGRNs(entityCode: string): GRN[] {
  return [
    {
      id: id('grn-1'),
      entity_id: entityCode,
      fiscal_year_id: FY,
      grn_no: 'GRN/26-27/0001',
      status: 'posted',
      po_id: id('po-1'), po_no: 'PO/26-27/0001',
      vendor_id: id('vendor-delta'),
      vendor_name: 'Delta Suppliers Pvt Ltd',
      vendor_invoice_no: 'DSL/24-25/1045',
      vendor_invoice_date: '2026-04-05',
      receipt_date: '2026-04-06',
      vehicle_no: 'MH-12-AB-9821', lr_no: 'LR/2026/04/8821',
      received_by_id: 'demo-user-storekeeper', received_by_name: 'Storekeeper · Demo',
      godown_id: id('godown-main'), godown_name: 'Main Store',
      project_centre_id: null,
      lines: [{
        id: id('grn-1-l1'),
        item_id: id('item-steel-coil'), item_code: 'STL-CR-12',
        item_name: 'CR Steel Coil 1.2mm', item_type: 'raw_material', uom: 'KG',
        ordered_qty: 5000, received_qty: 5000, accepted_qty: 5000, rejected_qty: 0,
        unit_rate: 62, line_total: 310000,
        batch_no: 'B-2604', serial_nos: [],
        heat_no: 'HT-A-2026-0408',
        bin_id: id('bin-rm-01'),
        qc_result: 'pass', qc_notes: 'Demo · QC passed.',
      }],
      total_qty: 5000, total_value: 310000, has_discrepancy: false,
      narration: 'Demo seed · receipt against PO/26-27/0001.',
      created_at: NOW, updated_at: NOW,
      posted_at: NOW, cancelled_at: null, cancellation_reason: null,
    },
  ];
}

// ────────────────────────────────────────────────────────────────────────
// BillPassing — references PO + GRN above
// ────────────────────────────────────────────────────────────────────────
function buildBillPassing(entityCode: string): BillPassingRecord[] {
  return [
    {
      id: id('bp-1'),
      bill_no: 'BP/26-27/0001', bill_date: '2026-04-07',
      entity_id: entityCode,
      fiscal_year_id: FY,
      branch_id: null,
      po_id: id('po-1'), po_no: 'PO/26-27/0001',
      git_id: null,
      vendor_id: id('vendor-delta'),
      vendor_name: 'Delta Suppliers Pvt Ltd',
      vendor_invoice_no: 'DSL/24-25/1045',
      vendor_invoice_date: '2026-04-05',
      match_type: '3-way',
      qa_inspection_id: null,
      lines: [{
        id: id('bp-1-l1'), line_no: 1,
        po_line_id: id('po-1-l1'), git_line_id: null,
        item_id: id('item-steel-coil'), item_name: 'CR Steel Coil 1.2mm',
        po_qty: 5000, po_rate: 62, po_value: 310000,
        grn_qty: 5000,
        invoice_qty: 5000, invoice_rate: 62, invoice_value: 310000,
        invoice_tax_pct: 18, invoice_tax_value: 55800, invoice_total: 365800,
        qty_variance: 0, rate_variance: 0, total_variance: 0,
        match_status: 'clean', variance_reason: '',
        requires_inspection: false, qa_passed: null,
      }],
      total_invoice_value: 365800, total_po_value: 365800, total_grn_value: 310000,
      total_variance: 0, variance_pct: 0,
      tolerance_pct: 2, tolerance_amount: 500,
      approver_user_id: 'demo-user-finmgr',
      approval_notes: 'Demo · clean 3-way match.',
      approved_at: '2026-04-08T09:30:00.000Z',
      fcpi_voucher_id: null, fcpi_drafted_at: null,
      mode_of_payment_id: null, terms_of_payment_id: null, terms_of_delivery_id: null,
      narration: 'Demo seed bill · clean match.',
      terms_conditions: '',
      status: 'approved_for_fcpi',
      notes: 'Demo seed · referenced by demo PaymentBatch.',
      retention_policy: 'gst_8yr',
      created_by: 'demo-seed',
      created_at: NOW, updated_at: NOW,
    },
    {
      id: id('bp-2'),
      bill_no: 'BP/26-27/0002', bill_date: '2026-04-11',
      entity_id: entityCode,
      fiscal_year_id: FY,
      branch_id: null,
      po_id: id('po-2'), po_no: 'PO/26-27/0002',
      git_id: null,
      vendor_id: id('vendor-gamma'),
      vendor_name: 'Gamma Chemicals Ltd',
      vendor_invoice_no: 'GC/1192',
      vendor_invoice_date: '2026-04-10',
      match_type: '3-way',
      qa_inspection_id: null,
      lines: [{
        id: id('bp-2-l1'), line_no: 1,
        po_line_id: id('po-2-l1'), git_line_id: null,
        item_id: id('item-cleaning'), item_name: 'Industrial Cleaning Concentrate',
        po_qty: 200, po_rate: 320, po_value: 64000,
        grn_qty: 200,
        invoice_qty: 200, invoice_rate: 325, invoice_value: 65000,
        invoice_tax_pct: 18, invoice_tax_value: 11700, invoice_total: 76700,
        qty_variance: 0, rate_variance: 5, total_variance: 1000,
        match_status: 'rate_variance', variance_reason: 'Rate revised at supplier end.',
        requires_inspection: false, qa_passed: null,
      }],
      total_invoice_value: 76700, total_po_value: 75520, total_grn_value: 64000,
      total_variance: 1000, variance_pct: 1.6,
      tolerance_pct: 2, tolerance_amount: 500,
      approver_user_id: null, approval_notes: '', approved_at: null,
      fcpi_voucher_id: null, fcpi_drafted_at: null,
      mode_of_payment_id: null, terms_of_payment_id: null, terms_of_delivery_id: null,
      narration: 'Demo seed bill · pending approval (rate variance).',
      terms_conditions: '',
      status: 'matched_with_variance',
      notes: 'Demo seed · variance flow.',
      retention_policy: 'gst_8yr',
      created_by: 'demo-seed',
      created_at: NOW, updated_at: NOW,
    },
  ];
}

// ────────────────────────────────────────────────────────────────────────
// PayOut — Vendor Payment Batches (references bp-1) + Vendor Advance
// ────────────────────────────────────────────────────────────────────────
function buildPaymentBatches(entityCode: string): VendorPaymentBatch[] {
  return [
    {
      id: id('pb-1'),
      entity_code: entityCode,
      financial_year: FY,
      retention_policy: 'gst_8yr',
      batch_no: 'PB/26-27/0001',
      scheduled_date: '2026-04-15',
      channel: 'bank_neft',
      lines: [{
        payment_requisition_id: id('bp-1'),
        party_id: id('vendor-delta'),
        amount_paise: 36580000, // ₹3,65,800
      }],
      line_count: 1,
      total_amount_paise: 36580000,
      status: 'released',
      created_by: 'demo-seed',
      released_by: 'demo-user-finmgr',
      released_at: '2026-04-15T11:00:00.000Z',
      notes: 'Demo seed · released batch against demo bill bp-1.',
      created_at: NOW, updated_at: NOW,
    },
    {
      id: id('pb-2'),
      entity_code: entityCode,
      financial_year: FY,
      retention_policy: 'gst_8yr',
      batch_no: 'PB/26-27/0002',
      scheduled_date: '2026-04-22',
      channel: 'bank_rtgs',
      lines: [{
        payment_requisition_id: id('bp-2'),
        party_id: id('vendor-gamma'),
        amount_paise: 7670000,
      }],
      line_count: 1,
      total_amount_paise: 7670000,
      status: 'queued',
      created_by: 'demo-seed',
      notes: 'Demo seed · queued batch awaiting release.',
      created_at: NOW, updated_at: NOW,
    },
  ];
}

function buildVendorAdvances(entityCode: string): VendorAdvance[] {
  return [{
    id: id('adv-1'),
    entity_id: entityCode,
    vendor_id: id('vendor-delta'),
    vendor_name: 'Delta Suppliers Pvt Ltd',
    po_id: id('po-1'), po_no: 'PO/26-27/0001',
    advance_amount: 50000,
    advance_paid_at: '2026-04-03T10:00:00.000Z',
    advance_adjusted_amount: 50000,
    status: 'fully_adjusted',
    notes: 'Demo seed · advance adjusted against bill bp-1.',
    created_at: NOW, updated_at: NOW,
  }];
}

// ────────────────────────────────────────────────────────────────────────
// EximX — eBRC + EDPMS rows
// ────────────────────────────────────────────────────────────────────────
function buildEBRCs(entityCode: string): EBRC[] {
  return [{
    id: id('ebrc-1'),
    ebrc_no: 'EBRC/26-27/0001',
    entity_id: entityCode,
    status: 'issued',
    related_realisation_id: id('exp-real-1'),
    related_shipping_bill_no: 'SB/26-27/0001',
    related_export_po_no: 'EXP-PO/26-27/0001',
    ad_bank_name: 'HDFC Bank',
    ad_bank_branch: 'Park Street · Kolkata',
    full_value_foreign: 12500,
    full_value_inr: 1043750,
    issuance_date: '2026-04-10',
    drawback_claim_used: false,
    rodtep_claim_used: true,
    notes: 'Demo seed · USD 12,500 realised against export shipment.',
    created_at: NOW, updated_at: NOW,
  }];
}

function buildEDPMS(entityCode: string): EDPMSDeclaration[] {
  return [{
    id: id('edpms-1'),
    edpms_ref_no: 'EDPMS/26-27/0001',
    entity_id: entityCode,
    state: 'closed',
    related_shipping_bill_no: 'SB/26-27/0001',
    related_realisation_id: id('exp-real-1'),
    rbi_reported_date: '2026-04-02',
    rbi_realised_date: '2026-04-10',
    rbi_caution_reason: null,
    rbi_extension_granted_to: null,
    notes: 'Demo seed · realised within 9 months · auto-closed.',
    created_at: NOW, updated_at: NOW,
  }];
}

// ────────────────────────────────────────────────────────────────────────
// Vendor Portal — VendorActivity rows
// ────────────────────────────────────────────────────────────────────────
function buildVendorActivity(entityCode: string): VendorActivity[] {
  return [
    {
      id: id('va-1'),
      vendor_id: id('vendor-delta'),
      entity_code: entityCode,
      kind: 'rfq_view',
      ref_type: 'rfq', ref_id: id('rfq-1'), ref_label: 'RFQ/26-27/0001',
      at: '2026-04-04T08:30:00.000Z',
    },
    {
      id: id('va-2'),
      vendor_id: id('vendor-delta'),
      entity_code: entityCode,
      kind: 'quotation_submit',
      ref_type: 'quotation', ref_id: id('q-1'), ref_label: 'Q/26-27/0001',
      at: '2026-04-04T11:00:00.000Z',
    },
    {
      id: id('va-3'),
      vendor_id: id('vendor-gamma'),
      entity_code: entityCode,
      kind: 'login',
      at: '2026-04-09T09:00:00.000Z',
    },
  ];
}

// ────────────────────────────────────────────────────────────────────────
// Write helpers — additive (never overwrite existing real data)
// ────────────────────────────────────────────────────────────────────────
function safeSet<T>(key: string, rows: T[]): void {
  // [JWT] GET /api/entity/storage/:key
  const existing = localStorage.getItem(key);
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed) && parsed.length > 0) return;
    } catch { /* fallthrough */ }
  }
  // [JWT] POST /api/entity/storage/:key
  localStorage.setItem(key, JSON.stringify(rows));
}

// ────────────────────────────────────────────────────────────────────────
// Public entry point — registered in useDemoSeedLoader
// ────────────────────────────────────────────────────────────────────────
export interface FinProcDemoCounts {
  purchaseOrders: number;
  grns: number;
  billPassings: number;
  paymentBatches: number;
  vendorAdvances: number;
  ebrcs: number;
  edpms: number;
  vendorActivities: number;
}

export function seedFinanceProcurementTxnsForDemo(entityCode: string): FinProcDemoCounts {
  const pos = buildPurchaseOrders(entityCode);
  const grns = buildGRNs(entityCode);
  const bps = buildBillPassing(entityCode);
  const pbs = buildPaymentBatches(entityCode);
  const advs = buildVendorAdvances(entityCode);
  const ebrcs = buildEBRCs(entityCode);
  const edpmss = buildEDPMS(entityCode);
  const vas = buildVendorActivity(entityCode);

  safeSet(purchaseOrdersKey(entityCode), pos);
  safeSet(grnsKey(entityCode), grns);
  safeSet(billPassingKey(entityCode), bps);
  safeSet(vendorPaymentBatchKey(entityCode), pbs);
  safeSet(vendorAdvancesKey(entityCode), advs);
  safeSet(ebrcKey(entityCode), ebrcs);
  safeSet(edpmsKey(entityCode), edpmss);
  safeSet(vendorActivityKey(entityCode), vas);

  // Comply360 transactional seed lives in its own engine (NBFC loans · RERA
  // projects · AI ROI rows). Idempotent · marker-guarded.
  // Comply360 transactional seed lives in its own engine (NBFC loans · RERA
  // projects · AI ROI rows). Idempotent · marker-guarded.
  try {
    applyComply360DemoSeed();
  } catch { /* engine not yet loaded in some test contexts */ }


  return {
    purchaseOrders: pos.length,
    grns: grns.length,
    billPassings: bps.length,
    paymentBatches: pbs.length,
    vendorAdvances: advs.length,
    ebrcs: ebrcs.length,
    edpms: edpmss.length,
    vendorActivities: vas.length,
  };
}

/** Keys this seeder writes — surfaced for the demo loader's purge map. */
export function finProcDemoKeys(entityCode: string): string[] {
  return [
    purchaseOrdersKey(entityCode),
    grnsKey(entityCode),
    billPassingKey(entityCode),
    vendorPaymentBatchKey(entityCode),
    vendorAdvancesKey(entityCode),
    ebrcKey(entityCode),
    edpmsKey(entityCode),
    vendorActivityKey(entityCode),
  ];
}
