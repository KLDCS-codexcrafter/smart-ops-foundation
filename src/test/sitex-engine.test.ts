/**
 * @file        src/test/sitex-engine.test.ts
 * @sprint      T-Phase-1.A.14 SiteX Foundation · Block I.1
 * @purpose     Verify sitex-engine Path B own entity behavior · 5-state machine guards · bridge event emission
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  listSites, getSite, createSite, mobilizeSite, canTransitionSiteState, getSiteContext,
} from '@/lib/sitex-engine';
import type { SiteMaster } from '@/types/sitex';

const ENTITY = 'TEST';

function makeSite(overrides: Partial<SiteMaster> = {}): SiteMaster {
  return {
    id: 'site-test-1',
    entity_id: ENTITY,
    branch_id: '',
    site_code: 'TEST-SITE-1',
    site_name: 'Test Site',
    site_mode: 'install_commission',
    site_type: 'erection',
    status: 'planned',
    mobilization_date: '2026-06-01',
    mobilization_actual: null,
    planned_demobilization: '2026-09-01',
    actual_demobilization: null,
    project_id: 'PRJ-001',
    customer_id: 'CUST-001',
    customer_name: 'Test Customer',
    source_quotation_id: null,
    source_so_id: null,
    location: {
      address_line_1: 'Test Address', address_line_2: null,
      city: 'Mumbai', state: 'Maharashtra', district: 'Mumbai',
      pincode: '400001', geo_lat: 19.076, geo_lng: 72.8777, geo_radius_meters: 500,
    },
    site_manager_id: 'PSN-001',
    safety_officer_id: null,
    qc_in_charge_id: null,
    contract_value: 1000000, approved_budget: 900000, imprest_limit: 100000,
    billed_to_date: 0, cost_to_date: 0, margin_pct: 0,
    linked_drawing_ids: [], linked_boq_id: null,
    originating_department_id: 'DEPT-PROJ',
    description: 'Test', is_active: true,
    created_at: '2026-05-10T10:00:00Z', updated_at: '2026-05-10T10:00:00Z',
    ...overrides,
  };
}

describe('A.14 · sitex-engine · Path B own entity · Site=Branch lifecycle', () => {
  beforeEach(() => localStorage.clear());

  it('listSites returns empty array for fresh entity', () => {
    expect(listSites(ENTITY)).toEqual([]);
  });

  it('createSite + getSite roundtrip · D-194 entity-prefixed key', () => {
    const site = makeSite();
    createSite(ENTITY, site);
    expect(getSite(ENTITY, site.id)).toEqual(site);
    expect(listSites(ENTITY)).toHaveLength(1);
  });

  it('mobilizeSite · success when site_manager_id present + install_commission mode', () => {
    const site = makeSite();
    createSite(ENTITY, site);
    const result = mobilizeSite(ENTITY, site.id);
    expect(result.allowed).toBe(true);
    expect(result.to_state).toBe('mobilizing');
    expect(getSite(ENTITY, site.id)?.status).toBe('mobilizing');
    expect(getSite(ENTITY, site.id)?.mobilization_actual).toBeTruthy();
  });

  it('canTransitionSiteState · blocks mobilize for construction mode without safety_officer_id', () => {
    const site = makeSite({ site_mode: 'construction', safety_officer_id: null });
    const guard = canTransitionSiteState(site, 'mobilizing');
    expect(guard.allowed).toBe(false);
    expect(guard.missing_prerequisites).toContain('safety_officer_id required for construction/capex_internal modes');
  });

  it('canTransitionSiteState · blocks mobilize for capex_internal mode without safety_officer_id', () => {
    const site = makeSite({ site_mode: 'capex_internal', safety_officer_id: null });
    const guard = canTransitionSiteState(site, 'mobilizing');
    expect(guard.allowed).toBe(false);
  });

  it('getSiteContext returns null + zeros for nonexistent site', () => {
    const ctx = getSiteContext(ENTITY, 'nonexistent');
    expect(ctx.site).toBeNull();
    expect(ctx.isActive).toBe(false);
    expect(ctx.daysInProgress).toBe(0);
  });
});
