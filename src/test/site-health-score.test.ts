/**
 * site-health-score.test.ts — A.15b T2 catch-up · Block G.4
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { computeSiteHealthScore, getSiteHealthRAG } from '@/lib/site-health-score-engine';
import { createSite } from '@/lib/sitex-engine';
import { siteMastersKey, type SiteMaster } from '@/types/sitex';

const E = 'TEST';
const site: SiteMaster = {
  id: 'S1', entity_id: 'E', branch_id: 'B', site_code: 'S-001', site_name: 'X',
  site_mode: 'construction', site_type: 'epc', status: 'active',
  mobilization_date: null, mobilization_actual: null,
  planned_demobilization: null, actual_demobilization: null,
  project_id: null, customer_id: null, customer_name: null,
  source_quotation_id: null, source_so_id: null,
  location: { address_line_1: '', address_line_2: null, city: '', state: '',
    district: null, pincode: '', geo_lat: 0, geo_lng: 0, geo_radius_meters: 100 },
  site_manager_id: 'M', safety_officer_id: 'S', qc_in_charge_id: null,
  contract_value: 1000000, approved_budget: 1000000, imprest_limit: 100000,
  billed_to_date: 0, cost_to_date: 500000, margin_pct: 0,
  linked_drawing_ids: [], linked_boq_id: null,
  originating_department_id: 'D', description: '', is_active: true,
  created_at: '', updated_at: '',
};

beforeEach(() => {
  localStorage.removeItem(siteMastersKey(E));
  createSite(E, site);
});

describe('site-health-score-engine', () => {
  it('returns 0-100 with 5 dimensions', () => {
    const s = computeSiteHealthScore(E, 'S1');
    expect(s.overall_score).toBeGreaterThanOrEqual(0);
    expect(s.overall_score).toBeLessThanOrEqual(100);
    expect(Object.keys(s.dimensions).length).toBe(5);
  });
  it('weights sum to 1.0', () => {
    const s = computeSiteHealthScore(E, 'S1');
    const sum = s.dimensions.safety.weight + s.dimensions.schedule.weight
      + s.dimensions.cost.weight + s.dimensions.quality.weight + s.dimensions.workforce.weight;
    expect(sum).toBeCloseTo(1.0, 5);
  });
  it('RAG green for >=80', () => expect(getSiteHealthRAG(85)).toBe('green'));
  it('RAG amber for 60-79', () => expect(getSiteHealthRAG(70)).toBe('amber'));
  it('RAG red for <60', () => expect(getSiteHealthRAG(40)).toBe('red'));
  it('RAG boundary at 80', () => expect(getSiteHealthRAG(80)).toBe('green'));
  it('RAG boundary at 60', () => expect(getSiteHealthRAG(60)).toBe('amber'));
});
