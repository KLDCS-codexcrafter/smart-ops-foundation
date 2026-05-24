/**
 * @file        src/test/factory-license-cap-engine.test.ts
 * @sprint      T-Phase-3.PROD-2 · ST14 · LEAK-10 coverage
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeFactoryLicenseUtilisation,
  detectFactoryLicenseBreaches,
  listOpenFactoryLicenseAlerts,
  acknowledgeFactoryLicenseAlert,
  factoryCapacityKey,
} from '@/lib/factory-license-cap-engine';
import type { Factory } from '@/types/factory';
import { factoriesKey } from '@/types/factory';
import type { ProductionOrder } from '@/types/production-order';
import { productionOrdersKey } from '@/types/production-order';

const ENTITY = 'TEST-FLC';

function mkFactory(id: string, name: string): Factory {
  return {
    id, entity_id: ENTITY, code: id.toUpperCase(), name,
    unit_type: 'manufacturing', manufacturing_config: null,
    address_line1: '', address_line2: '', city: 'Mumbai', state: 'MH',
    pincode: '400001', country: 'IN', latitude: null, longitude: null,
    factory_license_no: 'LIC-001', pollution_clearance_no: '',
    fire_safety_certificate: '', factory_gstin: '',
    parent_factory_id: null, primary_godown_id: null, primary_fg_godown_id: null,
    department_ids: [], status: 'active', notes: '',
    created_at: '2025-01-01', created_by: 'sys',
    updated_at: '2025-01-01', updated_by: 'sys',
  };
}

function mkPO(id: string, factoryId: string, planned: number, startISO: string): ProductionOrder {
  return {
    id, entity_id: ENTITY, doc_no: id,
    bom_id: '', bom_version: 1,
    output_item_id: 'itm-1', output_item_name: 'Widget', output_item_code: 'W1',
    planned_qty: planned, uom: 'pcs',
    start_date: startISO, target_end_date: startISO,
    actual_completion_date: startISO, status: 'completed',
    department_id: '', department_name: '',
    source_godown_id: null, wip_godown_id: null, output_godown_id: '',
    reservation_ids: [], project_id: null, project_milestone_id: null,
    project_centre_id: null, reference_project_id: null, sales_order_id: null,
    sales_order_line_mappings: [], sales_plan_id: null, customer_id: null,
    customer_name: null, business_unit_id: null, batch_no: null,
    is_export_project: false, production_site_id: factoryId,
    nature_of_processing: null, is_job_work_in: false,
    linked_job_work_out_order_ids: [], qc_required: false, qc_scenario: null,
    linked_test_report_ids: [], routed_to_quarantine: false,
    production_plan_id: null, shift_id: null, production_team_id: null,
    export_destination_country: null, export_regulatory_body: null,
    linked_letter_of_credit_id: null,
    cost_structure: { master: { total: 0 }, budget: { total: 0 }, actual: { total: 0 } } as ProductionOrder['cost_structure'],
    lines: [], outputs: [], linked_production_plan_ids: [],
    approval_history: [], status_history: [],
    closed_at: null, closed_by_user_id: null, closed_by_name: null,
    closure_approval: null, closure_remarks: '', closed_cost_snapshot: null,
    closed_variance_id: null, notes: '',
    created_at: startISO, created_by: 'sys', updated_at: startISO, updated_by: 'sys',
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('factory-license-cap-engine', () => {
  it('returns empty when no capacity records seeded', () => {
    localStorage.setItem(factoriesKey(ENTITY), JSON.stringify([mkFactory('f1', 'Plant 1')]));
    expect(computeFactoryLicenseUtilisation(ENTITY)).toEqual([]);
  });

  it('flags breach when actual qty exceeds installed capacity', () => {
    const thisYear = new Date().getFullYear();
    const inFY = `${thisYear}-06-15`;
    localStorage.setItem(factoriesKey(ENTITY), JSON.stringify([mkFactory('f1', 'Plant 1')]));
    localStorage.setItem(factoryCapacityKey(ENTITY), JSON.stringify([
      { factory_id: 'f1', installed_capacity_units: 1000, license_no: 'LIC-001', uom: 'pcs' },
    ]));
    localStorage.setItem(productionOrdersKey(ENTITY), JSON.stringify([
      mkPO('po1', 'f1', 1200, inFY),
    ]));
    const util = computeFactoryLicenseUtilisation(ENTITY);
    expect(util).toHaveLength(1);
    expect(util[0].status).toBe('breach');
  });

  it('detect + ack lifecycle clears open alerts', () => {
    const inFY = `${new Date().getFullYear()}-06-15`;
    localStorage.setItem(factoriesKey(ENTITY), JSON.stringify([mkFactory('f1', 'Plant 1')]));
    localStorage.setItem(factoryCapacityKey(ENTITY), JSON.stringify([
      { factory_id: 'f1', installed_capacity_units: 1000, license_no: 'LIC-001', uom: 'pcs' },
    ]));
    localStorage.setItem(productionOrdersKey(ENTITY), JSON.stringify([
      mkPO('po1', 'f1', 900, inFY),
    ]));
    const alerts = detectFactoryLicenseBreaches(ENTITY);
    expect(alerts.length).toBeGreaterThan(0);
    expect(listOpenFactoryLicenseAlerts(ENTITY).length).toBe(alerts.length);
    acknowledgeFactoryLicenseAlert(alerts[0].id, ENTITY);
    expect(listOpenFactoryLicenseAlerts(ENTITY).length).toBe(alerts.length - 1);
  });
});
