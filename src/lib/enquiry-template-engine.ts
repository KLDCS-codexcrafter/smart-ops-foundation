/**
 * @file        src/lib/enquiry-template-engine.ts
 * @purpose     OOB-51 · Enquiry Template Library · 15th SIBLING application
 * @sprint      T-Phase-2.A-Procure360-Phase2-Polish-Part-A · Block B · D-NEW-FU
 * @decisions   Q-LOCK-4(a) FR-19 SIBLING · procurement-enquiry-engine 0-DIFF
 * @disciplines FR-19 · FR-22 · FR-26 entity-scoped persistence
 * @[JWT]       GET/POST /api/procure360/enquiry-templates
 */
import type { EnquiryTemplate, EnquiryTemplateCategory, EnquiryTemplateSpec } from '@/types/enquiry-template';
import { enquiryTemplateKey } from '@/types/enquiry-template';

type StarterSeed = Omit<EnquiryTemplate, 'id' | 'entity_id' | 'created_at' | 'updated_at' | 'usage_count' | 'created_by'>;

const STARTER_TEMPLATES: StarterSeed[] = [
  {
    template_name: 'Steel CTH 7208 Hot-Rolled Coil (Standard)',
    category: 'steel',
    default_specifications: [
      { field_name: 'Grade', default_value: 'IS 2062 E250', is_required: true, field_type: 'select', options: ['IS 2062 E250', 'IS 2062 E350', 'IS 1079', 'Custom'] },
      { field_name: 'Thickness Range (mm)', default_value: '3-8', is_required: true, field_type: 'text' },
      { field_name: 'Width (mm)', default_value: '1250', is_required: true, field_type: 'number' },
      { field_name: 'Finish', default_value: 'Hot Rolled', is_required: true, field_type: 'select', options: ['Hot Rolled', 'Cold Rolled', 'Pickled & Oiled', 'Galvanized'] },
      { field_name: 'MOQ (MT)', default_value: '25', is_required: true, field_type: 'number' },
    ],
    default_quality_clauses: ['Mill Test Certificate required', 'Third-party inspection acceptable', 'Subject to incoming QC per ISO 9001:2015'],
    default_delivery_terms: ['30 days from PO date', 'Phased delivery acceptable'],
    default_packing_terms: ['Standard coil packing with strapping', 'Tag identification on each coil'],
    default_inco_terms: 'FOR Plant Gate',
    default_payment_terms: '30 days from invoice receipt',
    is_approved: true,
    approved_by: 'system',
    approved_at: '2026-05-22T00:00:00.000Z',
  },
  {
    template_name: 'Bearings · Deep Groove (Standard)',
    category: 'bearings',
    default_specifications: [
      { field_name: 'Type', default_value: 'Deep Groove Ball', is_required: true, field_type: 'select', options: ['Deep Groove Ball', 'Tapered Roller', 'Spherical', 'Cylindrical'] },
      { field_name: 'Bore Size (mm)', default_value: '25', is_required: true, field_type: 'number' },
      { field_name: 'Make', default_value: 'SKF / FAG / NTN', is_required: false, field_type: 'text' },
    ],
    default_quality_clauses: ['OEM only · no after-market', 'Original packing with serial trace'],
    default_delivery_terms: ['7 days from PO'],
    default_packing_terms: ['Original OEM box'],
    default_inco_terms: 'FOR Plant Gate',
    default_payment_terms: '15 days',
    is_approved: true,
    approved_by: 'system',
    approved_at: '2026-05-22T00:00:00.000Z',
  },
  {
    template_name: 'Lubricants · Hydraulic Oil',
    category: 'lubricants',
    default_specifications: [
      { field_name: 'Grade', default_value: 'ISO VG 46', is_required: true, field_type: 'select', options: ['ISO VG 32', 'ISO VG 46', 'ISO VG 68'] },
      { field_name: 'Pack Size', default_value: '210 L Barrel', is_required: true, field_type: 'select', options: ['20 L', '210 L Barrel', '1000 L IBC'] },
    ],
    default_quality_clauses: ['COA required per batch', 'OEM-approved spec'],
    default_delivery_terms: ['10 days'],
    default_packing_terms: ['Sealed barrels with batch sticker'],
    default_inco_terms: 'FOR Plant Gate',
    default_payment_terms: '30 days',
    is_approved: true,
    approved_by: 'system',
    approved_at: '2026-05-22T00:00:00.000Z',
  },
  {
    template_name: 'PCB Components · Standard',
    category: 'pcb_components',
    default_specifications: [
      { field_name: 'Component', default_value: 'SMD Resistor 0603', is_required: true, field_type: 'text' },
      { field_name: 'Tolerance', default_value: '1%', is_required: true, field_type: 'select', options: ['1%', '5%', '10%'] },
      { field_name: 'Reel Qty', default_value: '5000', is_required: true, field_type: 'number' },
    ],
    default_quality_clauses: ['RoHS compliant', 'Date code within 12 months'],
    default_delivery_terms: ['21 days'],
    default_packing_terms: ['Sealed reel · ESD bag'],
    default_inco_terms: 'CIP Plant',
    default_payment_terms: 'LC at sight',
    is_approved: true,
    approved_by: 'system',
    approved_at: '2026-05-22T00:00:00.000Z',
  },
  {
    template_name: 'Welding Consumables · MIG Wire',
    category: 'welding_consumables',
    default_specifications: [
      { field_name: 'Wire Diameter (mm)', default_value: '1.2', is_required: true, field_type: 'select', options: ['0.8', '1.0', '1.2', '1.6'] },
      { field_name: 'Spec', default_value: 'AWS A5.18 ER70S-6', is_required: true, field_type: 'text' },
      { field_name: 'Spool Weight (kg)', default_value: '15', is_required: true, field_type: 'number' },
    ],
    default_quality_clauses: ['Batch test certificate', 'Storage humidity controlled'],
    default_delivery_terms: ['14 days'],
    default_packing_terms: ['Sealed spool with moisture barrier'],
    default_inco_terms: 'FOR Plant Gate',
    default_payment_terms: '30 days',
    is_approved: true,
    approved_by: 'system',
    approved_at: '2026-05-22T00:00:00.000Z',
  },
];

function newId(): string {
  return `et-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadTemplates(entityCode: string): EnquiryTemplate[] {
  try {
    const raw = localStorage.getItem(enquiryTemplateKey(entityCode));
    if (!raw) {
      const seeded: EnquiryTemplate[] = STARTER_TEMPLATES.map((t) => ({
        ...t,
        id: newId(),
        entity_id: entityCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: 0,
        created_by: 'system',
      }));
      localStorage.setItem(enquiryTemplateKey(entityCode), JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as EnquiryTemplate[];
  } catch {
    return [];
  }
}

export function saveTemplates(entityCode: string, templates: EnquiryTemplate[]): void {
  localStorage.setItem(enquiryTemplateKey(entityCode), JSON.stringify(templates));
}

export function getTemplate(entityCode: string, templateId: string): EnquiryTemplate | null {
  return loadTemplates(entityCode).find((t) => t.id === templateId) ?? null;
}

export function createTemplate(
  entityCode: string,
  input: Omit<EnquiryTemplate, 'id' | 'entity_id' | 'created_at' | 'updated_at' | 'usage_count'>,
): EnquiryTemplate {
  const template: EnquiryTemplate = {
    ...input,
    id: newId(),
    entity_id: entityCode,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    usage_count: 0,
  };
  saveTemplates(entityCode, [...loadTemplates(entityCode), template]);
  return template;
}

export function updateTemplate(
  entityCode: string,
  templateId: string,
  updates: Partial<Omit<EnquiryTemplate, 'id' | 'entity_id'>>,
): EnquiryTemplate {
  const current = getTemplate(entityCode, templateId);
  if (!current) throw new Error(`Template ${templateId} not found`);
  const updated: EnquiryTemplate = { ...current, ...updates, updated_at: new Date().toISOString() };
  saveTemplates(entityCode, loadTemplates(entityCode).map((t) => (t.id === templateId ? updated : t)));
  return updated;
}

export function deleteTemplate(entityCode: string, templateId: string): boolean {
  const all = loadTemplates(entityCode);
  const filtered = all.filter((t) => t.id !== templateId);
  if (filtered.length === all.length) return false;
  saveTemplates(entityCode, filtered);
  return true;
}

export function listByCategory(
  entityCode: string,
  category: EnquiryTemplateCategory,
): EnquiryTemplate[] {
  return loadTemplates(entityCode).filter((t) => t.category === category && t.is_approved);
}

export interface AppliedTemplate {
  specs: EnquiryTemplateSpec[];
  quality_clauses: string[];
  delivery_terms: string[];
  packing_terms: string[];
  inco_terms?: string;
  payment_terms?: string;
}

export function applyTemplate(entityCode: string, templateId: string): AppliedTemplate | null {
  const template = getTemplate(entityCode, templateId);
  if (!template) return null;
  updateTemplate(entityCode, templateId, { usage_count: template.usage_count + 1 });
  return {
    specs: template.default_specifications,
    quality_clauses: template.default_quality_clauses,
    delivery_terms: template.default_delivery_terms,
    packing_terms: template.default_packing_terms,
    inco_terms: template.default_inco_terms,
    payment_terms: template.default_payment_terms,
  };
}
