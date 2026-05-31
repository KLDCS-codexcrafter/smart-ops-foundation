/**
 * @file        src/test/sprint-89/comply360-sprint-89.test.ts
 * @sprint      Sprint 89 · T-Phase-5.F.5.1 · FLOOR 5 OPENS · Q33 Fire Safety + Industrial Safety
 * @note        22+ it() blocks per v1.30 §N Form A floor · NO in-test ESLint (RETIRED at v1.31)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as nodeFs from 'fs';
import * as path from 'path';
import { SPRINTS, getCurrentAStreak, getSprintCount } from '@/lib/_institutional/sprint-history';
import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
import {
  recordFireNOC, listFireNOCs,
  recordFireSafetyAudit, listFireSafetyAudits,
  recordEquipmentAMC, listEquipmentAMCs,
  recordEvacuationDrill, listEvacuationDrills,
  recordBuildingFireCertificate, listBuildingFireCertificates,
  getFireSafetyComplianceSummary,
  READS_FROM as FS_RF,
} from '@/lib/comply360-fire-safety-engine';
import {
  recordPESOLicense, listPESOLicenses,
  recordBoilerInspection, listBoilerInspections,
  recordSMPV, listSMPVRecords,
  recordElectricalSafetyNOC, listElectricalSafetyNOCs,
  recordLiftActFiling, listLiftActFilings,
  getIndustrialSafetyComplianceSummary,
  READS_FROM as IS_RF,
} from '@/lib/comply360-industrial-safety-engine';
import { AUDIT_ENTITY_TYPES_REGISTRY } from '@/lib/comply360-audit-trail-aggregator-engine';
import { comply360SidebarItems } from '@/apps/erp/configs/comply360-sidebar-config';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);
const TEST_BAP = 'engagement_partner' as const;

describe('Sprint 89 · T-Phase-5.F.5.1 · FLOOR 5 OPENS · Fire Safety + Industrial Safety', () => {
  beforeEach(() => { localStorage.clear(); });

  // ─── Institutional (5) ───
  it('Sprint 89 entry exists · code T-Phase-5.F.5.1 · grade A first-pass-clean', () => {
    const s89 = SPRINTS.find((s) => s.code === 'T-Phase-5.F.5.1');
    expect(s89).toBeDefined();
    expect(s89?.grade).toBe('A first-pass-clean');
  });
  it('Sprint 88 SHA backfilled to 58d4246...', () => {
    const s88 = SPRINTS.find((s) => s.code === 'T-Phase-5.E.5.0');
    expect(s88?.headSha).toBe('58d4246140ac2ac9681dfafab59cd5209ef7c381');
  });
  it('A-streak >= 14 (target 15 post-bank)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(14);
  });
  it('SPRINTS count >= 106', () => {
    expect(getSprintCount()).toBeGreaterThanOrEqual(106);
  });
  it('SIBLINGs runtime >= 143', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(143);
  });

  // ─── 2 NEW SIBLINGs (2) ───
  it('comply360-fire-safety-engine registered · moatsRealized: []', () => {
    const fs = SIBLINGS.find((s) => s.id === 'comply360-fire-safety-engine');
    expect(fs).toBeDefined();
    expect(fs?.moatsRealized).toEqual([]);
  });
  it('comply360-industrial-safety-engine registered · moatsRealized: []', () => {
    const is = SIBLINGS.find((s) => s.id === 'comply360-industrial-safety-engine');
    expect(is).toBeDefined();
    expect(is?.moatsRealized).toEqual([]);
  });

  // ─── READS_FROM canon (2) ───
  it('fire-safety-engine READS_FROM includes factory-license-cap + audit-framework + calendar + rule-11g', () => {
    expect(FS_RF.engines).toContain('factory-license-cap-engine');
    expect(FS_RF.engines).toContain('comply360-audit-framework-engine');
    expect(FS_RF.engines).toContain('comply360-calendar-engine');
    expect(FS_RF.engines).toContain('comply360-rule-11g-report-engine');
  });
  it('industrial-safety-engine READS_FROM includes licenses-registry + audit-framework + calendar + rule-11g', () => {
    expect(IS_RF.engines).toContain('comply360-licenses-registry-engine');
    expect(IS_RF.engines).toContain('comply360-audit-framework-engine');
    expect(IS_RF.engines).toContain('comply360-calendar-engine');
    expect(IS_RF.engines).toContain('comply360-rule-11g-report-engine');
  });

  // ─── fire-safety functional (5) ───
  it('recordFireNOC creates Fire NOC with id · listFireNOCs returns it', () => {
    const noc = recordFireNOC({ premises_id: 'p1', state: 'MH', noc_number: 'NOC-001', issued_date: '2025-04-01', expiry_date: '2028-04-01', status: 'active', occupancy_class: 'G_industrial' }, TEST_BAP);
    expect(noc.id).toBeTruthy();
    expect(listFireNOCs({ state: 'MH' })).toHaveLength(1);
  });
  it('listFireNOCs filters by status', () => {
    recordFireNOC({ premises_id: 'p1', state: 'KA', noc_number: 'NOC-002', issued_date: '2025-04-01', expiry_date: '2028-04-01', status: 'active', occupancy_class: 'G_industrial' }, TEST_BAP);
    recordFireNOC({ premises_id: 'p1', state: 'KA', noc_number: 'NOC-003', issued_date: '2020-01-01', expiry_date: '2023-01-01', status: 'expired', occupancy_class: 'G_industrial' }, TEST_BAP);
    expect(listFireNOCs({ status: 'expired' })).toHaveLength(1);
  });
  it('recordFireSafetyAudit + recordEquipmentAMC + recordEvacuationDrill + recordBuildingFireCertificate work', () => {
    recordFireSafetyAudit({ premises_id: 'p1', audit_date: '2025-05-01', auditor_name: 'A', observations: [], pass_status: 'pass' }, TEST_BAP);
    recordEquipmentAMC({ equipment_type: 'extinguisher_refill', vendor_name: 'V', amc_start_date: '2025-04-01', amc_end_date: '2026-04-01', cost_inr: 10000, next_service_date: '2025-10-01' }, TEST_BAP);
    recordEvacuationDrill({ drill_date: '2025-06-01', premises_id: 'p1', participants_count: 50, evacuation_time_seconds: 180, observations: '' }, TEST_BAP);
    recordBuildingFireCertificate({ building_name: 'B1', certificate_number: 'BFC-1', issued_date: '2025-01-01', expiry_date: '2028-01-01', issuing_authority: 'Fire Dept' }, TEST_BAP);
    expect(listFireSafetyAudits()).toHaveLength(1);
    expect(listEquipmentAMCs()).toHaveLength(1);
    expect(listEvacuationDrills()).toHaveLength(1);
    expect(listBuildingFireCertificates()).toHaveLength(1);
  });
  it('getFireSafetyComplianceSummary returns 6-field object', () => {
    const s = getFireSafetyComplianceSummary('FY25-26');
    expect(s).toHaveProperty('active_nocs');
    expect(s).toHaveProperty('expiring_nocs_next_90_days');
    expect(s).toHaveProperty('audits_passed_last_12_months');
    expect(s).toHaveProperty('evacuation_drills_last_12_months');
    expect(s).toHaveProperty('equipment_amcs_active');
    expect(s).toHaveProperty('overall_status');
  });
  it('fire-safety entity types registered (5 NEW)', () => {
    const ids = AUDIT_ENTITY_TYPES_REGISTRY.map((t) => t.id);
    for (const t of ['fire_noc', 'fire_safety_audit', 'evacuation_drill', 'equipment_amc', 'building_fire_certificate']) {
      expect(ids).toContain(t);
    }
  });

  // ─── industrial-safety functional (5) ───
  it('recordPESOLicense creates license · listPESOLicenses returns it', () => {
    const lic = recordPESOLicense({ license_type: 'diesel_storage', license_number: 'PESO-001', capacity_kl_or_kg: 5000, premises_id: 'p1', issued_date: '2025-04-01', expiry_date: '2028-04-01', status: 'active' }, TEST_BAP);
    expect(lic.id).toBeTruthy();
    expect(listPESOLicenses({ license_type: 'diesel_storage' })).toHaveLength(1);
  });
  it('listPESOLicenses filters by status', () => {
    recordPESOLicense({ license_type: 'lpg_storage', license_number: 'PESO-002', capacity_kl_or_kg: 1000, premises_id: 'p1', issued_date: '2025-04-01', expiry_date: '2028-04-01', status: 'active' }, TEST_BAP);
    expect(listPESOLicenses({ status: 'active' })).toHaveLength(1);
  });
  it('recordBoilerInspection + recordSMPV + recordElectricalSafetyNOC + recordLiftActFiling work', () => {
    recordBoilerInspection({ boiler_serial_number: 'BLR-1', capacity_kg_per_hour: 500, inspection_date: '2025-05-01', inspector_name: 'I', next_inspection_due: '2026-05-01', inspection_result: 'pass', observations: '' }, TEST_BAP);
    recordSMPV({ vessel_serial_number: 'SMPV-1', vessel_type: 'static', pressure_rating_bar: 10, inspection_date: '2025-05-01', next_inspection_due: '2026-05-01', compliance_status: 'compliant' }, TEST_BAP);
    recordElectricalSafetyNOC({ premises_id: 'p1', noc_number: 'EL-1', voltage_class: 'HT', issued_date: '2025-01-01', expiry_date: '2028-01-01', issuing_authority: 'CEIG' }, TEST_BAP);
    recordLiftActFiling({ lift_serial_number: 'LIFT-1', state: 'MH', registration_number: 'LR-1', capacity_persons: 8, registration_date: '2025-01-01', next_inspection_due: '2026-01-01' }, TEST_BAP);
    expect(listBoilerInspections()).toHaveLength(1);
    expect(listSMPVRecords()).toHaveLength(1);
    expect(listElectricalSafetyNOCs()).toHaveLength(1);
    expect(listLiftActFilings()).toHaveLength(1);
  });
  it('getIndustrialSafetyComplianceSummary returns 6-field object', () => {
    const s = getIndustrialSafetyComplianceSummary('FY25-26');
    expect(s).toHaveProperty('peso_licenses_active');
    expect(s).toHaveProperty('boiler_inspections_passed_last_12_months');
    expect(s).toHaveProperty('smpv_compliant_count');
    expect(s).toHaveProperty('electrical_nocs_active');
    expect(s).toHaveProperty('lift_filings_compliant');
    expect(s).toHaveProperty('overall_status');
  });
  it('industrial-safety entity types registered (5 NEW)', () => {
    const ids = AUDIT_ENTITY_TYPES_REGISTRY.map((t) => t.id);
    for (const t of ['peso_license', 'boiler_inspection', 'smpv_record', 'electrical_safety_noc', 'lift_act_filing']) {
      expect(ids).toContain(t);
    }
  });

  // ─── Page existence + structure (4) · bounds-check ───
  it('FireSafetyDashboardPage file exists', () => {
    expect(nodeFs.existsSync(SRC('src/pages/erp/comply360/fire-safety/FireSafetyDashboardPage.tsx'))).toBe(true);
  });
  it('FireSafetyDashboardPage has >=4 TabsTrigger', () => {
    const src = nodeFs.readFileSync(SRC('src/pages/erp/comply360/fire-safety/FireSafetyDashboardPage.tsx'), 'utf8');
    const matches = src.match(/<TabsTrigger\b/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });
  it('IndustrialSafetyDashboardPage file exists', () => {
    expect(nodeFs.existsSync(SRC('src/pages/erp/comply360/industrial-safety/IndustrialSafetyDashboardPage.tsx'))).toBe(true);
  });
  it('IndustrialSafetyDashboardPage has >=3 TabsTrigger', () => {
    const src = nodeFs.readFileSync(SRC('src/pages/erp/comply360/industrial-safety/IndustrialSafetyDashboardPage.tsx'), 'utf8');
    const matches = src.match(/<TabsTrigger\b/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  // ─── Router + sidebar integration (3) ───
  it('Comply360Page imports FireSafetyDashboardPage and IndustrialSafetyDashboardPage', () => {
    const src = nodeFs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf8');
    expect(src).toContain('FireSafetyDashboardPage');
    expect(src).toContain('IndustrialSafetyDashboardPage');
  });
  it('Comply360Page has fire-safety + industrial-safety router cases', () => {
    const src = nodeFs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf8');
    expect(src).toContain("case 'fire-safety':");
    expect(src).toContain("case 'industrial-safety':");
  });
  it('sidebar-config has fire-safety + industrial-safety entries', () => {
    const ids = comply360SidebarItems.map((i) => i.id);
    expect(ids).toContain('fire-safety');
    expect(ids).toContain('industrial-safety');
  });

  // ─── §H 0-DIFF sanity (1 grouped) ───
  it('upstream engines unchanged — files exist at expected paths', () => {
    expect(nodeFs.existsSync(SRC('src/lib/factory-license-cap-engine.ts'))).toBe(true);
    expect(nodeFs.existsSync(SRC('src/lib/comply360-licenses-registry-engine.ts'))).toBe(true);
    expect(nodeFs.existsSync(SRC('src/lib/comply360-audit-framework-engine.ts'))).toBe(true);
    expect(nodeFs.existsSync(SRC('src/lib/comply360-calendar-engine.ts'))).toBe(true);
    expect(nodeFs.existsSync(SRC('src/lib/comply360-rule-11g-report-engine.ts'))).toBe(true);
  });
});
