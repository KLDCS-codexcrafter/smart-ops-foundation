/**
 * lead.ts — Lead / Enquiry master data model
 * [JWT] GET/POST/PUT/DELETE /api/salesx/leads
 */

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost' | 'duplicate';
export type LeadSource =
  | 'walk_in' | 'phone' | 'whatsapp' | 'website'
  | 'reference' | 'campaign' | 'trade_show' | 'other';

export interface Lead {
  id: string;
  entity_id: string;
  lead_no: string;            // auto-gen LEAD/YY-YY/0001
  lead_date: string;
  contact_name: string;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
  source: LeadSource;
  status: LeadStatus;
  assigned_salesman_id?: string | null;
  assigned_telecaller_id?: string | null;
  reference_person_id?: string | null;
  product_interest?: string | null;
  estimated_value?: number | null;
  next_follow_up?: string | null;
  notes?: string | null;
  converted_opportunity_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const leadsKey = (e: string) => `erp_leads_${e}`;
