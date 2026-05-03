/**
 * @file        demo-procurement-data.ts
 * @sprint      T-Phase-1.2.6f-a-fix · FIX-2
 * @purpose     Demo seed for Procure360 (Procurement Enquiries · RFQs · Quotations).
 *              Promotes from existing pending_purchase indents in demo-requestx-data.
 *              Filtered per-entity by id-prefix in entity-setup-service.
 * @[JWT]       POST /api/procure360/demo-seed
 */
import type {
  ProcurementEnquiry,
  ProcurementEnquiryLine,
  VendorSelectionMode,
} from '@/types/procurement-enquiry';
import type { RFQ, RFQSendChannel } from '@/types/rfq';
import type { VendorQuotation, VendorQuotationLine } from '@/types/vendor-quotation';

const ISO = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

interface EnqSpec {
  bp: string; // blueprint shortcode (lower)
  seq: number;
  source_indent_ids: string[];
  vendor_mode: VendorSelectionMode;
  status: ProcurementEnquiry['status'];
  is_standalone: boolean;
  daysAgo: number;
  lines: Array<{ item_id: string; item_name: string; uom: string; qty: number; rate: number; days: number }>;
  awarded_quotation_ids?: string[];
  notes?: string;
}

const SPECS: EnqSpec[] = [
  // SINHA · 3 enquiries · scoring · auto-fallback
  { bp: 'sinha', seq: 1, source_indent_ids: ['mi-sinha-001'], vendor_mode: 'scoring', status: 'awarded', is_standalone: false, daysAgo: 14,
    lines: [{ item_id: 'itm-steel-coil', item_name: 'CR Steel Coil 1.2mm', uom: 'kg', qty: 5000, rate: 65, days: 7 },
            { item_id: 'itm-paint-pu', item_name: 'PU Paint 20L', uom: 'pail', qty: 80, rate: 4500, days: 5 }],
    awarded_quotation_ids: ['vq-sinha-001'], notes: 'Scoring mode · vendor SINHA-V1 awarded' },
  { bp: 'sinha', seq: 2, source_indent_ids: ['mi-sinha-002'], vendor_mode: 'scoring', status: 'quotations_received', is_standalone: false, daysAgo: 6,
    lines: [{ item_id: 'itm-bearing-skf', item_name: 'SKF Bearing 6205', uom: 'pcs', qty: 200, rate: 380, days: 10 }] },
  { bp: 'sinha', seq: 3, source_indent_ids: ['mi-sinha-003'], vendor_mode: 'scoring', status: 'awarded', is_standalone: false, daysAgo: 21,
    lines: [{ item_id: 'itm-bolt-m12', item_name: 'M12 Bolt SS304', uom: 'pcs', qty: 5000, rate: 18, days: 4 }],
    awarded_quotation_ids: ['vq-sinha-005'] },
  // AMITH · 2 enquiries · single-vendor
  { bp: 'amith', seq: 1, source_indent_ids: ['mi-amith-001'], vendor_mode: 'single', status: 'awarded', is_standalone: false, daysAgo: 9,
    lines: [{ item_id: 'itm-trader-cotton', item_name: 'Raw Cotton Bales', uom: 'bale', qty: 50, rate: 8500, days: 14 }],
    awarded_quotation_ids: ['vq-amith-001'] },
  { bp: 'amith', seq: 2, source_indent_ids: ['mi-amith-002'], vendor_mode: 'single', status: 'rfqs_dispatched', is_standalone: false, daysAgo: 3,
    lines: [{ item_id: 'itm-pkg-jute', item_name: 'Jute Packing Material', uom: 'roll', qty: 100, rate: 220, days: 5 }] },
  // BCPL · 2 enquiries · floating (item-vendor matched)
  { bp: 'bcpl', seq: 1, source_indent_ids: ['mi-bcpl-001'], vendor_mode: 'floating', status: 'awarded', is_standalone: false, daysAgo: 18,
    lines: [{ item_id: 'itm-syringe-5ml', item_name: 'Syringe 5ml Disposable', uom: 'box', qty: 500, rate: 240, days: 3 },
            { item_id: 'itm-glove-nitrile', item_name: 'Nitrile Gloves M', uom: 'box', qty: 300, rate: 380, days: 3 }],
    awarded_quotation_ids: ['vq-bcpl-001', 'vq-bcpl-002'] },
  { bp: 'bcpl', seq: 2, source_indent_ids: ['mi-bcpl-002'], vendor_mode: 'floating', status: 'awarded', is_standalone: false, daysAgo: 11,
    lines: [{ item_id: 'itm-paracetamol-500', item_name: 'Paracetamol 500mg Strip', uom: 'strip', qty: 2000, rate: 12, days: 7 }],
    awarded_quotation_ids: ['vq-bcpl-004'] },
  // ABDOS · 2 enquiries · tier-2 override
  { bp: 'abdos', seq: 1, source_indent_ids: ['mi-abdos-001'], vendor_mode: 'scoring', status: 'awarded', is_standalone: true, daysAgo: 16,
    lines: [{ item_id: 'itm-pp-resin', item_name: 'PP Resin Granules', uom: 'kg', qty: 2000, rate: 95, days: 10 }],
    awarded_quotation_ids: ['vq-abdos-001'], notes: 'Tier-2 override applied' },
  { bp: 'abdos', seq: 2, source_indent_ids: ['mi-abdos-002'], vendor_mode: 'scoring', status: 'quotations_received', is_standalone: false, daysAgo: 4,
    lines: [{ item_id: 'itm-mold-cavity', item_name: 'Injection Mold 8-cavity', uom: 'set', qty: 2, rate: 185000, days: 30 }] },
  // CHRSE · 1 enquiry · pending quotation
  { bp: 'chrse', seq: 1, source_indent_ids: ['mi-chrse-001'], vendor_mode: 'scoring', status: 'quotations_pending', is_standalone: false, daysAgo: 2,
    lines: [{ item_id: 'itm-textbook-cl5', item_name: 'Textbook Class 5 Set', uom: 'set', qty: 250, rate: 980, days: 14 }] },
  // SMRTP · 2 enquiries · multi-channel
  { bp: 'smrtp', seq: 1, source_indent_ids: ['mi-smrtp-001'], vendor_mode: 'scoring', status: 'awarded', is_standalone: false, daysAgo: 12,
    lines: [{ item_id: 'itm-pcb-asy', item_name: 'PCB Assembly v2', uom: 'pcs', qty: 1000, rate: 320, days: 21 },
            { item_id: 'itm-encl-abs', item_name: 'ABS Enclosure', uom: 'pcs', qty: 1000, rate: 85, days: 14 }],
    awarded_quotation_ids: ['vq-smrtp-001'] },
  { bp: 'smrtp', seq: 2, source_indent_ids: ['mi-smrtp-002'], vendor_mode: 'scoring', status: 'awarded', is_standalone: false, daysAgo: 5,
    lines: [{ item_id: 'itm-batt-li', item_name: 'Li-ion Battery 3.7V', uom: 'pcs', qty: 2000, rate: 145, days: 12 }],
    awarded_quotation_ids: ['vq-smrtp-004'] },
  // SHKPH · 1 enquiry · contract-expiry-flagged vendor
  { bp: 'shkph', seq: 1, source_indent_ids: ['mi-shkph-001'], vendor_mode: 'scoring', status: 'awarded', is_standalone: false, daysAgo: 8,
    lines: [{ item_id: 'itm-api-azith', item_name: 'Azithromycin API', uom: 'kg', qty: 50, rate: 12500, days: 21 }],
    awarded_quotation_ids: ['vq-shkph-001'], notes: 'Contract expiry flagged' },
];

interface RfqSpec {
  bp: string; seq: number; enq_seq: number; vendor: string; vendor_name: string;
  channels: RFQSendChannel[]; primary: RFQSendChannel; status: RFQ['status']; daysAgo: number;
  decline_reason?: string;
}

const RFQ_SPECS: RfqSpec[] = [
  // SINHA enq#1 · 3 vendors · 2 quoted · 1 declined
  { bp: 'sinha', seq: 1, enq_seq: 1, vendor: 'v-sinha-1', vendor_name: 'Steelcraft Industries', channels: ['email'], primary: 'email', status: 'quoted', daysAgo: 13 },
  { bp: 'sinha', seq: 2, enq_seq: 1, vendor: 'v-sinha-2', vendor_name: 'MetalSource Pvt Ltd', channels: ['email', 'whatsapp'], primary: 'email', status: 'quoted', daysAgo: 13 },
  { bp: 'sinha', seq: 3, enq_seq: 1, vendor: 'v-sinha-3', vendor_name: 'Coilworks LLP', channels: ['email'], primary: 'email', status: 'declined', daysAgo: 12, decline_reason: 'Capacity full' },
  // SINHA enq#2 · 3 vendors · sent
  { bp: 'sinha', seq: 4, enq_seq: 2, vendor: 'v-sinha-4', vendor_name: 'Bearing House', channels: ['email'], primary: 'email', status: 'sent', daysAgo: 5 },
  { bp: 'sinha', seq: 5, enq_seq: 2, vendor: 'v-sinha-5', vendor_name: 'SKF Authorised Dealer', channels: ['email'], primary: 'email', status: 'sent', daysAgo: 5 },
  // SINHA enq#3 · 3 vendors · 2 quoted
  { bp: 'sinha', seq: 6, enq_seq: 3, vendor: 'v-sinha-6', vendor_name: 'Fasteners India', channels: ['email'], primary: 'email', status: 'quoted', daysAgo: 19 },
  { bp: 'sinha', seq: 7, enq_seq: 3, vendor: 'v-sinha-7', vendor_name: 'BoltMart', channels: ['email'], primary: 'email', status: 'quoted', daysAgo: 19 },
  { bp: 'sinha', seq: 8, enq_seq: 3, vendor: 'v-sinha-8', vendor_name: 'SS Hardware', channels: ['email'], primary: 'email', status: 'timeout', daysAgo: 20 },
  // AMITH enq#1 · 2 vendors
  { bp: 'amith', seq: 1, enq_seq: 1, vendor: 'v-amith-1', vendor_name: 'Cotton Mills Co', channels: ['email'], primary: 'email', status: 'quoted', daysAgo: 8 },
  { bp: 'amith', seq: 2, enq_seq: 1, vendor: 'v-amith-2', vendor_name: 'Raw Cotton Traders', channels: ['email'], primary: 'email', status: 'quoted', daysAgo: 8 },
  // AMITH enq#2 · 2 vendors
  { bp: 'amith', seq: 3, enq_seq: 2, vendor: 'v-amith-3', vendor_name: 'JuteWorks', channels: ['email'], primary: 'email', status: 'sent', daysAgo: 2 },
  { bp: 'amith', seq: 4, enq_seq: 2, vendor: 'v-amith-4', vendor_name: 'Pack Material Co', channels: ['email', 'whatsapp'], primary: 'email', status: 'quoted', daysAgo: 2 },
  // BCPL enq#1 · 3 vendors
  { bp: 'bcpl', seq: 1, enq_seq: 1, vendor: 'v-bcpl-1', vendor_name: 'MedSupply India', channels: ['email'], primary: 'email', status: 'quoted', daysAgo: 17 },
  { bp: 'bcpl', seq: 2, enq_seq: 1, vendor: 'v-bcpl-2', vendor_name: 'Hospital Stores Ltd', channels: ['email'], primary: 'email', status: 'quoted', daysAgo: 17 },
  { bp: 'bcpl', seq: 3, enq_seq: 1, vendor: 'v-bcpl-3', vendor_name: 'PharmaPacks', channels: ['email'], primary: 'email', status: 'quoted', daysAgo: 17 },
  // BCPL enq#2 · 2 vendors
  { bp: 'bcpl', seq: 4, enq_seq: 2, vendor: 'v-bcpl-4', vendor_name: 'GenericPharma', channels: ['email'], primary: 'email', status: 'quoted', daysAgo: 10 },
  { bp: 'bcpl', seq: 5, enq_seq: 2, vendor: 'v-bcpl-5', vendor_name: 'BulkMeds Ltd', channels: ['email'], primary: 'email', status: 'declined', daysAgo: 10, decline_reason: 'Out of stock' },
  // ABDOS enq#1 · 2 vendors
  { bp: 'abdos', seq: 1, enq_seq: 1, vendor: 'v-abdos-1', vendor_name: 'PolymerSource', channels: ['email'], primary: 'email', status: 'quoted', daysAgo: 15 },
  { bp: 'abdos', seq: 2, enq_seq: 1, vendor: 'v-abdos-2', vendor_name: 'Resin India', channels: ['email'], primary: 'email', status: 'quoted', daysAgo: 15 },
  // ABDOS enq#2 · 2 vendors
  { bp: 'abdos', seq: 3, enq_seq: 2, vendor: 'v-abdos-3', vendor_name: 'MoldCraft Pvt', channels: ['email'], primary: 'email', status: 'quoted', daysAgo: 3 },
  { bp: 'abdos', seq: 4, enq_seq: 2, vendor: 'v-abdos-4', vendor_name: 'PrecisionMolds', channels: ['email'], primary: 'email', status: 'sent', daysAgo: 3 },
  // CHRSE enq#1 · 2 vendors
  { bp: 'chrse', seq: 1, enq_seq: 1, vendor: 'v-chrse-1', vendor_name: 'Educational Books', channels: ['email'], primary: 'email', status: 'sent', daysAgo: 1 },
  { bp: 'chrse', seq: 2, enq_seq: 1, vendor: 'v-chrse-2', vendor_name: 'Text Publishers', channels: ['email'], primary: 'email', status: 'sent', daysAgo: 1 },
  // SMRTP enq#1 · 3 vendors · multi-channel
  { bp: 'smrtp', seq: 1, enq_seq: 1, vendor: 'v-smrtp-1', vendor_name: 'PCB Source', channels: ['email', 'whatsapp'], primary: 'email', status: 'quoted', daysAgo: 11 },
  { bp: 'smrtp', seq: 2, enq_seq: 1, vendor: 'v-smrtp-2', vendor_name: 'CircuitWorks', channels: ['email', 'whatsapp'], primary: 'email', status: 'quoted', daysAgo: 11 },
  { bp: 'smrtp', seq: 3, enq_seq: 1, vendor: 'v-smrtp-3', vendor_name: 'EnclosureFab', channels: ['email', 'whatsapp'], primary: 'whatsapp', status: 'quoted', daysAgo: 11 },
  // SMRTP enq#2 · 3 vendors
  { bp: 'smrtp', seq: 4, enq_seq: 2, vendor: 'v-smrtp-4', vendor_name: 'BatteryHub', channels: ['email'], primary: 'email', status: 'quoted', daysAgo: 4 },
  { bp: 'smrtp', seq: 5, enq_seq: 2, vendor: 'v-smrtp-5', vendor_name: 'PowerCells Ltd', channels: ['email'], primary: 'email', status: 'sent', daysAgo: 4 },
  { bp: 'smrtp', seq: 6, enq_seq: 2, vendor: 'v-smrtp-6', vendor_name: 'LithiumPro', channels: ['email'], primary: 'email', status: 'declined', daysAgo: 4, decline_reason: 'MOQ not met' },
  // SHKPH enq#1 · 3 vendors
  { bp: 'shkph', seq: 1, enq_seq: 1, vendor: 'v-shkph-1', vendor_name: 'API Source India', channels: ['email'], primary: 'email', status: 'quoted', daysAgo: 7 },
  { bp: 'shkph', seq: 2, enq_seq: 1, vendor: 'v-shkph-2', vendor_name: 'BulkAPI Ltd', channels: ['email'], primary: 'email', status: 'quoted', daysAgo: 7 },
  { bp: 'shkph', seq: 3, enq_seq: 1, vendor: 'v-shkph-3', vendor_name: 'PharmaActives', channels: ['email'], primary: 'email', status: 'sent', daysAgo: 7 },
];

interface QuoSpec {
  bp: string; seq: number; rfq_seq: number; rate_factor: number; days_factor: number; awarded?: boolean;
}

// Each quoted RFQ produces a quotation. rate_factor multiplies enquiry-line estimated rate.
const QUO_SPECS: QuoSpec[] = [
  { bp: 'sinha', seq: 1, rfq_seq: 1, rate_factor: 0.96, days_factor: 1.0, awarded: true },
  { bp: 'sinha', seq: 2, rfq_seq: 2, rate_factor: 1.02, days_factor: 0.9 },
  { bp: 'sinha', seq: 3, rfq_seq: 6, rate_factor: 0.95, days_factor: 1.0 },
  { bp: 'sinha', seq: 4, rfq_seq: 7, rate_factor: 1.05, days_factor: 1.0 },
  { bp: 'sinha', seq: 5, rfq_seq: 6, rate_factor: 0.95, days_factor: 1.0, awarded: true }, // award proxy
  { bp: 'amith', seq: 1, rfq_seq: 1, rate_factor: 0.98, days_factor: 1.0, awarded: true },
  { bp: 'amith', seq: 2, rfq_seq: 2, rate_factor: 1.04, days_factor: 1.1 },
  { bp: 'amith', seq: 3, rfq_seq: 4, rate_factor: 1.0, days_factor: 1.0 },
  { bp: 'bcpl', seq: 1, rfq_seq: 1, rate_factor: 0.97, days_factor: 1.0, awarded: true },
  { bp: 'bcpl', seq: 2, rfq_seq: 2, rate_factor: 1.03, days_factor: 1.0, awarded: true },
  { bp: 'bcpl', seq: 3, rfq_seq: 3, rate_factor: 1.06, days_factor: 1.2 },
  { bp: 'bcpl', seq: 4, rfq_seq: 4, rate_factor: 0.99, days_factor: 1.0, awarded: true },
  { bp: 'abdos', seq: 1, rfq_seq: 1, rate_factor: 0.96, days_factor: 1.0, awarded: true },
  { bp: 'abdos', seq: 2, rfq_seq: 2, rate_factor: 1.05, days_factor: 1.1 },
  { bp: 'abdos', seq: 3, rfq_seq: 3, rate_factor: 0.98, days_factor: 1.0 },
  { bp: 'chrse', seq: 1, rfq_seq: 1, rate_factor: 1.0, days_factor: 1.0 },
  { bp: 'smrtp', seq: 1, rfq_seq: 1, rate_factor: 0.97, days_factor: 1.0, awarded: true },
  { bp: 'smrtp', seq: 2, rfq_seq: 2, rate_factor: 1.04, days_factor: 1.0 },
  { bp: 'smrtp', seq: 3, rfq_seq: 3, rate_factor: 1.01, days_factor: 1.0 },
  { bp: 'smrtp', seq: 4, rfq_seq: 4, rate_factor: 1.0, days_factor: 1.0, awarded: true },
  { bp: 'shkph', seq: 1, rfq_seq: 1, rate_factor: 0.96, days_factor: 1.0, awarded: true },
  { bp: 'shkph', seq: 2, rfq_seq: 2, rate_factor: 1.03, days_factor: 1.1 },
];

function buildEnquiry(s: EnqSpec): ProcurementEnquiry {
  const ts = ISO(s.daysAgo);
  const date = ts.slice(0, 10);
  const lines: ProcurementEnquiryLine[] = s.lines.map((l, idx) => ({
    id: `pel-${s.bp}-${s.seq}-${idx + 1}`,
    line_no: idx + 1,
    source_indent_id: s.source_indent_ids[0] ?? null,
    source_indent_line_id: null,
    item_id: l.item_id,
    item_name: l.item_name,
    uom: l.uom,
    required_qty: l.qty,
    current_stock_qty: 0,
    estimated_rate: l.rate,
    estimated_value: Math.round(l.qty * l.rate * 100) / 100,
    required_date: ISO(s.daysAgo - l.days).slice(0, 10),
    schedule_date: ISO(s.daysAgo - l.days).slice(0, 10),
    vendor_mode_override: null,
    override_reason: null,
    matched_vendor_ids: [],
    remarks: '',
    status: s.status,
  }));
  return {
    id: `pe-${s.bp}-${String(s.seq).padStart(3, '0')}`,
    enquiry_no: `PE/${date.replace(/-/g, '').slice(0, 6)}/${String(s.seq).padStart(4, '0')}`,
    enquiry_date: date,
    entity_id: '', // stamped in entity-setup
    branch_id: null,
    division_id: null,
    department_id: null,
    cost_center_id: null,
    source_indent_ids: s.source_indent_ids,
    is_standalone: s.is_standalone,
    standalone_approval_tier: s.is_standalone ? 2 : null,
    vendor_mode: s.vendor_mode,
    selected_vendor_ids: [],
    vendor_overrides: [],
    item_vendor_matrix: [],
    matrix_overrides: [],
    lines,
    requested_by_user_id: 'user-demo',
    hod_id: null,
    purchase_manager_id: null,
    director_id: null,
    approval_stage: null,
    rfq_ids: [],
    awarded_quotation_ids: s.awarded_quotation_ids ?? [],
    award_notes: s.notes ?? '',
    awarded_at: s.status === 'awarded' ? ts : null,
    awarded_by_user_id: s.status === 'awarded' ? 'user-demo' : null,
    notes: s.notes ?? '',
    status: s.status,
    created_at: ts,
    updated_at: ts,
  };
}

function buildRfq(spec: RfqSpec, enq: ProcurementEnquiry): RFQ {
  const ts = ISO(spec.daysAgo);
  const date = ts.slice(0, 10);
  const sentTs = spec.status === 'draft' ? null : ts;
  const respondedTs = ['quoted', 'declined'].includes(spec.status) ? ISO(spec.daysAgo - 1) : null;
  return {
    id: `rfq-${spec.bp}-${String(spec.seq).padStart(3, '0')}`,
    rfq_no: `RFQ/${date.replace(/-/g, '').slice(0, 6)}/${String(spec.seq).padStart(4, '0')}`,
    parent_enquiry_id: enq.id,
    entity_id: '',
    vendor_id: spec.vendor,
    vendor_name: spec.vendor_name,
    line_item_ids: enq.lines.map((l) => l.id),
    send_channels: spec.channels,
    primary_channel: spec.primary,
    token_url: null,
    token_expires_at: null,
    sent_at: sentTs,
    received_by_vendor_at: sentTs,
    opened_at: sentTs,
    responded_at: respondedTs,
    auto_fallback_enabled: true,
    timeout_days: 7,
    timeout_at: sentTs ? ISO(spec.daysAgo - 7) : null,
    fallback_to_vendor_id: null,
    fallback_triggered_at: null,
    fallback_reason: null,
    declined_at: spec.status === 'declined' ? respondedTs : null,
    decline_reason: spec.decline_reason ?? null,
    vendor_quotation_id: null,
    follow_ups: [],
    next_followup_due: null,
    followup_count_originating: 0,
    followup_count_purchase: 0,
    last_followup_at: null,
    is_overdue_followup: false,
    status: spec.status,
    created_at: ts,
    updated_at: ts,
  };
}

function buildQuotation(qs: QuoSpec, enq: ProcurementEnquiry, rfq: RFQ): VendorQuotation {
  const ts = rfq.responded_at ?? ISO(0);
  const lines: VendorQuotationLine[] = enq.lines.map((l, idx) => {
    const rate = Math.round((l.estimated_rate ?? 0) * qs.rate_factor * 100) / 100;
    const qty = l.required_qty;
    const tax = 18;
    const gross = qty * rate;
    const afterTax = Math.round(gross * (1 + tax / 100) * 100) / 100;
    return {
      id: `vql-${qs.bp}-${qs.seq}-${idx + 1}`,
      line_no: idx + 1,
      enquiry_line_id: l.id,
      item_id: l.item_id,
      qty_quoted: qty,
      rate,
      discount_percent: 0,
      tax_percent: tax,
      amount_after_tax: afterTax,
      delivery_days: Math.round(7 * qs.days_factor),
      remarks: '',
      is_supplied: true,
    };
  });
  const totalValue = lines.reduce((s, l) => s + l.qty_quoted * l.rate, 0);
  const totalAfterTax = lines.reduce((s, l) => s + l.amount_after_tax, 0);
  return {
    id: `vq-${qs.bp}-${String(qs.seq).padStart(3, '0')}`,
    quotation_no: `VQ/${ts.slice(0, 7).replace('-', '')}/${String(qs.seq).padStart(4, '0')}`,
    parent_rfq_id: rfq.id,
    parent_enquiry_id: enq.id,
    entity_id: '',
    vendor_id: rfq.vendor_id,
    vendor_name: rfq.vendor_name,
    lines,
    total_value: Math.round(totalValue * 100) / 100,
    total_tax: Math.round((totalAfterTax - totalValue) * 100) / 100,
    total_after_tax: Math.round(totalAfterTax * 100) / 100,
    payment_terms: 'Net 30',
    payment_terms_days: 30,
    delivery_terms: 'FOB plant',
    validity_days: 30,
    validity_until: ISO(-30).slice(0, 10),
    vendor_gstin: null,
    vendor_msme_status: 'small',
    tds_section: null,
    rcm_applicable: false,
    source: 'manual_entry',
    submitted_at: ts,
    submitted_by: 'user-demo',
    is_awarded: qs.awarded ?? false,
    award_at: qs.awarded ? ts : null,
    award_remarks: qs.awarded ? 'Best price + scoring' : null,
    status: qs.awarded ? 'awarded' : 'submitted',
    created_at: ts,
    updated_at: ts,
  };
}

const ENQUIRIES = SPECS.map(buildEnquiry);
const ENQ_BY_KEY = new Map(SPECS.map((s, i) => [`${s.bp}-${s.seq}`, ENQUIRIES[i]]));

const RFQS = RFQ_SPECS.map((spec) => {
  const enq = ENQ_BY_KEY.get(`${spec.bp}-${spec.enq_seq}`);
  if (!enq) throw new Error(`demo-procurement-data · enquiry not found for rfq ${spec.bp}-${spec.seq}`);
  return buildRfq(spec, enq);
});

// stamp rfq_ids back into enquiries
for (const rfq of RFQS) {
  const enq = ENQUIRIES.find((e) => e.id === rfq.parent_enquiry_id);
  if (enq) enq.rfq_ids.push(rfq.id);
}

const RFQ_BY_KEY = new Map(RFQ_SPECS.map((s, i) => [`${s.bp}-${s.seq}`, RFQS[i]]));

const QUOTATIONS = QUO_SPECS.map((qs) => {
  const rfq = RFQ_BY_KEY.get(`${qs.bp}-${qs.rfq_seq}`);
  if (!rfq) throw new Error(`demo-procurement-data · rfq not found for quotation ${qs.bp}-${qs.seq}`);
  const enq = ENQUIRIES.find((e) => e.id === rfq.parent_enquiry_id);
  if (!enq) throw new Error(`demo-procurement-data · enquiry not found for quotation ${qs.bp}-${qs.seq}`);
  return buildQuotation(qs, enq, rfq);
});

export const DEMO_PROCUREMENT_ENQUIRIES: ProcurementEnquiry[] = ENQUIRIES;
export const DEMO_RFQS: RFQ[] = RFQS;
export const DEMO_QUOTATIONS: VendorQuotation[] = QUOTATIONS;

// ─── Sprint T-Phase-1.2.6f-b-1 · Block F · Vendor Portal demo seeds ─────────
// 21 vendor portal sessions across 7 blueprints (3 per blueprint).
// D-275: blueprint-shortcode password for "active" vendors · 'Welcome@123' for first-quote/never.
// vendor_id values match DEMO_RFQS so scoping works at portal load.
export interface DemoVendorPortalSession {
  blueprint: string;
  entity_short_code: string;
  vendor_id: string;
  party_code: string;
  party_name: string;
  password: string;             // demo only · D-275
  has_logged_in: boolean;
  last_activity: 'active' | 'pending_first_quote' | 'never';
}

export const DEMO_VENDOR_PORTAL_SESSIONS: DemoVendorPortalSession[] = [
  // SINHA
  { blueprint: 'sinha', entity_short_code: 'SINHA', vendor_id: 'v-sinha-1', party_code: 'V-SINHA-001', party_name: 'Steelcraft Industries', password: 'Sinha@123', has_logged_in: true, last_activity: 'active' },
  { blueprint: 'sinha', entity_short_code: 'SINHA', vendor_id: 'v-sinha-2', party_code: 'V-SINHA-002', party_name: 'MetalSource Pvt Ltd', password: 'Welcome@123', has_logged_in: false, last_activity: 'pending_first_quote' },
  { blueprint: 'sinha', entity_short_code: 'SINHA', vendor_id: 'v-sinha-3', party_code: 'V-SINHA-003', party_name: 'Coilworks LLP', password: 'Welcome@123', has_logged_in: false, last_activity: 'never' },
  // AMITH
  { blueprint: 'amith', entity_short_code: 'AMITH', vendor_id: 'v-amith-1', party_code: 'V-AMITH-001', party_name: 'Cotton Mills Co', password: 'Amith@123', has_logged_in: true, last_activity: 'active' },
  { blueprint: 'amith', entity_short_code: 'AMITH', vendor_id: 'v-amith-2', party_code: 'V-AMITH-002', party_name: 'Raw Cotton Traders', password: 'Welcome@123', has_logged_in: false, last_activity: 'pending_first_quote' },
  { blueprint: 'amith', entity_short_code: 'AMITH', vendor_id: 'v-amith-3', party_code: 'V-AMITH-003', party_name: 'JuteWorks', password: 'Welcome@123', has_logged_in: false, last_activity: 'never' },
  // BCPL
  { blueprint: 'bcpl', entity_short_code: 'BCPL', vendor_id: 'v-bcpl-1', party_code: 'V-BCPL-001', party_name: 'MedSupply India', password: 'Bcpl@123', has_logged_in: true, last_activity: 'active' },
  { blueprint: 'bcpl', entity_short_code: 'BCPL', vendor_id: 'v-bcpl-2', party_code: 'V-BCPL-002', party_name: 'Hospital Stores Ltd', password: 'Welcome@123', has_logged_in: false, last_activity: 'pending_first_quote' },
  { blueprint: 'bcpl', entity_short_code: 'BCPL', vendor_id: 'v-bcpl-3', party_code: 'V-BCPL-003', party_name: 'PharmaPacks', password: 'Welcome@123', has_logged_in: false, last_activity: 'never' },
  // ABDOS
  { blueprint: 'abdos', entity_short_code: 'ABDOS', vendor_id: 'v-abdos-1', party_code: 'V-ABDOS-001', party_name: 'PolymerSource', password: 'Abdos@123', has_logged_in: true, last_activity: 'active' },
  { blueprint: 'abdos', entity_short_code: 'ABDOS', vendor_id: 'v-abdos-2', party_code: 'V-ABDOS-002', party_name: 'Resin India', password: 'Welcome@123', has_logged_in: false, last_activity: 'pending_first_quote' },
  { blueprint: 'abdos', entity_short_code: 'ABDOS', vendor_id: 'v-abdos-3', party_code: 'V-ABDOS-003', party_name: 'MoldCraft Pvt', password: 'Welcome@123', has_logged_in: false, last_activity: 'never' },
  // CHRSE
  { blueprint: 'chrse', entity_short_code: 'CHRSE', vendor_id: 'v-chrse-1', party_code: 'V-CHRSE-001', party_name: 'Educational Books', password: 'Chrse@123', has_logged_in: true, last_activity: 'active' },
  { blueprint: 'chrse', entity_short_code: 'CHRSE', vendor_id: 'v-chrse-2', party_code: 'V-CHRSE-002', party_name: 'Text Publishers', password: 'Welcome@123', has_logged_in: false, last_activity: 'pending_first_quote' },
  { blueprint: 'chrse', entity_short_code: 'CHRSE', vendor_id: 'v-chrse-3', party_code: 'V-CHRSE-003', party_name: 'School Suppliers Co', password: 'Welcome@123', has_logged_in: false, last_activity: 'never' },
  // SMRTP
  { blueprint: 'smrtp', entity_short_code: 'SMRTP', vendor_id: 'v-smrtp-1', party_code: 'V-SMRTP-001', party_name: 'PCB Source', password: 'Smrtp@123', has_logged_in: true, last_activity: 'active' },
  { blueprint: 'smrtp', entity_short_code: 'SMRTP', vendor_id: 'v-smrtp-2', party_code: 'V-SMRTP-002', party_name: 'CircuitWorks', password: 'Welcome@123', has_logged_in: false, last_activity: 'pending_first_quote' },
  { blueprint: 'smrtp', entity_short_code: 'SMRTP', vendor_id: 'v-smrtp-3', party_code: 'V-SMRTP-003', party_name: 'EnclosureFab', password: 'Welcome@123', has_logged_in: false, last_activity: 'never' },
  // SHKPH
  { blueprint: 'shkph', entity_short_code: 'SHKPH', vendor_id: 'v-shkph-1', party_code: 'V-SHKPH-001', party_name: 'API Source India', password: 'Shkph@123', has_logged_in: true, last_activity: 'active' },
  { blueprint: 'shkph', entity_short_code: 'SHKPH', vendor_id: 'v-shkph-2', party_code: 'V-SHKPH-002', party_name: 'BulkAPI Ltd', password: 'Welcome@123', has_logged_in: false, last_activity: 'pending_first_quote' },
  { blueprint: 'shkph', entity_short_code: 'SHKPH', vendor_id: 'v-shkph-3', party_code: 'V-SHKPH-003', party_name: 'PharmaActives', password: 'Welcome@123', has_logged_in: false, last_activity: 'never' },
];

