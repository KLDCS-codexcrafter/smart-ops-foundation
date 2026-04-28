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
import type { SupplyRequestMemo } from '@/types/supply-request-memo';
import type { Order } from '@/types/order';
import type { Campaign } from '@/types/campaign';
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
  entity_id: DEFAULT_ENTITY_SHORTCODE,
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
export const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: 'cm-1', entity_id: DEFAULT_ENTITY_SHORTCODE,
    campaign_code: 'DIWALI24', campaign_name: 'Diwali Festive 2024',
    campaign_type: 'EVENT', communication_channels: ['whatsapp', 'sms', 'email'],
    status: 'completed', start_date: '2024-10-01', end_date: '2024-11-15',
    budget: 500000, is_active: true,
    budget_breakdown: { total: 500000, creative: 80000, media: 150000, events: 120000, incentives: 80000, staff: 40000, technology: 20000, misc: 10000, actual_spent: 492000 },
    target_filters: { customer_type: 'all', min_purchase_value: null, territory_ids: [], product_category_ids: [], last_purchase_days: null, tags: [] },
    follow_up_rule: { enabled: true, auto_create_enquiry: true, follow_up_days: 2, max_follow_ups: 3, assign_to_salesman_id: null, assign_to_salesman_name: null, reminder_note: 'Diwali follow-up' },
    outcome_tracking: { target_reach: 2000, actual_reach: 1850, responses: 420, enquiries_generated: 38, quotations_generated: 22, orders_converted: 14, revenue_attributed: 2800000 },
    performance_metrics: { response_rate: 22.7, enquiry_conversion_rate: 9.1, order_conversion_rate: 36.8, cost_per_enquiry: 12947, cost_per_order: 35143, roi_pct: 469.5 },
    description: 'Annual Diwali festive push across all product lines.', created_at: '2024-09-15T10:00:00Z', updated_at: '2024-11-20T10:00:00Z',
  },
  {
    id: 'cm-2', entity_id: DEFAULT_ENTITY_SHORTCODE,
    campaign_code: 'NEWYEAR25', campaign_name: 'New Year Promo 2025',
    campaign_type: 'EMAIL', communication_channels: ['email', 'whatsapp'],
    status: 'completed', start_date: '2024-12-15', end_date: '2025-01-15',
    budget: 300000, is_active: true,
    budget_breakdown: { total: 300000, creative: 50000, media: 80000, events: 0, incentives: 100000, staff: 30000, technology: 30000, misc: 10000, actual_spent: 285000 },
    target_filters: { customer_type: 'existing', min_purchase_value: 100000, territory_ids: [], product_category_ids: [], last_purchase_days: 180, tags: [] },
    follow_up_rule: { enabled: true, auto_create_enquiry: false, follow_up_days: 5, max_follow_ups: 2, assign_to_salesman_id: null, assign_to_salesman_name: null, reminder_note: null },
    outcome_tracking: { target_reach: 800, actual_reach: 760, responses: 190, enquiries_generated: 18, quotations_generated: 12, orders_converted: 8, revenue_attributed: 1200000 },
    performance_metrics: { response_rate: 25.0, enquiry_conversion_rate: 9.5, order_conversion_rate: 44.4, cost_per_enquiry: 15833, cost_per_order: 35625, roi_pct: 321.1 },
    description: 'New year discount offer for existing high-value accounts.', created_at: '2024-12-01T10:00:00Z', updated_at: '2025-01-20T10:00:00Z',
  },
  {
    id: 'cm-3', entity_id: DEFAULT_ENTITY_SHORTCODE,
    campaign_code: 'SUMMER25', campaign_name: 'Summer Push 2025',
    campaign_type: 'CALL', communication_channels: ['phone', 'whatsapp'],
    status: 'active', start_date: '2025-04-01', end_date: '2025-06-30',
    budget: 800000, is_active: true,
    budget_breakdown: { total: 800000, creative: 60000, media: 200000, events: 0, incentives: 300000, staff: 150000, technology: 50000, misc: 40000, actual_spent: 320000 },
    target_filters: { customer_type: 'all', min_purchase_value: null, territory_ids: [], product_category_ids: [], last_purchase_days: null, tags: ['high_volume'] },
    follow_up_rule: { enabled: true, auto_create_enquiry: true, follow_up_days: 3, max_follow_ups: 4, assign_to_salesman_id: null, assign_to_salesman_name: null, reminder_note: 'Summer push follow-up' },
    outcome_tracking: { target_reach: 3000, actual_reach: 1200, responses: 280, enquiries_generated: 24, quotations_generated: 15, orders_converted: 6, revenue_attributed: 900000 },
    performance_metrics: { response_rate: 23.3, enquiry_conversion_rate: 8.6, order_conversion_rate: 25.0, cost_per_enquiry: 13333, cost_per_order: 53333, roi_pct: 181.3 },
    description: 'Outbound call campaign targeting all segments. Q1 FY26.', created_at: '2025-03-15T10:00:00Z', updated_at: '2025-04-28T10:00:00Z',
  },
  {
    id: 'cm-4', entity_id: DEFAULT_ENTITY_SHORTCODE,
    campaign_code: 'WINBACK26', campaign_name: 'Win-Back Lapsed Accounts',
    campaign_type: 'WINBACK', communication_channels: ['phone', 'email', 'in_person'],
    status: 'active', start_date: '2026-01-15', end_date: '2026-03-31',
    budget: 400000, is_active: true,
    budget_breakdown: { total: 400000, creative: 40000, media: 50000, events: 60000, incentives: 150000, staff: 70000, technology: 20000, misc: 10000, actual_spent: 180000 },
    target_filters: { customer_type: 'lapsed', min_purchase_value: 200000, territory_ids: [], product_category_ids: [], last_purchase_days: 365, tags: ['lapsed_premium'] },
    follow_up_rule: { enabled: true, auto_create_enquiry: true, follow_up_days: 7, max_follow_ups: 5, assign_to_salesman_id: null, assign_to_salesman_name: null, reminder_note: 'Win-back: offer 10% discount on first re-order' },
    outcome_tracking: { target_reach: 150, actual_reach: 90, responses: 35, enquiries_generated: 12, quotations_generated: 7, orders_converted: 3, revenue_attributed: 750000 },
    performance_metrics: { response_rate: 38.9, enquiry_conversion_rate: 34.3, order_conversion_rate: 25.0, cost_per_enquiry: 15000, cost_per_order: 60000, roi_pct: 316.7 },
    description: 'Re-engage customers with no purchase in last 12 months.', created_at: '2026-01-10T10:00:00Z', updated_at: '2026-04-20T10:00:00Z',
  },
  {
    id: 'cm-5', entity_id: DEFAULT_ENTITY_SHORTCODE,
    campaign_code: 'REFER26', campaign_name: 'Referral Drive Q1 FY26',
    campaign_type: 'REFER', communication_channels: ['whatsapp', 'in_person'],
    status: 'active', start_date: '2026-02-01', end_date: '2026-04-30',
    budget: 250000, is_active: true,
    budget_breakdown: { total: 250000, creative: 20000, media: 10000, events: 0, incentives: 180000, staff: 30000, technology: 10000, misc: 0, actual_spent: 95000 },
    target_filters: { customer_type: 'existing', min_purchase_value: 500000, territory_ids: [], product_category_ids: [], last_purchase_days: 90, tags: ['premium'] },
    follow_up_rule: { enabled: true, auto_create_enquiry: true, follow_up_days: 1, max_follow_ups: 2, assign_to_salesman_id: null, assign_to_salesman_name: null, reminder_note: 'Referral programme — thank customer and action referral' },
    outcome_tracking: { target_reach: 80, actual_reach: 65, responses: 28, enquiries_generated: 22, quotations_generated: 14, orders_converted: 8, revenue_attributed: 1600000 },
    performance_metrics: { response_rate: 43.1, enquiry_conversion_rate: 78.6, order_conversion_rate: 36.4, cost_per_enquiry: 4318, cost_per_order: 11875, roi_pct: 1584.2 },
    description: 'Incentivise top accounts to refer new customers. ₹5000 credit per converted referral.', created_at: '2026-01-25T10:00:00Z', updated_at: '2026-04-22T10:00:00Z',
  },
  {
    id: 'cm-6', entity_id: DEFAULT_ENTITY_SHORTCODE,
    campaign_code: 'EXPO-IMPEX26', campaign_name: 'IMPEX 2026 Exhibition',
    campaign_type: 'EXPO', communication_channels: ['in_person', 'email', 'whatsapp'],
    status: 'planned', start_date: '2026-06-10', end_date: '2026-06-13',
    budget: 600000, is_active: true,
    budget_breakdown: { total: 600000, creative: 80000, media: 40000, events: 250000, incentives: 60000, staff: 120000, technology: 30000, misc: 20000, actual_spent: 0 },
    target_filters: { customer_type: 'prospect', min_purchase_value: null, territory_ids: [], product_category_ids: [], last_purchase_days: null, tags: [] },
    follow_up_rule: { enabled: true, auto_create_enquiry: true, follow_up_days: 1, max_follow_ups: 5, assign_to_salesman_id: null, assign_to_salesman_name: null, reminder_note: 'IMPEX lead — captured at booth. Follow-up within 24h.' },
    outcome_tracking: { target_reach: 500, actual_reach: 0, responses: 0, enquiries_generated: 0, quotations_generated: 0, orders_converted: 0, revenue_attributed: 0 },
    performance_metrics: { response_rate: 0, enquiry_conversion_rate: 0, order_conversion_rate: 0, cost_per_enquiry: 0, cost_per_order: 0, roi_pct: 0 },
    description: 'Booth at IMPEX 2026 trade fair.', created_at: '2026-04-01T10:00:00Z', updated_at: '2026-04-01T10:00:00Z',
  },
  {
    id: 'cm-7', entity_id: DEFAULT_ENTITY_SHORTCODE,
    campaign_code: 'UPSELL-Q4', campaign_name: 'Q4 Upsell — Premium SKUs',
    campaign_type: 'UPSELL', communication_channels: ['phone', 'in_person'],
    status: 'completed', start_date: '2025-01-01', end_date: '2025-03-31',
    budget: 350000, is_active: true,
    budget_breakdown: { total: 350000, creative: 30000, media: 20000, events: 0, incentives: 200000, staff: 80000, technology: 20000, misc: 0, actual_spent: 338000 },
    target_filters: { customer_type: 'existing', min_purchase_value: 300000, territory_ids: [], product_category_ids: [], last_purchase_days: 60, tags: [] },
    follow_up_rule: { enabled: false, auto_create_enquiry: false, follow_up_days: 7, max_follow_ups: 2, assign_to_salesman_id: null, assign_to_salesman_name: null, reminder_note: null },
    outcome_tracking: { target_reach: 120, actual_reach: 118, responses: 52, enquiries_generated: 31, quotations_generated: 20, orders_converted: 12, revenue_attributed: 1800000 },
    performance_metrics: { response_rate: 44.1, enquiry_conversion_rate: 59.6, order_conversion_rate: 38.7, cost_per_enquiry: 10903, cost_per_order: 28167, roi_pct: 432.5 },
    description: 'Upsell mid-tier accounts to premium product range.', created_at: '2024-12-15T10:00:00Z', updated_at: '2025-04-05T10:00:00Z',
  },
  {
    id: 'cm-8', entity_id: DEFAULT_ENTITY_SHORTCODE,
    campaign_code: 'SURVEY-NPS', campaign_name: 'Customer NPS Survey',
    campaign_type: 'SURVEY', communication_channels: ['whatsapp', 'email', 'sms'],
    status: 'completed', start_date: '2025-03-01', end_date: '2025-03-31',
    budget: 50000, is_active: true,
    budget_breakdown: { total: 50000, creative: 10000, media: 5000, events: 0, incentives: 20000, staff: 10000, technology: 5000, misc: 0, actual_spent: 47000 },
    target_filters: { customer_type: 'existing', min_purchase_value: null, territory_ids: [], product_category_ids: [], last_purchase_days: 365, tags: [] },
    follow_up_rule: { enabled: false, auto_create_enquiry: false, follow_up_days: 3, max_follow_ups: 1, assign_to_salesman_id: null, assign_to_salesman_name: null, reminder_note: null },
    outcome_tracking: { target_reach: 400, actual_reach: 380, responses: 210, enquiries_generated: 0, quotations_generated: 0, orders_converted: 0, revenue_attributed: 0 },
    performance_metrics: { response_rate: 55.3, enquiry_conversion_rate: 0, order_conversion_rate: 0, cost_per_enquiry: 0, cost_per_order: 0, roi_pct: 0 },
    description: 'Annual NPS survey. Identify promoters and detractors.', created_at: '2025-02-20T10:00:00Z', updated_at: '2025-04-05T10:00:00Z',
  },
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
      entity_id: DEFAULT_ENTITY_SHORTCODE,
      enquiry_no: `ENQ-${prefix}-${String(i+1).padStart(4, '0')}`,
      enquiry_date: enquiryDate,
      enquiry_time: '10:00',
      enquiry_type: 'prospect',
      enquiry_source_id: src?.id ?? null,
      enquiry_source_name: src?.name ?? null,
      priority: priorities[i % priorities.length],
      campaign: DEMO_CAMPAIGNS[i % DEMO_CAMPAIGNS.length]?.campaign_code ?? null,
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
      entity_id: DEFAULT_ENTITY_SHORTCODE,
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
      // Sprint T-Phase-1.1.1a — ProjX hookpoint stub (D-171 dual-phase)
      project_id: null,
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
        entity_id: DEFAULT_ENTITY_SHORTCODE,
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

// ─── Supply Request Memos (Sprint T-Phase-1.1.1n) ───────────────────────

export const DEMO_SUPPLY_REQUEST_MEMOS: SupplyRequestMemo[] = [
  {
    id: 'srm-demo-1',
    entity_id: 'ENTITY',
    memo_no: 'SRQM/25-26/0001',
    memo_date: '2026-01-15',
    sales_order_id: null,
    sales_order_no: 'SO/25-26/0001',
    customer_id: null,
    customer_name: 'Demo Customer A',
    raised_by_person_id: null,
    raised_by_person_name: 'Demo Salesman',
    raised_by_person_type: 'salesman',
    expected_dispatch_date: '2026-01-20',
    delivery_address: '123 Demo Street, Kolkata 700001',
    special_instructions: 'Handle with care',
    items: [
      { id: 'sri-1', item_name: 'Demo Item A', description: null, qty: 10, uom: 'NOS', rate: 500, amount: 5000 },
      { id: 'sri-2', item_name: 'Demo Item B', description: null, qty: 5, uom: 'KG', rate: 200, amount: 1000 },
    ],
    total_amount: 6000,
    status: 'raised',
    acknowledged_by: null,
    acknowledged_at: null,
    dispatched_at: null,
    delivery_memo_id: null,
    delivery_memo_no: null,
    created_at: '2026-01-15T10:00:00.000Z',
    updated_at: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'srm-demo-2',
    entity_id: 'ENTITY',
    memo_no: 'SRQM/25-26/0002',
    memo_date: '2026-02-01',
    sales_order_id: null,
    sales_order_no: 'SO/25-26/0002',
    customer_id: null,
    customer_name: 'Demo Customer B',
    raised_by_person_id: null,
    raised_by_person_name: 'Demo Salesman',
    raised_by_person_type: 'salesman',
    expected_dispatch_date: '2026-02-10',
    delivery_address: '456 Test Road, Mumbai 400001',
    special_instructions: null,
    items: [
      { id: 'sri-3', item_name: 'Demo Item C', description: null, qty: 20, uom: 'MTR', rate: 150, amount: 3000 },
    ],
    total_amount: 3000,
    status: 'dispatched',
    acknowledged_by: 'dispatch_user',
    acknowledged_at: '2026-02-02T09:00:00.000Z',
    dispatched_at: '2026-02-08T14:00:00.000Z',
    delivery_memo_id: 'dm-demo-1',
    delivery_memo_no: 'DM/25-26/0001',
    created_at: '2026-02-01T10:00:00.000Z',
    updated_at: '2026-02-08T14:00:00.000Z',
  },
];

// ─── Demo Sales Orders (Sprint T-Phase-1.1.1o) ──────────────────────────
// Aligned with DEMO_SUPPLY_REQUEST_MEMOS.sales_order_no so the
// Cross-Dept Handoff Tracker assembles complete pipeline rows.
// SO #1: Quote QT-M-0001 → SO/25-26/0001 → SRM/25-26/0001 (raised)
// SO #2: Quote QT-M-0002 → SO/25-26/0002 → SRM/25-26/0002 → DM/25-26/0001 (delivered)
export const DEMO_ORDERS: Order[] = [
  {
    id: 'so-demo-1',
    order_no: 'SO/25-26/0001',
    base_voucher_type: 'Sales Order',
    entity_id: DEFAULT_ENTITY_SHORTCODE,
    date: '2026-01-10',
    party_id: 'cust-demo-a',
    party_name: 'Demo Customer A',
    ref_no: 'QT-M-0001',
    ref_date: '2026-01-08',
    lines: [
      {
        id: 'so-demo-1-l1',
        item_id: 'itm-a', item_code: 'ITM-A', item_name: 'Demo Item A',
        hsn_sac_code: '7308',
        qty: 10, uom: 'NOS',
        rate: 500, discount_percent: 0,
        taxable_value: 5000, gst_rate: 18,
        pending_qty: 10, fulfilled_qty: 0, status: 'open',
      },
      {
        id: 'so-demo-1-l2',
        item_id: 'itm-b', item_code: 'ITM-B', item_name: 'Demo Item B',
        hsn_sac_code: '7308',
        qty: 5, uom: 'KG',
        rate: 200, discount_percent: 0,
        taxable_value: 1000, gst_rate: 18,
        pending_qty: 5, fulfilled_qty: 0, status: 'open',
      },
    ],
    gross_amount: 6000, total_tax: 1080, net_amount: 7080,
    narration: 'Demo SO 1 (Sprint 1.1.1o handoff tracker chain)',
    terms_conditions: '',
    status: 'open',
    created_at: '2026-01-10T10:00:00.000Z',
    updated_at: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'so-demo-2',
    order_no: 'SO/25-26/0002',
    base_voucher_type: 'Sales Order',
    entity_id: DEFAULT_ENTITY_SHORTCODE,
    date: '2026-01-28',
    party_id: 'cust-demo-b',
    party_name: 'Demo Customer B',
    ref_no: 'QT-M-0002',
    ref_date: '2026-01-25',
    lines: [
      {
        id: 'so-demo-2-l1',
        item_id: 'itm-c', item_code: 'ITM-C', item_name: 'Demo Item C',
        hsn_sac_code: '7308',
        qty: 20, uom: 'MTR',
        rate: 150, discount_percent: 0,
        taxable_value: 3000, gst_rate: 18,
        pending_qty: 0, fulfilled_qty: 20, status: 'closed',
      },
    ],
    gross_amount: 3000, total_tax: 540, net_amount: 3540,
    narration: 'Demo SO 2 (full pipeline through DM)',
    terms_conditions: '',
    status: 'partial',
    created_at: '2026-01-28T10:00:00.000Z',
    updated_at: '2026-02-08T14:00:00.000Z',
  },
];

