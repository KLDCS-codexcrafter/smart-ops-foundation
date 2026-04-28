/**
 * campaign.ts — Marketing campaign master · Canvas Wave 1 (T-Phase-1.1.1b)
 * [JWT] GET/POST/PUT/DELETE /api/salesx/campaigns
 *
 * 20 campaign types · communication channels · target filters ·
 * budget breakdown · follow-up rules · outcome tracking · performance metrics
 */

export type CampaignType =
  | 'CALL' | 'SMS' | 'WA' | 'EMAIL' | 'VISIT' | 'MEET' | 'WEB' | 'EXPO'
  | 'EVENT' | 'DEMO' | 'XSELL' | 'UPSELL' | 'RET' | 'WINBACK' | 'REFER'
  | 'SURVEY' | 'PARTNER' | 'CSR' | 'GEO' | 'AI';

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  CALL:'Outbound Call', SMS:'SMS Broadcast', WA:'WhatsApp', EMAIL:'Email',
  VISIT:'Field Visit', MEET:'Meeting / Seminar', WEB:'Webinar', EXPO:'Exhibition',
  EVENT:'Event Marketing', DEMO:'Demo Drive', XSELL:'Cross-Sell', UPSELL:'Upsell',
  RET:'Retention', WINBACK:'Win-Back', REFER:'Referral', SURVEY:'Survey',
  PARTNER:'Partner / Channel', CSR:'CSR Outreach', GEO:'Geo-Targeted', AI:'AI-Assisted',
};

export type CommunicationChannel =
  | 'phone' | 'whatsapp' | 'email' | 'sms'
  | 'in_person' | 'social_media' | 'website' | 'push_notification';

export const CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  phone:'Phone', whatsapp:'WhatsApp', email:'Email', sms:'SMS',
  in_person:'In-Person', social_media:'Social Media',
  website:'Website', push_notification:'Push Notification',
};

export interface TargetFilters {
  customer_type: 'all' | 'new' | 'existing' | 'lapsed' | 'prospect';
  min_purchase_value: number | null;
  territory_ids: string[];
  product_category_ids: string[];
  last_purchase_days: number | null;
  tags: string[];
}

export interface CampaignBudget {
  total: number;
  creative: number;
  media: number;
  events: number;
  incentives: number;
  staff: number;
  technology: number;
  misc: number;
  actual_spent: number;
}

export interface FollowUpRule {
  enabled: boolean;
  auto_create_enquiry: boolean;
  follow_up_days: number;
  max_follow_ups: number;
  assign_to_salesman_id: string | null;
  assign_to_salesman_name: string | null;
  reminder_note: string | null;
}

export interface OutcomeTracking {
  target_reach: number;
  actual_reach: number;
  responses: number;
  enquiries_generated: number;
  quotations_generated: number;
  orders_converted: number;
  revenue_attributed: number;
}

export interface PerformanceMetrics {
  response_rate: number;
  enquiry_conversion_rate: number;
  order_conversion_rate: number;
  cost_per_enquiry: number;
  cost_per_order: number;
  roi_pct: number;
}

export type CampaignStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export interface Campaign {
  id: string;
  entity_id: string;
  campaign_code: string;
  campaign_name: string;
  campaign_type: CampaignType;
  communication_channels: CommunicationChannel[];
  start_date: string;
  end_date: string | null;
  budget: number | null;
  budget_breakdown: CampaignBudget | null;
  target_filters: TargetFilters | null;
  follow_up_rule: FollowUpRule | null;
  outcome_tracking: OutcomeTracking | null;
  performance_metrics: PerformanceMetrics | null;
  status: CampaignStatus;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const defaultTargetFilters = (): TargetFilters => ({
  customer_type: 'all', min_purchase_value: null,
  territory_ids: [], product_category_ids: [],
  last_purchase_days: null, tags: [],
});

export const defaultBudget = (): CampaignBudget => ({
  total: 0, creative: 0, media: 0, events: 0,
  incentives: 0, staff: 0, technology: 0, misc: 0, actual_spent: 0,
});

export const defaultFollowUpRule = (): FollowUpRule => ({
  enabled: false, auto_create_enquiry: false,
  follow_up_days: 3, max_follow_ups: 3,
  assign_to_salesman_id: null, assign_to_salesman_name: null,
  reminder_note: null,
});

export const defaultOutcomeTracking = (): OutcomeTracking => ({
  target_reach: 0, actual_reach: 0, responses: 0,
  enquiries_generated: 0, quotations_generated: 0,
  orders_converted: 0, revenue_attributed: 0,
});

export function computeMetrics(b: CampaignBudget, o: OutcomeTracking): PerformanceMetrics {
  const spent = b.actual_spent || 0;
  const safe = (n: number, d: number) => d === 0 ? 0 : Math.round((n / d) * 100 * 10) / 10;
  return {
    response_rate:           safe(o.responses, o.actual_reach),
    enquiry_conversion_rate: safe(o.enquiries_generated, o.responses || o.actual_reach),
    order_conversion_rate:   safe(o.orders_converted, o.enquiries_generated),
    cost_per_enquiry:        o.enquiries_generated > 0 ? Math.round(spent / o.enquiries_generated) : 0,
    cost_per_order:          o.orders_converted > 0 ? Math.round(spent / o.orders_converted) : 0,
    roi_pct:                 spent > 0 ? Math.round(((o.revenue_attributed - spent) / spent) * 1000) / 10 : 0,
  };
}

export const campaignsKey = (e: string) => `erp_campaigns_${e}`;
