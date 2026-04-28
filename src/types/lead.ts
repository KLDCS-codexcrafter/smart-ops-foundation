/**
 * lead.ts — Lead Aggregation Hub · Canvas Wave (T-Phase-1.1.1f)
 * [JWT] GET/POST/PUT/DELETE /api/salesx/leads
 *
 * 9 platform channels · per-platform fields · deduplication ·
 * bulk import · convert-to-enquiry flow
 */

// ─── Platform channels ────────────────────────────────────────────────────────
export type LeadPlatform =
  | 'indiamart'
  | 'justdial'
  | 'tradeindia'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'email'
  | 'website'
  | 'whatsapp'
  | 'other';

export const LEAD_PLATFORM_LABELS: Record<LeadPlatform, string> = {
  indiamart:  'IndiaMart',
  justdial:   'JustDial',
  tradeindia: 'TradeIndia',
  facebook:   'Facebook',
  instagram:  'Instagram / Meta',
  linkedin:   'LinkedIn',
  email:      'Email',
  website:    'Website',
  whatsapp:   'WhatsApp',
  other:      'Other',
};

export const LEAD_PLATFORM_COLORS: Record<LeadPlatform, string> = {
  indiamart:  'bg-orange-500/15 text-orange-700 border-orange-500/30',
  justdial:   'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  tradeindia: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  facebook:   'bg-indigo-500/15 text-indigo-700 border-indigo-500/30',
  instagram:  'bg-pink-500/15 text-pink-700 border-pink-500/30',
  linkedin:   'bg-sky-500/15 text-sky-700 border-sky-500/30',
  email:      'bg-teal-500/15 text-teal-700 border-teal-500/30',
  website:    'bg-green-500/15 text-green-700 border-green-500/30',
  whatsapp:   'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  other:      'bg-muted text-muted-foreground border-border',
};

// ─── Lead status ──────────────────────────────────────────────────────────────
export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'converted'
  | 'lost'
  | 'duplicate';

// ─── Platform-specific extra fields ──────────────────────────────────────────
export interface LeadPlatformMeta {
  portal_lead_id?: string | null;
  portal_category?: string | null;
  portal_query?: string | null;
  buy_requirement?: string | null;
  ad_campaign?: string | null;
  ad_set?: string | null;
  form_name?: string | null;
  email_subject?: string | null;
  email_received_at?: string | null;
  page_url?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  wa_message?: string | null;
}

// ─── Main Lead interface ──────────────────────────────────────────────────────
export interface Lead {
  id: string;
  entity_id: string;
  lead_no: string;
  lead_date: string;
  platform: LeadPlatform;
  status: LeadStatus;
  contact_name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  product_interest: string | null;
  estimated_value: number | null;
  priority: 'high' | 'medium' | 'low';
  assigned_salesman_id: string | null;
  assigned_salesman_name: string | null;
  assigned_telecaller_id: string | null;
  platform_meta: LeadPlatformMeta | null;
  is_duplicate: boolean;
  duplicate_of_lead_id: string | null;
  next_follow_up: string | null;
  notes: string | null;
  converted_enquiry_id: string | null;
  converted_at: string | null;
  campaign_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Bulk import row (CSV simulation) ────────────────────────────────────────
export interface LeadImportRow {
  contact_name: string;
  company_name?: string;
  phone?: string;
  email?: string;
  city?: string;
  product_interest?: string;
  platform: LeadPlatform;
  portal_query?: string;
}

export const defaultLeadPlatformMeta = (): LeadPlatformMeta => ({});

export const leadsKey = (e: string) => `erp_leads_${e}`;
