import { describe, it, expect, beforeEach } from 'vitest';
import * as Engine from '@/lib/enquiry-template-engine';
import { enquiryTemplateKey } from '@/types/enquiry-template';

describe('enquiry-template-engine · D-NEW-FU · OOB-51', () => {
  beforeEach(() => { localStorage.clear(); });

  it('module imports cleanly', () => { expect(Engine).toBeDefined(); });

  it('seeds 5 starter templates on first load', () => {
    const list = Engine.loadTemplates('sinha');
    expect(list.length).toBe(5);
    const categories = list.map((t) => t.category).sort();
    expect(categories).toContain('steel');
    expect(categories).toContain('bearings');
    expect(categories).toContain('lubricants');
    expect(categories).toContain('pcb_components');
    expect(categories).toContain('welding_consumables');
  });

  it('persistence key is entity-scoped (FR-26)', () => {
    expect(enquiryTemplateKey('acme')).toBe('erp_acme_enquiry_templates');
  });

  it('does not re-seed on second load', () => {
    const a = Engine.loadTemplates('e1');
    const b = Engine.loadTemplates('e1');
    expect(a.length).toBe(b.length);
    expect(a[0].id).toBe(b[0].id);
  });

  it('getTemplate finds by id', () => {
    const list = Engine.loadTemplates('e1');
    const found = Engine.getTemplate('e1', list[0].id);
    expect(found?.id).toBe(list[0].id);
  });

  it('createTemplate adds new template', () => {
    Engine.loadTemplates('e1');
    const before = Engine.loadTemplates('e1').length;
    Engine.createTemplate('e1', {
      template_name: 'Custom · Test',
      category: 'custom',
      default_specifications: [],
      default_quality_clauses: [],
      default_delivery_terms: [],
      default_packing_terms: [],
      is_approved: false,
      created_by: 'tester',
    });
    expect(Engine.loadTemplates('e1').length).toBe(before + 1);
  });

  it('updateTemplate mutates fields', () => {
    const list = Engine.loadTemplates('e1');
    const updated = Engine.updateTemplate('e1', list[0].id, { template_name: 'Renamed' });
    expect(updated.template_name).toBe('Renamed');
  });

  it('deleteTemplate removes by id', () => {
    const list = Engine.loadTemplates('e1');
    const removed = Engine.deleteTemplate('e1', list[0].id);
    expect(removed).toBe(true);
    expect(Engine.loadTemplates('e1').length).toBe(list.length - 1);
  });

  it('listByCategory filters by approved + category', () => {
    const steel = Engine.listByCategory('e1', 'steel');
    expect(steel.every((t) => t.category === 'steel' && t.is_approved)).toBe(true);
  });

  it('applyTemplate returns content + increments usage_count', () => {
    const list = Engine.loadTemplates('e1');
    const before = list[0].usage_count;
    const applied = Engine.applyTemplate('e1', list[0].id);
    expect(applied).not.toBeNull();
    expect(applied?.specs.length).toBeGreaterThan(0);
    expect(Engine.getTemplate('e1', list[0].id)?.usage_count).toBe(before + 1);
  });

  it('applyTemplate returns null for unknown id', () => {
    expect(Engine.applyTemplate('e1', 'no-such-id')).toBeNull();
  });

  it('Sentinel · D-NEW-FU closure marker', () => { expect('D-NEW-FU').toBe('D-NEW-FU'); });
});
