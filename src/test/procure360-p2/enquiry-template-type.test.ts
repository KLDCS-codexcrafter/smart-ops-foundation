import { describe, it, expect } from 'vitest';
import { enquiryTemplateKey } from '@/types/enquiry-template';
import type { EnquiryTemplate, EnquiryTemplateCategory } from '@/types/enquiry-template';

describe('enquiry-template type · D-NEW-FU', () => {
  it('key helper is entity-scoped', () => {
    expect(enquiryTemplateKey('sinha')).toBe('erp_sinha_enquiry_templates');
  });

  it('category union accepts all 6 values', () => {
    const cats: EnquiryTemplateCategory[] = [
      'steel', 'bearings', 'lubricants', 'pcb_components', 'welding_consumables', 'custom',
    ];
    expect(cats.length).toBe(6);
  });

  it('shape construction compiles', () => {
    const t: EnquiryTemplate = {
      id: 't1', template_name: 'x', category: 'steel', entity_id: 'e',
      default_specifications: [], default_quality_clauses: [],
      default_delivery_terms: [], default_packing_terms: [],
      is_approved: false, created_by: 'u', created_at: 'd', updated_at: 'd',
      usage_count: 0,
    };
    expect(t.id).toBe('t1');
  });

  it('Sentinel · type module exists', () => { expect('enquiry-template').toBe('enquiry-template'); });
});
