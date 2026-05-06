/**
 * demo-factory-data.ts — Demo Factory + WorkCenter + Machine seeds (D-576)
 * Sprint T-Phase-1.3-3-PlantOps-pre-1
 *
 * Three priority client blueprints: Cherise FMCG · Sinha · Smartpower.
 */
import type { Factory } from '@/types/factory';
import type { WorkCenter } from '@/types/work-center';
import type { Machine } from '@/types/machine';

const NOW = '2026-04-01T00:00:00.000Z';

export function getDemoFactories(entityCode: string): Factory[] {
  const base = (
    overrides: Partial<Factory> & Pick<Factory, 'id' | 'code' | 'name' | 'unit_type'>,
  ): Factory => ({
    entity_id: entityCode,
    manufacturing_config: null,
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    latitude: null,
    longitude: null,
    factory_license_no: '',
    pollution_clearance_no: '',
    fire_safety_certificate: '',
    factory_gstin: '',
    parent_factory_id: null,
    primary_godown_id: null,
    primary_fg_godown_id: null,
    department_ids: [],
    status: 'active',
    notes: '',
    created_at: NOW,
    created_by: 'seed',
    updated_at: NOW,
    updated_by: 'seed',
    ...overrides,
  });

  return [
    base({
      id: 'fac-cherise-root',
      code: 'FAC-001',
      name: 'Cherise India',
      unit_type: 'manufacturing',
      city: 'Mumbai',
      state: 'Maharashtra',
      manufacturing_config: {
        primary_template_id: 'process-batch',
        secondary_template_id: 'make-to-stock',
        industry_sector_template_id: 'industry-food',
        enabled_modules: ['production-plan', 'job-card', 'wastage', 'oee'],
        compliance_standards: ['FSSAI', 'HACCP'],
        costing_method: 'standard',
        production_model: 'mts',
        configured_at: NOW,
        configured_by: 'seed',
      },
    }),
    base({
      id: 'fac-cherise-mumbai',
      code: 'FAC-002',
      name: 'Cherise Mumbai Unit',
      unit_type: 'manufacturing',
      parent_factory_id: 'fac-cherise-root',
      city: 'Mumbai',
      state: 'Maharashtra',
    }),
    base({
      id: 'fac-sinha-pune',
      code: 'FAC-003',
      name: 'Sinha Pune Unit',
      unit_type: 'manufacturing',
      city: 'Pune',
      state: 'Maharashtra',
      manufacturing_config: {
        primary_template_id: 'engineer-to-order',
        secondary_template_id: null,
        industry_sector_template_id: null,
        enabled_modules: ['production-plan', 'job-card', 'project-link'],
        compliance_standards: ['ISO9001'],
        costing_method: 'actual',
        production_model: 'eto',
        configured_at: NOW,
        configured_by: 'seed',
      },
    }),
    base({
      id: 'fac-smartpower-blr',
      code: 'FAC-004',
      name: 'Smartpower Bengaluru Unit',
      unit_type: 'manufacturing',
      city: 'Bengaluru',
      state: 'Karnataka',
      manufacturing_config: {
        primary_template_id: 'discrete-assembly',
        secondary_template_id: 'assemble-to-order',
        industry_sector_template_id: 'industry-electronics',
        enabled_modules: ['production-plan', 'job-card', 'oee', 'qc-incoming'],
        compliance_standards: ['ISO9001'],
        costing_method: 'standard',
        production_model: 'ato',
        configured_at: NOW,
        configured_by: 'seed',
      },
    }),
  ];
}

export function getDemoWorkCenters(entityCode: string): WorkCenter[] {
  const wc = (
    id: string, code: string, name: string, factory_id: string,
  ): WorkCenter => ({
    id, code, name, factory_id,
    entity_id: entityCode,
    type: 'machine_center',
    capacity_hours_per_shift: 8,
    setup_time_minutes: 15,
    efficiency_pct: 85,
    hourly_run_cost: 250,
    hourly_idle_cost: 100,
    department_id: null,
    parent_work_center_id: null,
    current_status: 'active',
    last_breakdown_at: null,
    next_maintenance_due: null,
    notes: '',
    created_at: NOW, created_by: 'seed',
    updated_at: NOW, updated_by: 'seed',
  });
  return [
    wc('wc-cherise-mix', 'WC-001', 'Mixing Bay', 'fac-cherise-mumbai'),
    wc('wc-cherise-pack', 'WC-002', 'Packaging Line', 'fac-cherise-mumbai'),
    wc('wc-cherise-qc', 'WC-003', 'QC Bay', 'fac-cherise-mumbai'),
    wc('wc-sinha-fab', 'WC-004', 'Fabrication Bay', 'fac-sinha-pune'),
    wc('wc-sinha-assy', 'WC-005', 'Assembly Bay', 'fac-sinha-pune'),
    wc('wc-sp-smt', 'WC-006', 'SMT Line', 'fac-smartpower-blr'),
    wc('wc-sp-assy', 'WC-007', 'Assembly Line', 'fac-smartpower-blr'),
    wc('wc-sp-test', 'WC-008', 'Functional Test', 'fac-smartpower-blr'),
    wc('wc-sp-pack', 'WC-009', 'Packaging', 'fac-smartpower-blr'),
  ];
}

export function getDemoMachines(entityCode: string): Machine[] {
  const m = (
    id: string, code: string, name: string,
    factory_id: string, work_center_id: string,
    capabilities: string[] = [],
  ): Machine => ({
    id, code, name, factory_id, work_center_id,
    entity_id: entityCode,
    asset_tag: code,
    manufacturer: '', model: '', serial_number: '', year_of_make: 2022,
    capabilities,
    rated_capacity_per_hour: 100,
    rated_capacity_uom: 'units',
    setup_time_minutes: 10,
    current_status: 'idle',
    current_operator_employee_id: null,
    last_maintenance_at: null, next_maintenance_due: null,
    maintenance_interval_hours: 500,
    hourly_run_cost: 200,
    power_kw: 5,
    notes: '',
    created_at: NOW, created_by: 'seed',
    updated_at: NOW, updated_by: 'seed',
  });
  return [
    m('mch-mix-1', 'MCH-001', 'Planetary Mixer', 'fac-cherise-mumbai', 'wc-cherise-mix', ['mixing', 'food-grade']),
    m('mch-mix-2', 'MCH-002', 'Ribbon Blender', 'fac-cherise-mumbai', 'wc-cherise-mix', ['blending']),
    m('mch-pack-1', 'MCH-003', 'Auger Filler', 'fac-cherise-mumbai', 'wc-cherise-pack', ['filling']),
    m('mch-pack-2', 'MCH-004', 'Sealer', 'fac-cherise-mumbai', 'wc-cherise-pack', ['sealing']),
    m('mch-qc-1', 'MCH-005', 'Moisture Analyzer', 'fac-cherise-mumbai', 'wc-cherise-qc', ['qc-test']),
    m('mch-fab-1', 'MCH-006', 'CNC Lathe', 'fac-sinha-pune', 'wc-sinha-fab', ['cnc-turning']),
    m('mch-fab-2', 'MCH-007', 'Welding Station', 'fac-sinha-pune', 'wc-sinha-fab', ['welding']),
    m('mch-assy-1', 'MCH-008', 'Assembly Bench', 'fac-sinha-pune', 'wc-sinha-assy', ['assembly']),
    m('mch-smt-1', 'MCH-009', 'SMT Pick-Place', 'fac-smartpower-blr', 'wc-sp-smt', ['smt']),
    m('mch-smt-2', 'MCH-010', 'Reflow Oven', 'fac-smartpower-blr', 'wc-sp-smt', ['reflow']),
    m('mch-assy-2', 'MCH-011', 'Hand Assembly', 'fac-smartpower-blr', 'wc-sp-assy', ['assembly']),
    m('mch-test-1', 'MCH-012', 'Functional Tester', 'fac-smartpower-blr', 'wc-sp-test', ['testing']),
    m('mch-test-2', 'MCH-013', 'Burn-in Chamber', 'fac-smartpower-blr', 'wc-sp-test', ['burn-in']),
    m('mch-pack-3', 'MCH-014', 'Carton Sealer', 'fac-smartpower-blr', 'wc-sp-pack', ['packing']),
  ];
}
