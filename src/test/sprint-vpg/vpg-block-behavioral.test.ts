/**
 * @file        src/test/sprint-vpg/vpg-block-behavioral.test.ts
 * @sprint      T-VPG-VendorPortal-Gaps · behavioral assertions (≥20 it()) · house posture
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import {
  // zones
  listVendorZones, createVendorZone, updateVendorZone,
  // thresholds
  listRiskThresholds, upsertRiskThreshold, deleteRiskThreshold, listThresholdAuditLog,
  // alerts
  evaluateRiskThresholds, listRiskAlerts, updateRiskAlertStatus,
  // checklists
  buildComplianceChecklist, listComplianceChecklists,
  // dcn
  createDcn, listDcn, updateDcnStatus,
  // doc requests
  createDocumentRequest, listDocumentRequests, updateDocumentRequestStatus, flagOverdueDocumentRequests,
  // payment batches
  createPaymentBatch, listPaymentBatches, updatePaymentBatchStatus,
} from '@/lib/vendor-risk-compliance-engine';

import { vendorReliabilityKey } from '@/types/vendor-reliability-score';
import { vendorFinancialHealthKey } from '@/types/vendor-financial-health';
import { vendorComplianceRecordKey } from '@/types/vendor-compliance-record';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const E = 'vpg-test';

beforeEach(() => {
  // Clear all keys under the test entity
  const prefixes = [
    'erp_vendor_zones_', 'erp_vendor_risk_alerts_', 'erp_vendor_risk_thresholds_',
    'erp_vendor_compliance_checklists_', 'erp_vendor_dcn_', 'erp_vendor_document_requests_',
    'erp_vendor_payment_batches_', 'erp_vendor_risk_threshold_audit_',
    vendorReliabilityKey(''), vendorFinancialHealthKey(''), vendorComplianceRecordKey(''),
  ];
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i) || '';
    if (prefixes.some(p => k.startsWith(p) || k.includes(E))) localStorage.removeItem(k);
  }
  // Seed empty stores for the test entity
  localStorage.setItem(vendorReliabilityKey(E), JSON.stringify([]));
  localStorage.setItem(vendorFinancialHealthKey(E), JSON.stringify([]));
  localStorage.setItem(vendorComplianceRecordKey(E), JSON.stringify([]));
});

describe('VP-GAPS · 7 new type files present (source assertion)', () => {
  const root = process.cwd();
  const types = [
    'src/types/vendor-zone.ts',
    'src/types/vendor-risk-alert.ts',
    'src/types/vendor-risk-threshold.ts',
    'src/types/vendor-compliance-checklist.ts',
    'src/types/vendor-dcn.ts',
    'src/types/vendor-document-request.ts',
    'src/types/vendor-payment-batch.ts',
  ];
  for (const rel of types) {
    it(`type file present: ${rel}`, () => {
      expect(existsSync(join(root, rel))).toBe(true);
    });
  }
  it('vendor-dcn FY-stamped + retention_policy field', () => {
    const txt = readFileSync(join(root, 'src/types/vendor-dcn.ts'), 'utf-8');
    expect(txt).toContain('fiscal_year_id');
    expect(txt).toContain('retention_policy?: RetentionPolicyId');
  });
  it('vendor-payment-batch FY-stamped + retention_policy field', () => {
    const txt = readFileSync(join(root, 'src/types/vendor-payment-batch.ts'), 'utf-8');
    expect(txt).toContain('fiscal_year_id');
    expect(txt).toContain('retention_policy?: RetentionPolicyId');
  });
});

describe('VP-GAPS · zones master', () => {
  it('creates and lists zones', () => {
    createVendorZone(E, { zone_code: 'N-01', zone_name: 'North 1', region: 'North', active: true });
    expect(listVendorZones(E)).toHaveLength(1);
  });
  it('updates a zone', () => {
    const z = createVendorZone(E, { zone_code: 'S-01', zone_name: 'South', region: 'S', active: true });
    updateVendorZone(E, z.id, { active: false });
    expect(listVendorZones(E)[0].active).toBe(false);
  });
});

describe('VP-GAPS · threshold rules CRUD + audit', () => {
  it('seeds defaults on first read', () => {
    const t = listRiskThresholds(E);
    expect(t.length).toBeGreaterThan(0);
  });
  it('upsert + delete + audit log entries written', () => {
    const created = upsertRiskThreshold(E, { metric: 'reliability', operator: 'lt', value: 25, severity: 'critical', active: true });
    upsertRiskThreshold(E, { id: created.id, metric: 'reliability', operator: 'lt', value: 20, severity: 'critical', active: true });
    deleteRiskThreshold(E, created.id);
    const log = listThresholdAuditLog(E);
    expect(log.length).toBe(3);
    expect(log.map(l => l.action)).toEqual(['create', 'update', 'delete']);
  });
});

describe('VP-GAPS · evaluateRiskThresholds (CONSUMES base scores · honest no-alert)', () => {
  it('returns NO alerts when no source scores present (honest)', () => {
    const fresh = evaluateRiskThresholds(E);
    expect(fresh).toEqual([]);
    expect(listRiskAlerts(E)).toEqual([]);
  });
  it('raises alert when reliability composite below threshold', () => {
    localStorage.setItem(vendorReliabilityKey(E), JSON.stringify([{
      id: 'vrs-1', entity_id: E, related_foreign_vendor_id: 'v-1', vendor_name: 'Test Vendor',
      country_code: 'IN',
      components: { on_time_delivery_score: 90, quality_acceptance_score: 90, price_stability_score: 80, carotar_compliance_score: 90, dgtr_exposure_score: 80, sanctions_clearance_score: 100, payment_terms_adherence_score: 80, composite_score: 25, classification: 'blocked', computed_at: new Date().toISOString() },
      prior_classification: null, classification_changed_at: null, active_dgtr_case_count: 0, active_sanctions_hit_count: 0, open_carotar_queries: 0, notes: '',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }]));
    const fresh = evaluateRiskThresholds(E);
    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh.every(a => a.vendor_id === 'v-1')).toBe(true);
  });
  it('dedupes on second eval (no duplicate open alert per rule × vendor)', () => {
    localStorage.setItem(vendorReliabilityKey(E), JSON.stringify([{
      id: 'vrs-1', entity_id: E, related_foreign_vendor_id: 'v-2', vendor_name: 'V2', country_code: 'IN',
      components: { on_time_delivery_score: 90, quality_acceptance_score: 90, price_stability_score: 80, carotar_compliance_score: 90, dgtr_exposure_score: 80, sanctions_clearance_score: 100, payment_terms_adherence_score: 80, composite_score: 10, classification: 'blocked', computed_at: new Date().toISOString() },
      prior_classification: null, classification_changed_at: null, active_dgtr_case_count: 0, active_sanctions_hit_count: 0, open_carotar_queries: 0, notes: '',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }]));
    evaluateRiskThresholds(E);
    const first = listRiskAlerts(E).length;
    evaluateRiskThresholds(E);
    expect(listRiskAlerts(E).length).toBe(first);
  });
  it('acknowledge changes status', () => {
    localStorage.setItem(vendorReliabilityKey(E), JSON.stringify([{
      id: 'vrs-1', entity_id: E, related_foreign_vendor_id: 'v-3', vendor_name: 'V3', country_code: 'IN',
      components: { on_time_delivery_score: 50, quality_acceptance_score: 90, price_stability_score: 80, carotar_compliance_score: 90, dgtr_exposure_score: 80, sanctions_clearance_score: 100, payment_terms_adherence_score: 80, composite_score: 20, classification: 'blocked', computed_at: new Date().toISOString() },
      prior_classification: null, classification_changed_at: null, active_dgtr_case_count: 0, active_sanctions_hit_count: 0, open_carotar_queries: 0, notes: '',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }]));
    const fresh = evaluateRiskThresholds(E);
    updateRiskAlertStatus(E, fresh[0].id, 'acknowledged');
    expect(listRiskAlerts(E).find(a => a.id === fresh[0].id)?.status).toBe('acknowledged');
  });
});

describe('VP-GAPS · compliance checklist (CONSUMES vendor-compliance-record)', () => {
  it('builds checklist with mirrored verification statuses', () => {
    const now = new Date().toISOString();
    localStorage.setItem(vendorComplianceRecordKey(E), JSON.stringify([
      { id: 'cr-1', party_id: 'v-1', entity_code: E, compliance_type: 'gst', document_name: 'GST Cert', is_recurring: false, verification_status: 'verified', is_mandatory: true, created_at: now, updated_at: now },
      { id: 'cr-2', party_id: 'v-1', entity_code: E, compliance_type: 'pan', document_name: 'PAN', is_recurring: false, verification_status: 'pending', is_mandatory: true, created_at: now, updated_at: now },
    ]));
    const cl = buildComplianceChecklist(E, 'v-1');
    expect(cl.items).toHaveLength(2);
    expect(cl.overall_status).toBe('partial');
    expect(listComplianceChecklists(E)).toHaveLength(1);
  });
});

describe('VP-GAPS · DCN lifecycle', () => {
  it('creates DCN with retention floor and amount sum', () => {
    const d = createDcn(E, {
      vendor_id: 'v-1', type: 'debit', dcn_no: 'DCN/001', fiscal_year_id: 'FY-2026-27',
      reason: 'Short supply', lines: [{ id: 'l1', description: 'Short', amount: 1000 }, { id: 'l2', description: 'Penalty', amount: 500 }],
    });
    expect(d.amount).toBe(1500);
    expect(d.retention_policy).toBe('companies_act_8yr');
    updateDcnStatus(E, d.id, 'approved');
    expect(listDcn(E)[0].status).toBe('approved');
  });
});

describe('VP-GAPS · document-request lifecycle (requested→submitted→verified→overdue)', () => {
  it('flows requested → submitted → verified', () => {
    const r = createDocumentRequest(E, { vendor_id: 'v-1', doc_type: 'GST cert' });
    updateDocumentRequestStatus(E, r.id, 'submitted', 'ref-1');
    updateDocumentRequestStatus(E, r.id, 'verified');
    expect(listDocumentRequests(E)[0].status).toBe('verified');
  });
  it('flags overdue when due_date past', () => {
    createDocumentRequest(E, { vendor_id: 'v-2', doc_type: 'ISO', due_date: '2020-01-01' });
    const n = flagOverdueDocumentRequests(E);
    expect(n).toBe(1);
    expect(listDocumentRequests(E)[0].status).toBe('overdue');
  });
});

describe('VP-GAPS · payment-batch (CONSUMES payment-requisition · no duplicate accounting)', () => {
  it('creates batch with grouped requisition IDs', () => {
    // payment-requisition store is empty in test entity — total_amount honestly 0
    const b = createPaymentBatch(E, { batch_no: 'PB/001', fiscal_year_id: 'FY-2026-27', requisition_ids: ['req-1', 'req-2'] });
    expect(b.requisition_ids).toHaveLength(2);
    expect(b.total_amount).toBe(0);
    expect(b.retention_policy).toBe('companies_act_8yr');
    updatePaymentBatchStatus(E, b.id, 'released');
    expect(listPaymentBatches(E)[0].released_at).toBeTruthy();
  });
});

describe('VP-GAPS · §H walls held + history + ccc not imported', () => {
  const root = process.cwd();
  it('vendor-reliability-score type 0-DIFF (no VPG marker)', () => {
    const txt = readFileSync(join(root, 'src/types/vendor-reliability-score.ts'), 'utf-8');
    expect(txt).not.toMatch(/VP-GAPS/);
  });
  it('vendor-compliance-record type 0-DIFF (no VPG marker)', () => {
    const txt = readFileSync(join(root, 'src/types/vendor-compliance-record.ts'), 'utf-8');
    expect(txt).not.toMatch(/VP-GAPS/);
  });
  it('vendor-financial-health type 0-DIFF (no VPG marker)', () => {
    const txt = readFileSync(join(root, 'src/types/vendor-financial-health.ts'), 'utf-8');
    expect(txt).not.toMatch(/VP-GAPS/);
  });
  it('engine does NOT import craft-company-canvas (ccc)', () => {
    const txt = readFileSync(join(root, 'src/lib/vendor-risk-compliance-engine.ts'), 'utf-8');
    expect(txt).not.toMatch(/craft.company.canvas/i);
    expect(txt).not.toMatch(/from ['"]ccc/i);
  });
  it('VP-GAPS row in sprint-history with predecessor 4e5e13e6', () => {
    const row = SPRINTS.find(s => s.code === 'T-VPG-VendorPortal-Gaps');
    expect(row).toBeDefined();
    expect(row?.predecessorSha).toBe('4e5e13e6');
    expect(row?.newSiblings).toContain('vendor-risk-compliance-engine');
  });
  it('A.2 sprint-history row flipped to headSha 4e5e13e6', () => {
    const row = SPRINTS.find(s => s.code === 'T-A2-Production-ATP');
    expect(row?.headSha).toBe('4e5e13e6');
  });
});
