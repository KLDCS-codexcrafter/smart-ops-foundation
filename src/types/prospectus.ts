/**
 * prospectus.ts — Prospect company profile
 * Permanent record — never deleted even if lead is lost.
 * [JWT] GET/POST/PUT /api/salesx/prospects
 */

export type ProspectStatus = 'active' | 'converted' | 'dormant';

export interface Prospectus {
  id: string;
  entity_id: string;
  enquiry_id: string;
  company_name: string;
  address: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  area: string | null;
  pincode: string | null;
  contact_person: string | null;
  email: string | null;
  mobile: string | null;
  phone: string | null;
  fax: string | null;
  website: string | null;
  prospect_status: ProspectStatus;
  last_contacted: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const prospectsKey = (e: string) => `erp_prospects_${e}`;
