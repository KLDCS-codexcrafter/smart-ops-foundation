/**
 * exhibition.ts — Exhibition / Trade Show management · Canvas Wave 2 (T-Phase-1.1.1c)
 * [JWT] GET/POST/PUT/DELETE /api/salesx/exhibitions
 */

export type ExhibitionStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export type ExhibitionCategory =
  | 'trade_fair' | 'industry_expo' | 'road_show' | 'dealer_meet'
  | 'product_launch' | 'conference' | 'buyer_seller' | 'government'
  | 'international' | 'other';

export const EXHIBITION_CATEGORY_LABELS: Record<ExhibitionCategory, string> = {
  trade_fair: 'Trade Fair', industry_expo: 'Industry Expo', road_show: 'Road Show',
  dealer_meet: 'Dealer / Partner Meet', product_launch: 'Product Launch',
  conference: 'Conference', buyer_seller: 'Buyer-Seller Meet',
  government: 'Government / PSU Event', international: 'International Exhibition', other: 'Other',
};

export type VisitorInterestLevel = 'hot' | 'warm' | 'cold' | 'not_interested';

export interface ExhibitionVisitor {
  id: string; exhibition_id: string;
  visit_date: string; visit_time: string | null;
  capture_method: 'manual' | 'qr_scan' | 'badge_scan' | 'business_card';
  visitor_name: string; company_name: string | null;
  designation: string | null; mobile: string | null;
  email: string | null; city: string | null;
  interest_level: VisitorInterestLevel;
  products_interested: string[]; estimated_value: number | null;
  notes: string | null; enquiry_created: boolean; enquiry_id: string | null;
  follow_up_due: string | null;
  assigned_salesman_id: string | null; assigned_salesman_name: string | null;
  created_at: string; updated_at: string;
}

export interface ExhibitionBudget {
  booth: number; travel: number; meals: number;
  marketing: number; staff: number; misc: number;
  total_planned: number; total_actual: number; variance: number;
}

export interface ExhibitionOutcome {
  total_visitors: number; hot_leads: number; warm_leads: number;
  enquiries_created: number; quotations_raised: number;
  orders_converted: number; revenue_attributed: number;
}

export interface Exhibition {
  id: string; entity_id: string;
  exhibition_code: string; exhibition_name: string;
  category: ExhibitionCategory; organiser: string | null;
  venue_name: string; venue_city: string; venue_state: string | null;
  start_date: string; end_date: string;
  stall_no: string | null; stall_size: string | null;
  team_members: string[]; campaign_code: string | null;
  budget: ExhibitionBudget | null; outcome: ExhibitionOutcome | null;
  status: ExhibitionStatus; description: string | null; is_active: boolean;
  created_at: string; updated_at: string;
}

export const defaultExhibitionBudget = (): ExhibitionBudget => ({
  booth: 0, travel: 0, meals: 0, marketing: 0, staff: 0, misc: 0,
  total_planned: 0, total_actual: 0, variance: 0,
});

export const defaultExhibitionOutcome = (): ExhibitionOutcome => ({
  total_visitors: 0, hot_leads: 0, warm_leads: 0,
  enquiries_created: 0, quotations_raised: 0, orders_converted: 0, revenue_attributed: 0,
});

export function computeExhibitionBudget(b: ExhibitionBudget): ExhibitionBudget {
  const total_planned = b.booth + b.travel + b.meals + b.marketing + b.staff + b.misc;
  return { ...b, total_planned, variance: b.total_actual - total_planned };
}

export const exhibitionsKey = (e: string) => `erp_exhibitions_${e}`;
export const exhibitionVisitorsKey = (e: string) => `erp_exhibition_visitors_${e}`;
