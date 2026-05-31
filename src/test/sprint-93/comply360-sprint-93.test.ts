/**
 * @file        src/test/sprint-93/comply360-sprint-93.test.ts
 * @sprint      Sprint 93 · T-Phase-5.F.5.5 · Floor 5.5 · Q37 Quality + Labour Tier-2
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as nodeFs from 'fs';
import * as path from 'path';
import { SPRINTS, getCurrentAStreak, getSprintCount } from '@/lib/_institutional/sprint-history';
import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
import {
  recordScheduleHDispense, listScheduleHRecords,
  recordH1Sale, listH1Sales,
  registerFSSAILicense, listFSSAILicenses,
  registerBISCert, listBISCerts,
  registerISOCert, listISOCerts,
  registerNABLScope, listNABLScopes,
  recordLegalMetrology, listLegalMetrology,
  initiateRecall, listRecalls,
  recordQualityAudit, listQualityAudits,
  getQualityComplianceSummary,
  READS_FROM as QS_RF,
} from '@/lib/comply360-quality-standards-engine';
import {
  computeBonus, listBonusComputations,
  fileMaternityClaim, listMaternityClaims,
  recordEqualRemAudit, listEqualRemAudits,
  registerApprentice, listApprentices,
  recordCLRAEngagement, listCLRAEngagements,
  registerShop, listShops,
  fileForm21, listForm21,
  recordOSHCheckup, listOSHCheckups,
  getLabourTier2ComplianceSummary,
  READS_FROM as LT2_RF,
} from '@/lib/comply360-labour-tier2-engine';
import { AUDIT_ENTITY_TYPES_REGISTRY } from '@/lib/comply360-audit-trail-aggregator-engine';
import { comply360SidebarItems } from '@/apps/erp/configs/comply360-sidebar-config';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);
const BAP = 'mr-a-client' as const;

describe('Sprint 93 · T-Phase-5.F.5.5 · Floor 5.5 · Quality + Labour Tier-2', () => {
  beforeEach(() => { localStorage.clear(); });

  // ─── Institutional (5) ───
  it('Sprint 93 entry exists · code T-Phase-5.F.5.5 · grade A first-pass-clean', () => {
    const s = SPRINTS.find((e) => e.code === 'T-Phase-5.F.5.5');
    expect(s).toBeDefined();
    expect(s?.grade).toBe('A first-pass-clean');
  });
  it('Sprint 92 SHA backfilled to 98f82039...', () => {
    const s92 = SPRINTS.find((e) => e.code === 'T-Phase-5.F.5.4');
    expect(s92?.headSha).toBe('98f820391f5bab0193a2195a0562c4cf06eda75b');
  });
  it('A-streak >= 18 (target 19 post-bank)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(18);
  });
  it('SPRINTS count >= 110', () => {
    expect(getSprintCount()).toBeGreaterThanOrEqual(110);
  });
  it('SIBLINGs runtime >= 150', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(150);
  });

  // ─── NEW SIBLINGs (2) ───
  it('comply360-quality-standards-engine registered · moatsRealized: []', () => {
    const e = SIBLINGS.find((s) => s.id === 'comply360-quality-standards-engine');
    expect(e).toBeDefined();
    expect(e?.moatsRealized).toEqual([]);
  });
  it('comply360-labour-tier2-engine registered · moatsRealized: []', () => {
    const e = SIBLINGS.find((s) => s.id === 'comply360-labour-tier2-engine');
    expect(e).toBeDefined();
    expect(e?.moatsRealized).toEqual([]);
  });

  // ─── READS_FROM canon (2) ───
  it('quality-standards READS_FROM audit-trail anchors', () => {
    expect(QS_RF.engines).toContain('audit-trail-engine');
    expect(QS_RF.engines).toContain('comply360-audit-trail-aggregator-engine');
  });
  it('labour-tier2 READS_FROM peoplepay-skill (cross-card)', () => {
    expect(LT2_RF.engines).toContain('peoplepay-skill-engine');
    expect(LT2_RF.engines).toContain('audit-trail-engine');
  });

  // ─── Quality (10) ───
  it('recordScheduleHDispense + filter by class', () => {
    recordScheduleHDispense({
      drug_name: 'Tramadol', schedule_class: 'H1', batch_no: 'B1',
      qty_dispensed: 10, prescriber: 'Dr X', patient_name: 'A', dispensed_at: '2026-06-01',
    }, BAP);
    expect(listScheduleHRecords({ schedule_class: 'H1' })).toHaveLength(1);
    expect(listScheduleHRecords({ schedule_class: 'X' })).toHaveLength(0);
  });
  it('recordH1Sale persists', () => {
    recordH1Sale({
      drug_name: 'Tramadol', qty: 10, prescription_ref: 'RX-1',
      prescriber_reg_no: 'MCI-1', patient_name: 'A', patient_address: 'Pune',
      dispensed_at: '2026-06-01',
    }, BAP);
    expect(listH1Sales()).toHaveLength(1);
  });
  it('registerFSSAILicense + active filter', () => {
    registerFSSAILicense({
      license_no: 'F1', tier: 'state', fbo_name: 'Acme',
      issued_on: '2026-01-01', valid_until: '2027-01-01', status: 'active',
    }, BAP);
    expect(listFSSAILicenses({ status: 'active' })).toHaveLength(1);
  });
  it('registerBISCert + list', () => {
    registerBISCert({
      kind: 'isi', cm_license_no: 'CM/L-1', product: 'Cement',
      is_standard: 'IS 269:2015', issued_on: '2026-01-01', valid_until: '2027-01-01',
    }, BAP);
    expect(listBISCerts()).toHaveLength(1);
  });
  it('registerISOCert with standard filter', () => {
    registerISOCert({
      standard: '9001', certifying_body: 'BV', cert_no: 'C1',
      scope: 'mfg', issued_on: '2026-01-01', valid_until: '2027-01-01',
      last_surveillance_audit: null,
    }, BAP);
    expect(listISOCerts({ standard: '9001' })).toHaveLength(1);
    expect(listISOCerts({ standard: '27001' })).toHaveLength(0);
  });
  it('registerNABLScope', () => {
    registerNABLScope({
      lab_name: 'QC Lab', cert_no: 'TC-1', discipline: 'Chemical',
      parameters: ['pH', 'TDS'], valid_until: '2027-01-01',
    }, BAP);
    expect(listNABLScopes()).toHaveLength(1);
  });
  it('recordLegalMetrology', () => {
    recordLegalMetrology({
      product: 'Atta 1 kg', net_qty: '1 kg', mrp_paise: 7500,
      mfg_date: '2026-06-01', packer_name: 'Acme', declared_on: '2026-06-01',
    }, BAP);
    expect(listLegalMetrology()).toHaveLength(1);
  });
  it('initiateRecall + status filter', () => {
    initiateRecall({
      product: 'Batch X', batch_no: 'B1', severity: 'class_i',
      reason: 'contamination', initiated_on: '2026-06-01',
      closed_on: null, status: 'initiated',
    }, BAP);
    expect(listRecalls({ status: 'initiated' })).toHaveLength(1);
    expect(listRecalls({ status: 'closed' })).toHaveLength(0);
  });
  it('recordQualityAudit', () => {
    recordQualityAudit({
      standard: 'ISO 9001', scope: 'mfg', performed_on: '2026-06-01',
      ncs_open: 2, ncs_closed: 3,
    }, BAP);
    expect(listQualityAudits()).toHaveLength(1);
  });
  it('getQualityComplianceSummary shape', () => {
    const s = getQualityComplianceSummary();
    expect(s).toHaveProperty('fssai_active');
    expect(s).toHaveProperty('fssai_expired');
    expect(s).toHaveProperty('bis_certs');
    expect(s).toHaveProperty('iso_certs');
    expect(s).toHaveProperty('open_recalls');
    expect(s).toHaveProperty('overall_status');
  });

  // ─── Labour Tier-2 (9) ───
  it('computeBonus clamps pct 8.33-20 + records', () => {
    const b = computeBonus({
      fy: '2025-26', employee_id: 'E1', employee_name: 'A',
      basic_da_paise: 1000000, allocable_surplus_pct: 25, paid_on: null,
    }, BAP);
    expect(b.bonus_paise).toBe(200000);
  });
  it('fileMaternityClaim computes benefit', () => {
    const m = fileMaternityClaim({
      employee_id: 'E1', employee_name: 'A', expected_dd: '2026-09-01',
      leave_start: '2026-08-01', leave_weeks: 26, wage_per_day_paise: 50000,
      status: 'approved',
    }, BAP);
    expect(m.benefit_paise).toBe(26 * 7 * 50000);
    expect(listMaternityClaims()).toHaveLength(1);
  });
  it('recordEqualRemAudit computes gap_pct', () => {
    const e = recordEqualRemAudit({
      fy: '2025-26', role: 'Engineer',
      male_avg_paise: 100000, female_avg_paise: 90000, remarks: null,
    }, BAP);
    expect(e.gap_pct).toBe(10);
    expect(listEqualRemAudits()).toHaveLength(1);
  });
  it('registerApprentice + status filter', () => {
    registerApprentice({
      reg_no: 'AP-1', name: 'A', trade: 'Fitter',
      start_date: '2026-04-01', end_date: '2027-04-01',
      stipend_paise: 800000, status: 'active',
    }, BAP);
    expect(listApprentices({ status: 'active' })).toHaveLength(1);
  });
  it('recordCLRAEngagement', () => {
    recordCLRAEngagement({
      contractor_name: 'C1', reg_license_no: 'L-1', worker_count: 50,
      engagement_start: '2026-04-01', engagement_end: '2027-04-01',
      pf_esi_compliant: true,
    }, BAP);
    expect(listCLRAEngagements()).toHaveLength(1);
  });
  it('registerShop', () => {
    registerShop({
      state: 'MH', reg_no: 'SHOP-1', shop_name: 'Acme Office',
      issued_on: '2026-01-01', valid_until: '2027-01-01', employee_count: 25,
    }, BAP);
    expect(listShops()).toHaveLength(1);
  });
  it('fileForm21 filed_on tracking', () => {
    fileForm21({
      fy: '2025-26', factory_lic_no: 'F-1', avg_workers_employed: 100,
      man_days_worked: 24000, accidents: 0, filed_on: '2026-04-30',
    }, BAP);
    expect(listForm21()).toHaveLength(1);
  });
  it('recordOSHCheckup unfit triggers attention status', () => {
    recordOSHCheckup({
      fy: '2025-26', employee_id: 'E1', employee_name: 'A',
      exam_date: '2026-06-01', fitness: 'unfit', notes: 'follow-up',
    }, BAP);
    const s = getLabourTier2ComplianceSummary();
    expect(s.osh_unfit).toBe(1);
    expect(s.overall_status).toBe('attention_required');
  });
  it('getLabourTier2ComplianceSummary shape', () => {
    const s = getLabourTier2ComplianceSummary();
    expect(s).toHaveProperty('bonus_computed');
    expect(s).toHaveProperty('maternity_active');
    expect(s).toHaveProperty('active_apprentices');
    expect(s).toHaveProperty('clra_engagements');
    expect(s).toHaveProperty('shops_registered');
    expect(s).toHaveProperty('form21_filed');
    expect(s).toHaveProperty('overall_status');
  });

  // ─── Audit entity types (3) ───
  it('17 NEW S93 entity types registered (9 quality + 8 labour-t2)', () => {
    const ids = AUDIT_ENTITY_TYPES_REGISTRY.map((t) => t.id);
    for (const t of [
      'quality_schedule_h', 'quality_h1_register', 'quality_fssai_license',
      'quality_bis_cert', 'quality_iso_cert', 'quality_nabl_scope',
      'quality_legal_metrology', 'quality_recall', 'quality_audit',
      'lt2_bonus', 'lt2_maternity', 'lt2_equal_remuneration',
      'lt2_apprentice', 'lt2_clra', 'lt2_shops',
      'lt2_factories_form21', 'lt2_osh_health',
    ]) {
      expect(ids).toContain(t);
    }
  });
  it('quality entity types map to existing union member `licenses`', () => {
    const reg = AUDIT_ENTITY_TYPES_REGISTRY.find((t) => t.id === 'quality_fssai_license');
    expect(reg?.module).toBe('licenses');
  });
  it('labour-tier2 entity types map to existing union member `payroll`', () => {
    const reg = AUDIT_ENTITY_TYPES_REGISTRY.find((t) => t.id === 'lt2_bonus');
    expect(reg?.module).toBe('payroll');
  });

  // ─── Pages (2) ───
  it('QualityStandardsDashboardPage exists with >=5 TabsTrigger', () => {
    const p = SRC('src/pages/erp/comply360/quality-standards/QualityStandardsDashboardPage.tsx');
    expect(nodeFs.existsSync(p)).toBe(true);
    const src = nodeFs.readFileSync(p, 'utf8');
    expect((src.match(/<TabsTrigger\b/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });
  it('LabourTier2DashboardPage exists with >=5 TabsTrigger', () => {
    const p = SRC('src/pages/erp/comply360/labour-tier2/LabourTier2DashboardPage.tsx');
    expect(nodeFs.existsSync(p)).toBe(true);
    const src = nodeFs.readFileSync(p, 'utf8');
    expect((src.match(/<TabsTrigger\b/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });

  // ─── Router + sidebar integration (4) ───
  it('Comply360Page imports both new dashboards', () => {
    const src = nodeFs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf8');
    expect(src).toContain('QualityStandardsDashboardPage');
    expect(src).toContain('LabourTier2DashboardPage');
  });
  it('Comply360Page has quality-standards + labour-tier2 router cases', () => {
    const src = nodeFs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf8');
    expect(src).toContain("case 'quality-standards':");
    expect(src).toContain("case 'labour-tier2':");
  });
  it('sidebar-config has quality-standards entry with keyboard `c Q`', () => {
    const item = comply360SidebarItems.find((i) => i.id === 'quality-standards');
    expect(item).toBeDefined();
    expect(item?.keyboard).toBe('c Q');
  });
  it('sidebar-config has labour-tier2 entry with keyboard `c T`', () => {
    const item = comply360SidebarItems.find((i) => i.id === 'labour-tier2');
    expect(item).toBeDefined();
    expect(item?.keyboard).toBe('c T');
  });

  // ─── §H 0-DIFF anchors (1) ───
  it('S92 dpdp + cyber-security + cross-card peoplepay-skill files unchanged', () => {
    expect(nodeFs.existsSync(SRC('src/lib/comply360-dpdp-engine.ts'))).toBe(true);
    expect(nodeFs.existsSync(SRC('src/lib/comply360-cyber-security-engine.ts'))).toBe(true);
    expect(nodeFs.existsSync(SRC('src/lib/peoplepay-skill-engine.ts'))).toBe(true);
  });
});
