/**
 * factory-master.test.ts — Sprint T-Phase-1.3-3-PlantOps-pre-1 · D-576
 * 5 NEW tests · Factory + WorkCenter + Machine + hierarchy + config
 */
import { describe, it, expect } from 'vitest';
import {
  buildFactoryAncestry,
  buildFactoryDescendants,
  type Factory,
} from '@/types/factory';
import { getTemplateById, MANUFACTURING_TEMPLATES } from '@/config/manufacturing-templates';
import { getDemoFactories, getDemoWorkCenters, getDemoMachines } from '@/data/demo-factory-data';

const E = 'TST';
const NOW = '2026-04-01T00:00:00.000Z';

const mkFactory = (overrides: Partial<Factory> & Pick<Factory, 'id' | 'code' | 'name'>): Factory => ({
  entity_id: E, unit_type: 'manufacturing',
  manufacturing_config: null,
  address_line1: '', address_line2: '', city: '', state: '', pincode: '', country: 'India',
  latitude: null, longitude: null,
  factory_license_no: '', pollution_clearance_no: '', fire_safety_certificate: '', factory_gstin: '',
  parent_factory_id: null, primary_godown_id: null, primary_fg_godown_id: null,
  department_ids: [], status: 'active', notes: '',
  created_at: NOW, created_by: 'test', updated_at: NOW, updated_by: 'test',
  ...overrides,
});

describe('factory-master · 3-PlantOps-pre-1', () => {
  it('Test 1 · Factory unit_type union accepts all 4 values (Q26=a)', () => {
    const types: Factory['unit_type'][] = ['manufacturing', 'job_work', 'warehouse_only', 'hybrid'];
    types.forEach(t => {
      const f = mkFactory({ id: `f-${t}`, code: `FAC-${t}`, name: t, unit_type: t });
      expect(f.unit_type).toBe(t);
    });
  });

  it('Test 2 · Multi-unit hierarchy resolves recursively (Q28=b unlimited)', () => {
    const root = mkFactory({ id: 'r', code: 'FAC-001', name: 'Root' });
    const l1 = mkFactory({ id: 'l1', code: 'FAC-002', name: 'L1', parent_factory_id: 'r' });
    const l2 = mkFactory({ id: 'l2', code: 'FAC-003', name: 'L2', parent_factory_id: 'l1' });
    const l3 = mkFactory({ id: 'l3', code: 'FAC-004', name: 'L3', parent_factory_id: 'l2' });
    const all = [root, l1, l2, l3];
    const ancestry = buildFactoryAncestry(all, 'l3');
    expect(ancestry.map(f => f.id)).toEqual(['r', 'l1', 'l2', 'l3']);
    const descendants = buildFactoryDescendants(all, 'r');
    expect(descendants).toHaveLength(3);
  });

  it('Test 3 · ManufacturingConfig embeds inside Factory (Q27=a) · template registry resolves', () => {
    const tpl = getTemplateById('process-batch');
    expect(tpl).toBeDefined();
    expect(MANUFACTURING_TEMPLATES.length).toBeGreaterThanOrEqual(27);
    const f = mkFactory({
      id: 'fc', code: 'FAC-CFG', name: 'Configured',
      manufacturing_config: {
        primary_template_id: 'process-batch',
        secondary_template_id: null,
        industry_sector_template_id: null,
        enabled_modules: ['production-plan'],
        compliance_standards: ['FSSAI'],
        costing_method: 'standard',
        production_model: 'mts',
        configured_at: NOW, configured_by: 'test',
      },
    });
    expect(f.manufacturing_config?.primary_template_id).toBe('process-batch');
  });

  it('Test 4 · Demo work centers belong to a factory · capacity_hours_per_shift positive', () => {
    const factories = getDemoFactories(E);
    const wcs = getDemoWorkCenters(E);
    const factoryIds = new Set(factories.map(f => f.id));
    wcs.forEach(w => {
      expect(factoryIds.has(w.factory_id)).toBe(true);
      expect(w.capacity_hours_per_shift).toBeGreaterThan(0);
    });
  });

  it('Test 5 · Demo machines belong to a WorkCenter + Factory · capabilities populated', () => {
    const factories = getDemoFactories(E);
    const wcs = getDemoWorkCenters(E);
    const machines = getDemoMachines(E);
    const fIds = new Set(factories.map(f => f.id));
    const wIds = new Set(wcs.map(w => w.id));
    machines.forEach(m => {
      expect(fIds.has(m.factory_id)).toBe(true);
      expect(wIds.has(m.work_center_id)).toBe(true);
    });
    expect(machines.some(m => m.capabilities.length > 0)).toBe(true);
  });
});
