/**
 * demo-field-force-data.ts — Sprint 7 seed: Territories, Beats, Visits, Secondary Sales
 * [JWT] Read by orchestrator → POST /api/salesx/*
 */
import type { Territory } from '@/types/territory';
import type { BeatRoute } from '@/types/beat-route';
import type { VisitLog } from '@/types/visit-log';
import type { SecondarySales } from '@/types/secondary-sales';

const NOW_ISO = new Date().toISOString();
const TODAY = new Date().toISOString().slice(0, 10);

function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ─── Territories ────────────────────────────────────────────────────────
export const DEMO_TERRITORIES: Territory[] = [
  {
    id: 'ter-mum-w', entity_id: '',
    territory_code: 'TER/MUM-W', territory_name: 'Mumbai West',
    parent_territory_id: null,
    assigned_salesman_ids: ['sm-t1', 'sm-t2'],
    state_codes: ['27'],
    district_codes: ['MUM'],
    city_codes: [],
    is_active: true,
    notes: 'Bandra to Borivali corridor',
    created_at: NOW_ISO, updated_at: NOW_ISO,
  },
  {
    id: 'ter-mum-e', entity_id: '',
    territory_code: 'TER/MUM-E', territory_name: 'Mumbai East',
    parent_territory_id: null,
    assigned_salesman_ids: ['sm-t3'],
    state_codes: ['27'],
    district_codes: ['MUM'],
    city_codes: [],
    is_active: true,
    notes: 'Ghatkopar to Mulund',
    created_at: NOW_ISO, updated_at: NOW_ISO,
  },
  {
    id: 'ter-pune', entity_id: '',
    territory_code: 'TER/PUNE', territory_name: 'Pune Metro',
    parent_territory_id: null,
    assigned_salesman_ids: ['sm-t4'],
    state_codes: ['27'],
    district_codes: ['PUN'],
    city_codes: [],
    is_active: true,
    notes: 'Pune city + Pimpri-Chinchwad',
    created_at: NOW_ISO, updated_at: NOW_ISO,
  },
];

// ─── Beat Routes ────────────────────────────────────────────────────────
// Stops reference customer IDs; if customers seed uses partyCode as id, the visit
// tracking screen still works via the customer dropdown. The seed values here are
// intentionally generic — actual stops get edited per entity.
export const DEMO_BEAT_ROUTES: BeatRoute[] = [
  {
    id: 'beat-mum-w-mon', entity_id: '',
    beat_code: 'BEAT/MUM-W-MON', beat_name: 'Mumbai West Monday',
    territory_id: 'ter-mum-w',
    salesman_id: 'sm-t1',
    frequency: 'weekly',
    day_of_week: 'monday',
    stops: [],
    is_active: true,
    notes: 'Bandra → Andheri → Borivali sweep',
    created_at: NOW_ISO, updated_at: NOW_ISO,
  },
  {
    id: 'beat-mum-w-thu', entity_id: '',
    beat_code: 'BEAT/MUM-W-THU', beat_name: 'Mumbai West Thursday',
    territory_id: 'ter-mum-w',
    salesman_id: 'sm-t2',
    frequency: 'weekly',
    day_of_week: 'thursday',
    stops: [],
    is_active: true,
    notes: 'Khar → Santacruz → Goregaon',
    created_at: NOW_ISO, updated_at: NOW_ISO,
  },
  {
    id: 'beat-pune-daily', entity_id: '',
    beat_code: 'BEAT/PUNE-DLY', beat_name: 'Pune Daily Sweep',
    territory_id: 'ter-pune',
    salesman_id: 'sm-t4',
    frequency: 'daily',
    day_of_week: null,
    stops: [],
    is_active: true,
    notes: 'High-frequency core accounts',
    created_at: NOW_ISO, updated_at: NOW_ISO,
  },
];

// ─── Visit Logs (recent) ────────────────────────────────────────────────
// Generic visits — the customer_id values are illustrative; the report engines
// degrade gracefully when references don't match (they show "—").
export const DEMO_VISIT_LOGS: VisitLog[] = [
  {
    id: 'vl-1', entity_id: '',
    salesman_id: 'sm-t1', salesman_name: 'Amit Kumar',
    customer_id: 'cust-001', customer_name: 'Demo Customer 1',
    beat_id: 'beat-mum-w-mon',
    check_in_time: daysAgo(2),
    check_in_geo: { latitude: 19.0760, longitude: 72.8777, accuracy_meters: 12 },
    check_out_time: daysAgo(2),
    check_out_geo: { latitude: 19.0760, longitude: 72.8777, accuracy_meters: 14 },
    customer_geo: { latitude: 19.0762, longitude: 72.8778, accuracy_meters: null },
    distance_from_customer_meters: 28,
    within_radius: true,
    purpose: 'regular_visit',
    outcome: 'order_captured',
    notes: 'Re-stock order placed',
    order_captured_value: 45_000,
    order_voucher_id: null,
    next_visit_date: null,
    photo_urls: [],
    created_at: daysAgo(2),
  },
  {
    id: 'vl-2', entity_id: '',
    salesman_id: 'sm-t2', salesman_name: 'Priya Sharma',
    customer_id: 'cust-002', customer_name: 'Demo Customer 2',
    beat_id: 'beat-mum-w-thu',
    check_in_time: daysAgo(1),
    check_in_geo: { latitude: 19.0822, longitude: 72.8408, accuracy_meters: 8 },
    check_out_time: daysAgo(1),
    check_out_geo: { latitude: 19.0822, longitude: 72.8408, accuracy_meters: 10 },
    customer_geo: { latitude: 19.0820, longitude: 72.8410, accuracy_meters: null },
    distance_from_customer_meters: 32,
    within_radius: true,
    purpose: 'follow_up',
    outcome: 'follow_up_scheduled',
    notes: 'Will revisit next week',
    order_captured_value: 0,
    order_voucher_id: null,
    next_visit_date: null,
    photo_urls: [],
    created_at: daysAgo(1),
  },
  {
    id: 'vl-3', entity_id: '',
    salesman_id: 'sm-t4', salesman_name: 'Anjali Singh',
    customer_id: 'cust-003', customer_name: 'Demo Customer 3',
    beat_id: 'beat-pune-daily',
    check_in_time: daysAgo(0),
    check_in_geo: { latitude: 18.5204, longitude: 73.8567, accuracy_meters: 15 },
    check_out_time: null,
    check_out_geo: null,
    customer_geo: null,
    distance_from_customer_meters: null,
    within_radius: true,
    purpose: 'product_demo',
    outcome: 'sample_given',
    notes: 'Demo of new SKU',
    order_captured_value: 0,
    order_voucher_id: null,
    next_visit_date: null,
    photo_urls: [],
    created_at: daysAgo(0),
  },
];

// ─── Secondary Sales ────────────────────────────────────────────────────
export const DEMO_SECONDARY_SALES: SecondarySales[] = [
  {
    id: 'ss-1', entity_id: '',
    secondary_code: 'SEC/25-26/0001',
    sale_date: TODAY,
    distributor_id: 'cust-dist-1',
    distributor_name: 'Western Distributors Pvt Ltd',
    end_customer_type: 'retailer',
    end_customer_name: 'Sai Provision Store',
    end_customer_code: null,
    lines: [
      { id: 'ssl-1', item_code: 'ITM-001', item_name: 'Demo Item A', qty: 50, uom: 'Nos', rate: 120, amount: 6000 },
      { id: 'ssl-2', item_code: 'ITM-002', item_name: 'Demo Item B', qty: 25, uom: 'Box', rate: 480, amount: 12000 },
    ],
    total_amount: 18000,
    capture_mode: 'manual',
    api_request_id: null,
    notes: 'Weekly retailer order',
    created_at: NOW_ISO, updated_at: NOW_ISO,
  },
  {
    id: 'ss-2', entity_id: '',
    secondary_code: 'SEC/25-26/0002',
    sale_date: TODAY,
    distributor_id: 'cust-dist-2',
    distributor_name: 'Eastern Trade Links',
    end_customer_type: 'sub_dealer',
    end_customer_name: 'Krishna Agencies',
    end_customer_code: null,
    lines: [
      { id: 'ssl-3', item_code: 'ITM-001', item_name: 'Demo Item A', qty: 100, uom: 'Nos', rate: 115, amount: 11500 },
    ],
    total_amount: 11500,
    capture_mode: 'manual',
    api_request_id: null,
    notes: null,
    created_at: NOW_ISO, updated_at: NOW_ISO,
  },
];
