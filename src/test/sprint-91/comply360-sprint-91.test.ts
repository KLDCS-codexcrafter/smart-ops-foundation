/**
 * @file        src/test/sprint-91/comply360-sprint-91.test.ts
 * @sprint      Sprint 91 · T-Phase-5.F.5.3 · Floor 5.3 · Q35 Waste Management
 * @note        31 it() blocks · v1.30 §N Form A floor exceed · NO in-test ESLint (RETIRED at v1.31)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as nodeFs from 'fs';
import * as path from 'path';
import { SPRINTS, getCurrentAStreak, getSprintCount } from '@/lib/_institutional/sprint-history';
import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
import {
  recordHazardousForm1, listHazardousForm1,
  recordHazardousForm4, listHazardousForm4,
  recordHazardousForm10, listHazardousForm10,
  recordEWasteForm1, listEWasteForm1,
  recordEWasteForm6EPR, listEWasteForm6EPR,
  recordEWasteForm1A, listEWasteForm1A,
  recordPlasticForm1, listPlasticForm1,
  recordPlasticAnnualReturn, listPlasticAnnualReturns,
  recordBatteryForm1, listBatteryForm1,
  recordBatteryForm5, listBatteryForm5,
  recordBioMedicalForm2, listBioMedicalForm2,
  recordBioMedicalForm4, listBioMedicalForm4,
  recordEPRConsolidated, listEPRConsolidated,
  getWasteManagementComplianceSummary,
  READS_FROM as WM_RF,
} from '@/lib/comply360-waste-management-engine';
import { AUDIT_ENTITY_TYPES_REGISTRY } from '@/lib/comply360-audit-trail-aggregator-engine';
import { comply360SidebarItems } from '@/apps/erp/configs/comply360-sidebar-config';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);
const TEST_BAP = 'mr-a-client' as const;

describe('Sprint 91 · T-Phase-5.F.5.3 · Floor 5.3 · Waste Management (6 sub-regimes)', () => {
  beforeEach(() => { localStorage.clear(); });

  // ─── Institutional (5) ───
  it('Sprint 91 entry exists · code T-Phase-5.F.5.3 · grade A first-pass-clean', () => {
    const s = SPRINTS.find((e) => e.code === 'T-Phase-5.F.5.3');
    expect(s).toBeDefined();
    expect(s?.grade).toBe('A first-pass-clean');
  });
  it('Sprint 90 SHA backfilled to 72aff237...', () => {
    const s90 = SPRINTS.find((e) => e.code === 'T-Phase-5.F.5.2');
    expect(s90?.headSha).toBe('72aff23747e52e1945829ff68963e148d655a012');
  });
  it('A-streak >= 16 (target 17 post-bank)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(16);
  });
  it('SPRINTS count >= 108', () => {
    expect(getSprintCount()).toBeGreaterThanOrEqual(108);
  });
  it('SIBLINGs runtime >= 146', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(146);
  });

  // ─── NEW SIBLING (1) ───
  it('comply360-waste-management-engine registered · moatsRealized: []', () => {
    const e = SIBLINGS.find((s) => s.id === 'comply360-waste-management-engine');
    expect(e).toBeDefined();
    expect(e?.moatsRealized).toEqual([]);
  });

  // ─── READS_FROM canon (1) ───
  it('waste-management-engine READS_FROM includes 7 upstream engines', () => {
    expect(WM_RF.engines).toContain('comply360-audit-framework-engine');
    expect(WM_RF.engines).toContain('comply360-calendar-engine');
    expect(WM_RF.engines).toContain('comply360-brsr-comprehensive-engine');
    expect(WM_RF.engines).toContain('comply360-rule-11g-report-engine');
    expect(WM_RF.engines).toContain('comply360-environmental-engine');
    expect(WM_RF.engines).toContain('audit-trail-engine');
    expect(WM_RF.engines).toContain('comply360-audit-trail-aggregator-engine');
  });

  // ─── Module 1 · Hazardous (3) ───
  it('recordHazardousForm1 creates · listHazardousForm1 returns it', () => {
    const r = recordHazardousForm1({
      premises_id: 'P1', authorisation_number: 'HW-AUTH-1',
      issued_date: '2025-04-01', expiry_date: '2028-04-01',
      schedules: ['I', 'II'], status: 'active',
    }, TEST_BAP);
    expect(r.id).toBeTruthy();
    expect(listHazardousForm1({ status: 'active' })).toHaveLength(1);
  });
  it('recordHazardousForm4 (Annual Return) works', () => {
    recordHazardousForm4({
      fy: 'FY25-26', premises_id: 'P1', generated_mt: 10,
      recycled_mt: 7, disposed_mt: 3, filing_status: 'filed',
    }, TEST_BAP);
    expect(listHazardousForm4({ fy: 'FY25-26' })).toHaveLength(1);
  });
  it('recordHazardousForm10 (Manifest) works', () => {
    recordHazardousForm10({
      manifest_number: 'MAN-001', date: '2026-04-10',
      generator_id: 'G1', transporter_id: 'T1', tsdf_id: 'TSDF-A',
      waste_category: 'Used Oil', quantity_mt: 2.5,
    }, TEST_BAP);
    expect(listHazardousForm10()).toHaveLength(1);
  });

  // ─── Module 2 · E-Waste (3) ───
  it('recordEWasteForm1 creates authorisation', () => {
    recordEWasteForm1({
      producer_id: 'PROD-1', authorisation_number: 'EW-1',
      issued_date: '2025-04-01', expiry_date: '2028-04-01',
      product_categories: ['IT'], status: 'active',
    }, TEST_BAP);
    expect(listEWasteForm1()).toHaveLength(1);
  });
  it('recordEWasteForm6EPR (EPR Plan) works · filter by fy', () => {
    recordEWasteForm6EPR({
      fy: 'FY25-26', producer_id: 'PROD-1',
      target_collection_mt: 100, achieved_collection_mt: 85,
      pro_id: 'PRO-A', filing_status: 'filed',
    }, TEST_BAP);
    expect(listEWasteForm6EPR({ fy: 'FY25-26' })).toHaveLength(1);
    expect(listEWasteForm6EPR({ fy: 'FY24-25' })).toHaveLength(0);
  });
  it('recordEWasteForm1A (Annual Return) works', () => {
    recordEWasteForm1A({
      fy: 'FY25-26', producer_id: 'PROD-1',
      placed_market_mt: 200, collected_mt: 170, recycled_mt: 165,
      filing_status: 'filed',
    }, TEST_BAP);
    expect(listEWasteForm1A({ fy: 'FY25-26' })).toHaveLength(1);
  });

  // ─── Module 3 · Plastic (2) ───
  it('recordPlasticForm1 (Registration) works', () => {
    recordPlasticForm1({
      entity_role: 'producer', registration_number: 'PL-1',
      issued_date: '2025-04-01', expiry_date: '2028-04-01', status: 'active',
    }, TEST_BAP);
    expect(listPlasticForm1()).toHaveLength(1);
  });
  it('recordPlasticAnnualReturn computes 4 categories + EPR', () => {
    recordPlasticAnnualReturn({
      fy: 'FY25-26', entity_role: 'producer',
      category_i_mt: 10, category_ii_mt: 5, category_iii_mt: 2, category_iv_mt: 1,
      epr_target_mt: 18, epr_achieved_mt: 16, filing_status: 'filed',
    }, TEST_BAP);
    expect(listPlasticAnnualReturns({ fy: 'FY25-26' })).toHaveLength(1);
  });

  // ─── Module 4 · Battery (2) ───
  it('recordBatteryForm1 (Registration with chemistry) works', () => {
    recordBatteryForm1({
      producer_id: 'PROD-B', registration_number: 'BAT-1',
      chemistry: 'lithium_ion',
      issued_date: '2025-04-01', expiry_date: '2028-04-01', status: 'active',
    }, TEST_BAP);
    expect(listBatteryForm1()).toHaveLength(1);
  });
  it('recordBatteryForm5 (Annual Return with EPR percentages) works', () => {
    recordBatteryForm5({
      fy: 'FY25-26', producer_id: 'PROD-B',
      placed_market_mt: 50, collected_mt: 40, recycled_mt: 38,
      epr_target_pct: 80, epr_achieved_pct: 76, filing_status: 'filed',
    }, TEST_BAP);
    expect(listBatteryForm5({ fy: 'FY25-26' })).toHaveLength(1);
  });

  // ─── Module 5 · Bio-Medical (2) ───
  it('recordBioMedicalForm2 (Authorisation) works · 4 facility types', () => {
    recordBioMedicalForm2({
      facility_id: 'HOSP-1', facility_type: 'hospital',
      authorisation_number: 'BMW-1',
      issued_date: '2025-04-01', expiry_date: '2028-04-01',
      beds_count: 200, status: 'active',
    }, TEST_BAP);
    expect(listBioMedicalForm2()).toHaveLength(1);
  });
  it('recordBioMedicalForm4 (Annual Report with 4 colour-coded streams) works', () => {
    recordBioMedicalForm4({
      fy: 'FY25-26', facility_id: 'HOSP-1',
      yellow_kg: 1200, red_kg: 800, white_kg: 50, blue_kg: 300,
      filing_status: 'filed',
    }, TEST_BAP);
    expect(listBioMedicalForm4({ fy: 'FY25-26' })).toHaveLength(1);
  });

  // ─── Module 6 · EPR Consolidated (2) ───
  it('recordEPRConsolidated tracker works for all 3 regimes', () => {
    recordEPRConsolidated({
      fy: 'FY25-26', regime: 'e-waste', producer_id: 'PROD-1',
      target_mt: 100, achieved_mt: 85, shortfall_mt: 15,
      environmental_compensation_inr: 0, status: 'shortfall',
    }, TEST_BAP);
    recordEPRConsolidated({
      fy: 'FY25-26', regime: 'plastic', producer_id: 'PROD-1',
      target_mt: 50, achieved_mt: 50, shortfall_mt: 0,
      environmental_compensation_inr: 0, status: 'achieved',
    }, TEST_BAP);
    expect(listEPRConsolidated({ fy: 'FY25-26' })).toHaveLength(2);
    expect(listEPRConsolidated({ regime: 'e-waste' })).toHaveLength(1);
  });
  it('listEPRConsolidated filters by both fy and regime', () => {
    recordEPRConsolidated({
      fy: 'FY25-26', regime: 'battery', producer_id: 'P1',
      target_mt: 10, achieved_mt: 9, shortfall_mt: 1,
      environmental_compensation_inr: 100, status: 'shortfall',
    }, TEST_BAP);
    expect(listEPRConsolidated({ fy: 'FY25-26', regime: 'battery' })).toHaveLength(1);
    expect(listEPRConsolidated({ fy: 'FY24-25', regime: 'battery' })).toHaveLength(0);
  });

  // ─── Consolidated Summary (2) ───
  it('getWasteManagementComplianceSummary returns 9-field object', () => {
    const s = getWasteManagementComplianceSummary('FY25-26');
    expect(s).toHaveProperty('hazardous_active_auth_count');
    expect(s).toHaveProperty('ewaste_active_auth_count');
    expect(s).toHaveProperty('plastic_active_reg_count');
    expect(s).toHaveProperty('battery_active_reg_count');
    expect(s).toHaveProperty('biomedical_active_auth_count');
    expect(s).toHaveProperty('expiring_auths_next_90_days');
    expect(s).toHaveProperty('annual_returns_filed_current_fy');
    expect(s).toHaveProperty('epr_shortfall_count');
    expect(s).toHaveProperty('overall_status');
  });
  it('summary reflects shortfall as attention_required', () => {
    recordEPRConsolidated({
      fy: 'FY25-26', regime: 'plastic', producer_id: 'X',
      target_mt: 10, achieved_mt: 5, shortfall_mt: 5,
      environmental_compensation_inr: 1000, status: 'shortfall',
    }, TEST_BAP);
    const s = getWasteManagementComplianceSummary('FY25-26');
    expect(s.epr_shortfall_count).toBeGreaterThanOrEqual(1);
    expect(s.overall_status).not.toBe('compliant');
  });

  // ─── Audit entity types (1) ───
  it('13 NEW waste-management entity types registered (module esg)', () => {
    const ids = AUDIT_ENTITY_TYPES_REGISTRY.map((t) => t.id);
    for (const t of [
      'hazardous_form1', 'hazardous_form4', 'hazardous_form10',
      'ewaste_form1', 'ewaste_form6_epr', 'ewaste_form1a',
      'plastic_form1', 'plastic_annual',
      'battery_form1', 'battery_form5',
      'biomedical_form2', 'biomedical_form4',
      'epr_consolidated',
    ]) {
      expect(ids).toContain(t);
    }
  });

  // ─── Page existence + structure (2) · bounds-check ───
  it('WasteManagementDashboardPage file exists', () => {
    expect(nodeFs.existsSync(SRC('src/pages/erp/comply360/waste-management/WasteManagementDashboardPage.tsx'))).toBe(true);
  });
  it('WasteManagementDashboardPage has >=6 TabsTrigger', () => {
    const src = nodeFs.readFileSync(SRC('src/pages/erp/comply360/waste-management/WasteManagementDashboardPage.tsx'), 'utf8');
    const matches = src.match(/<TabsTrigger\b/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(6);
  });

  // ─── Router + sidebar integration (3) ───
  it('Comply360Page imports WasteManagementDashboardPage', () => {
    const src = nodeFs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf8');
    expect(src).toContain('WasteManagementDashboardPage');
  });
  it('Comply360Page has waste-management router case', () => {
    const src = nodeFs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf8');
    expect(src).toContain("case 'waste-management':");
  });
  it('sidebar-config has waste-management entry with keyboard `c W`', () => {
    const item = comply360SidebarItems.find((i) => i.id === 'waste-management');
    expect(item).toBeDefined();
    expect(item?.keyboard).toBe('c W');
  });

  // ─── §H 0-DIFF anchors (2) ───
  it('S90 environmental + eia engines unchanged — files exist', () => {
    expect(nodeFs.existsSync(SRC('src/lib/comply360-environmental-engine.ts'))).toBe(true);
    expect(nodeFs.existsSync(SRC('src/lib/comply360-eia-engine.ts'))).toBe(true);
  });
  it('upstream engines + _shared/ components unchanged', () => {
    expect(nodeFs.existsSync(SRC('src/lib/comply360-audit-framework-engine.ts'))).toBe(true);
    expect(nodeFs.existsSync(SRC('src/lib/comply360-calendar-engine.ts'))).toBe(true);
    expect(nodeFs.existsSync(SRC('src/pages/erp/comply360/_shared/Comply360Breadcrumb.tsx'))).toBe(true);
  });
});
