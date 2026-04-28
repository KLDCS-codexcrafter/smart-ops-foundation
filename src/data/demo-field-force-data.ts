/**
 * demo-field-force-data.ts — Sprint 7 seed: Territories, Beats, Visits, Secondary Sales
 * [JWT] Read by orchestrator → POST /api/salesx/*
 *
 * Volumes target (Sprint 7 demo polish):
 *  - 12 territories (trading + services + manufacturing)
 *  - ~30+ beats (2 per salesman: Mon + Wed)
 *  - ~80–120 backdated visit logs (30–45 days, ~70% beat completion)
 *  - ~30+ secondary sales rows (3–4 months × distributors, trading + mfg only)
 */
import type { Territory } from '@/types/territory';
import type { BeatRoute, BeatCustomerStop, DayOfWeek } from '@/types/beat-route';
import type { VisitLog, VisitOutcome, VisitPurpose } from '@/types/visit-log';
import type { SecondarySales, SecondarySalesLine, EndCustomerType } from '@/types/secondary-sales';

const NOW_ISO = new Date().toISOString();
const TODAY = new Date().toISOString().slice(0, 10);

function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString();
}
function dateOnlyDaysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Deterministic pseudo-random (seeded) so demo is stable across reloads.
let _seed = 4242;
function rand(): number {
  // mulberry32
  _seed = (_seed + 0x6D2B79F5) | 0;
  let t = _seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T { return arr[Math.floor(rand() * arr.length)]; }
function jitter(value: number, range: number): number {
  return value + (rand() - 0.5) * range;
}

// Reset seed at module load so each evaluation produces same volumes.
function resetSeed() { _seed = 4242; }

// ─── Territories ────────────────────────────────────────────────────────
// Salesman ids reference DEMO_SAM_PERSONS in demo-salesx-data.ts.
// trading: sm-t1..sm-t6 ; services: sm-s1..sm-s4 ; manufacturing: sm-m1..sm-m5
export const DEMO_TERRITORIES: Territory[] = [
  // ── Trading (4) ──
  { id: 'ter-t-mum-w', entity_id: '', territory_code: 'TER/MUM-W', territory_name: 'Mumbai West',
    parent_territory_id: null, assigned_salesman_ids: ['sm-t1', 'sm-t2'],
    state_codes: ['27'], district_codes: ['MUM'], city_codes: [],
    is_active: true, notes: 'Bandra to Borivali corridor',
    created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'ter-t-mum-e', entity_id: '', territory_code: 'TER/MUM-E', territory_name: 'Mumbai East',
    parent_territory_id: null, assigned_salesman_ids: ['sm-t3'],
    state_codes: ['27'], district_codes: ['MUM'], city_codes: [],
    is_active: true, notes: 'Ghatkopar to Mulund',
    created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'ter-t-pune', entity_id: '', territory_code: 'TER/PUNE', territory_name: 'Pune Metro',
    parent_territory_id: null, assigned_salesman_ids: ['sm-t4'],
    state_codes: ['27'], district_codes: ['PUN'], city_codes: [],
    is_active: true, notes: 'Pune city + Pimpri-Chinchwad',
    created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'ter-t-ahd', entity_id: '', territory_code: 'TER/AHD', territory_name: 'Ahmedabad',
    parent_territory_id: null, assigned_salesman_ids: ['sm-t5', 'sm-t6'],
    state_codes: ['24'], district_codes: ['AHD'], city_codes: [],
    is_active: true, notes: 'CG Road, Ashram Road, SG Highway belt',
    created_at: NOW_ISO, updated_at: NOW_ISO },

  // ── Services (3) ──
  { id: 'ter-s-blr', entity_id: '', territory_code: 'TER/BLR', territory_name: 'Bangalore Tech Belt',
    parent_territory_id: null, assigned_salesman_ids: ['sm-s1', 'sm-s2'],
    state_codes: ['29'], district_codes: ['BLR'], city_codes: [],
    is_active: true, notes: 'Whitefield, Sarjapur, ORR',
    created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'ter-s-hyd', entity_id: '', territory_code: 'TER/HYD', territory_name: 'Hyderabad',
    parent_territory_id: null, assigned_salesman_ids: ['sm-s3'],
    state_codes: ['36'], district_codes: ['HYD'], city_codes: [],
    is_active: true, notes: 'HITEC City + Gachibowli',
    created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'ter-s-chn', entity_id: '', territory_code: 'TER/CHN', territory_name: 'Chennai',
    parent_territory_id: null, assigned_salesman_ids: ['sm-s4'],
    state_codes: ['33'], district_codes: ['CHN'], city_codes: [],
    is_active: true, notes: 'OMR + Guindy',
    created_at: NOW_ISO, updated_at: NOW_ISO },

  // ── Manufacturing (5) ──
  { id: 'ter-m-pune', entity_id: '', territory_code: 'TER/M-PUNE', territory_name: 'Pune Industrial',
    parent_territory_id: null, assigned_salesman_ids: ['sm-m1'],
    state_codes: ['27'], district_codes: ['PUN'], city_codes: [],
    is_active: true, notes: 'Bhosari, Hadapsar MIDC',
    created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'ter-m-mum', entity_id: '', territory_code: 'TER/M-MUM', territory_name: 'Mumbai MMR',
    parent_territory_id: null, assigned_salesman_ids: ['sm-m2'],
    state_codes: ['27'], district_codes: ['MUM'], city_codes: [],
    is_active: true, notes: 'Vikhroli, Andheri MIDC',
    created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'ter-m-chakan', entity_id: '', territory_code: 'TER/CHAKAN', territory_name: 'Chakan Auto Cluster',
    parent_territory_id: null, assigned_salesman_ids: ['sm-m3'],
    state_codes: ['27'], district_codes: ['PUN'], city_codes: [],
    is_active: true, notes: 'Chakan MIDC Phase 1+2',
    created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'ter-m-nashik', entity_id: '', territory_code: 'TER/NASHIK', territory_name: 'Nashik',
    parent_territory_id: null, assigned_salesman_ids: ['sm-m4'],
    state_codes: ['27'], district_codes: ['NSK'], city_codes: [],
    is_active: true, notes: 'Satpur + Ambad MIDC',
    created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'ter-m-aur', entity_id: '', territory_code: 'TER/AUR', territory_name: 'Aurangabad',
    parent_territory_id: null, assigned_salesman_ids: ['sm-m5'],
    state_codes: ['27'], district_codes: ['AUR'], city_codes: [],
    is_active: true, notes: 'Waluj + Shendra MIDC',
    created_at: NOW_ISO, updated_at: NOW_ISO },
];

// ─── Beat Routes ────────────────────────────────────────────────────────
// 2 beats per salesman (Monday + Wednesday). Customer stops are illustrative
// IDs; reports degrade gracefully when refs don't match real customer master.

interface SalesmanSeed {
  id: string; name: string; territory_id: string;
  cust_prefix: string; cust_count: number;
  base_lat: number; base_lng: number;
}

const SALESMAN_SEEDS: SalesmanSeed[] = [
  // Trading
  { id: 'sm-t1', name: 'Amit Kumar',     territory_id: 'ter-t-mum-w', cust_prefix: 'CUST-T0', cust_count: 20, base_lat: 19.0760, base_lng: 72.8777 },
  { id: 'sm-t2', name: 'Priya Sharma',   territory_id: 'ter-t-mum-w', cust_prefix: 'CUST-T0', cust_count: 20, base_lat: 19.0822, base_lng: 72.8408 },
  { id: 'sm-t3', name: 'Rahul Verma',    territory_id: 'ter-t-mum-e', cust_prefix: 'CUST-T0', cust_count: 20, base_lat: 19.0860, base_lng: 72.9080 },
  { id: 'sm-t4', name: 'Anjali Singh',   territory_id: 'ter-t-pune',  cust_prefix: 'CUST-T0', cust_count: 20, base_lat: 18.5204, base_lng: 73.8567 },
  { id: 'sm-t5', name: 'Vikram Mehta',   territory_id: 'ter-t-ahd',   cust_prefix: 'CUST-T0', cust_count: 20, base_lat: 23.0225, base_lng: 72.5714 },
  { id: 'sm-t6', name: 'Neha Kapoor',    territory_id: 'ter-t-ahd',   cust_prefix: 'CUST-T0', cust_count: 20, base_lat: 23.0300, base_lng: 72.5800 },

  // Services
  { id: 'sm-s1', name: 'Rohit Mishra',   territory_id: 'ter-s-blr', cust_prefix: 'CUST-S0', cust_count: 12, base_lat: 12.9716, base_lng: 77.5946 },
  { id: 'sm-s2', name: 'Kavita Iyer',    territory_id: 'ter-s-blr', cust_prefix: 'CUST-S0', cust_count: 12, base_lat: 12.9352, base_lng: 77.6245 },
  { id: 'sm-s3', name: 'Suresh Reddy',   territory_id: 'ter-s-hyd', cust_prefix: 'CUST-S0', cust_count: 12, base_lat: 17.4485, base_lng: 78.3908 },
  { id: 'sm-s4', name: 'Pooja Patel',    territory_id: 'ter-s-chn', cust_prefix: 'CUST-S0', cust_count: 12, base_lat: 13.0827, base_lng: 80.2707 },

  // Manufacturing
  { id: 'sm-m1', name: 'Manish Gupta',   territory_id: 'ter-m-pune',   cust_prefix: 'CUST-M0', cust_count: 13, base_lat: 18.6298, base_lng: 73.7997 },
  { id: 'sm-m2', name: 'Sneha Joshi',    territory_id: 'ter-m-mum',    cust_prefix: 'CUST-M0', cust_count: 13, base_lat: 19.1075, base_lng: 72.9260 },
  { id: 'sm-m3', name: 'Arun Pillai',    territory_id: 'ter-m-chakan', cust_prefix: 'CUST-M0', cust_count: 13, base_lat: 18.7606, base_lng: 73.8636 },
  { id: 'sm-m4', name: 'Divya Nair',     territory_id: 'ter-m-nashik', cust_prefix: 'CUST-M0', cust_count: 13, base_lat: 19.9975, base_lng: 73.7898 },
  { id: 'sm-m5', name: 'Karan Bhatia',   territory_id: 'ter-m-aur',    cust_prefix: 'CUST-M0', cust_count: 13, base_lat: 19.8762, base_lng: 75.3433 },
];

function custCodeFor(seed: SalesmanSeed, idx: number): string {
  // pad to 3 digits, e.g. CUST-T001
  const n = ((idx - 1) % seed.cust_count) + 1;
  return `${seed.cust_prefix}${String(n).padStart(2, '0')}`.replace(/0(\d{2})$/, '$1') // unused safety
    .replace(seed.cust_prefix, seed.cust_prefix) ;
}
// simpler builder (avoid regex weirdness)
function custCode(seed: SalesmanSeed, n: number): string {
  return `${seed.cust_prefix}${String(((n - 1) % seed.cust_count) + 1).padStart(2, '0')}`;
}

function makeStops(seed: SalesmanSeed, startIdx: number, count: number): BeatCustomerStop[] {
  const stops: BeatCustomerStop[] = [];
  for (let i = 0; i < count; i++) {
    const customerNum = startIdx + i;
    stops.push({
      id: `stop-${seed.id}-${startIdx}-${i}`,
      customer_id: custCode(seed, customerNum),
      sequence: i + 1,
      planned_duration_minutes: 30,
      notes: null,
    });
  }
  return stops;
}

function makeBeats(): BeatRoute[] {
  resetSeed();
  const beats: BeatRoute[] = [];
  for (const seed of SALESMAN_SEEDS) {
    // Monday beat
    const monStops = randInt(6, 8);
    beats.push({
      id: `beat-${seed.id}-mon`, entity_id: '',
      beat_code: `BEAT/${seed.id.toUpperCase()}-MON`,
      beat_name: `${seed.name.split(' ')[0]} - Monday Beat`,
      territory_id: seed.territory_id,
      salesman_id: seed.id,
      frequency: 'weekly',
      day_of_week: 'monday',
      stops: makeStops(seed, 1, monStops),
      is_active: true,
      notes: 'Weekly Monday route',
      created_at: NOW_ISO, updated_at: NOW_ISO,
    });
    // Wednesday beat
    const wedStops = randInt(6, 8);
    beats.push({
      id: `beat-${seed.id}-wed`, entity_id: '',
      beat_code: `BEAT/${seed.id.toUpperCase()}-WED`,
      beat_name: `${seed.name.split(' ')[0]} - Wednesday Beat`,
      territory_id: seed.territory_id,
      salesman_id: seed.id,
      frequency: 'weekly',
      day_of_week: 'wednesday',
      stops: makeStops(seed, monStops + 1, wedStops),
      is_active: true,
      notes: 'Weekly Wednesday route',
      created_at: NOW_ISO, updated_at: NOW_ISO,
    });
  }
  return beats;
}

export const DEMO_BEAT_ROUTES: BeatRoute[] = makeBeats();

// ─── Visit Logs ─────────────────────────────────────────────────────────
const OUTCOME_BUCKETS: Array<{ outcome: VisitOutcome; purpose: VisitPurpose; weight: number }> = [
  { outcome: 'order_captured',         purpose: 'regular_visit',  weight: 25 },
  { outcome: 'follow_up_scheduled',    purpose: 'follow_up',      weight: 35 },
  { outcome: 'sample_given',           purpose: 'product_demo',   weight: 15 },
  { outcome: 'customer_not_available', purpose: 'regular_visit',  weight: 10 },
  { outcome: 'no_requirement',         purpose: 'regular_visit',  weight: 5 },
  { outcome: 'shop_closed',            purpose: 'regular_visit',  weight: 5 },
  { outcome: 'complaint_registered',   purpose: 'complaint_resolution', weight: 3 },
  { outcome: 'other',                  purpose: 'scheme_briefing', weight: 2 },
];

function pickOutcome(): { outcome: VisitOutcome; purpose: VisitPurpose } {
  const totalWeight = OUTCOME_BUCKETS.reduce((s, b) => s + b.weight, 0);
  let r = rand() * totalWeight;
  for (const b of OUTCOME_BUCKETS) {
    r -= b.weight;
    if (r <= 0) return { outcome: b.outcome, purpose: b.purpose };
  }
  return { outcome: 'other', purpose: 'regular_visit' };
}

function makeVisitLogs(beats: BeatRoute[]): VisitLog[] {
  resetSeed();
  const logs: VisitLog[] = [];
  let logCounter = 1;

  // Weeks back: 5 weeks (~35 days). For each beat × each scheduled day in window,
  // ~70% of stops are visited.
  const WEEKS_BACK = 5;
  const DAY_OFFSET: Record<DayOfWeek, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  };

  // Compute today's day-of-week index (0=Sun..6=Sat)
  const todayDow = new Date().getDay();

  for (const beat of beats) {
    if (!beat.day_of_week) continue;
    const beatDowIdx = DAY_OFFSET[beat.day_of_week];

    for (let w = 0; w < WEEKS_BACK; w++) {
      // Days back to the most recent occurrence of beat.day_of_week, then add weeks.
      let daysBack = (todayDow - beatDowIdx + 7) % 7;
      if (daysBack === 0) daysBack = 7; // skip "today" so check_out is meaningful
      daysBack += w * 7;
      if (daysBack > 45) continue;

      const seed = SALESMAN_SEEDS.find(s => s.id === beat.salesman_id);
      if (!seed) continue;

      for (const stop of beat.stops) {
        // ~70% completion
        if (rand() > 0.70) continue;

        const { outcome, purpose } = pickOutcome();
        const orderValue = outcome === 'order_captured'
          ? randInt(15_000, 400_000)
          : 0;

        // Customer geo (jitter base by ~1km for variety per stop)
        const custLat = jitter(seed.base_lat, 0.02); // ~2km spread
        const custLng = jitter(seed.base_lng, 0.02);

        // 90% within 500m radius — jitter check-in within ~0.003 deg (~330m)
        const within = rand() < 0.90;
        const checkInLat = within
          ? jitter(custLat, 0.005)   // ~250m
          : jitter(custLat, 0.02);   // ~1.5km outside
        const checkInLng = within
          ? jitter(custLng, 0.005)
          : jitter(custLng, 0.02);

        // Approx distance using equirectangular at this latitude
        const dLat = (checkInLat - custLat) * 111_320;
        const dLng = (checkInLng - custLng) * 111_320 * Math.cos(custLat * Math.PI / 180);
        const distance = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));

        const checkInTime = daysAgo(daysBack);
        // Check-out 15-90 minutes later
        const checkOutDate = new Date(checkInTime);
        checkOutDate.setMinutes(checkOutDate.getMinutes() + randInt(15, 90));

        logs.push({
          id: `vl-${String(logCounter++).padStart(4, '0')}`,
          entity_id: '',
          salesman_id: seed.id,
          salesman_name: seed.name,
          customer_id: stop.customer_id,
          customer_name: `Customer ${stop.customer_id}`,
          beat_id: beat.id,
          check_in_time: checkInTime,
          check_in_geo: { latitude: checkInLat, longitude: checkInLng, accuracy_meters: randInt(5, 30) },
          check_out_time: checkOutDate.toISOString(),
          check_out_geo: { latitude: checkInLat, longitude: checkInLng, accuracy_meters: randInt(5, 30) },
          customer_geo: { latitude: custLat, longitude: custLng, accuracy_meters: null },
          distance_from_customer_meters: distance,
          within_radius: within,
          purpose,
          outcome,
          notes: outcome === 'order_captured'
            ? 'Order placed'
            : outcome === 'follow_up_scheduled'
              ? 'Will revisit next cycle'
              : '',
          order_captured_value: orderValue,
          order_voucher_id: null,
          next_visit_date: outcome === 'follow_up_scheduled' ? dateOnlyDaysAgo(daysBack - 7) : null,
          photo_urls: [],
          signature_data_url: null,
          signature_captured_at: null,
          created_at: checkInTime,
        });
      }
    }
  }
  return logs;
}

export const DEMO_VISIT_LOGS: VisitLog[] = makeVisitLogs(DEMO_BEAT_ROUTES);

// ─── Secondary Sales ────────────────────────────────────────────────────
interface DistributorSeed {
  id: string; name: string; primary_value: number; // INR
}

// Trading + Manufacturing distributors only (skip services).
const DISTRIBUTOR_SEEDS: DistributorSeed[] = [
  { id: 'CUST-T001', name: 'Sharma Traders',       primary_value: 1_800_000 },
  { id: 'CUST-T002', name: 'Gupta Enterprises',    primary_value: 2_400_000 },
  { id: 'CUST-T004', name: 'Verma Distributors',   primary_value: 1_500_000 },
  { id: 'CUST-T005', name: 'Khanna Bros',          primary_value: 3_000_000 },
  { id: 'CUST-T010', name: 'Reddy Enterprises',    primary_value: 1_200_000 },
  { id: 'CUST-T015', name: 'Jindal Distribution',  primary_value: 2_000_000 },
  { id: 'CUST-M001', name: 'Hero Auto Parts Ltd',  primary_value: 4_500_000 },
  { id: 'CUST-M002', name: 'Bajaj Steel Works',    primary_value: 3_800_000 },
  { id: 'CUST-M005', name: 'Tata Motors Components', primary_value: 5_200_000 },
];

const SS_ITEMS = [
  { code: 'ITM-001', name: 'Premium Grade Bolts',     uom: 'Nos', rate: 120 },
  { code: 'ITM-002', name: 'Industrial Lubricant 5L', uom: 'Box', rate: 480 },
  { code: 'ITM-003', name: 'Hex Nut Pack',            uom: 'Pkt', rate: 95 },
  { code: 'ITM-004', name: 'MS Plate 6mm',            uom: 'Kg',  rate: 78 },
  { code: 'ITM-005', name: 'Welding Rod Pack',        uom: 'Pkt', rate: 320 },
  { code: 'ITM-006', name: 'Rubber Gasket Set',       uom: 'Set', rate: 210 },
  { code: 'ITM-007', name: 'Bearing 6205',            uom: 'Nos', rate: 180 },
  { code: 'ITM-008', name: 'Cable 4 Sq mm',           uom: 'Mtr', rate: 65 },
];

const END_CUSTOMER_NAMES: Record<EndCustomerType, string[]> = {
  sub_dealer:   ['Krishna Agencies', 'Mahalaxmi Traders', 'Shree Distributors', 'Om Sai Enterprises', 'Balaji Trading'],
  retailer:     ['Sai Provision Store', 'Lucky Hardware', 'Modern Stores', 'New Bharat Mart', 'Apna Bazaar'],
  end_consumer: ['Rajesh Kumar', 'Sunita Patil', 'Mohan Joshi', 'Anita Desai', 'Vikas Shinde'],
  institution:  ['Govt Workshop', 'PWD Division', 'Municipal Garage', 'Defence Workshop', 'Railway Depot'],
};

function pickEndCustomerType(): EndCustomerType {
  const r = rand();
  if (r < 0.50) return 'sub_dealer';
  if (r < 0.80) return 'retailer';
  if (r < 0.95) return 'end_consumer';
  return 'institution';
}

function makeSecondarySales(distributors: DistributorSeed[], months: number): SecondarySales[] {
  resetSeed();
  const out: SecondarySales[] = [];
  let counter = 1;
  const yy = new Date().getFullYear() % 100;
  const yyNext = (yy + 1) % 100;
  const yearTag = `${yy}-${yyNext}`;

  for (const dist of distributors) {
    // Target secondary value per month = primary / months × (60–80%)
    const totalSecondaryTarget = dist.primary_value * (0.60 + rand() * 0.20);
    const perMonthTarget = totalSecondaryTarget / months;

    for (let m = 0; m < months; m++) {
      // 1 row per distributor per month (mostly), occasionally 2.
      const rowsThisMonth = rand() < 0.30 ? 2 : 1;
      const baseDaysBack = 30 * m + randInt(2, 25);

      for (let r = 0; r < rowsThisMonth; r++) {
        const lineCount = randInt(3, 8);
        const lines: SecondarySalesLine[] = [];
        let total = 0;
        for (let i = 0; i < lineCount; i++) {
          const item = pick(SS_ITEMS);
          const qty = randInt(10, 200);
          const amount = qty * item.rate;
          total += amount;
          lines.push({
            id: `ssl-${counter}-${i}`,
            item_code: item.code,
            item_name: item.name,
            qty, uom: item.uom, rate: item.rate, amount,
          });
        }
        // Scale toward perMonthTarget by adjusting last line if needed (small nudge)
        const targetThisRow = perMonthTarget / rowsThisMonth;
        const ratio = targetThisRow / total;
        if (ratio > 1.2 || ratio < 0.8) {
          const last = lines[lines.length - 1];
          const newAmount = Math.round(last.amount * ratio);
          total = total - last.amount + newAmount;
          last.amount = newAmount;
          last.qty = Math.max(1, Math.round(newAmount / last.rate));
        }

        const ecType = pickEndCustomerType();
        const ecName = pick(END_CUSTOMER_NAMES[ecType]);

        out.push({
          id: `ss-${String(counter).padStart(4, '0')}`,
          entity_id: '',
          secondary_code: `SEC/${yearTag}/${String(counter).padStart(4, '0')}`,
          sale_date: dateOnlyDaysAgo(baseDaysBack + r),
          distributor_id: dist.id,
          distributor_name: dist.name,
          end_customer_type: ecType,
          end_customer_name: ecName,
          end_customer_code: null,
          lines,
          total_amount: Math.round(total),
          capture_mode: rand() < 0.7 ? 'manual' : 'csv_import',
          api_request_id: null,
          notes: null,
          created_at: NOW_ISO, updated_at: NOW_ISO,
        });
        counter++;
      }
    }
  }
  return out;
}

export const DEMO_SECONDARY_SALES: SecondarySales[] = makeSecondarySales(DISTRIBUTOR_SEEDS, 4);

// Silence unused-export lint if any tooling complains.
export const __FF_SEED_META = {
  territories: DEMO_TERRITORIES.length,
  beats: DEMO_BEAT_ROUTES.length,
  visit_logs: DEMO_VISIT_LOGS.length,
  secondary_sales: DEMO_SECONDARY_SALES.length,
};

// (custCodeFor kept above as legacy; not exported.)
void custCodeFor;
// expose TODAY for callers that may need it (parity with prior shape)
export { TODAY };
