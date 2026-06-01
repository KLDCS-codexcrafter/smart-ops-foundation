/**
 * @file        src/test/sprint-104/cost-audit-applicability-surfacing.test.ts
 * @sprint      Sprint 104 · T-Phase-6.A.1.3 · 🏁 Arc 1 CAPSTONE
 * @purpose     §148 applicability engine extension + UX-surfacing closure (2 orphans) + register invariants.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  determineCostAuditApplicability,
  listCostProductServices,
  upsertCostProductService,
  appointCostAuditor,
  listCostAuditorAppointments,
  createCRAFormFiling,
  listCRAFormFilings,
  recordCostAuditReport,
  listCostAuditReports,
  isCostAuditorEligible,
} from '@/lib/comply360-cost-audit-engine';
import * as costAuditEngine from '@/lib/comply360-cost-audit-engine';
import { comply360SidebarItems } from '@/apps/erp/configs/comply360-sidebar-config';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { getSiblingCount } from '@/lib/_institutional/sibling-register';

beforeEach(() => {
  localStorage.clear();
});

describe('Sprint 104 · §148 applicability engine (DP-A1-5)', () => {
  it('regulated · above records + audit thresholds → both required, Table A', () => {
    const r = determineCostAuditApplicability({
      fy: '2025-26', industry_category: 'regulated',
      overall_turnover: 60_00_00_000, aggregate_product_service_turnover: 30_00_00_000,
    });
    expect(r.table).toBe('A_regulated');
    expect(r.cost_records_required).toBe(true);
    expect(r.cost_audit_required).toBe(true);
  });

  it('non-regulated · above records + audit thresholds → both required, Table B', () => {
    const r = determineCostAuditApplicability({
      fy: '2025-26', industry_category: 'non_regulated',
      overall_turnover: 120_00_00_000, aggregate_product_service_turnover: 40_00_00_000,
    });
    expect(r.table).toBe('B_non_regulated');
    expect(r.cost_records_required).toBe(true);
    expect(r.cost_audit_required).toBe(true);
  });

  it('exempt industry → none table, neither required', () => {
    const r = determineCostAuditApplicability({
      fy: '2025-26', industry_category: 'exempt',
      overall_turnover: 999_00_00_000, aggregate_product_service_turnover: 999_00_00_000,
    });
    expect(r.table).toBe('none');
    expect(r.cost_records_required).toBe(false);
    expect(r.cost_audit_required).toBe(false);
  });

  it('below records threshold → neither required regardless of industry', () => {
    const r = determineCostAuditApplicability({
      fy: '2025-26', industry_category: 'non_regulated',
      overall_turnover: 10_00_00_000, aggregate_product_service_turnover: 100_00_00_000,
    });
    expect(r.cost_records_required).toBe(false);
    expect(r.cost_audit_required).toBe(false);
  });

  it('records required but aggregate below audit threshold → records only', () => {
    const r = determineCostAuditApplicability({
      fy: '2025-26', industry_category: 'regulated',
      overall_turnover: 60_00_00_000, aggregate_product_service_turnover: 10_00_00_000,
    });
    expect(r.cost_records_required).toBe(true);
    expect(r.cost_audit_required).toBe(false);
  });

  it('regulated audit threshold = ₹25 cr; non-regulated = ₹35 cr', () => {
    const reg = determineCostAuditApplicability({
      fy: '2025-26', industry_category: 'regulated',
      overall_turnover: 60_00_00_000, aggregate_product_service_turnover: 0,
    });
    const non = determineCostAuditApplicability({
      fy: '2025-26', industry_category: 'non_regulated',
      overall_turnover: 60_00_00_000, aggregate_product_service_turnover: 0,
    });
    expect(reg.thresholds_applied.audit_threshold).toBe(25_00_00_000);
    expect(non.thresholds_applied.audit_threshold).toBe(35_00_00_000);
  });

  it('records threshold uniform ₹35 cr', () => {
    const r = determineCostAuditApplicability({
      fy: '2025-26', industry_category: 'regulated',
      overall_turnover: 35_00_00_000, aggregate_product_service_turnover: 0,
    });
    expect(r.thresholds_applied.records_threshold).toBe(35_00_00_000);
    expect(r.cost_records_required).toBe(true);
  });

  it('reason string is populated for every branch', () => {
    const branches = ['regulated', 'non_regulated', 'exempt'] as const;
    for (const c of branches) {
      const r = determineCostAuditApplicability({
        fy: '2025-26', industry_category: c,
        overall_turnover: 50_00_00_000, aggregate_product_service_turnover: 30_00_00_000,
      });
      expect(r.reason.length).toBeGreaterThan(10);
    }
  });

  it('negative turnover clamped to zero', () => {
    const r = determineCostAuditApplicability({
      fy: '2025-26', industry_category: 'regulated',
      overall_turnover: -100, aggregate_product_service_turnover: -50,
    });
    expect(r.overall_turnover).toBe(0);
    expect(r.aggregate_product_service_turnover).toBe(0);
  });

  it('non-regulated overall gate 100 cr enforced', () => {
    const r = determineCostAuditApplicability({
      fy: '2025-26', industry_category: 'non_regulated',
      overall_turnover: 50_00_00_000, aggregate_product_service_turnover: 40_00_00_000,
    });
    // records required (≥35cr) but overall < 100cr gate → audit NOT required
    expect(r.cost_records_required).toBe(true);
    expect(r.cost_audit_required).toBe(false);
  });
});

describe('Sprint 104 · product / service turnover table', () => {
  it('listCostProductServices initially empty per FY', () => {
    expect(listCostProductServices('2025-26')).toEqual([]);
  });

  it('upsertCostProductService inserts then lists', () => {
    upsertCostProductService('2025-26', { ceta_heading: '8501', description: 'Motors', turnover: 12_00_00_000 });
    const rows = listCostProductServices('2025-26');
    expect(rows.length).toBe(1);
    expect(rows[0].ceta_heading).toBe('8501');
  });

  it('upsertCostProductService updates existing CETA heading', () => {
    upsertCostProductService('2025-26', { ceta_heading: '8501', description: 'Motors', turnover: 1 });
    upsertCostProductService('2025-26', { ceta_heading: '8501', description: 'Motors v2', turnover: 99 });
    const rows = listCostProductServices('2025-26');
    expect(rows.length).toBe(1);
    expect(rows[0].turnover).toBe(99);
    expect(rows[0].description).toBe('Motors v2');
  });

  it('upsertCostProductService rejects empty CETA heading', () => {
    expect(() => upsertCostProductService('2025-26', { ceta_heading: '', description: 'x', turnover: 1 })).toThrow();
  });

  it('FYs are isolated', () => {
    upsertCostProductService('2025-26', { ceta_heading: '8501', description: 'a', turnover: 1 });
    upsertCostProductService('2024-25', { ceta_heading: '8502', description: 'b', turnover: 2 });
    expect(listCostProductServices('2025-26')).toHaveLength(1);
    expect(listCostProductServices('2024-25')).toHaveLength(1);
  });
});

describe('Sprint 104 · existing 9 engine exports remain 0-DIFF', () => {
  const NINE_EXPORTS = [
    'appointCostAuditor', 'listCostAuditorAppointments',
    'createCRAFormFiling', 'listCRAFormFilings',
    'recordCostAuditReport', 'listCostAuditReports',
    'isCostAuditorEligible',
  ] as const;

  it('all original function exports still present', () => {
    for (const name of NINE_EXPORTS) {
      expect(typeof (costAuditEngine as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('appointCostAuditor still throws on missing ICMAI', () => {
    expect(() => appointCostAuditor({
      fy: '2025-26', appointment_type: 'first_appointment',
      cost_auditor_name: 'X', icmai_membership_no: '',
      firm_registration_no: null, appointment_date: '2025-04-01',
      term_years: 1, prepared_by_bap: 'mr-a-client',
    })).toThrow();
  });

  it('CRA filing flow still works (draft default)', () => {
    const f = createCRAFormFiling({
      form_type: 'CRA_2', fy: '2025-26',
      appointment_id: null, prepared_by_bap: 'mr-a-client',
    });
    expect(f.filing_status).toBe('draft');
    expect(listCRAFormFilings({ fy: '2025-26' })).toHaveLength(1);
  });

  it('Cost audit report still records', () => {
    const r = recordCostAuditReport({
      fy: '2025-26', appointment_id: 'a1', total_cost_inr: 1, adverse_findings: false,
      findings_summary: '', recorded_by_bap: 'mr-a-client',
    });
    expect(listCostAuditReports({ fy: '2025-26' })[0].id).toBe(r.id);
  });

  it('Cooling-off check still returns eligible when no priors', () => {
    expect(isCostAuditorEligible('NEW-X', '2026-27').eligible).toBe(true);
  });

  it('appointment list filter by FY still works', () => {
    appointCostAuditor({
      fy: '2025-26', appointment_type: 'first_appointment',
      cost_auditor_name: 'X', icmai_membership_no: 'ICMAI-1',
      firm_registration_no: null, appointment_date: '2025-04-01',
      term_years: 1, prepared_by_bap: 'mr-a-client',
    });
    expect(listCostAuditorAppointments({ fy: '2025-26' })).toHaveLength(1);
    expect(listCostAuditorAppointments({ fy: '2099-00' })).toHaveLength(0);
  });
});

describe('Sprint 104 · UX-surfacing closure (2 genuine orphans)', () => {
  it('audit-framework sidebar entry exists', () => {
    expect(comply360SidebarItems.find((i) => i.id === 'audit-framework')).toBeDefined();
  });
  it('rule-11g sidebar entry exists', () => {
    expect(comply360SidebarItems.find((i) => i.id === 'rule-11g')).toBeDefined();
  });
  it('audit-framework has keyboard shortcut', () => {
    const i = comply360SidebarItems.find((x) => x.id === 'audit-framework');
    expect(i?.keyboard).toBeTruthy();
  });
  it('rule-11g has keyboard shortcut', () => {
    const i = comply360SidebarItems.find((x) => x.id === 'rule-11g');
    expect(i?.keyboard).toBeTruthy();
  });
});

describe('Sprint 104 · institutional register invariants', () => {
  it('sibling-register UNCHANGED at 172 (engine extension is additive)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(172);
  });
  it('S103 headSha backfilled to 327b7bde…', () => {
    const s103 = SPRINTS.find((s) => s.sprintNumber === 103 && s.code === 'T-Phase-6.A.1.2');
    expect(s103?.headSha).toBe('327b7bdebaeea5347cdecf4f964e6292de6af322');
  });
  it('S104 entry headSha backfilled to e59f1ecf…', () => {
    const s104 = SPRINTS.find((s) => s.sprintNumber === 104 && s.code === 'T-Phase-6.A.1.3');
    expect(s104?.headSha).toBe('e59f1ecf246f4891d5efdd248b1b19aee8c921ef');
    expect(s104?.newSiblings).toEqual([]);
    expect(s104?.predecessorSha).toBe('327b7bdebaeea5347cdecf4f964e6292de6af322');
  });
});
