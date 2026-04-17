/**
 * enquiry.ts — Enquiry / CRM lead data model
 * Based on Charis TDL: Sales Enquiry module UDF 4900-4975
 * [JWT] GET/POST/PUT/DELETE /api/salesx/enquiries
 */

export type EnquiryType = 'existing' | 'prospect' | 'partner';

export type EnquiryStatus =
  | 'new' | 'assigned' | 'pending' | 'in_process'
  | 'demo' | 'on_hold' | 'forwarded' | 'quote'
  | 'agreed' | 'sold' | 'lost';

export type FollowUpType = 'call' | 'email' | 'meeting' | 'tasks' | 'quote' | 'demo';
export type EnquiryPriority = 'high' | 'medium' | 'low' | 'urgent';

// One row in the history trail — append-only, never edited or deleted
export interface EnquiryFollowUp {
  id: string;
  date: string;                   // YYYY-MM-DD
  time: string;                   // HH:MM
  follow_up_type: FollowUpType;
  status: EnquiryStatus;
  executive_id: string | null;
  executive_name: string | null;
  follow_up_date: string | null;  // next follow-up scheduled date
  follow_up_time: string | null;
  reason: string | null;          // required when status = lost | on_hold
  remarks: string;
  user_name: string;
}

export interface EnquiryItem {
  id: string;
  product_name: string;
  quantity: number;
  unit: string | null;
  rate: number | null;
  amount: number | null;
}

export interface Enquiry {
  id: string;
  entity_id: string;
  enquiry_no: string;             // ENQ/YY-YY/0001
  enquiry_date: string;
  enquiry_time: string | null;
  enquiry_type: EnquiryType;
  enquiry_source_id: string | null;
  enquiry_source_name: string | null;
  priority: EnquiryPriority;
  campaign: string | null;
  // Party
  customer_id: string | null;
  customer_name: string | null;
  prospectus_id: string | null;
  partner_id: string | null;
  partner_name: string | null;
  // Contact
  contact_person: string | null;
  department: string | null;
  designation: string | null;
  email: string | null;
  mobile: string | null;
  phone: string | null;
  // SAM assignment
  dealer_id: string | null;
  dealer_name: string | null;
  reference_id: string | null;
  reference_name: string | null;
  assigned_executive_id: string | null;
  assigned_executive_name: string | null;
  // Lines
  items: EnquiryItem[];
  // State
  status: EnquiryStatus;
  // History — append-only
  follow_ups: EnquiryFollowUp[];
  // Linked
  quotation_ids: string[];
  opportunity_id: string | null;
  converted_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const enquiriesKey = (e: string) => `erp_enquiries_${e}`;
