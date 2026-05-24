/**
 * @file        src/test/hazmat-production-cap-engine.test.ts
 * @sprint      T-Phase-3.PROD-2 · ST14 · LEAK-11 coverage
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeHazmatUtilisation,
  detectHazmatCapBreaches,
  listOpenHazmatCapAlerts,
  acknowledgeHazmatCapAlert,
  hazmatCapsKey,
} from '@/lib/hazmat-production-cap-engine';
import type { HazmatProfile } from '@/types/hazmat-profile';
import { hazmatProfilesKey } from '@/types/hazmat-profile';
import type { ProductionOrder } from '@/types/production-order';
import { productionOrdersKey } from '@/types/production-order';

const ENTITY = 'TEST-HZC';

function mkPO(id: string, outputItemId: string, qty: number, startISO: string): ProductionOrder {
  return {
    id, entity_id: ENTITY, doc_no: id, bom_id: '', bom_version: 1,
    output_item_id: outputItemId, output_item_name: 'Solvent', output_item_code: 'SLV',
    planned_qty: qty, uom: 'L',
    start_date: startISO, target_end_date: startISO, actual_completion_date: startISO,
    status: 'completed', department_id: '', department_name: '',
    source_godown_id: null, wip_godown_id: null, output_godown_id: '',
    reservation_ids: [], project_id: null, project_milestone_id: null,
    project_centre_id: null, reference_project_id: null, sales_order_id: null,
    sales_order_line_mappings: [], sales_plan_id: null, customer_id: null,
    customer_name: null, business_unit_id: null, batch_no: null,
    is_export_project: false, production_site_id: null, nature_of_processing: null,
    is_job_work_in: false, linked_job_work_out_order_ids: [], qc_required: false,
    qc_scenario: null, linked_test_report_ids: [], routed_to_quarantine: false,
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

function seedItems(items: { id: string; name: string; hazmat_profile_id: string | null }[]) {
  localStorage.setItem('erp_inventory_items', JSON.stringify(items));
}

function mkProfile(id: string): HazmatProfile {
  return {
    id, entity_id: ENTITY, profile_name: 'Flammable',
    dg_class: '3', dg_sub_class: null, un_number: 'UN1993', packing_group: 'II',
    proper_shipping_name: 'Flammable liquid',
    flash_point_celsius: 35, boiling_point_celsius: 90,
    is_oxidizer: false, is_water_reactive: false, is_corrosive: false,
    is_toxic: false, is_carcinogenic: false,
    msds_document_url: null, msds_document_filename: null, msds_uploaded_at: null,
    msds_revision_no: null, emergency_contact_no: null, emergency_contact_name: null,
    max_storage_temperature_celsius: 30, min_storage_temperature_celsius: 0,
    ventilation_required: true, segregation_notes: null, notes: null,
    created_at: '2025-01-01', updated_at: '2025-01-01',
  };
}

beforeEach(() => localStorage.clear());

describe('hazmat-production-cap-engine', () => {
  it('returns empty utilisation when no caps configured', () => {
    expect(computeHazmatUtilisation(ENTITY)).toEqual([]);
  });

  it('aggregates qty by DG class and flags breach', () => {
    const now = new Date();
    const monthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10`;
    seedItems([{ id: 'itm-1', name: 'Acetone', hazmat_profile_id: 'hp-1' }]);
    localStorage.setItem(hazmatProfilesKey(ENTITY), JSON.stringify([mkProfile('hp-1')]));
    localStorage.setItem(hazmatCapsKey(ENTITY), JSON.stringify([
      { dg_class: '3', monthly_cap_units: 100, uom: 'L' },
    ]));
    localStorage.setItem(productionOrdersKey(ENTITY), JSON.stringify([
      mkPO('po1', 'itm-1', 110, monthISO),
    ]));
    const util = computeHazmatUtilisation(ENTITY);
    expect(util).toHaveLength(1);
    expect(util[0].status).toBe('breach');
  });

  it('ack lifecycle clears open alerts', () => {
    const now = new Date();
    const monthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10`;
    seedItems([{ id: 'itm-1', name: 'Acetone', hazmat_profile_id: 'hp-1' }]);
    localStorage.setItem(hazmatProfilesKey(ENTITY), JSON.stringify([mkProfile('hp-1')]));
    localStorage.setItem(hazmatCapsKey(ENTITY), JSON.stringify([
      { dg_class: '3', monthly_cap_units: 100, uom: 'L' },
    ]));
    localStorage.setItem(productionOrdersKey(ENTITY), JSON.stringify([
      mkPO('po1', 'itm-1', 85, monthISO),
    ]));
    const alerts = detectHazmatCapBreaches(ENTITY);
    expect(alerts.length).toBeGreaterThan(0);
    acknowledgeHazmatCapAlert(alerts[0].id, ENTITY);
    expect(listOpenHazmatCapAlerts(ENTITY).length).toBe(alerts.length - 1);
  });
});
