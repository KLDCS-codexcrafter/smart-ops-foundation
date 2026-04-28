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


import type { Exhibition, ExhibitionVisitor } from '@/types/exhibition';

export const DEMO_EXHIBITIONS: Exhibition[] = [
  {
    id: 'exh-1', entity_id: DEFAULT_ENTITY_SHORTCODE,
    exhibition_code: 'IMPEX-26', exhibition_name: 'IMPEX 2026 — International Trade Fair',
    category: 'trade_fair', organiser: 'ITPO',
    venue_name: 'Pragati Maidan', venue_city: 'New Delhi', venue_state: 'Delhi',
    start_date: '2026-06-10', end_date: '2026-06-13',
    stall_no: 'Hall 5 · Stall 32', stall_size: '3m × 3m',
    team_members: ['Rahul Sharma', 'Priya Mehta', 'Suresh Kumar'],
    campaign_code: null,
    budget: { booth: 120000, travel: 45000, meals: 30000, marketing: 80000, staff: 60000, misc: 15000, total_planned: 350000, total_actual: 0, variance: -350000 },
    outcome: { total_visitors: 0, hot_leads: 0, warm_leads: 0, enquiries_created: 0, quotations_raised: 0, orders_converted: 0, revenue_attributed: 0 },
    status: 'planned', description: 'Annual international trade exhibition.', is_active: true,
    created_at: '2026-04-01T10:00:00Z', updated_at: '2026-04-15T10:00:00Z',
  },
  {
    id: 'exh-2', entity_id: DEFAULT_ENTITY_SHORTCODE,
    exhibition_code: 'DEALER-MEET-26', exhibition_name: 'Annual Dealer Meet FY26',
    category: 'dealer_meet', organiser: null,
    venue_name: 'Taj Lands End', venue_city: 'Mumbai', venue_state: 'Maharashtra',
    start_date: '2026-03-15', end_date: '2026-03-16',
    stall_no: null, stall_size: null,
    team_members: ['Vivek Soni', 'Manish Gupta'],
    campaign_code: null,
    budget: { booth: 0, travel: 80000, meals: 120000, marketing: 50000, staff: 40000, misc: 10000, total_planned: 300000, total_actual: 312000, variance: 12000 },
    outcome: { total_visitors: 68, hot_leads: 22, warm_leads: 30, enquiries_created: 18, quotations_raised: 12, orders_converted: 7, revenue_attributed: 2100000 },
    status: 'completed', description: 'Annual dealer meet — product showcase + incentive announcement.', is_active: true,
    created_at: '2026-02-01T10:00:00Z', updated_at: '2026-03-20T10:00:00Z',
  },
  {
    id: 'exh-3', entity_id: DEFAULT_ENTITY_SHORTCODE,
    exhibition_code: 'BUILDCON-25', exhibition_name: 'Buildcon 2025 — Construction Expo',
    category: 'industry_expo', organiser: 'CII',
    venue_name: 'Bombay Exhibition Centre', venue_city: 'Mumbai', venue_state: 'Maharashtra',
    start_date: '2025-11-20', end_date: '2025-11-23',
    stall_no: 'Gate 2 · B-14', stall_size: '6m × 4m',
    team_members: ['Manish Gupta', 'Sneha Patil'],
    campaign_code: null,
    budget: { booth: 180000, travel: 35000, meals: 25000, marketing: 90000, staff: 50000, misc: 20000, total_planned: 400000, total_actual: 388000, variance: -12000 },
    outcome: { total_visitors: 142, hot_leads: 38, warm_leads: 61, enquiries_created: 32, quotations_raised: 20, orders_converted: 9, revenue_attributed: 3600000 },
    status: 'completed', description: 'Construction & building materials expo.', is_active: true,
    created_at: '2025-10-01T10:00:00Z', updated_at: '2025-12-05T10:00:00Z',
  },
];

export const DEMO_EXHIBITION_VISITORS: ExhibitionVisitor[] = [
  {
    id: 'vis-1', exhibition_id: 'exh-2',
    visit_date: '2026-03-15', visit_time: '10:30', capture_method: 'business_card',
    visitor_name: 'Rajesh Khanna', company_name: 'Khanna Trading Co.', designation: 'Proprietor',
    mobile: '+919811000101', email: 'rajesh@khannatrading.in', city: 'Pune',
    interest_level: 'hot', products_interested: ['Premium Range', 'Bulk Pack Scheme'],
    estimated_value: 500000, notes: 'Currently buying from competitor — ready to switch',
    enquiry_created: true, enquiry_id: null, follow_up_due: '2026-03-20',
    assigned_salesman_id: null, assigned_salesman_name: null,
    created_at: '2026-03-15T10:30:00Z', updated_at: '2026-03-15T10:30:00Z',
  },
  {
    id: 'vis-2', exhibition_id: 'exh-3',
    visit_date: '2025-11-21', visit_time: '11:00', capture_method: 'qr_scan',
    visitor_name: 'Anil Sharma', company_name: 'Sharma Constructions Pvt Ltd', designation: 'Director',
    mobile: '+919833000303', email: 'anil@sharmaconstructions.com', city: 'Mumbai',
    interest_level: 'hot', products_interested: ['Industrial Grade', 'Waterproofing Series'],
    estimated_value: 1200000, notes: 'Large upcoming project — confirmed budget',
    enquiry_created: true, enquiry_id: null, follow_up_due: '2025-11-25',
    assigned_salesman_id: null, assigned_salesman_name: null,
    created_at: '2025-11-21T11:00:00Z', updated_at: '2025-11-21T11:00:00Z',
  },
];

import type { Webinar, WebinarParticipant } from '@/types/webinar';

export const DEMO_WEBINARS: Webinar[] = [
  {
    id: 'web-1', entity_id: DEFAULT_ENTITY_SHORTCODE,
    webinar_code: 'WEB-PROD-LAUNCH-26',
    webinar_title: 'New Product Line Launch — FY26 Summer Range',
    category: 'product_launch', platform: 'zoom',
    platform_url: 'https://zoom.us/j/99999000001',
    platform_meeting_id: '999 9900 0001', platform_passcode: 'launch26',
    scheduled_date: '2026-05-15', scheduled_time: '11:00', duration_mins: 90,
    host_name: 'Vivek Soni',
    speakers: ['Vivek Soni', 'Product Head — Rajan Mehta'],
    topic_summary: 'Unveiling the Summer 2026 product line. New SKUs, revised MRP, dealer schemes, and marketing support.',
    target_audience: 'Dealers, Distributors, Key Accounts',
    max_registrations: 200, registration_link: null, recording_url: null,
    campaign_code: 'SUMMER25',
    budget: { platform_cost: 5000, speaker_fee: 0, promotion: 25000, production: 15000, misc: 5000, total_planned: 50000, total_actual: 0, variance: -50000 },
    outcome: { registrations: 0, attendees: 0, no_shows: 0, avg_duration_mins: 0, questions_asked: 0, enquiries_created: 0, quotations_raised: 0, orders_converted: 0, revenue_attributed: 0, recording_views: 0 },
    status: 'scheduled', is_active: true,
    created_at: '2026-04-20T10:00:00Z', updated_at: '2026-04-20T10:00:00Z',
  },
  {
    id: 'web-2', entity_id: DEFAULT_ENTITY_SHORTCODE,
    webinar_code: 'WEB-DEALER-TRAIN-26',
    webinar_title: 'Dealer Training: Application Techniques & Site Best Practices',
    category: 'training', platform: 'google_meet',
    platform_url: 'https://meet.google.com/abc-defg-hij',
    platform_meeting_id: null, platform_passcode: null,
    scheduled_date: '2026-03-10', scheduled_time: '15:00', duration_mins: 60,
    host_name: 'Priya Mehta',
    speakers: ['Priya Mehta', 'Tech Specialist — Arvind Kumar'],
    topic_summary: 'Hands-on application training for dealers — surface prep, coverage rates, common errors, warranty conditions.',
    target_audience: 'Dealer Network — Tier 1 & 2 Cities',
    max_registrations: 100, registration_link: null,
    recording_url: 'https://drive.google.com/file/d/demo-recording-1',
    campaign_code: null,
    budget: { platform_cost: 0, speaker_fee: 0, promotion: 8000, production: 5000, misc: 2000, total_planned: 15000, total_actual: 14200, variance: -800 },
    outcome: { registrations: 87, attendees: 64, no_shows: 23, avg_duration_mins: 54, questions_asked: 18, enquiries_created: 8, quotations_raised: 5, orders_converted: 3, revenue_attributed: 480000, recording_views: 42 },
    status: 'completed', is_active: true,
    created_at: '2026-02-15T10:00:00Z', updated_at: '2026-03-15T10:00:00Z',
  },
  {
    id: 'web-3', entity_id: DEFAULT_ENTITY_SHORTCODE,
    webinar_code: 'WEB-ARCH-DEMO-25',
    webinar_title: 'Architect Insights: Premium Interior Solutions Demo',
    category: 'product_demo', platform: 'zoom',
    platform_url: null,
    platform_meeting_id: '888 7766 5544', platform_passcode: 'arch2025',
    scheduled_date: '2025-12-05', scheduled_time: '11:30', duration_mins: 75,
    host_name: 'Manish Gupta',
    speakers: ['Manish Gupta'],
    topic_summary: 'Live product demo for architects and interior designers. Premium texture range, finish options, and project support services.',
    target_audience: 'Architects, Interior Designers — Mumbai, Pune, Bengaluru',
    max_registrations: 80, registration_link: null,
    recording_url: 'https://drive.google.com/file/d/demo-recording-2',
    campaign_code: 'DIWALI24',
    budget: { platform_cost: 3000, speaker_fee: 0, promotion: 12000, production: 8000, misc: 2000, total_planned: 25000, total_actual: 23500, variance: -1500 },
    outcome: { registrations: 61, attendees: 48, no_shows: 13, avg_duration_mins: 68, questions_asked: 24, enquiries_created: 14, quotations_raised: 9, orders_converted: 5, revenue_attributed: 950000, recording_views: 89 },
    status: 'completed', is_active: true,
    created_at: '2025-11-10T10:00:00Z', updated_at: '2025-12-10T10:00:00Z',
  },
];

export const DEMO_WEBINAR_PARTICIPANTS: WebinarParticipant[] = [
  {
    id: 'par-1', webinar_id: 'web-2',
    name: 'Ankit Sharma', company: 'Sharma Paint House', designation: 'Owner',
    email: 'ankit@sharmapaint.in', mobile: '+919811001122', city: 'Jaipur',
    registration_date: '2026-03-05', status: 'attended',
    attended_duration_mins: 58, interest_level: 'hot',
    questions_asked: 'What is the warranty period for exterior textures?',
    enquiry_created: true, enquiry_id: null,
    follow_up_due: '2026-03-14', notes: 'Large dealer — good potential for scheme upgrade',
    created_at: '2026-03-05T10:00:00Z', updated_at: '2026-03-10T10:00:00Z',
  },
  {
    id: 'par-2', webinar_id: 'web-2',
    name: 'Sunita Verma', company: 'Verma Building Materials', designation: 'Purchase Manager',
    email: null, mobile: '+919822003344', city: 'Lucknow',
    registration_date: '2026-03-06', status: 'no_show',
    attended_duration_mins: null, interest_level: 'warm',
    questions_asked: null, enquiry_created: false, enquiry_id: null,
    follow_up_due: '2026-03-18', notes: 'Call back — could not attend, wants recording link',
    created_at: '2026-03-06T10:00:00Z', updated_at: '2026-03-10T10:00:00Z',
  },
  {
    id: 'par-3', webinar_id: 'web-3',
    name: 'Ar. Deepa Nair', company: 'Nair & Associates', designation: 'Principal Architect',
    email: 'deepa@nairassociates.com', mobile: '+919944005566', city: 'Bengaluru',
    registration_date: '2025-12-01', status: 'attended',
    attended_duration_mins: 72, interest_level: 'hot',
    questions_asked: 'Do you have a sample kit for the textured finish range?',
    enquiry_created: true, enquiry_id: null,
    follow_up_due: '2025-12-10', notes: 'Upcoming residential project — ₹25L potential',
    created_at: '2025-12-01T10:00:00Z', updated_at: '2025-12-05T10:00:00Z',
  },
];

// ─── Lead Aggregation seed (T-Phase-1.1.1f) ──────────────────────────────────
import type { Lead } from '@/types/lead';

export const DEMO_LEADS: Lead[] = [
  {
    id: 'lead-001', entity_id: DEFAULT_ENTITY_SHORTCODE,
    lead_no: 'LEAD/SINHA/25-26/0001',
    lead_date: '2026-04-10', platform: 'indiamart', status: 'new',
    contact_name: 'Rakesh Agarwal', company_name: 'Agarwal Construction',
    phone: '+919811100001', email: 'rakesh@agarwalconstruction.in',
    city: 'Kanpur', state: 'Uttar Pradesh',
    product_interest: 'Wall Putty — 500 bags', estimated_value: 75000,
    priority: 'high',
    assigned_salesman_id: null, assigned_salesman_name: null, assigned_telecaller_id: null,
    platform_meta: { portal_lead_id: 'IM-2026-88721', portal_category: 'Wall Putty', portal_query: 'Need 500 bags wall putty for residential project. Best price?' },
    is_duplicate: false, duplicate_of_lead_id: null,
    next_follow_up: '2026-04-12', notes: 'Large residential project enquiry',
    converted_enquiry_id: null, converted_at: null, campaign_code: null,
    is_active: true, created_at: '2026-04-10T09:30:00Z', updated_at: '2026-04-10T09:30:00Z',
  },
  {
    id: 'lead-002', entity_id: DEFAULT_ENTITY_SHORTCODE,
    lead_no: 'LEAD/SINHA/25-26/0002',
    lead_date: '2026-04-11', platform: 'justdial', status: 'contacted',
    contact_name: 'Sunita Mehta', company_name: 'Mehta Paints & Hardware',
    phone: '+919822200002', email: null,
    city: 'Lucknow', state: 'Uttar Pradesh',
    product_interest: 'Exterior Paint', estimated_value: 40000,
    priority: 'medium',
    assigned_salesman_id: 'sm-m1', assigned_salesman_name: 'Manish Gupta', assigned_telecaller_id: null,
    platform_meta: { portal_lead_id: 'JD-LP-44892', portal_category: 'Paint Dealers', portal_query: 'Looking for bulk exterior paint supplier' },
    is_duplicate: false, duplicate_of_lead_id: null,
    next_follow_up: '2026-04-14', notes: 'Called — interested in dealership',
    converted_enquiry_id: null, converted_at: null, campaign_code: null,
    is_active: true, created_at: '2026-04-11T11:00:00Z', updated_at: '2026-04-11T14:00:00Z',
  },
  {
    id: 'lead-003', entity_id: DEFAULT_ENTITY_SHORTCODE,
    lead_no: 'LEAD/SINHA/25-26/0003',
    lead_date: '2026-04-12', platform: 'facebook', status: 'qualified',
    contact_name: 'Ar. Deepika Nair', company_name: 'Nair Design Studio',
    phone: '+919944300003', email: 'deepika@nairdesign.in',
    city: 'Bengaluru', state: 'Karnataka',
    product_interest: 'Texture Finish — Premium Range', estimated_value: 120000,
    priority: 'high',
    assigned_salesman_id: 'sm-m1', assigned_salesman_name: 'Manish Gupta', assigned_telecaller_id: null,
    platform_meta: { ad_campaign: 'SUMMER25', form_name: 'Architect Lead Form April 2026' },
    is_duplicate: false, duplicate_of_lead_id: null,
    next_follow_up: '2026-04-15', notes: 'Architect — 3 BHK premium project. Confirmed sample request.',
    converted_enquiry_id: null, converted_at: null, campaign_code: 'SUMMER25',
    is_active: true, created_at: '2026-04-12T08:00:00Z', updated_at: '2026-04-12T10:00:00Z',
  },
  {
    id: 'lead-004', entity_id: DEFAULT_ENTITY_SHORTCODE,
    lead_no: 'LEAD/SINHA/25-26/0004',
    lead_date: '2026-04-13', platform: 'whatsapp', status: 'new',
    contact_name: 'Vijay Sharma', company_name: null,
    phone: '+919811100001', email: null,
    city: 'Delhi', state: 'Delhi',
    product_interest: 'Wall Putty', estimated_value: null,
    priority: 'low',
    assigned_salesman_id: null, assigned_salesman_name: null, assigned_telecaller_id: null,
    platform_meta: { wa_message: 'Bhai wall putty ka rate kya hai? 500 bag chahiye.' },
    is_duplicate: true, duplicate_of_lead_id: 'lead-001',
    next_follow_up: null, notes: 'Duplicate — same phone as lead-001',
    converted_enquiry_id: null, converted_at: null, campaign_code: null,
    is_active: true, created_at: '2026-04-13T16:30:00Z', updated_at: '2026-04-13T16:30:00Z',
  },
  {
    id: 'lead-005', entity_id: DEFAULT_ENTITY_SHORTCODE,
    lead_no: 'LEAD/SINHA/25-26/0005',
    lead_date: '2026-04-08', platform: 'website', status: 'converted',
    contact_name: 'Priya Joshi', company_name: 'Joshi Builders Pvt Ltd',
    phone: '+919955500005', email: 'priya@joshibuilders.com',
    city: 'Pune', state: 'Maharashtra',
    product_interest: 'Waterproofing Solutions', estimated_value: 200000,
    priority: 'high',
    assigned_salesman_id: 'sm-m1', assigned_salesman_name: 'Manish Gupta', assigned_telecaller_id: null,
    platform_meta: { page_url: '/products/waterproofing', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'waterproofing-2026' },
    is_duplicate: false, duplicate_of_lead_id: null,
    next_follow_up: null, notes: 'Converted to ENQ/SINHA/25-26/0012',
    converted_enquiry_id: 'enq-SINHA-12', converted_at: '2026-04-09T10:00:00Z', campaign_code: null,
    is_active: true, created_at: '2026-04-08T14:00:00Z', updated_at: '2026-04-09T10:00:00Z',
  },
  {
    id: 'lead-006', entity_id: DEFAULT_ENTITY_SHORTCODE,
    lead_no: 'LEAD/SINHA/25-26/0006',
    lead_date: '2026-04-14', platform: 'linkedin', status: 'new',
    contact_name: 'Anand Krishnan', company_name: 'Krishnan Infrastructure',
    phone: null, email: 'anand.krishnan@infraco.in',
    city: 'Chennai', state: 'Tamil Nadu',
    product_interest: 'Industrial Coatings', estimated_value: 500000,
    priority: 'high',
    assigned_salesman_id: null, assigned_salesman_name: null, assigned_telecaller_id: null,
    platform_meta: { ad_campaign: 'Industrial B2B Q1', form_name: 'LinkedIn Lead Gen — Industrial' },
    is_duplicate: false, duplicate_of_lead_id: null,
    next_follow_up: '2026-04-16', notes: 'Large infra company — high value opportunity',
    converted_enquiry_id: null, converted_at: null, campaign_code: null,
    is_active: true, created_at: '2026-04-14T09:00:00Z', updated_at: '2026-04-14T09:00:00Z',
  },
  {
    id: 'lead-007', entity_id: DEFAULT_ENTITY_SHORTCODE,
    lead_no: 'LEAD/SINHA/25-26/0007',
    lead_date: '2026-04-15', platform: 'tradeindia', status: 'contacted',
    contact_name: 'Mohan Lal', company_name: 'Lal Trading Co.',
    phone: '+919866600007', email: 'mohanlal@laltrading.biz',
    city: 'Ahmedabad', state: 'Gujarat',
    product_interest: 'Primer — Economy Line', estimated_value: 30000,
    priority: 'medium',
    assigned_salesman_id: null, assigned_salesman_name: null, assigned_telecaller_id: null,
    platform_meta: { portal_lead_id: 'TI-ABZ-99123', portal_category: 'Building Materials', buy_requirement: '200 buckets primer, delivery to Ahmedabad' },
    is_duplicate: false, duplicate_of_lead_id: null,
    next_follow_up: '2026-04-17', notes: 'Sent catalogue. Waiting for callback.',
    converted_enquiry_id: null, converted_at: null, campaign_code: null,
    is_active: true, created_at: '2026-04-15T12:00:00Z', updated_at: '2026-04-15T15:00:00Z',
  },
];

import type { WaTemplate } from '@/types/wa-template';

export const DEMO_WA_TEMPLATES: WaTemplate[] = [
  {
    id: 'wat-001', entity_id: DEFAULT_ENTITY_SHORTCODE,
    template_code: 'INTRO-01', template_name: 'First Contact Introduction',
    category: 'introduction', language: 'en',
    body: 'Hello {contact}, this is {salesman} from {entity}. I noticed your enquiry for {product}. Would you have 5 minutes to discuss? Thanks!',
    is_active: true, use_count: 12,
    created_at: '2026-02-01T10:00:00Z', updated_at: '2026-04-01T10:00:00Z',
  },
  {
    id: 'wat-002', entity_id: DEFAULT_ENTITY_SHORTCODE,
    template_code: 'FU-01', template_name: 'Routine Follow-up',
    category: 'follow_up', language: 'en',
    body: 'Hi {contact}, following up on our discussion about {product}. As discussed, scheduling next call on {follow_up_date}. Please confirm. — {salesman}, {entity}',
    is_active: true, use_count: 47,
    created_at: '2026-02-01T10:00:00Z', updated_at: '2026-04-15T10:00:00Z',
  },
  {
    id: 'wat-003', entity_id: DEFAULT_ENTITY_SHORTCODE,
    template_code: 'QUOTE-01', template_name: 'Quotation Sent',
    category: 'quotation', language: 'en',
    body: 'Dear {contact}, as discussed, we have prepared the quotation for {product} totalling {amount}. Please review and let me know if you have any questions. — {salesman}',
    is_active: true, use_count: 23,
    created_at: '2026-02-01T10:00:00Z', updated_at: '2026-04-10T10:00:00Z',
  },
  {
    id: 'wat-004', entity_id: DEFAULT_ENTITY_SHORTCODE,
    template_code: 'REM-01', template_name: 'Appointment Reminder',
    category: 'reminder', language: 'en',
    body: 'Hi {contact}, gentle reminder of our scheduled call on {follow_up_date}. Looking forward to our discussion. — {salesman}, {entity}',
    is_active: true, use_count: 31,
    created_at: '2026-02-01T10:00:00Z', updated_at: '2026-04-20T10:00:00Z',
  },
  {
    id: 'wat-005', entity_id: DEFAULT_ENTITY_SHORTCODE,
    template_code: 'INTRO-HI-01', template_name: 'Hindi Introduction',
    category: 'introduction', language: 'hi',
    body: 'नमस्ते {contact} जी, मैं {salesman} {entity} से बात कर रहा हूं। आपकी {product} संबंधी पूछताछ पर बात करनी थी। क्या आप 5 मिनट निकाल सकते हैं?',
    is_active: true, use_count: 8,
    created_at: '2026-02-01T10:00:00Z', updated_at: '2026-04-05T10:00:00Z',
  },
  {
    id: 'wat-006', entity_id: DEFAULT_ENTITY_SHORTCODE,
    template_code: 'PROD-INFO-01', template_name: 'Product Catalogue Share',
    category: 'product_info', language: 'mixed',
    body: 'Dear {contact}, sharing our product catalogue. Aap mujhe {follow_up_date} ko call kar sakte hain to discuss further. Best regards, {salesman}',
    is_active: true, use_count: 15,
    created_at: '2026-02-01T10:00:00Z', updated_at: '2026-03-25T10:00:00Z',
  },
  {
    id: 'wat-007', entity_id: DEFAULT_ENTITY_SHORTCODE,
    template_code: 'TY-01', template_name: 'Post-Call Thank You',
    category: 'thank_you', language: 'en',
    body: 'Thanks {contact} for taking the time today. Will share details by {follow_up_date} as discussed. — {salesman}',
    is_active: true, use_count: 19,
    created_at: '2026-02-01T10:00:00Z', updated_at: '2026-04-18T10:00:00Z',
  },
];

import type { AgentStatus } from '@/types/agent-status';
import type { AgentProfile, PointsTransaction } from '@/types/gamification';

// 2 telecallers seeded with realistic varying activity
export const DEMO_AGENT_STATUSES: AgentStatus[] = [
  {
    id: 'as-tc-m1', entity_id: DEFAULT_ENTITY_SHORTCODE,
    telecaller_id: 'tc-m1', telecaller_name: 'Anjali Desai',
    state: 'available',
    state_changed_at: new Date().toISOString(),
    current_session_id: null, current_dialer_id: null, break_reason: null,
    calls_today: 14, on_call_seconds_today: 3680, break_seconds_today: 920,
    wrap_seconds_today: 280, available_seconds_today: 4200,
    last_login_at: new Date(Date.now() - 4 * 3600000).toISOString(), last_logout_at: null,
    is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'as-tc-m2', entity_id: DEFAULT_ENTITY_SHORTCODE,
    telecaller_id: 'tc-m2', telecaller_name: 'Meera Iyer',
    state: 'on_call',
    state_changed_at: new Date(Date.now() - 5 * 60000).toISOString(),
    current_session_id: null, current_dialer_id: null, break_reason: null,
    calls_today: 9, on_call_seconds_today: 2120, break_seconds_today: 540,
    wrap_seconds_today: 180, available_seconds_today: 3850,
    last_login_at: new Date(Date.now() - 3 * 3600000).toISOString(), last_logout_at: null,
    is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
];

export const DEMO_AGENT_PROFILES: AgentProfile[] = [
  {
    id: 'prof-tc-m1', entity_id: DEFAULT_ENTITY_SHORTCODE,
    telecaller_id: 'tc-m1', telecaller_name: 'Anjali Desai',
    total_points: 1850, level: 5,
    earned_badges: ['first_call', 'call_century', 'first_conversion', 'conversion_10', 'streak_7', 'team_player'],
    current_streak_days: 12, longest_streak_days: 18,
    last_active_date: new Date().toISOString().split('T')[0],
    lifetime_calls: 247, lifetime_conversions: 18, lifetime_wa_sent: 64,
    fy_points: 1850, fy_calls: 247, fy_conversions: 18,
    created_at: '2026-02-01T10:00:00Z', updated_at: new Date().toISOString(),
  },
  {
    id: 'prof-tc-m2', entity_id: DEFAULT_ENTITY_SHORTCODE,
    telecaller_id: 'tc-m2', telecaller_name: 'Meera Iyer',
    total_points: 920, level: 4,
    earned_badges: ['first_call', 'call_century', 'first_conversion', 'streak_7', 'early_bird'],
    current_streak_days: 5, longest_streak_days: 9,
    last_active_date: new Date().toISOString().split('T')[0],
    lifetime_calls: 158, lifetime_conversions: 7, lifetime_wa_sent: 42,
    fy_points: 920, fy_calls: 158, fy_conversions: 7,
    created_at: '2026-02-15T10:00:00Z', updated_at: new Date().toISOString(),
  },
];

export const DEMO_POINTS_TRANSACTIONS: PointsTransaction[] = [
  { id: 'pt-001', entity_id: DEFAULT_ENTITY_SHORTCODE, telecaller_id: 'tc-m1',
    points: 5, reason: 'call_made', source_type: 'call_session', source_id: null,
    awarded_at: new Date(Date.now() - 30 * 60000).toISOString(), created_at: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: 'pt-002', entity_id: DEFAULT_ENTITY_SHORTCODE, telecaller_id: 'tc-m1',
    points: 50, reason: 'call_converted', source_type: 'call_session', source_id: null,
    awarded_at: new Date(Date.now() - 2 * 3600000).toISOString(), created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'pt-003', entity_id: DEFAULT_ENTITY_SHORTCODE, telecaller_id: 'tc-m1',
    points: 10, reason: 'call_interested', source_type: 'call_session', source_id: null,
    awarded_at: new Date(Date.now() - 90 * 60000).toISOString(), created_at: new Date(Date.now() - 90 * 60000).toISOString() },
  { id: 'pt-004', entity_id: DEFAULT_ENTITY_SHORTCODE, telecaller_id: 'tc-m2',
    points: 5, reason: 'call_made', source_type: 'call_session', source_id: null,
    awarded_at: new Date(Date.now() - 15 * 60000).toISOString(), created_at: new Date(Date.now() - 15 * 60000).toISOString() },
  { id: 'pt-005', entity_id: DEFAULT_ENTITY_SHORTCODE, telecaller_id: 'tc-m2',
    points: 8, reason: 'call_callback', source_type: 'call_session', source_id: null,
    awarded_at: new Date(Date.now() - 60 * 60000).toISOString(), created_at: new Date(Date.now() - 60 * 60000).toISOString() },
];

import type { QualityCriterion, CallReview, CoachingFeedback } from '@/types/call-quality';
import type { DistributionConfig, TelecallerCapacity, DistributionLog } from '@/types/lead-distribution';

export const DEMO_QUALITY_CRITERIA: QualityCriterion[] = [
  { id: 'qc-001', entity_id: DEFAULT_ENTITY_SHORTCODE, criterion_code: 'GREET', criterion_name: 'Greeting & Opening', description: 'Professional greeting within first 10 seconds', weight_pct: 10, is_active: true, display_order: 1, created_at: '2026-02-01T10:00:00Z', updated_at: '2026-02-01T10:00:00Z' },
  { id: 'qc-002', entity_id: DEFAULT_ENTITY_SHORTCODE, criterion_code: 'NEEDS', criterion_name: 'Needs Assessment', description: 'Asks open-ended questions', weight_pct: 20, is_active: true, display_order: 2, created_at: '2026-02-01T10:00:00Z', updated_at: '2026-02-01T10:00:00Z' },
  { id: 'qc-003', entity_id: DEFAULT_ENTITY_SHORTCODE, criterion_code: 'KNOW', criterion_name: 'Product Knowledge', description: 'Accurate product and pricing knowledge', weight_pct: 25, is_active: true, display_order: 3, created_at: '2026-02-01T10:00:00Z', updated_at: '2026-02-01T10:00:00Z' },
  { id: 'qc-004', entity_id: DEFAULT_ENTITY_SHORTCODE, criterion_code: 'OBJECT', criterion_name: 'Objection Handling', description: 'Addresses concerns calmly', weight_pct: 15, is_active: true, display_order: 4, created_at: '2026-02-01T10:00:00Z', updated_at: '2026-02-01T10:00:00Z' },
  { id: 'qc-005', entity_id: DEFAULT_ENTITY_SHORTCODE, criterion_code: 'CLOSE', criterion_name: 'Closing & Next Steps', description: 'Confirms next action with timeline', weight_pct: 20, is_active: true, display_order: 5, created_at: '2026-02-01T10:00:00Z', updated_at: '2026-02-01T10:00:00Z' },
  { id: 'qc-006', entity_id: DEFAULT_ENTITY_SHORTCODE, criterion_code: 'COMPL', criterion_name: 'Compliance & Disclosure', description: 'Recording disclosure, accurate quote', weight_pct: 10, is_active: true, display_order: 6, created_at: '2026-02-01T10:00:00Z', updated_at: '2026-02-01T10:00:00Z' },
];

export const DEMO_CALL_REVIEWS: CallReview[] = [
  {
    id: 'rv-001', entity_id: DEFAULT_ENTITY_SHORTCODE,
    call_session_id: 'cs-demo-1', call_session_no: 'CALL/2026-2027/0001',
    telecaller_id: 'tc-m1', telecaller_name: 'Anjali Desai',
    reviewer_id: 'supervisor', reviewer_name: 'Vivek Soni (Supervisor)',
    reviewed_at: '2026-04-22T15:30:00Z',
    scores: [
      { criterion_id: 'qc-001', criterion_code: 'GREET',  criterion_name: 'Greeting & Opening',     weight_pct: 10, score: 95, comment: 'Strong opening' },
      { criterion_id: 'qc-002', criterion_code: 'NEEDS',  criterion_name: 'Needs Assessment',       weight_pct: 20, score: 80, comment: 'Good but rushed' },
      { criterion_id: 'qc-003', criterion_code: 'KNOW',   criterion_name: 'Product Knowledge',      weight_pct: 25, score: 90, comment: 'Excellent' },
      { criterion_id: 'qc-004', criterion_code: 'OBJECT', criterion_name: 'Objection Handling',     weight_pct: 15, score: 70, comment: 'Hesitated on price' },
      { criterion_id: 'qc-005', criterion_code: 'CLOSE',  criterion_name: 'Closing & Next Steps',   weight_pct: 20, score: 85, comment: 'Clear next step' },
      { criterion_id: 'qc-006', criterion_code: 'COMPL',  criterion_name: 'Compliance & Disclosure',weight_pct: 10, score: 100,comment: 'Perfect' },
    ],
    total_score: 86, status: 'completed',
    overall_comment: 'Strong overall. Work on objection-handling.',
    agent_acknowledged: true, agent_acknowledged_at: '2026-04-22T17:00:00Z',
    created_at: '2026-04-22T15:30:00Z', updated_at: '2026-04-22T17:00:00Z',
  },
  {
    id: 'rv-002', entity_id: DEFAULT_ENTITY_SHORTCODE,
    call_session_id: 'cs-demo-2', call_session_no: 'CALL/2026-2027/0002',
    telecaller_id: 'tc-m2', telecaller_name: 'Meera Iyer',
    reviewer_id: 'supervisor', reviewer_name: 'Vivek Soni (Supervisor)',
    reviewed_at: '2026-04-23T11:00:00Z',
    scores: [
      { criterion_id: 'qc-001', criterion_code: 'GREET',  criterion_name: 'Greeting & Opening',     weight_pct: 10, score: 70, comment: null },
      { criterion_id: 'qc-002', criterion_code: 'NEEDS',  criterion_name: 'Needs Assessment',       weight_pct: 20, score: 65, comment: 'Jumped to pitch' },
      { criterion_id: 'qc-003', criterion_code: 'KNOW',   criterion_name: 'Product Knowledge',      weight_pct: 25, score: 75, comment: 'Weak on pricing' },
      { criterion_id: 'qc-004', criterion_code: 'OBJECT', criterion_name: 'Objection Handling',     weight_pct: 15, score: 60, comment: 'Defensive' },
      { criterion_id: 'qc-005', criterion_code: 'CLOSE',  criterion_name: 'Closing & Next Steps',   weight_pct: 20, score: 70, comment: null },
      { criterion_id: 'qc-006', criterion_code: 'COMPL',  criterion_name: 'Compliance & Disclosure',weight_pct: 10, score: 80, comment: null },
    ],
    total_score: 70, status: 'completed',
    overall_comment: 'Needs coaching on consultative selling.',
    agent_acknowledged: false, agent_acknowledged_at: null,
    created_at: '2026-04-23T11:00:00Z', updated_at: '2026-04-23T11:00:00Z',
  },
];

export const DEMO_COACHING_FEEDBACK: CoachingFeedback[] = [
  {
    id: 'cf-001', entity_id: DEFAULT_ENTITY_SHORTCODE,
    review_id: 'rv-001',
    telecaller_id: 'tc-m1', telecaller_name: 'Anjali Desai',
    coach_id: 'supervisor', coach_name: 'Vivek Soni',
    feedback_date: '2026-04-23',
    strengths: 'Strong product knowledge. Excellent compliance. Natural rapport-building.',
    improvements: 'Build confidence on price objections. Slow down during needs assessment.',
    action_items: [
      { id: 'ai-1', text: 'Complete role-play module on price objection',  due_date: '2026-04-30', status: 'in_progress', completed_at: null },
      { id: 'ai-2', text: 'Shadow 3 calls of senior closer',               due_date: '2026-05-05', status: 'open',        completed_at: null },
    ],
    agent_response: 'Thanks for the feedback.',
    is_acknowledged: true, acknowledged_at: '2026-04-23T16:30:00Z',
    created_at: '2026-04-23T15:00:00Z', updated_at: '2026-04-23T16:30:00Z',
  },
  {
    id: 'cf-002', entity_id: DEFAULT_ENTITY_SHORTCODE,
    review_id: 'rv-002',
    telecaller_id: 'tc-m2', telecaller_name: 'Meera Iyer',
    coach_id: 'supervisor', coach_name: 'Vivek Soni',
    feedback_date: '2026-04-24',
    strengths: 'Punctual, fast learner. Good at WhatsApp follow-ups.',
    improvements: 'Develop consultative selling. Avoid jumping to pitch.',
    action_items: [
      { id: 'ai-3', text: 'Read SPIN Selling Chapter 3', due_date: '2026-05-01', status: 'open', completed_at: null },
      { id: 'ai-4', text: 'Practice 5 mock calls',       due_date: '2026-05-08', status: 'open', completed_at: null },
      { id: 'ai-5', text: 'Memorize pricing slabs',      due_date: '2026-04-30', status: 'open', completed_at: null },
    ],
    agent_response: null,
    is_acknowledged: false, acknowledged_at: null,
    created_at: '2026-04-24T10:00:00Z', updated_at: '2026-04-24T10:00:00Z',
  },
];

export const DEMO_DISTRIBUTION_CONFIG: DistributionConfig = {
  id: `dc-${DEFAULT_ENTITY_SHORTCODE}`,
  entity_id: DEFAULT_ENTITY_SHORTCODE,
  strategy: 'round_robin',
  rotation_cursor: 3,
  weights: { 'tc-m1': 7, 'tc-m2': 4 },
  skills: {
    'tc-m1': ['wall putty', 'texture', 'premium'],
    'tc-m2': ['primer', 'economy', 'distemper'],
  },
  auto_redistribute_enabled: true,
  redistribute_when_overcap_pct: 110,
  last_distributed_at: '2026-04-27T16:30:00Z',
  last_distributed_by: 'supervisor',
  created_at: '2026-02-01T10:00:00Z',
  updated_at: '2026-04-27T16:30:00Z',
};

export const DEMO_TELECALLER_CAPACITIES: TelecallerCapacity[] = [
  {
    id: 'cap-tc-m1', entity_id: DEFAULT_ENTITY_SHORTCODE,
    telecaller_id: 'tc-m1', telecaller_name: 'Anjali Desai',
    daily_capacity: 35, weekly_capacity: 175,
    active: true,
    product_skills: ['wall putty', 'texture', 'premium'],
    current_daily_load: 14, current_weekly_load: 62,
    utilisation_pct: 40,
    created_at: '2026-02-01T10:00:00Z', updated_at: new Date().toISOString(),
  },
  {
    id: 'cap-tc-m2', entity_id: DEFAULT_ENTITY_SHORTCODE,
    telecaller_id: 'tc-m2', telecaller_name: 'Meera Iyer',
    daily_capacity: 25, weekly_capacity: 125,
    active: true,
    product_skills: ['primer', 'economy', 'distemper'],
    current_daily_load: 9, current_weekly_load: 38,
    utilisation_pct: 36,
    created_at: '2026-02-15T10:00:00Z', updated_at: new Date().toISOString(),
  },
];

export const DEMO_DISTRIBUTION_LOGS: DistributionLog[] = [
  { id: 'dl-001', entity_id: DEFAULT_ENTITY_SHORTCODE, distributed_at: '2026-04-27T16:30:00Z', strategy: 'round_robin', lead_id: 'lead-001', lead_no: 'LEAD/SINHA/25-26/0001', assigned_telecaller_id: 'tc-m1', assigned_telecaller_name: 'Anjali Desai', reason: 'Round-robin position 1/2', created_at: '2026-04-27T16:30:00Z' },
  { id: 'dl-002', entity_id: DEFAULT_ENTITY_SHORTCODE, distributed_at: '2026-04-27T16:35:00Z', strategy: 'round_robin', lead_id: 'lead-002', lead_no: 'LEAD/SINHA/25-26/0002', assigned_telecaller_id: 'tc-m2', assigned_telecaller_name: 'Meera Iyer', reason: 'Round-robin position 2/2', created_at: '2026-04-27T16:35:00Z' },
  { id: 'dl-003', entity_id: DEFAULT_ENTITY_SHORTCODE, distributed_at: '2026-04-28T09:15:00Z', strategy: 'skill_based', lead_id: 'lead-003', lead_no: 'LEAD/SINHA/25-26/0003', assigned_telecaller_id: 'tc-m1', assigned_telecaller_name: 'Anjali Desai', reason: 'Skill match · load 40%', created_at: '2026-04-28T09:15:00Z' },
];

// ─── Campaign Templates · Canvas Wave 6 (T-Phase-1.1.1j) ──────────────
import type { CampaignTemplate } from '@/types/campaign-template';

export const DEMO_CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'ct-builtin-001', entity_id: DEFAULT_ENTITY_SHORTCODE,
    template_code: 'WELCOME-NEW-LEAD', template_name: 'New Lead Welcome Sequence',
    campaign_type: 'WA',
    description: 'Standard 3-touch welcome sequence for new inbound leads (WhatsApp + Email + Call).',
    channel_steps: [
      { id: 'cs-001', channel: 'whatsapp', day_offset: 0, hour_of_day: 10,
        subject: null,
        body: 'Hi {contact}, welcome to {entity}! Thanks for your interest in {product}. I\'ll be your point of contact.',
        is_active: true },
      { id: 'cs-002', channel: 'email', day_offset: 0, hour_of_day: 14,
        subject: 'Welcome to {entity} – Quick Intro',
        body: 'Dear {contact},\n\nThank you for reaching out. Attached is our product brochure for {product}. I\'ll call you tomorrow to walk through it.\n\nRegards,\n{salesman}',
        is_active: true },
      { id: 'cs-003', channel: 'call', day_offset: 1, hour_of_day: 11,
        subject: null,
        body: 'Discovery call — understand requirement, share price, set demo if interested.',
        is_active: true },
    ],
    use_count: 12, is_active: true, is_built_in: true,
    created_at: '2026-01-15T10:00:00Z', updated_at: '2026-04-20T10:00:00Z',
  },
  {
    id: 'ct-builtin-002', entity_id: DEFAULT_ENTITY_SHORTCODE,
    template_code: 'QUOTE-FOLLOWUP', template_name: 'Quote Follow-up (3-touch)',
    campaign_type: 'CALL',
    description: 'Gentle 3-step follow-up after sending a quotation that hasn\'t converted.',
    channel_steps: [
      { id: 'cs-004', channel: 'whatsapp', day_offset: 2, hour_of_day: 11,
        subject: null,
        body: 'Hi {contact}, just checking — did you have a chance to review the quote for {product}? Happy to clarify anything.',
        is_active: true },
      { id: 'cs-005', channel: 'sms', day_offset: 4, hour_of_day: 15,
        subject: null,
        body: '{entity}: Reminder about your quote ref {follow_up_date}. Questions? Reply or call.',
        is_active: true },
      { id: 'cs-006', channel: 'call', day_offset: 7, hour_of_day: 11,
        subject: null,
        body: 'Final follow-up call — close, defer, or qualify out.',
        is_active: true },
    ],
    use_count: 8, is_active: true, is_built_in: true,
    created_at: '2026-01-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z',
  },
  {
    id: 'ct-builtin-003', entity_id: DEFAULT_ENTITY_SHORTCODE,
    template_code: 'EXHIBITION-FOLLOWUP', template_name: 'Exhibition Visitor Follow-up',
    campaign_type: 'EXPO',
    description: 'Post-event follow-up for visitors collected at an exhibition or trade show.',
    channel_steps: [
      { id: 'cs-007', channel: 'email', day_offset: 1, hour_of_day: 10,
        subject: 'Great meeting you at {entity} stall!',
        body: 'Dear {contact},\n\nIt was great speaking with you at the exhibition. As discussed, here\'s our brochure for {product}.\n\nBest regards,\n{salesman}',
        is_active: true },
      { id: 'cs-008', channel: 'whatsapp', day_offset: 3, hour_of_day: 11,
        subject: null,
        body: 'Hi {contact}, sharing our catalog from the show. Would love to schedule a visit / call this week.',
        is_active: true },
      { id: 'cs-009', channel: 'call', day_offset: 5, hour_of_day: 14,
        subject: null,
        body: 'Qualifying call — does the requirement still hold, what\'s the timeline.',
        is_active: true },
    ],
    use_count: 5, is_active: true, is_built_in: true,
    created_at: '2026-02-01T10:00:00Z', updated_at: '2026-03-20T10:00:00Z',
  },
  {
    id: 'ct-builtin-004', entity_id: DEFAULT_ENTITY_SHORTCODE,
    template_code: 'WIN-BACK-INACTIVE', template_name: 'Win-back Inactive Customer',
    campaign_type: 'WINBACK',
    description: 'Re-engage customers who haven\'t purchased in 90+ days.',
    channel_steps: [
      { id: 'cs-010', channel: 'email', day_offset: 0, hour_of_day: 10,
        subject: 'We\'ve missed you at {entity}',
        body: 'Dear {contact},\n\nIt\'s been a while since your last order. Sharing a special pricing for {product} valid this month — limited stock.\n\nCall to discuss.\n\nRegards, {salesman}',
        is_active: true },
      { id: 'cs-011', channel: 'whatsapp', day_offset: 7, hour_of_day: 11,
        subject: null,
        body: 'Hi {contact}, special pricing for old customers — interested?',
        is_active: true },
    ],
    use_count: 3, is_active: true, is_built_in: true,
    created_at: '2026-02-15T10:00:00Z', updated_at: '2026-04-10T10:00:00Z',
  },
];
