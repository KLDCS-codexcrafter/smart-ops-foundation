/**
 * enquiry-source.ts — Enquiry source / channel master
 * [JWT] GET/POST/PUT/DELETE /api/salesx/enquiry-sources
 */

export interface EnquirySource {
  id: string;
  entity_id: string;
  source_code: string;     // unique code, e.g. WEB, REF, WALK
  source_name: string;     // display name
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const enquirySourcesKey = (e: string) => `erp_enquiry_sources_${e}`;
