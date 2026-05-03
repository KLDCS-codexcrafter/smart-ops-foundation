/**
 * enquiry-template-library.ts — OOB-51 · save common Enquiry shapes
 * Sprint T-Phase-1.2.6f-a
 */
import type { ProcurementEnquiryLine, VendorSelectionMode } from '@/types/procurement-enquiry';

export interface EnquiryTemplate {
  id: string;
  name: string;
  description: string;
  vendor_mode: VendorSelectionMode;
  lines: Pick<ProcurementEnquiryLine, 'item_id' | 'item_name' | 'uom' | 'required_qty' | 'remarks'>[];
  created_at: string;
}

const KEY = (entityCode: string): string => `erp_procurement_enquiry_templates_${entityCode}`;

export function listTemplates(entityCode: string): EnquiryTemplate[] {
  // [JWT] GET /api/procure360/enquiry-templates
  try {
    const raw = localStorage.getItem(KEY(entityCode));
    return raw ? (JSON.parse(raw) as EnquiryTemplate[]) : [];
  } catch {
    return [];
  }
}

export function saveTemplate(t: EnquiryTemplate, entityCode: string): void {
  // [JWT] POST /api/procure360/enquiry-templates
  const list = listTemplates(entityCode);
  try {
    localStorage.setItem(KEY(entityCode), JSON.stringify([t, ...list]));
  } catch {
    /* quota silent */
  }
}

export function deleteTemplate(id: string, entityCode: string): void {
  const list = listTemplates(entityCode).filter((t) => t.id !== id);
  try {
    localStorage.setItem(KEY(entityCode), JSON.stringify(list));
  } catch {
    /* quota silent */
  }
}
