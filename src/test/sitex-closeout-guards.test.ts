/**
 * @file        src/test/sitex-closeout-guards.test.ts
 * @purpose     A.15b closeout guard tests (FR-30 header backfilled at A.16c.G.1 T3.1)
 * @sprint      T-Phase-1.A.15b SiteX Closeout Mobile · Block G.3
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkCloseoutGuards, generateMobilizationChecklist, completeMobilizationItem,
  isReadyToTransitionFromMobilizing, createSite,
} from '@/lib/sitex-engine';
import { siteMastersKey, type SiteMaster } from '@/types/sitex';

const E = 'TEST';
const mkSite = (mode: SiteMaster['site_mode']): SiteMaster => ({
  id: 'S1', entity_id: 'E', branch_id: 'B', site_code: 'S-001', site_name: 'X',
  site_mode: mode, site_type: 'turnkey', status: 'active',
  mobilization_date: null, mobilization_actual: null,
  planned_demobilization: null, actual_demobilization: null,
  project_id: null, customer_id: null, customer_name: null,
  source_quotation_id: null, source_so_id: null,
  location: { address_line_1: '', address_line_2: null, city: '', state: '',
    district: null, pincode: '', geo_lat: 0, geo_lng: 0, geo_radius_meters: 100 },
  site_manager_id: 'M', safety_officer_id: 'S', qc_in_charge_id: null,
  contract_value: 0, approved_budget: 0, imprest_limit: 0,
  billed_to_date: 0, cost_to_date: 0, margin_pct: 0,
  linked_drawing_ids: [], linked_boq_id: null,
  originating_department_id: 'D', description: '', is_active: true,
  created_at: '', updated_at: '',
});

beforeEach(() => localStorage.removeItem(siteMastersKey(E)));

describe('sitex closeout guards', () => {
  it('Phase-1 stub guards return all_passed=true', () => {
    createSite(E, mkSite('construction'));
    const g = checkCloseoutGuards(E, 'S1');
    expect(g.all_passed).toBe(true);
  });
  it('capex_internal skips customer_signoff', () => {
    createSite(E, mkSite('capex_internal'));
    const g = checkCloseoutGuards(E, 'S1');
    const signoff = g.results.find((r) => r.guard_name === 'customer_signoff');
    expect(signoff?.status).toBe('skip_for_mode');
  });
  it('returns failed for unknown site', () => {
    expect(checkCloseoutGuards(E, 'unknown').all_passed).toBe(false);
  });
});

describe('mobilization checklist', () => {
  it('install_commission returns 12 items', () => {
    expect(generateMobilizationChecklist(mkSite('install_commission')).length).toBe(12);
  });
  it('construction returns 18 items', () => {
    expect(generateMobilizationChecklist(mkSite('construction')).length).toBe(18);
  });
  it('capex_internal returns 15 items', () => {
    expect(generateMobilizationChecklist(mkSite('capex_internal')).length).toBe(15);
  });
  it('isReadyToTransitionFromMobilizing pending when incomplete', () => {
    const items = generateMobilizationChecklist(mkSite('construction'));
    const r = isReadyToTransitionFromMobilizing(mkSite('construction'), items);
    expect(r.allowed).toBe(false);
    expect(r.pending_items.length).toBeGreaterThan(0);
  });
  it('completeMobilizationItem returns false for unknown', () => {
    expect(completeMobilizationItem(E, 'S1', 'unknown', 'u', null)).toBe(false);
  });
});
