/**
 * demo-salesx-data.ts — SalesX masters and pipeline data
 * Uses production types from @/types so the seeded rows render correctly
 * on every detail screen.
 * The non-typed `_archetype` tag stays on each row — the seed orchestrator
 * filters by it before writing to localStorage. We use intersection types
 * `Type & { _archetype: DemoArchetype }` so TS keeps both shapes happy.
 * [JWT] Read by orchestrator → POST /api/salesx/*
 */
import type { DemoArchetype } from '@/data/demo-customers-vendors';
import type { SAMPerson, SAMPersonType } from '@/types/sam-person';
import type { Enquiry, EnquiryStatus, EnquiryPriority } from '@/types/enquiry';
import type { Quotation, QuotationStage } from '@/types/quotation';
import type { CommissionEntry } from '@/types/commission-register';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

type Tagged<T> = T & { _archetype: DemoArchetype };

const NOW_ISO = new Date().toISOString();

// ─── SAM Hierarchy ──────────────────────────────────────────────────────
export const DEMO_SAM_HIERARCHY = [
  { id: 'sh-1', level: 1, code: 'SALESMAN',   label: 'Salesman',   commission_pct: 2.0 },
  { id: 'sh-2', level: 2, code: 'AGENT',      label: 'Agent',      commission_pct: 1.5 },
  { id: 'sh-3', level: 3, code: 'BROKER',     label: 'Broker',     commission_pct: 1.0 },
  { id: 'sh-4', level: 4, code: 'TELECALLER', label: 'Telecaller', commission_pct: 0.5 },
];

// ─── SAM Persons ────────────────────────────────────────────────────────
// SAMPersonType in production = salesman | agent | broker | receiver | reference
// "telecaller" is a domain concept not in the enum → we map it to 'reference'.
export type DemoSamPerson = Tagged<SAMPerson>;

interface SeedRow {
  arche: DemoArchetype;
  id: string;
  person_type: SAMPersonType;
  person_code: string;
  display_name: string;
  parent_group_code: string;
  phone: string;
  email: string;
  rate_pct: number;
}

const SEED_ROWS: SeedRow[] = [
  // Trading
  { arche: 'trading', id: 'sm-t1', person_type: 'salesman', person_code: 'SM-T01', display_name: 'Amit Kumar',     parent_group_code: 'SLSM', phone: '+919811000001', email: 'amit@op.in',   rate_pct: 2.0 },
  { arche: 'trading', id: 'sm-t2', person_type: 'salesman', person_code: 'SM-T02', display_name: 'Priya Sharma',   parent_group_code: 'SLSM', phone: '+919811000002', email: 'priya@op.in',  rate_pct: 2.0 },
  { arche: 'trading', id: 'sm-t3', person_type: 'salesman', person_code: 'SM-T03', display_name: 'Rahul Verma',    parent_group_code: 'SLSM', phone: '+919811000003', email: 'rahul@op.in',  rate_pct: 2.0 },
  { arche: 'trading', id: 'sm-t4', person_type: 'salesman', person_code: 'SM-T04', display_name: 'Anjali Singh',   parent_group_code: 'SLSM', phone: '+919811000004', email: 'anjali@op.in', rate_pct: 2.0 },
  { arche: 'trading', id: 'sm-t5', person_type: 'salesman', person_code: 'SM-T05', display_name: 'Vikram Mehta',   parent_group_code: 'SLSM', phone: '+919811000005', email: 'vikram@op.in', rate_pct: 2.0 },
  { arche: 'trading', id: 'sm-t6', person_type: 'salesman', person_code: 'SM-T06', display_name: 'Neha Kapoor',    parent_group_code: 'SLSM', phone: '+919811000006', email: 'neha@op.in',   rate_pct: 2.0 },
  { arche: 'trading', id: 'ag-t1', person_type: 'agent',    person_code: 'AG-T01', display_name: 'Nirmal Agencies',    parent_group_code: 'AGNT', phone: '+919811000011', email: 'nirmal@ag.in', rate_pct: 1.5 },
  { arche: 'trading', id: 'ag-t2', person_type: 'agent',    person_code: 'AG-T02', display_name: 'Sunrise Marketing',  parent_group_code: 'AGNT', phone: '+919811000012', email: 'sun@ag.in',    rate_pct: 1.5 },
  { arche: 'trading', id: 'ag-t3', person_type: 'agent',    person_code: 'AG-T03', display_name: 'Capital Agency',     parent_group_code: 'AGNT', phone: '+919811000013', email: 'cap@ag.in',    rate_pct: 1.5 },
  { arche: 'trading', id: 'ag-t4', person_type: 'agent',    person_code: 'AG-T04', display_name: 'Eastern Trading',    parent_group_code: 'AGNT', phone: '+919811000014', email: 'east@ag.in',   rate_pct: 1.5 },
  // Services
  { arche: 'services', id: 'sm-s1', person_type: 'salesman', person_code: 'SM-S01', display_name: 'Rohit Mishra', parent_group_code: 'SLSM', phone: '+919811000021', email: 'rohit@op.in',  rate_pct: 2.0 },
  { arche: 'services', id: 'sm-s2', person_type: 'salesman', person_code: 'SM-S02', display_name: 'Kavita Iyer',  parent_group_code: 'SLSM', phone: '+919811000022', email: 'kavita@op.in', rate_pct: 2.0 },
  { arche: 'services', id: 'sm-s3', person_type: 'salesman', person_code: 'SM-S03', display_name: 'Suresh Reddy', parent_group_code: 'SLSM', phone: '+919811000023', email: 'suresh@op.in', rate_pct: 2.0 },
  { arche: 'services', id: 'sm-s4', person_type: 'salesman', person_code: 'SM-S04', display_name: 'Pooja Patel',  parent_group_code: 'SLSM', phone: '+919811000024', email: 'pooja@op.in',  rate_pct: 2.0 },
  { arche: 'services', id: 'br-s1', person_type: 'broker',   person_code: 'BR-S01', display_name: 'Deepak Brokerage', parent_group_code: 'BRKR', phone: '+919811000031', email: 'deep@br.in', rate_pct: 1.0 },
  { arche: 'services', id: 'br-s2', person_type: 'broker',   person_code: 'BR-S02', display_name: 'VK Brokers',       parent_group_code: 'BRKR', phone: '+919811000032', email: 'vk@br.in',   rate_pct: 1.0 },
  // Manufacturing
  { arche: 'manufacturing', id: 'sm-m1', person_type: 'salesman', person_code: 'SM-M01', display_name: 'Manish Gupta', parent_group_code: 'SLSM', phone: '+919811000041', email: 'manish@op.in', rate_pct: 2.0 },
  { arche: 'manufacturing', id: 'sm-m2', person_type: 'salesman', person_code: 'SM-M02', display_name: 'Sneha Joshi',  parent_group_code: 'SLSM', phone: '+919811000042', email: 'sneha@op.in',  rate_pct: 2.0 },
  { arche: 'manufacturing', id: 'sm-m3', person_type: 'salesman', person_code: 'SM-M03', display_name: 'Arun Pillai',  parent_group_code: 'SLSM', phone: '+919811000043', email: 'arun@op.in',   rate_pct: 2.0 },
  { arche: 'manufacturing', id: 'sm-m4', person_type: 'salesman', person_code: 'SM-M04', display_name: 'Divya Nair',   parent_group_code: 'SLSM', phone: '+919811000044', email: 'divya@op.in',  rate_pct: 2.0 },
  { arche: 'manufacturing', id: 'sm-m5', person_type: 'salesman', person_code: 'SM-M05', display_name: 'Karan Bhatia', parent_group_code: 'SLSM', phone: '+919811000045', email: 'karan@op.in',  rate_pct: 2.0 },
  { arche: 'manufacturing', id: 'ag-m1', person_type: 'agent',    person_code: 'AG-M01', display_name: 'Industrial Agencies', parent_group_code: 'AGNT', phone: '+919811000051', email: 'ind@ag.in',   rate_pct: 1.5 },
  { arche: 'manufacturing', id: 'ag-m2', person_type: 'agent',    person_code: 'AG-M02', display_name: 'Metro Sales',         parent_group_code: 'AGNT', phone: '+919811000052', email: 'metro@ag.in', rate_pct: 1.5 },
  { arche: 'manufacturing', id: 'ag-m3', person_type: 'agent',    person_code: 'AG-M03', display_name: 'Prime Distribution',  parent_group_code: 'AGNT', phone: '+919811000053', email: 'prime@ag.in', rate_pct: 1.5 },
  // Telecallers map → 'reference' (closest match in production enum)
  { arche: 'manufacturing', id: 'tc-m1', person_type: 'reference', person_code: 'TC-M01', display_name: 'Anjali Desai', parent_group_code: 'REFR', phone: '+919811000061', email: 'aDesai@op.in', rate_pct: 0.5 },
  { arche: 'manufacturing', id: 'tc-m2', person_type: 'reference', person_code: 'TC-M02', display_name: 'Meera Iyer',   parent_group_code: 'REFR', phone: '+919811000062', email: 'mIyer@op.in',  rate_pct: 0.5 },
];

export const DEMO_SAM_PERSONS: DemoSamPerson[] = SEED_ROWS.map(r => ({
  id: r.id,
  entity_id: 'SMRT',
  person_type: r.person_type,
  person_code: r.person_code,
  display_name: r.display_name,
  alias: null,
  ledger_id: `lg-${r.id}`,
  ledger_name: `${r.display_name} - ${r.person_type}`,
  parent_group_code: r.parent_group_code,
  hierarchy_level_id: null,
  phone: r.phone,
  email: r.email,
  gstin: null,
  pan: null,
  address: null,
  employee_id: null,
  employee_name: null,
  tds_section: 'not_applicable',
  tds_deductible: false,
  commission_rates: [{
    id: `cr-${r.id}`,
    applicable_from: '2024-04-01',
    item_pct: r.rate_pct,
    item_amt_per_unit: null,
    service_pct: r.rate_pct,
    margin_pct: null,
  }],
  commission_slabs: [],
  portfolio: [],
  primary_agent_id: null,
  receiver_share_pct: null,
  commission_expense_ledger_id: null,
  commission_expense_ledger_name: null,
  treat_as_salesman: false,
  is_active: true,
  created_at: NOW_ISO,
  updated_at: NOW_ISO,
  _archetype: r.arche,
}));

// ─── Enquiry Sources ────────────────────────────────────────────────────
export const DEMO_ENQUIRY_SOURCES = [
  { id: 'es-1', code: 'WEBSITE',   name: 'Website',           is_active: true },
  { id: 'es-2', code: 'REFERRAL',  name: 'Referral',          is_active: true },
  { id: 'es-3', code: 'COLDCALL',  name: 'Cold Call',         is_active: true },
  { id: 'es-4', code: 'TRADEFAIR', name: 'Trade Fair',        is_active: true },
  { id: 'es-5', code: 'GOOGLEADS', name: 'Google Ads',        is_active: true },
  { id: 'es-6', code: 'WHATSAPP',  name: 'WhatsApp',          is_active: true },
  { id: 'es-7', code: 'WALKIN',    name: 'Walk-in',           is_active: true },
  { id: 'es-8', code: 'EXISTING',  name: 'Existing Customer', is_active: true },
];

// ─── Campaigns ──────────────────────────────────────────────────────────
export const DEMO_CAMPAIGNS = [
  { id: 'cm-1', code: 'DIWALI24',  name: 'Diwali Festive 2024',     status: 'active',  start_date: '2024-10-01', end_date: '2024-11-15', budget: 500000 },
  { id: 'cm-2', code: 'NEWYEAR25', name: 'New Year Promo',          status: 'active',  start_date: '2024-12-15', end_date: '2025-01-15', budget: 300000 },
  { id: 'cm-3', code: 'SUMMER25',  name: 'Summer Push 2025',        status: 'active',  start_date: '2025-04-01', end_date: '2025-06-30', budget: 800000 },
  { id: 'cm-4', code: 'MONSOON25', name: 'Monsoon Special',         status: 'active',  start_date: '2025-07-01', end_date: '2025-09-30', budget: 400000 },
  { id: 'cm-5', code: 'FESTIVE25', name: 'Festive 2025',            status: 'active',  start_date: '2025-09-15', end_date: '2025-11-30', budget: 600000 },
  { id: 'cm-6', code: 'OLD-CMP1',  name: 'Independence Day Sale',   status: 'closed',  start_date: '2024-08-01', end_date: '2024-08-20', budget: 200000 },
  { id: 'cm-7', code: 'OLD-CMP2',  name: 'Q4 FY24 Push',            status: 'closed',  start_date: '2024-01-01', end_date: '2024-03-31', budget: 350000 },
  { id: 'cm-8', code: 'OLD-CMP3',  name: 'Republic Day Discount',   status: 'closed',  start_date: '2024-01-15', end_date: '2024-01-30', budget: 150000 },
];

// ─── Targets ────────────────────────────────────────────────────────────
export const DEMO_TARGETS = DEMO_SAM_PERSONS.map((p, i) => ({
  id: `tg-${i+1}`, sam_person_id: p.id, sam_person_name: p.display_name,
  period: 'Q4-FY25', target_amount: 500000 + (i % 5) * 200000,
  achieved_amount: 200000 + (i % 7) * 80000, status: 'in_progress' as const,
}));

// ─── Enquiries ──────────────────────────────────────────────────────────
export type DemoEnquiry = Tagged<Enquiry>;

function makeEnquiries(arche: DemoArchetype, count: number, prefix: string): DemoEnquiry[] {
  const stages: EnquiryStatus[] = ['new', 'assigned', 'pending', 'quote', 'lost'];
  const priorities: EnquiryPriority[] = ['low', 'medium', 'high', 'urgent'];
  const sources = DEMO_ENQUIRY_SOURCES;
  const salesmen = DEMO_SAM_PERSONS.filter(p => p._archetype === arche && p.person_type === 'salesman');

  return Array.from({ length: count }, (_, i): DemoEnquiry => {
    const sm = salesmen[i % Math.max(1, salesmen.length)];
    const src = sources[i % sources.length];
    const partyName = `Lead ${prefix}${i+1}`;
    const enquiryDate = new Date(Date.now() - (i * 24 * 3600 * 1000)).toISOString().slice(0, 10);
    const estValue = 50000 + (i % 8) * 35000;

    return {
      id: `enq-${prefix}-${i+1}`,
      entity_id: 'SMRT',
      enquiry_no: `ENQ-${prefix}-${String(i+1).padStart(4, '0')}`,
      enquiry_date: enquiryDate,
      enquiry_time: '10:00',
      enquiry_type: 'prospect',
      enquiry_source_id: src?.id ?? null,
      enquiry_source_name: src?.name ?? null,
      priority: priorities[i % priorities.length],
      campaign: DEMO_CAMPAIGNS[i % DEMO_CAMPAIGNS.length]?.code ?? null,
      customer_id: null,
      customer_name: partyName,
      prospectus_id: null,
      partner_id: null,
      partner_name: null,
      contact_person: `Contact ${i+1}`,
      department: null,
      designation: null,
      email: `lead${i+1}@${prefix.toLowerCase()}.in`,
      mobile: `+9198110${String(20000 + i).slice(-5)}`,
      phone: null,
      dealer_id: sm?.id ?? null,
      dealer_name: sm?.display_name ?? null,
      reference_id: null,
      reference_name: null,
      assigned_executive_id: sm?.id ?? null,
      assigned_executive_name: sm?.display_name ?? null,
      items: [{
        id: `enq-item-${prefix}-${i+1}`,
        product_name: `Product Interest ${i+1}`,
        quantity: 1 + (i % 5),
        unit: 'NOS',
        rate: estValue / (1 + (i % 5)),
        amount: estValue,
        line_type: 'product',
        ledger_name: null,
      }],
      status: stages[i % stages.length],
      follow_ups: [],
      quotation_ids: [],
      opportunity_id: null,
      converted_at: null,
      is_active: true,
      created_at: NOW_ISO,
      updated_at: NOW_ISO,
      _archetype: arche,
    };
  });
}

export const DEMO_ENQUIRIES: DemoEnquiry[] = [
  ...makeEnquiries('trading', 22, 'T'),
  ...makeEnquiries('services', 18, 'S'),
  ...makeEnquiries('manufacturing', 20, 'M'),
];

// ─── Quotations ─────────────────────────────────────────────────────────
export type DemoQuotation = Tagged<Quotation>;

function makeQuotations(arche: DemoArchetype, count: number, prefix: string): DemoQuotation[] {
  const stages: QuotationStage[] = ['draft', 'negotiation', 'confirmed', 'lost'];
  const enquiries = DEMO_ENQUIRIES.filter(e => e._archetype === arche);

  return Array.from({ length: count }, (_, i): DemoQuotation => {
    const enq = enquiries[i % Math.max(1, enquiries.length)];
    const total = 75000 + (i % 10) * 45000;
    const taxAmt = Math.round(total * 0.18);
    const subTotal = total - taxAmt;
    const qDate = new Date(Date.now() - (i * 36 * 3600 * 1000)).toISOString().slice(0, 10);

    return {
      id: `qt-${prefix}-${i+1}`,
      entity_id: 'SMRT',
      quotation_no: `QT-${prefix}-${String(i+1).padStart(4, '0')}`,
      quotation_date: qDate,
      quotation_type: 'original',
      quotation_stage: stages[i % stages.length],
      enquiry_id: enq?.id ?? null,
      enquiry_no: enq?.enquiry_no ?? null,
      customer_id: null,
      customer_name: `Prospect ${prefix}${i+1}`,
      valid_until_days: 30,
      valid_until_date: new Date(new Date(qDate).getTime() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      original_quotation_no: null,
      last_quotation_no: null,
      last_quotation_date: null,
      revision_number: 0,
      revision_history: [],
      items: [{
        id: `qt-item-${prefix}-${i+1}`,
        item_name: `Item ${i+1}`,
        description: null,
        qty: 1 + (i % 5),
        uom: 'NOS',
        rate: subTotal / (1 + (i % 5)),
        discount_pct: 0,
        sub_total: subTotal,
        tax_pct: 18,
        tax_amount: taxAmt,
        amount: total,
      }],
      sub_total: subTotal,
      tax_amount: taxAmt,
      total_amount: total,
      notes: null,
      terms_conditions: null,
      proforma_no: null,
      proforma_date: null,
      proforma_converted_at: null,
      is_active: true,
      created_at: NOW_ISO,
      updated_at: NOW_ISO,
      _archetype: arche,
    };
  });
}

export const DEMO_QUOTATIONS: DemoQuotation[] = [
  ...makeQuotations('trading', 16, 'T'),
  ...makeQuotations('services', 12, 'S'),
  ...makeQuotations('manufacturing', 12, 'M'),
];

// ─── Opportunities ──────────────────────────────────────────────────────
// Opportunity is a lightweight pipeline view — not strictly typed against
// production Opportunity (kept as inline structural type).
export const DEMO_OPPORTUNITIES = DEMO_ENQUIRIES
  .filter(e => e.status === 'quote' || e.status === 'pending')
  .map(e => ({
    _archetype: e._archetype,
    id: `op-${e.id}`,
    enquiry_id: e.id,
    party_name: e.customer_name ?? '',
    expected_value: e.items[0]?.amount ?? 0,
    expected_close_date: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    probability: 60,
    stage: 'negotiation' as const,
    salesman_id: e.assigned_executive_id ?? '',
  }));

// ─── Commission Entries ─────────────────────────────────────────────────
export type DemoCommissionEntry = Tagged<CommissionEntry>;

function makeCommissions(
  arche: DemoArchetype,
  pending: number,
  booked: number,
  paid: number,
  prefix: string,
): DemoCommissionEntry[] {
  const persons = DEMO_SAM_PERSONS.filter(p => p._archetype === arche);

  const make = (
    n: number,
    status: CommissionEntry['status'],
    offset: number,
  ): DemoCommissionEntry[] =>
    Array.from({ length: n }, (_, i): DemoCommissionEntry => {
      const p = persons[(offset + i) % Math.max(1, persons.length)];
      const base = 80000 + ((offset + i) % 8) * 35000;
      const ratePct = p?.commission_rates[0]?.item_pct ?? 1.5;
      const commission = Math.round(base * ratePct / 100);
      const vDate = new Date(Date.now() - ((offset + i) * 5 * 24 * 3600 * 1000))
        .toISOString().slice(0, 10);
      const isPaid = status === 'paid';
      const isPartial = status === 'partial';
      const received = isPaid ? base : isPartial ? Math.round(base * 0.5) : 0;
      const earned = isPaid ? commission : isPartial ? Math.round(commission * 0.5) : 0;

      return {
        id: `cm-${prefix}-${status}-${i+1}`,
        entity_id: 'SMRT',
        voucher_id: `inv-demo-${prefix}-${offset + i + 1}`,
        voucher_no: `SI/${prefix}/${String(offset + i + 1).padStart(4, '0')}`,
        voucher_date: vDate,
        customer_id: null,
        customer_name: `Customer ${prefix}${offset + i + 1}`,
        person_id: p?.id ?? '',
        person_name: p?.display_name ?? '',
        person_type: p?.person_type ?? 'salesman',
        person_pan: null,
        deductee_type: 'no_pan',
        invoice_amount: base,
        base_amount: base,
        commission_rate: ratePct,
        total_commission: commission,
        method: 'item_amount',
        tds_applicable: false,
        tds_section: null,
        tds_rate: 0,
        amount_received_to_date: received,
        commission_earned_to_date: earned,
        tds_deducted_to_date: 0,
        net_paid_to_date: earned,
        payments: [],
        credit_note_amount: 0,
        credit_note_refs: [],
        net_invoice_amount: base,
        net_total_commission: commission,
        commission_expense_ledger_id: null,
        commission_expense_ledger_name: null,
        commission_expense_voucher_id: null,
        commission_expense_voucher_no: null,
        agent_invoice_no: null,
        agent_invoice_date: null,
        agent_invoice_gross_amount: null,
        agent_invoice_gst_amount: null,
        agent_invoice_status: null,
        agent_invoice_variance: null,
        agent_invoice_dispute_reason: null,
        catchup_tds_required: false,
        catchup_tds_amount: 0,
        source_document: 'sales_invoice',
        bank_payment_voucher_id: null,
        bank_payment_voucher_no: null,
        bank_payment_date: null,
        collection_bonus_earned: isPaid,
        collection_bonus_window_days: 30,
        collection_bonus_amount: isPaid ? Math.round(commission * 0.25) : 0,
        receipt_within_window: isPaid,
        status,
        created_at: NOW_ISO,
        updated_at: NOW_ISO,
        _archetype: arche,
      };
    });

  return [
    ...make(pending, 'pending', 0),
    ...make(booked, 'partial', pending),
    ...make(paid, 'paid', pending + booked),
  ];
}

export const DEMO_COMMISSION_ENTRIES: DemoCommissionEntry[] = [
  ...makeCommissions('trading', 12, 8, 5, 'T'),
  ...makeCommissions('services', 6, 4, 3, 'S'),
  ...makeCommissions('manufacturing', 10, 6, 4, 'M'),
];
