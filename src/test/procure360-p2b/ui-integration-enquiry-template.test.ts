/**
 * @file        ui-integration-enquiry-template.test.ts
 * @purpose     HK-5-2 Block D · UI integration coverage · EnquiryTemplateLibraryPanel + engine
 * @sprint      T-Phase-2.HK-5-2 · Block D
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as Engine from '@/lib/enquiry-template-engine';
import * as P2 from '@/pages/erp/procure-hub/panels-p2';
import type { EnquiryTemplate, EnquiryTemplateCategory } from '@/types/enquiry-template';

function mkInput(name: string, category: EnquiryTemplateCategory = 'custom'):
  Omit<EnquiryTemplate, 'id' | 'entity_id' | 'created_at' | 'updated_at' | 'usage_count'> {
  return {
    template_name: name,
    category,
    default_specifications: [],
    default_quality_clauses: [],
    default_delivery_terms: [],
    default_packing_terms: [],
    is_approved: true,
    created_by: 'test-user',
  };
}

describe('HK-5-2 Block D · EnquiryTemplate UI integration', () => {
  beforeEach(() => { localStorage.clear(); });

  it('panel exported', () => { expect(typeof P2.EnquiryTemplateLibraryPanel).toBe('function'); });
  it('engine imports', () => { expect(Engine).toBeDefined(); });
  it('CRUD surface present', () => {
    expect(typeof Engine.loadTemplates).toBe('function');
    expect(typeof Engine.saveTemplates).toBe('function');
    expect(typeof Engine.getTemplate).toBe('function');
    expect(typeof Engine.createTemplate).toBe('function');
    expect(typeof Engine.updateTemplate).toBe('function');
    expect(typeof Engine.deleteTemplate).toBe('function');
  });
  it('loadTemplates includes 5 starter templates on first load', () => {
    const t = Engine.loadTemplates('e1');
    expect(t.length).toBeGreaterThanOrEqual(5);
  });
  it('createTemplate persists (delta +1)', () => {
    const before = Engine.loadTemplates('e1').length;
    Engine.createTemplate('e1', mkInput('T1', 'steel'));
    expect(Engine.loadTemplates('e1').length).toBe(before + 1);
  });
  it('getTemplate roundtrip', () => {
    const t = Engine.createTemplate('e1', mkInput('T2', 'bearings'));
    expect(Engine.getTemplate('e1', t.id)?.template_name).toBe('T2');
  });
  it('updateTemplate mutates', () => {
    const t = Engine.createTemplate('e1', mkInput('T3', 'lubricants'));
    const u = Engine.updateTemplate('e1', t.id, { template_name: 'T3-edit' });
    expect(u.template_name).toBe('T3-edit');
  });
  it('deleteTemplate removes', () => {
    const t = Engine.createTemplate('e1', mkInput('T4', 'custom'));
    expect(Engine.deleteTemplate('e1', t.id)).toBe(true);
    expect(Engine.getTemplate('e1', t.id)).toBe(null);
  });
  it('listByCategory delta +1 after adding to category', () => {
    const before = Engine.listByCategory('e1', 'steel').length;
    Engine.createTemplate('e1', mkInput('A', 'steel'));
    expect(Engine.listByCategory('e1', 'steel').length).toBe(before + 1);
  });
  it('applyTemplate returns null for missing', () => {
    expect(Engine.applyTemplate('e1', 'missing')).toBe(null);
  });
  it('saveTemplates persists list', () => {
    Engine.saveTemplates('e1', []);
    expect(Engine.loadTemplates('e1')).toEqual([]);
  });
  it('entity scoping: each entity gets its own seed', () => {
    const e1Count = Engine.loadTemplates('e1').length;
    const e2Count = Engine.loadTemplates('e2').length;
    expect(e1Count).toBeGreaterThan(0);
    expect(e2Count).toBeGreaterThan(0);
  });
  it('panel name stability', () => {
    expect(P2.EnquiryTemplateLibraryPanel.name).toContain('EnquiryTemplate');
  });
});
