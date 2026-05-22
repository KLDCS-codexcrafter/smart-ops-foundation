/**
 * @file        ui-integration-enquiry-template.test.ts
 * @purpose     HK-5-2 Block D · UI integration coverage · EnquiryTemplateLibraryPanel + engine
 * @sprint      T-Phase-2.HK-5-2 · Block D
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as Engine from '@/lib/enquiry-template-engine';
import * as P2 from '@/pages/erp/procure-hub/panels-p2';

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
    const t = Engine.createTemplate('e1', { name: 'T1', category: 'electrical', lines: [] });
    expect(t.id).toBeTruthy();
    expect(Engine.loadTemplates('e1').length).toBe(1);
  });
  it('getTemplate roundtrip', () => {
    const t = Engine.createTemplate('e1', { name: 'T2', category: 'mech', lines: [] });
    expect(Engine.getTemplate('e1', t.id)?.name).toBe('T2');
  });
  it('updateTemplate mutates', () => {
    const t = Engine.createTemplate('e1', { name: 'T3', category: 'mech', lines: [] });
    const u = Engine.updateTemplate('e1', t.id, { name: 'T3-edit' });
    expect(u?.name).toBe('T3-edit');
  });
  it('deleteTemplate removes', () => {
    const t = Engine.createTemplate('e1', { name: 'T4', category: 'mech', lines: [] });
    expect(Engine.deleteTemplate('e1', t.id)).toBe(true);
    expect(Engine.getTemplate('e1', t.id)).toBe(null);
  });
  it('listByCategory filters', () => {
    Engine.createTemplate('e1', { name: 'A', category: 'cat1', lines: [] });
    Engine.createTemplate('e1', { name: 'B', category: 'cat2', lines: [] });
    expect(Engine.listByCategory('e1', 'cat1').length).toBe(1);
  });
  it('applyTemplate returns null for missing', () => {
    expect(Engine.applyTemplate('e1', 'missing')).toBe(null);
  });
  it('saveTemplates persists list', () => {
    Engine.saveTemplates('e1', []);
    expect(Engine.loadTemplates('e1')).toEqual([]);
  });
  it('entity scoping isolated', () => {
    Engine.createTemplate('e1', { name: 'X', category: 'c', lines: [] });
    expect(Engine.loadTemplates('e2').length).toBe(0);
  });
  it('panel name stability', () => {
    expect(P2.EnquiryTemplateLibraryPanel.name).toContain('EnquiryTemplate');
  });
});
