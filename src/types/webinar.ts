/**
 * webinar.ts — Webinar management · Canvas Wave 3 (T-Phase-1.1.1d)
 * [JWT] GET/POST/PUT/DELETE /api/salesx/webinars
 */

export type WebinarStatus = 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled';

export type WebinarPlatform =
  | 'zoom' | 'google_meet' | 'ms_teams' | 'webex'
  | 'youtube_live' | 'instagram_live' | 'custom' | 'in_house';

export const WEBINAR_PLATFORM_LABELS: Record<WebinarPlatform, string> = {
  zoom:           'Zoom',
  google_meet:    'Google Meet',
  ms_teams:       'Microsoft Teams',
  webex:          'Cisco Webex',
  youtube_live:   'YouTube Live',
  instagram_live: 'Instagram Live',
  custom:         'Custom Platform',
  in_house:       'In-House Tool',
};

export type WebinarCategory =
  | 'product_demo'
  | 'training'
  | 'thought_leadership'
  | 'product_launch'
  | 'customer_success'
  | 'technical'
  | 'sales_pitch'
  | 'onboarding'
  | 'other';

export const WEBINAR_CATEGORY_LABELS: Record<WebinarCategory, string> = {
  product_demo:       'Product Demo',
  training:           'Training',
  thought_leadership: 'Thought Leadership',
  product_launch:     'Product Launch',
  customer_success:   'Customer Success',
  technical:          'Technical Deep-Dive',
  sales_pitch:        'Sales Webinar',
  onboarding:         'Customer Onboarding',
  other:              'Other',
};

export type ParticipantStatus = 'registered' | 'attended' | 'no_show' | 'cancelled';

export interface WebinarParticipant {
  id: string;
  webinar_id: string;
  name: string;
  company: string | null;
  designation: string | null;
  email: string | null;
  mobile: string | null;
  city: string | null;
  registration_date: string;
  status: ParticipantStatus;
  attended_duration_mins: number | null;
  interest_level: 'hot' | 'warm' | 'cold' | 'not_interested';
  questions_asked: string | null;
  enquiry_created: boolean;
  enquiry_id: string | null;
  follow_up_due: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebinarBudget {
  platform_cost: number;
  speaker_fee: number;
  promotion: number;
  production: number;
  misc: number;
  total_planned: number;
  total_actual: number;
  variance: number;
}

export interface WebinarOutcome {
  registrations:       number;
  attendees:           number;
  no_shows:            number;
  avg_duration_mins:   number;
  questions_asked:     number;
  enquiries_created:   number;
  quotations_raised:   number;
  orders_converted:    number;
  revenue_attributed:  number;
  recording_views:     number;
}

export interface Webinar {
  id: string;
  entity_id: string;
  webinar_code: string;
  webinar_title: string;
  category: WebinarCategory;
  platform: WebinarPlatform;
  platform_url: string | null;
  platform_meeting_id: string | null;
  platform_passcode: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_mins: number;
  host_name: string | null;
  speakers: string[];
  topic_summary: string | null;
  target_audience: string | null;
  max_registrations: number | null;
  registration_link: string | null;
  recording_url: string | null;
  campaign_code: string | null;
  budget: WebinarBudget | null;
  outcome: WebinarOutcome | null;
  status: WebinarStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const defaultWebinarBudget = (): WebinarBudget => ({
  platform_cost: 0, speaker_fee: 0, promotion: 0,
  production: 0, misc: 0,
  total_planned: 0, total_actual: 0, variance: 0,
});

export const defaultWebinarOutcome = (): WebinarOutcome => ({
  registrations: 0, attendees: 0, no_shows: 0,
  avg_duration_mins: 0, questions_asked: 0,
  enquiries_created: 0, quotations_raised: 0,
  orders_converted: 0, revenue_attributed: 0,
  recording_views: 0,
});

export function computeWebinarBudget(b: WebinarBudget): WebinarBudget {
  const total_planned = b.platform_cost + b.speaker_fee + b.promotion + b.production + b.misc;
  return { ...b, total_planned, variance: b.total_actual - total_planned };
}

export function computeWebinarMetrics(o: WebinarOutcome) {
  const attendance_rate = o.registrations > 0
    ? Math.round((o.attendees / o.registrations) * 1000) / 10 : 0;
  const enquiry_rate = o.attendees > 0
    ? Math.round((o.enquiries_created / o.attendees) * 1000) / 10 : 0;
  const conversion_rate = o.enquiries_created > 0
    ? Math.round((o.orders_converted / o.enquiries_created) * 1000) / 10 : 0;
  return { attendance_rate, enquiry_rate, conversion_rate };
}

export const webinarsKey = (e: string) => `erp_webinars_${e}`;
export const webinarParticipantsKey = (e: string) => `erp_webinar_participants_${e}`;
