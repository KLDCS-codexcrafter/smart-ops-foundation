/**
 * field-force-engine.ts — Pure field-force computations
 * Sprint 7. Haversine distance, radius check, today's beat resolution,
 * coverage % per salesman, aggregated secondary sales.
 * No localStorage. No React. No toast. Pure functions only.
 */

import type { Territory } from '@/types/territory';
import type { BeatRoute, DayOfWeek } from '@/types/beat-route';
import type { VisitLog, GeoPoint } from '@/types/visit-log';
import type { SecondarySales } from '@/types/secondary-sales';

const EARTH_RADIUS_M = 6_371_000;
const DAYS: DayOfWeek[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

/** Haversine distance in metres between two geo points. */
export function computeDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** True if point-a is within radiusMeters of point-b. */
export function isWithinRadius(a: GeoPoint, b: GeoPoint, radiusMeters: number): boolean {
  return computeDistanceMeters(a, b) <= radiusMeters;
}

/** Day-of-week for the given date (local timezone). */
export function dayOfWeekFor(date: Date): DayOfWeek {
  return DAYS[date.getDay()];
}

/** Resolve the beat(s) scheduled for a given salesman on a given date. */
export function todayBeatFor(
  salesmanId: string,
  onDate: Date,
  allBeats: BeatRoute[],
): BeatRoute[] {
  const today = dayOfWeekFor(onDate);
  return allBeats.filter(b =>
    b.salesman_id === salesmanId
    && b.is_active
    && (b.frequency === 'daily'
      || (b.frequency === 'weekly' && b.day_of_week === today)
      || (b.frequency === 'bi_weekly' && b.day_of_week === today)
      || (b.frequency === 'monthly' && b.day_of_week === today)),
  );
}

/** Coverage %: customers in territory that were visited in the period. */
export function computeCoveragePct(
  salesmanId: string,
  customerIdsInTerritory: string[],
  logsInPeriod: VisitLog[],
): number {
  if (customerIdsInTerritory.length === 0) return 0;
  const visitedSet = new Set(
    logsInPeriod
      .filter(l => l.salesman_id === salesmanId)
      .map(l => l.customer_id),
  );
  const covered = customerIdsInTerritory.filter(id => visitedSet.has(id)).length;
  return Math.round((covered / customerIdsInTerritory.length) * 100);
}

/** Days since last visit per customer (Infinity if never). */
export function daysSinceLastVisit(
  customerId: string,
  logs: VisitLog[],
  asOf: Date = new Date(),
): number {
  const customerLogs = logs.filter(l => l.customer_id === customerId);
  if (customerLogs.length === 0) return Infinity;
  const latest = customerLogs.reduce((max, l) =>
    new Date(l.check_in_time) > new Date(max.check_in_time) ? l : max,
  );
  const ms = asOf.getTime() - new Date(latest.check_in_time).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export interface BeatProductivity {
  planned_visits: number;
  actual_visits: number;
  completion_pct: number;
  orders_captured: number;
  order_value_total: number;
}

/** Beat productivity: planned vs actual per-day. */
export function computeBeatProductivity(
  beat: BeatRoute,
  logsInPeriod: VisitLog[],
): BeatProductivity {
  const planned = beat.stops.length;
  const logs = logsInPeriod.filter(l => l.beat_id === beat.id);
  const actual = logs.length;
  const orders = logs.filter(l => l.outcome === 'order_captured');
  return {
    planned_visits: planned,
    actual_visits: actual,
    completion_pct: planned > 0 ? Math.round((actual / planned) * 100) : 0,
    orders_captured: orders.length,
    order_value_total: orders.reduce((s, o) => s + o.order_captured_value, 0),
  };
}

/** Aggregate secondary sales by product across distributors + period. */
export function aggregateSecondarySalesByItem(
  sales: SecondarySales[],
): Record<string, { item_name: string; qty: number; amount: number }> {
  const byItem: Record<string, { item_name: string; qty: number; amount: number }> = {};
  for (const s of sales) {
    for (const line of s.lines) {
      if (!byItem[line.item_code]) {
        byItem[line.item_code] = { item_name: line.item_name, qty: 0, amount: 0 };
      }
      byItem[line.item_code].qty += line.qty;
      byItem[line.item_code].amount += line.amount;
    }
  }
  return byItem;
}

/** Aggregate secondary sales by distributor. */
export function aggregateSecondarySalesByDistributor(
  sales: SecondarySales[],
): Record<string, { distributor_name: string; total_amount: number; count: number }> {
  const byDist: Record<string, { distributor_name: string; total_amount: number; count: number }> = {};
  for (const s of sales) {
    if (!byDist[s.distributor_id]) {
      byDist[s.distributor_id] = { distributor_name: s.distributor_name, total_amount: 0, count: 0 };
    }
    byDist[s.distributor_id].total_amount += s.total_amount;
    byDist[s.distributor_id].count += 1;
  }
  return byDist;
}

/** Aggregate secondary sales by month (YYYY-MM). */
export function aggregateSecondarySalesByMonth(
  sales: SecondarySales[],
): Record<string, { month: string; total_amount: number; count: number }> {
  const byMonth: Record<string, { month: string; total_amount: number; count: number }> = {};
  for (const s of sales) {
    const month = s.sale_date.slice(0, 7); // YYYY-MM
    if (!byMonth[month]) {
      byMonth[month] = { month, total_amount: 0, count: 0 };
    }
    byMonth[month].total_amount += s.total_amount;
    byMonth[month].count += 1;
  }
  return byMonth;
}

/** Group territories by parent — for tree rendering. */
export function groupTerritoriesByParent(
  territories: Territory[],
): Record<string, Territory[]> {
  const byParent: Record<string, Territory[]> = {};
  for (const t of territories) {
    const key = t.parent_territory_id ?? '__root__';
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(t);
  }
  return byParent;
}
