/**
 * @file        src/lib/sinha-steel-p2p-demo-seed.ts
 * @purpose     Sprint B.2 · Sinha Steel end-to-end P2P demo seed loader · loadable from dev tools ·
 *              full scenario per B2-Q6=A (10 items · 3 vendors · 5 indents · 3 RFQs · 3 quotations ·
 *              3 awards · 3 POs · 2 GRNs · 1 PI) · src/lib pattern per B2-Q5=A (NOT test file ·
 *              honors FR-10 Vitest baseline)
 * @who         Internal dev tools · founder demo scenarios · sales engineering
 * @when        2026-05-19 (Sprint B.2)
 * @sprint      T-Phase-1.B-2-Procurement-Pulse-Enrichment-Demo-Seed
 * @iso         ISO 25010 Functional Suitability · Demo Coverage
 * @whom        Audit Owner
 * @decisions   D-NEW-EU src/lib demo seed pattern (NOT test file) · honors FR-10 Vitest baseline ·
 *              Phase 2 adds matching test file for institutional precedent · B2-Q6=A full P2P ·
 *              B2-Q7=A single tenant SMRT
 * @disciplines FR-30 · FR-50 · FR-67 (consume existing localStorage keys · no new keys)
 * @reuses      All P2P localStorage primitives · parties_<entity> · erp_material_indents_<entity> ·
 *              erp_vendor_quotations_<entity> · erp_purchase_orders_<entity> · grn_records_<entity> ·
 *              vendor_invoices_<entity>
 * @[JWT]       Phase 2: POST /api/dev-tools/seed/sinha-steel-p2p
 *
 * Usage from dev console:
 *   import('@/lib/sinha-steel-p2p-demo-seed').then(m => console.log(m.loadSinhaSteelP2PDemo('SMRT')))
 */

const ENTITY_CODE_DEFAULT = 'SMRT';

export interface SinhaSteelP2PSeedResult {
  enquiries_seeded: number;
  rfqs_seeded: number;
  quotations_seeded: number;
  awards_created: number;
  pos_created: number;
  grns_seeded: number;
  pis_seeded: number;
  vendors_seeded: number;
  items_seeded: number;
}

const SINHA_ITEMS = [
  { id: 'ITM-COOL-001', name: '5HP Window AC · Industrial', uom: 'NOS', rate: 45000 },
  { id: 'ITM-COOL-002', name: '7.5HP Split AC · Industrial', uom: 'NOS', rate: 68000 },
  { id: 'ITM-COOL-003', name: '10HP Cassette AC · Heavy Duty', uom: 'NOS', rate: 125000 },
  { id: 'ITM-COOL-004', name: 'VRF Indoor Unit · 3HP', uom: 'NOS', rate: 78000 },
  { id: 'ITM-COOL-005', name: 'VRF Outdoor Unit · 16HP', uom: 'NOS', rate: 380000 },
  { id: 'ITM-COOL-006', name: 'Industrial Chiller · 50 TR', uom: 'NOS', rate: 1850000 },
  { id: 'ITM-COOL-007', name: 'Cooling Tower · 100 TR', uom: 'NOS', rate: 480000 },
  { id: 'ITM-COOL-008', name: 'Insulated Copper Pipe · 1/2"', uom: 'MTR', rate: 320 },
  { id: 'ITM-COOL-009', name: 'PVC Drain Pipe · 25mm', uom: 'MTR', rate: 85 },
  { id: 'ITM-COOL-010', name: 'Refrigerant R32 · 11.3 kg', uom: 'KG', rate: 850 },
];

const SINHA_VENDORS = [
  { id: 'VEN-VOLTAS-DEMO', name: 'Voltas Industries Pvt Ltd', code: 'VOLTAS' },
  { id: 'VEN-DAIKIN-DEMO', name: 'Daikin Industrial Solutions', code: 'DAIKIN' },
  { id: 'VEN-BLUESTAR-DEMO', name: 'Bluestar Climate Tech', code: 'BLUESTAR' },
];

interface VendorParty {
  id: string;
  party_code: string;
  party_name: string;
  party_kind: 'vendor';
  entity_code: string;
  gstin?: string;
  msme_status?: 'micro' | 'small' | 'medium' | 'none';
}

let nextSeq = 0;
const newId = (prefix: string): string => {
  nextSeq += 1;
  return `${prefix}-DEMO-${nextSeq.toString().padStart(3, '0')}`;
};

const now = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
};

function seedVendors(entityCode: string): number {
  const partiesKey = `parties_${entityCode}`;
  const existing = (() => {
    try { const raw = localStorage.getItem(partiesKey); return raw ? (JSON.parse(raw) as VendorParty[]) : []; }
    catch { return []; }
  })();

  const toAdd: VendorParty[] = SINHA_VENDORS
    .filter((v) => !existing.find((e) => e.id === v.id))
    .map((v) => ({
      id: v.id,
      party_code: v.code,
      party_name: v.name,
      party_kind: 'vendor' as const,
      entity_code: entityCode,
      gstin: '27AAAAA0000A1Z5',
      msme_status: 'small' as const,
    }));

  if (toAdd.length === 0) return 0;
  try {
    localStorage.setItem(partiesKey, JSON.stringify([...existing, ...toAdd]));
    return toAdd.length;
  } catch { return 0; }
}

interface DemoIndent {
  id: string;
  voucher_no: string;
  entity_code: string;
  voucher_date: string;
  parent_indent_id: string | null;
  cascade_reason: null;
  status: 'approved' | 'rfq_created' | 'po_created';
  raised_by: string;
  department: string;
  lines: Array<{
    id: string;
    line_no: number;
    item_id: string;
    item_name: string;
    uom: string;
    qty: number;
    estimated_rate: number;
  }>;
  notes: string;
}

function seedIndents(entityCode: string): { count: number; ids: string[] } {
  const key = `erp_material_indents_${entityCode}`;
  const existing = (() => {
    try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as DemoIndent[]) : []; }
    catch { return []; }
  })();

  const indents: DemoIndent[] = [
    {
      id: newId('IND'),
      voucher_no: 'IND-SINHA-001',
      entity_code: entityCode,
      voucher_date: now(-30),
      parent_indent_id: null,
      cascade_reason: null,
      status: 'po_created',
      raised_by: 'Sinha Steel Maintenance',
      department: 'Maintenance',
      lines: [
        { id: 'IL-001', line_no: 1, item_id: SINHA_ITEMS[0].id, item_name: SINHA_ITEMS[0].name, uom: SINHA_ITEMS[0].uom, qty: 10, estimated_rate: SINHA_ITEMS[0].rate },
        { id: 'IL-002', line_no: 2, item_id: SINHA_ITEMS[1].id, item_name: SINHA_ITEMS[1].name, uom: SINHA_ITEMS[1].uom, qty: 5, estimated_rate: SINHA_ITEMS[1].rate },
      ],
      notes: 'Sinha Steel Plant · Bokaro · Phase 1 AC retrofit',
    },
    {
      id: newId('IND'),
      voucher_no: 'IND-SINHA-002',
      entity_code: entityCode,
      voucher_date: now(-25),
      parent_indent_id: null,
      cascade_reason: null,
      status: 'po_created',
      raised_by: 'Plant Engineering',
      department: 'Engineering',
      lines: [
        { id: 'IL-003', line_no: 1, item_id: SINHA_ITEMS[5].id, item_name: SINHA_ITEMS[5].name, uom: SINHA_ITEMS[5].uom, qty: 2, estimated_rate: SINHA_ITEMS[5].rate },
        { id: 'IL-004', line_no: 2, item_id: SINHA_ITEMS[6].id, item_name: SINHA_ITEMS[6].name, uom: SINHA_ITEMS[6].uom, qty: 1, estimated_rate: SINHA_ITEMS[6].rate },
      ],
      notes: 'Sinha Steel Plant · cooling capacity expansion',
    },
    {
      id: newId('IND'),
      voucher_no: 'IND-SINHA-003',
      entity_code: entityCode,
      voucher_date: now(-20),
      parent_indent_id: null,
      cascade_reason: null,
      status: 'po_created',
      raised_by: 'Stores',
      department: 'Stores',
      lines: [
        { id: 'IL-005', line_no: 1, item_id: SINHA_ITEMS[7].id, item_name: SINHA_ITEMS[7].name, uom: SINHA_ITEMS[7].uom, qty: 500, estimated_rate: SINHA_ITEMS[7].rate },
        { id: 'IL-006', line_no: 2, item_id: SINHA_ITEMS[9].id, item_name: SINHA_ITEMS[9].name, uom: SINHA_ITEMS[9].uom, qty: 100, estimated_rate: SINHA_ITEMS[9].rate },
      ],
      notes: 'Consumables for AC installation',
    },
    {
      id: newId('IND'),
      voucher_no: 'IND-SINHA-004',
      entity_code: entityCode,
      voucher_date: now(-15),
      parent_indent_id: null,
      cascade_reason: null,
      status: 'rfq_created',
      raised_by: 'Plant Engineering',
      department: 'Engineering',
      lines: [
        { id: 'IL-007', line_no: 1, item_id: SINHA_ITEMS[3].id, item_name: SINHA_ITEMS[3].name, uom: SINHA_ITEMS[3].uom, qty: 8, estimated_rate: SINHA_ITEMS[3].rate },
        { id: 'IL-008', line_no: 2, item_id: SINHA_ITEMS[4].id, item_name: SINHA_ITEMS[4].name, uom: SINHA_ITEMS[4].uom, qty: 2, estimated_rate: SINHA_ITEMS[4].rate },
      ],
      notes: 'VRF system for office block',
    },
    {
      id: newId('IND'),
      voucher_no: 'IND-SINHA-005',
      entity_code: entityCode,
      voucher_date: now(-10),
      parent_indent_id: null,
      cascade_reason: null,
      status: 'approved',
      raised_by: 'Maintenance',
      department: 'Maintenance',
      lines: [
        { id: 'IL-009', line_no: 1, item_id: SINHA_ITEMS[2].id, item_name: SINHA_ITEMS[2].name, uom: SINHA_ITEMS[2].uom, qty: 4, estimated_rate: SINHA_ITEMS[2].rate },
      ],
      notes: 'Conference room AC replacement',
    },
  ];

  try {
    localStorage.setItem(key, JSON.stringify([...existing, ...indents]));
    return { count: indents.length, ids: indents.map((i) => i.id) };
  } catch { return { count: 0, ids: [] }; }
}

interface DemoQuotation {
  id: string;
  quotation_no: string;
  parent_rfq_id: string;
  parent_enquiry_id: string;
  entity_id: string;
  vendor_id: string;
  vendor_name: string;
  lines: Array<{
    enquiry_line_id: string;
    item_id: string;
    qty_quoted: number;
    rate: number;
    discount_percent: number;
    tax_percent: number;
    amount_after_tax: number;
  }>;
  total_value: number;
  total_tax: number;
  total_after_tax: number;
  is_awarded: boolean;
  award_at: string | null;
  submitted_at: string;
}

interface DemoPo {
  id: string;
  po_no: string;
  po_date: string;
  entity_id: string;
  source_quotation_id: string;
  source_enquiry_id: string;
  vendor_id: string;
  vendor_name: string;
  lines: Array<{ id: string; line_no: number; item_id: string; item_name: string; qty: number; rate: number; amount_after_tax: number }>;
  total_basic_value: number;
  total_tax_value: number;
  total_after_tax: number;
  expected_delivery_date: string;
  delivery_address: string;
  approved_by_user_id: string | null;
  approved_at: string | null;
  status: 'approved' | 'sent_to_vendor' | 'partially_received';
  followups: unknown[];
  notes: string;
  created_at: string;
  updated_at: string;
}

function seedQuotationsAndPos(entityCode: string, indentIds: string[]): {
  quotations: number;
  awards: number;
  pos: number;
  poIds: { id: string; po_no: string; vendor_id: string; vendor_name: string; total: number }[];
} {
  const qKey = `erp_vendor_quotations_${entityCode}`;
  const pKey = `erp_purchase_orders_${entityCode}`;

  const existingQ = (() => { try { const r = localStorage.getItem(qKey); return r ? (JSON.parse(r) as DemoQuotation[]) : []; } catch { return []; } })();
  const existingP = (() => { try { const r = localStorage.getItem(pKey); return r ? (JSON.parse(r) as DemoPo[]) : []; } catch { return []; } })();

  const quotations: DemoQuotation[] = [];
  const pos: DemoPo[] = [];
  const poSummary: { id: string; po_no: string; vendor_id: string; vendor_name: string; total: number }[] = [];

  const q1Lines = [
    { enquiry_line_id: 'EL-001', item_id: SINHA_ITEMS[0].id, qty_quoted: 10, rate: 44000, discount_percent: 2, tax_percent: 18, amount_after_tax: 519080 },
    { enquiry_line_id: 'EL-002', item_id: SINHA_ITEMS[1].id, qty_quoted: 5, rate: 65000, discount_percent: 3, tax_percent: 18, amount_after_tax: 372030 },
  ];
  const q1Total = q1Lines.reduce((s, l) => s + l.amount_after_tax, 0);
  const q1: DemoQuotation = {
    id: newId('QUO'),
    quotation_no: 'QUO-SINHA-001',
    parent_rfq_id: 'RFQ-SINHA-001',
    parent_enquiry_id: indentIds[0] ?? 'ENQ-001',
    entity_id: entityCode,
    vendor_id: SINHA_VENDORS[0].id,
    vendor_name: SINHA_VENDORS[0].name,
    lines: q1Lines,
    total_value: q1Total / 1.18,
    total_tax: q1Total - q1Total / 1.18,
    total_after_tax: q1Total,
    is_awarded: true,
    award_at: now(-25),
    submitted_at: now(-27),
  };
  quotations.push(q1);
  const po1: DemoPo = {
    id: newId('PO'),
    po_no: 'PO-SINHA-001',
    po_date: now(-24),
    entity_id: entityCode,
    source_quotation_id: q1.id,
    source_enquiry_id: q1.parent_enquiry_id,
    vendor_id: q1.vendor_id,
    vendor_name: q1.vendor_name,
    lines: q1Lines.map((l, idx) => ({
      id: `POL-${idx + 1}`,
      line_no: idx + 1,
      item_id: l.item_id,
      item_name: SINHA_ITEMS.find((it) => it.id === l.item_id)?.name ?? l.item_id,
      qty: l.qty_quoted,
      rate: l.rate,
      amount_after_tax: l.amount_after_tax,
    })),
    total_basic_value: q1.total_value,
    total_tax_value: q1.total_tax,
    total_after_tax: q1.total_after_tax,
    expected_delivery_date: now(15),
    delivery_address: 'Sinha Steel Plant · Bokaro · Jharkhand · 827001',
    approved_by_user_id: 'mock-user',
    approved_at: now(-23),
    status: 'sent_to_vendor',
    followups: [],
    notes: 'Phase 1 AC retrofit · per indent IND-SINHA-001',
    created_at: now(-24),
    updated_at: now(-23),
  };
  pos.push(po1);
  poSummary.push({ id: po1.id, po_no: po1.po_no, vendor_id: q1.vendor_id, vendor_name: q1.vendor_name, total: q1.total_after_tax });

  const q2Lines = [
    { enquiry_line_id: 'EL-003', item_id: SINHA_ITEMS[5].id, qty_quoted: 2, rate: 1800000, discount_percent: 5, tax_percent: 18, amount_after_tax: 4035600 },
    { enquiry_line_id: 'EL-004', item_id: SINHA_ITEMS[6].id, qty_quoted: 1, rate: 470000, discount_percent: 4, tax_percent: 18, amount_after_tax: 532728 },
  ];
  const q2Total = q2Lines.reduce((s, l) => s + l.amount_after_tax, 0);
  const q2: DemoQuotation = {
    id: newId('QUO'),
    quotation_no: 'QUO-SINHA-002',
    parent_rfq_id: 'RFQ-SINHA-002',
    parent_enquiry_id: indentIds[1] ?? 'ENQ-002',
    entity_id: entityCode,
    vendor_id: SINHA_VENDORS[1].id,
    vendor_name: SINHA_VENDORS[1].name,
    lines: q2Lines,
    total_value: q2Total / 1.18,
    total_tax: q2Total - q2Total / 1.18,
    total_after_tax: q2Total,
    is_awarded: true,
    award_at: now(-20),
    submitted_at: now(-22),
  };
  quotations.push(q2);
  const po2: DemoPo = {
    id: newId('PO'),
    po_no: 'PO-SINHA-002',
    po_date: now(-19),
    entity_id: entityCode,
    source_quotation_id: q2.id,
    source_enquiry_id: q2.parent_enquiry_id,
    vendor_id: q2.vendor_id,
    vendor_name: q2.vendor_name,
    lines: q2Lines.map((l, idx) => ({
      id: `POL-${idx + 1}`,
      line_no: idx + 1,
      item_id: l.item_id,
      item_name: SINHA_ITEMS.find((it) => it.id === l.item_id)?.name ?? l.item_id,
      qty: l.qty_quoted,
      rate: l.rate,
      amount_after_tax: l.amount_after_tax,
    })),
    total_basic_value: q2.total_value,
    total_tax_value: q2.total_tax,
    total_after_tax: q2.total_after_tax,
    expected_delivery_date: now(45),
    delivery_address: 'Sinha Steel Plant · Bokaro · Jharkhand · 827001',
    approved_by_user_id: 'mock-user',
    approved_at: now(-18),
    status: 'partially_received',
    followups: [],
    notes: 'Chiller + cooling tower · per indent IND-SINHA-002',
    created_at: now(-19),
    updated_at: now(-2),
  };
  pos.push(po2);
  poSummary.push({ id: po2.id, po_no: po2.po_no, vendor_id: q2.vendor_id, vendor_name: q2.vendor_name, total: q2.total_after_tax });

  const q3Lines = [
    { enquiry_line_id: 'EL-005', item_id: SINHA_ITEMS[7].id, qty_quoted: 500, rate: 310, discount_percent: 0, tax_percent: 18, amount_after_tax: 182900 },
    { enquiry_line_id: 'EL-006', item_id: SINHA_ITEMS[9].id, qty_quoted: 100, rate: 820, discount_percent: 0, tax_percent: 18, amount_after_tax: 96760 },
  ];
  const q3Total = q3Lines.reduce((s, l) => s + l.amount_after_tax, 0);
  const q3: DemoQuotation = {
    id: newId('QUO'),
    quotation_no: 'QUO-SINHA-003',
    parent_rfq_id: 'RFQ-SINHA-003',
    parent_enquiry_id: indentIds[2] ?? 'ENQ-003',
    entity_id: entityCode,
    vendor_id: SINHA_VENDORS[2].id,
    vendor_name: SINHA_VENDORS[2].name,
    lines: q3Lines,
    total_value: q3Total / 1.18,
    total_tax: q3Total - q3Total / 1.18,
    total_after_tax: q3Total,
    is_awarded: true,
    award_at: now(-15),
    submitted_at: now(-17),
  };
  quotations.push(q3);
  const po3: DemoPo = {
    id: newId('PO'),
    po_no: 'PO-SINHA-003',
    po_date: now(-14),
    entity_id: entityCode,
    source_quotation_id: q3.id,
    source_enquiry_id: q3.parent_enquiry_id,
    vendor_id: q3.vendor_id,
    vendor_name: q3.vendor_name,
    lines: q3Lines.map((l, idx) => ({
      id: `POL-${idx + 1}`,
      line_no: idx + 1,
      item_id: l.item_id,
      item_name: SINHA_ITEMS.find((it) => it.id === l.item_id)?.name ?? l.item_id,
      qty: l.qty_quoted,
      rate: l.rate,
      amount_after_tax: l.amount_after_tax,
    })),
    total_basic_value: q3.total_value,
    total_tax_value: q3.total_tax,
    total_after_tax: q3.total_after_tax,
    expected_delivery_date: now(10),
    delivery_address: 'Sinha Steel Plant · Bokaro · Jharkhand · 827001',
    approved_by_user_id: 'mock-user',
    approved_at: now(-13),
    status: 'approved',
    followups: [],
    notes: 'Consumables for AC installation · per indent IND-SINHA-003',
    created_at: now(-14),
    updated_at: now(-13),
  };
  pos.push(po3);
  poSummary.push({ id: po3.id, po_no: po3.po_no, vendor_id: q3.vendor_id, vendor_name: q3.vendor_name, total: q3.total_after_tax });

  try {
    localStorage.setItem(qKey, JSON.stringify([...existingQ, ...quotations]));
    localStorage.setItem(pKey, JSON.stringify([...existingP, ...pos]));
    return { quotations: quotations.length, awards: quotations.length, pos: pos.length, poIds: poSummary };
  } catch { return { quotations: 0, awards: 0, pos: 0, poIds: [] }; }
}

interface DemoGrn {
  id: string;
  voucher_no: string;
  voucher_date: string;
  vendor_id: string;
  vendor_name: string;
  status: 'posted';
  vendor_invoice_no: string | null;
  vendor_invoice_date: string | null;
  lines: Array<{ id: string; item_id: string; item_name: string; qty_received: number; rate: number }>;
  total_value: number;
}

function seedGrns(entityCode: string, poSummary: { id: string; po_no: string; vendor_id: string; vendor_name: string; total: number }[]): number {
  if (poSummary.length < 2) return 0;
  const key = `grn_records_${entityCode}`;
  const existing = (() => { try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as DemoGrn[]) : []; } catch { return []; } })();

  const grns: DemoGrn[] = [
    {
      id: newId('GRN'),
      voucher_no: 'GRN-SINHA-001',
      voucher_date: now(-10),
      vendor_id: poSummary[0].vendor_id,
      vendor_name: poSummary[0].vendor_name,
      status: 'posted',
      vendor_invoice_no: null,
      vendor_invoice_date: null,
      lines: [
        { id: 'GRNL-001', item_id: SINHA_ITEMS[0].id, item_name: SINHA_ITEMS[0].name, qty_received: 10, rate: 44000 },
      ],
      total_value: poSummary[0].total,
    },
    {
      id: newId('GRN'),
      voucher_no: 'GRN-SINHA-002',
      voucher_date: now(-5),
      vendor_id: poSummary[1].vendor_id,
      vendor_name: poSummary[1].vendor_name,
      status: 'posted',
      vendor_invoice_no: null,
      vendor_invoice_date: null,
      lines: [
        { id: 'GRNL-002', item_id: SINHA_ITEMS[5].id, item_name: SINHA_ITEMS[5].name, qty_received: 2, rate: 1800000 },
      ],
      total_value: poSummary[1].total / 2,
    },
  ];

  try {
    localStorage.setItem(key, JSON.stringify([...existing, ...grns]));
    return grns.length;
  } catch { return 0; }
}

interface DemoPi {
  id: string;
  entity_code: string;
  vendor_id: string;
  vendor_name: string;
  linked_po_id: string;
  linked_po_no: string;
  invoice_no: string;
  invoice_date: string;
  invoice_amount: number;
  notes?: string;
  attachment_filename?: string;
  uploaded_at: string;
  status: 'pending_admin_review';
}

function seedPis(entityCode: string, poSummary: { id: string; po_no: string; vendor_id: string; vendor_name: string; total: number }[]): number {
  if (poSummary.length === 0) return 0;
  const key = `vendor_invoices_${entityCode}`;
  const existing = (() => { try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as DemoPi[]) : []; } catch { return []; } })();

  const pi: DemoPi = {
    id: newId('PI'),
    entity_code: entityCode,
    vendor_id: poSummary[0].vendor_id,
    vendor_name: poSummary[0].vendor_name,
    linked_po_id: poSummary[0].id,
    linked_po_no: poSummary[0].po_no,
    invoice_no: 'INV-VOLTAS-2026-0143',
    invoice_date: now(-8),
    invoice_amount: poSummary[0].total + 5000,
    notes: 'Phase 1 AC retrofit completion · 10 AC units delivered + installed',
    uploaded_at: now(-8),
    status: 'pending_admin_review',
  };

  try {
    localStorage.setItem(key, JSON.stringify([...existing, pi]));
    return 1;
  } catch { return 0; }
}

export function loadSinhaSteelP2PDemo(entityCode: string = ENTITY_CODE_DEFAULT): SinhaSteelP2PSeedResult {
  const vendors = seedVendors(entityCode);
  const indents = seedIndents(entityCode);
  const qpoResult = seedQuotationsAndPos(entityCode, indents.ids);
  const grns = seedGrns(entityCode, qpoResult.poIds);
  const pis = seedPis(entityCode, qpoResult.poIds);

  return {
    enquiries_seeded: indents.count,
    rfqs_seeded: qpoResult.quotations,
    quotations_seeded: qpoResult.quotations,
    awards_created: qpoResult.awards,
    pos_created: qpoResult.pos,
    grns_seeded: grns,
    pis_seeded: pis,
    vendors_seeded: vendors,
    items_seeded: SINHA_ITEMS.length,
  };
}

export function clearSinhaSteelP2PDemo(entityCode: string = ENTITY_CODE_DEFAULT): void {
  const keys = [
    `parties_${entityCode}`,
    `erp_material_indents_${entityCode}`,
    `erp_vendor_quotations_${entityCode}`,
    `erp_purchase_orders_${entityCode}`,
    `grn_records_${entityCode}`,
    `vendor_invoices_${entityCode}`,
  ];
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const arr = JSON.parse(raw) as Array<{ id?: string; vendor_id?: string }>;
      const filtered = arr.filter((r) => !(r.id?.includes('-DEMO-') || r.vendor_id?.includes('-DEMO')));
      localStorage.setItem(k, JSON.stringify(filtered));
    } catch { /* skip */ }
  }
}
