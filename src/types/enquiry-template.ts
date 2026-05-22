/**
 * @file        src/types/enquiry-template.ts
 * @purpose     OOB-51 · Enquiry Template SIBLING type · 15th SIBLING application
 * @sprint      T-Phase-2.A-Procure360-Phase2-Polish-Part-A · Block B · D-NEW-FU
 * @decisions   Q-LOCK-4(a) SIBLING type · category-based template lookup · 5 starter templates
 * @discipline  FR-22 canonical · FR-26 entity-scoped persistence
 */

export type EnquiryTemplateCategory =
  | 'steel'
  | 'bearings'
  | 'lubricants'
  | 'pcb_components'
  | 'welding_consumables'
  | 'custom';

export interface EnquiryTemplateSpec {
  field_name: string;
  default_value: string;
  is_required: boolean;
  field_type: 'text' | 'number' | 'select' | 'date';
  options?: string[];
}

export interface EnquiryTemplate {
  id: string;
  template_name: string;
  category: EnquiryTemplateCategory;
  entity_id: string;

  default_specifications: EnquiryTemplateSpec[];
  default_quality_clauses: string[];
  default_delivery_terms: string[];
  default_packing_terms: string[];
  default_inco_terms?: string;
  default_payment_terms?: string;

  is_approved: boolean;
  approved_by?: string | null;
  approved_at?: string | null;

  created_by: string;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

export const enquiryTemplateKey = (entityCode: string): string =>
  `erp_${entityCode}_enquiry_templates`;
