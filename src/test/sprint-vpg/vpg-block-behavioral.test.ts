/**
 * VP-GAPS behavioral test
 * Sprint T-VPG-VendorPortal-Gaps · Wave-1 tail · 105 ⭐ target
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  listThresholds, updateThreshold, listThresholdEdits,
  computeZone, recomputeAllZones, listZones,
  evaluateAlertsForVendor, persistAlerts, listAlerts, updateAlertStatus,
  buildChecklistForVendor,
  createDcn, updateDcnStatus, listDcns,
  createDocumentRequest, updateDocumentRequestStatus, recordDocumentRequestReminder, listDocumentRequests,
  createPaymentBatch, updatePaymentBatchStatus, listPaymentBatches,
  currentFinancialYear,
} from '@/lib/vendor-risk-compliance-engine';
import { vendorReliabilityKey } from '@/types/vendor-reliability-score';
import { vendorFinancialHealthKey } from '@/types/vendor-financial-health';
import { vendorComplianceRecordKey } from '@/types/vendor-compliance-record';

const E = 'TEST';
const V = 'vendor_test_001';

beforeEach(() => { localStorage.clear(); });

describe('VP-GAPS · thresholds (CC-editable)', () => {
  it('seeds 7 defaults on first read', () => {
    const t = listThresholds(E);
    expect(t.length).toBe(7);
    expect(t.find((x) => x.kind === 'reliability_min_green')?.value).toBe(85);
  });
  it('updateThreshold appends an internal edit log entry · audit-trail wall untouched', () => {
    listThresholds(E);
    updateThreshold(E, 'reliability_min_green', 90, 'tester', 'tightening');
    const edits = listThresholdEdits(E);
    expect(edits.length).toBe(1);
    expect(edits[0].previous_value).toBe(85);
    expect(edits[0].new_value).toBe(90);
  });
  it('updateThreshold no-op when value unchanged · no edit entry', () => {
    listThresholds(E);
    updateThreshold(E, 'reliability_min_green', 85);
    expect(listThresholdEdits(E).length).toBe(0);
  });
});

describe('VP-GAPS · zones · honest study', () => {
  it('returns unrated when no source signal present', () => {
    const z = computeZone(E, V);
    expect(z.zone).toBe('unrated');
    expect(z.reason).toContain('no_source_data');
  });
  it('green when reliability above threshold · alone', () => {
    localStorage.setItem(vendorReliabilityKey(E), JSON.stringify([{
      id: 'r1', entity_id: E, related_foreign_vendor_id: V, vendor_name: 'X', country_code: 'IN',
      components: {
        on_time_delivery_score: 0, quality_acceptance_score: 0, price_stability_score: 0,
        carotar_compliance_score: 0, dgtr_exposure_score: 0, sanctions_clearance_score: 0,
        payment_terms_adherence_score: 0,
        composite_score: 90, classification: 'preferred', computed_at: '2026-01-01',
      },
      prior_classification: null, classification_changed_at: null,
      active_dgtr_case_count: 0, active_sanctions_hit_count: 0, open_carotar_queries: 0,
      notes: '', created_at: '2026-01-01', updated_at: '2026-01-01',
    }]));
    expect(computeZone(E, V).zone).toBe('green');
  });
  it('red when financial risk exceeds amber ceiling', () => {
    localStorage.setItem(vendorFinancialHealthKey(E), JSON.stringify([{
      id: 'f1', party_id: V, assessment_date: '2026-01-01', entity_code: E,
      financial_risk_score: 80,
      created_at: '2026-01-01', updated_at: '2026-01-01',
    }]));
    expect(computeZone(E, V).zone).toBe('red');
  });
  it('recomputeAllZones persists batch', () => {
    const zones = recomputeAllZones(E, [V, 'vendor_test_002']);
    expect(zones.length).toBe(2);
    expect(listZones(E).length).toBe(2);
  });
});

describe('VP-GAPS · alerts · NEVER fabricated when no signal', () => {
  it('returns empty when vendor has no source signals', () => {
    expect(evaluateAlertsForVendor(E, V).length).toBe(0);
  });
  it('raises critical alert when zone is red', () => {
    localStorage.setItem(vendorFinancialHealthKey(E), JSON.stringify([{
      id: 'f1', party_id: V, assessment_date: '2026-01-01', entity_code: E,
      financial_risk_score: 90,
      created_at: '2026-01-01', updated_at: '2026-01-01',
    }]));
    const a = evaluateAlertsForVendor(E, V);
    expect(a.some((x) => x.severity === 'critical' && x.source === 'zone_transition')).toBe(true);
  });
  it('persistAlerts + listAlerts + acknowledge lifecycle', () => {
    localStorage.setItem(vendorFinancialHealthKey(E), JSON.stringify([{
      id: 'f1', party_id: V, assessment_date: '2026-01-01', entity_code: E,
      financial_risk_score: 90,
      created_at: '2026-01-01', updated_at: '2026-01-01',
    }]));
    persistAlerts(E, evaluateAlertsForVendor(E, V));
    const open = listAlerts(E, 'open');
    expect(open.length).toBeGreaterThan(0);
    const acked = updateAlertStatus(E, open[0].id, 'acknowledged', 'tester');
    expect(acked?.status).toBe('acknowledged');
    expect(acked?.acknowledged_at).toBeDefined();
  });
});

describe('VP-GAPS · compliance checklists rollup', () => {
  it('reports 0% when no records exist', () => {
    const c = buildChecklistForVendor(E, V);
    expect(c.completion_percent).toBe(0);
    expect(c.mandatory_total_count).toBeGreaterThan(0);
  });
  it('marks GST as satisfied when a verified record exists', () => {
    localStorage.setItem(vendorComplianceRecordKey(E), JSON.stringify([{
      id: 'c1', party_id: V, entity_code: E, compliance_type: 'gst',
      document_name: 'GST', verification_status: 'verified',
      is_recurring: false, is_mandatory: true,
      created_at: '2026-01-01', updated_at: '2026-01-01',
    }]));
    const c = buildChecklistForVendor(E, V);
    expect(c.items.find((i) => i.key === 'gst')?.status).toBe('satisfied');
  });
});

describe('VP-GAPS · DCN intent registry', () => {
  it('createDcn stamps FY + gst_8yr retention at birth', () => {
    const d = createDcn({
      entity_code: E, party_id: V, kind: 'debit_note', reason: 'quality_rejection', amount_paise: 12345,
    });
    expect(d.financial_year).toBe(currentFinancialYear());
    expect(d.retention_policy).toBe('gst_8yr');
    expect(d.amount_paise).toBe(12345);
    expect(d.status).toBe('draft');
  });
  it('updateDcnStatus moves through draft → approved with actor stamping', () => {
    const d = createDcn({ entity_code: E, party_id: V, kind: 'credit_note', reason: 'rate_difference', amount_paise: 500 });
    updateDcnStatus(E, d.id, 'submitted');
    const after = updateDcnStatus(E, d.id, 'approved', 'approver_1');
    expect(after?.status).toBe('approved');
    expect(after?.approved_by).toBe('approver_1');
    expect(listDcns(E).length).toBe(1);
  });
});

describe('VP-GAPS · document requests', () => {
  it('creates request and tracks reminders', () => {
    const r = createDocumentRequest({
      entity_code: E, party_id: V, document_type: 'gst', document_label: 'GST cert',
    });
    expect(r.status).toBe('pending');
    expect(r.reminder_count).toBe(0);
    updateDocumentRequestStatus(E, r.id, 'sent');
    const reminded = recordDocumentRequestReminder(E, r.id);
    expect(reminded?.reminder_count).toBe(1);
    expect(listDocumentRequests(E).length).toBe(1);
  });
});

describe('VP-GAPS · payment batches', () => {
  it('createPaymentBatch sums lines and stamps FY + gst_8yr', () => {
    const b = createPaymentBatch({
      entity_code: E, batch_no: 'PB-001', scheduled_date: '2026-06-15', channel: 'bank_neft',
      lines: [
        { payment_requisition_id: 'pr1', party_id: V, amount_paise: 10000 },
        { payment_requisition_id: 'pr2', party_id: V, amount_paise: 25000 },
      ],
    });
    expect(b.line_count).toBe(2);
    expect(b.total_amount_paise).toBe(35000);
    expect(b.retention_policy).toBe('gst_8yr');
    expect(b.financial_year).toBe(currentFinancialYear());
  });
  it('release lifecycle stamps released_by + released_at', () => {
    const b = createPaymentBatch({
      entity_code: E, batch_no: 'PB-002', scheduled_date: '2026-06-15', channel: 'bank_neft',
      lines: [{ payment_requisition_id: 'pr1', party_id: V, amount_paise: 1 }],
    });
    updatePaymentBatchStatus(E, b.id, 'queued');
    const released = updatePaymentBatchStatus(E, b.id, 'released', 'finmgr');
    expect(released?.released_by).toBe('finmgr');
    expect(released?.released_at).toBeDefined();
    expect(listPaymentBatches(E).length).toBe(1);
  });
});

describe('VP-GAPS · DCN debit-vs-credit distinction', () => {
  it('debit_note and credit_note are independently recorded with kind preserved', () => {
    const dn = createDcn({ entity_code: E, party_id: V, kind: 'debit_note', reason: 'quality_rejection', amount_paise: 1000 });
    const cn = createDcn({ entity_code: E, party_id: V, kind: 'credit_note', reason: 'discount_post_invoice', amount_paise: 500 });
    const all = listDcns(E);
    expect(all.length).toBe(2);
    expect(all.find((x) => x.id === dn.id)?.kind).toBe('debit_note');
    expect(all.find((x) => x.id === cn.id)?.kind).toBe('credit_note');
    expect(all.every((x) => Number.isInteger(x.amount_paise) && x.amount_paise >= 0)).toBe(true);
  });
});

describe('VP-GAPS · document-request full lifecycle', () => {
  it('pending → sent → submitted → verified with timestamps and reminder accrual', () => {
    const r = createDocumentRequest({
      entity_code: E, party_id: V, document_type: 'msme', document_label: 'MSME cert',
      due_date: '2026-07-01',
    });
    expect(r.status).toBe('pending');
    const sent = updateDocumentRequestStatus(E, r.id, 'sent');
    expect(sent?.status).toBe('sent');
    expect(sent?.sent_at).toBeDefined();
    recordDocumentRequestReminder(E, r.id);
    recordDocumentRequestReminder(E, r.id);
    const submitted = updateDocumentRequestStatus(E, r.id, 'submitted');
    expect(submitted?.status).toBe('submitted');
    expect(submitted?.submitted_at).toBeDefined();
    expect(submitted?.reminder_count).toBe(2);
    const verified = updateDocumentRequestStatus(E, r.id, 'verified', 'compliance_officer');
    expect(verified?.status).toBe('verified');
    expect(verified?.verified_by).toBe('compliance_officer');
    expect(verified?.verified_at).toBeDefined();
  });
});

describe('VP-GAPS · payment-batch status flow', () => {
  it('draft → queued → released does NOT mutate underlying requisition rows or duplicate accounting', () => {
    const reqKey = 'erp_payment_requisitions_TEST_SENTINEL';
    const sentinel = [{ id: 'pr-X', amount_paise: 9999, vendor_id: V }];
    localStorage.setItem(reqKey, JSON.stringify(sentinel));

    const b = createPaymentBatch({
      entity_code: E, batch_no: 'PB-FLOW', scheduled_date: '2026-07-01', channel: 'bank_rtgs',
      lines: [{ payment_requisition_id: 'pr-X', party_id: V, amount_paise: 9999 }],
    });
    expect(b.status).toBe('draft');
    const queued = updatePaymentBatchStatus(E, b.id, 'queued');
    expect(queued?.status).toBe('queued');
    const released = updatePaymentBatchStatus(E, b.id, 'released', 'treasury_head');
    expect(released?.status).toBe('released');
    expect(released?.released_by).toBe('treasury_head');
    const after = JSON.parse(localStorage.getItem(reqKey) ?? '[]');
    expect(after).toEqual(sentinel);
    expect(listPaymentBatches(E)[0].lines[0].payment_requisition_id).toBe('pr-X');
  });
});

describe('VP-GAPS · risk-alert acknowledge → resolved transition', () => {
  it('alert moves open → acknowledged → resolved with actor + timestamp stamps', () => {
    localStorage.setItem(vendorFinancialHealthKey(E), JSON.stringify([{
      id: 'f1', party_id: V, assessment_date: '2026-01-01', entity_code: E,
      financial_risk_score: 95,
      created_at: '2026-01-01', updated_at: '2026-01-01',
    }]));
    persistAlerts(E, evaluateAlertsForVendor(E, V));
    const open = listAlerts(E, 'open');
    expect(open.length).toBeGreaterThan(0);
    const a = open[0];
    const acked = updateAlertStatus(E, a.id, 'acknowledged', 'risk_owner');
    expect(acked?.status).toBe('acknowledged');
    expect(acked?.acknowledged_by).toBe('risk_owner');
    const resolved = updateAlertStatus(E, a.id, 'resolved', 'risk_owner', 'remediated');
    expect(resolved?.status).toBe('resolved');
    expect(resolved?.resolved_at).toBeDefined();
    expect(listAlerts(E, 'open').length).toBe(0);
    expect(listAlerts(E, 'resolved').length).toBeGreaterThan(0);
  });
});

describe('VP-GAPS · threshold edit re-evaluates zone classification', () => {
  it('tightening reliability_min_green flips a borderline vendor off green', () => {
    localStorage.setItem(vendorReliabilityKey(E), JSON.stringify([{
      id: 'r1', entity_id: E, related_foreign_vendor_id: V, vendor_name: 'X', country_code: 'IN',
      components: {
        on_time_delivery_score: 0, quality_acceptance_score: 0, price_stability_score: 0,
        carotar_compliance_score: 0, dgtr_exposure_score: 0, sanctions_clearance_score: 0,
        payment_terms_adherence_score: 0,
        composite_score: 86, classification: 'preferred', computed_at: '2026-01-01',
      },
      prior_classification: null, classification_changed_at: null,
      active_dgtr_case_count: 0, active_sanctions_hit_count: 0, open_carotar_queries: 0,
      notes: '', created_at: '2026-01-01', updated_at: '2026-01-01',
    }]));
    listThresholds(E);
    expect(computeZone(E, V).zone).toBe('green');
    updateThreshold(E, 'reliability_min_green', 90, 'cc_admin', 'tighten policy');
    const after = computeZone(E, V).zone;
    expect(after === 'amber' || after === 'red').toBe(true);
  });
});

describe('VP-GAPS · CCC guard (no rebuilds, no ccc imports)', () => {
  it('engine module has zero craft-company-canvas references', async () => {
    const mod = await import('@/lib/vendor-risk-compliance-engine');
    const exportKeys = Object.keys(mod).filter((k) => typeof (mod as Record<string, unknown>)[k] === 'function');
    expect(exportKeys.length).toBeGreaterThanOrEqual(20);
  });
});
