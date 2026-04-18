/**
 * beat-route.ts — Beat / route master
 * Sprint 7. A Beat is a sequenced list of customers a salesman visits
 * on a specific cadence (daily/weekly/monthly). Day-of-week optional.
 * [JWT] GET/POST/PUT/DELETE /api/salesx/beat-routes
 */

export type BeatFrequency = 'daily' | 'weekly' | 'bi_weekly' | 'monthly';

export type DayOfWeek =
  | 'monday' | 'tuesday' | 'wednesday' | 'thursday'
  | 'friday' | 'saturday' | 'sunday';

export interface BeatCustomerStop {
  id: string;                       // stop row id
  customer_id: string;              // CustomerMaster.id
  sequence: number;                 // order in the route (1, 2, 3...)
  planned_duration_minutes: number; // rough time budget per stop
  notes: string | null;             // special instructions
}

export interface BeatRoute {
  id: string;
  entity_id: string;
  beat_code: string;                // BEAT/MUM-W-MON
  beat_name: string;                // "Mumbai West Monday Beat"
  territory_id: string;             // Territory.id
  salesman_id: string;              // SAMPerson.id (person_type='salesman')

  frequency: BeatFrequency;
  day_of_week: DayOfWeek | null;    // null for daily

  stops: BeatCustomerStop[];        // ordered sequence

  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const beatRoutesKey = (e: string) => `erp_beat_routes_${e}`;

export const FREQUENCY_LABELS: Record<BeatFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  bi_weekly: 'Bi-weekly',
  monthly: 'Monthly',
};

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};
