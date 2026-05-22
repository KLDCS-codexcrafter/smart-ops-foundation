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
  it('loadTemplates empty default', () => {
    expect(Engine.loadTemplates('e1')).toEqual([]);
  });
  it('createTemplate persists', () => {
    const t = Engine.createTemplate('e1', mkInput('T1', 'steel'));
    expect(t.id).toBeTruthy();
    expect(Engine.loadTemplates('e1').length).toBe(1);
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
  it('listByCategory filters by approved category', () => {
    Engine.createTemplate('e1', mkInput('A', 'steel'));
    Engine.createTemplate('e1', mkInput('B', 'bearings'));
    expect(Engine.listByCategory('e1', 'steel').length).toBe(1);
  });
  it('applyTemplate returns null for missing', () => {
    expect(Engine.applyTemplate('e1', 'missing')).toBe(null);
  });
  it('saveTemplates persists list', () => {
    Engine.saveTemplates('e1', []);
    expect(Engine.loadTemplates('e1')).toEqual([]);
  });
  it('entity scoping isolated', () => {
    Engine.createTemplate('e1', mkInput('X', 'custom'));
    expect(Engine.loadTemplates('e2').length).toBe(0);
  });
  it('panel name stability', () => {
    expect(P2.EnquiryTemplateLibraryPanel.name).toContain('EnquiryTemplate');
  });
});
