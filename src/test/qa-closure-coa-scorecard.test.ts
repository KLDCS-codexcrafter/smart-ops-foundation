/**
 * @file        qa-closure-coa-scorecard.test.ts
 * @sprint      T-Phase-1.2.6f-d-2-card5-5-pre-2 · Block H · 6 NEW tests
 * @covers      D-338 closure resolver · D-340 vendor scorecard · D-341 CoA · OOB-59 pending alerts
 *
 * Pattern: seed inspections directly into localStorage to avoid bill-passing dependency.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { routeInspectionClosure, listClosureLog } from '@/lib/qa-closure-resolver';
import { computeVendorScorecard } from '@/lib/oob/vendor-quality-scorecard-engine';
import { generateAndCacheCoA, listGeneratedCoA } from '@/lib/qa-coa-print-engine';
import { getPendingInspectionAlerts } from '@/lib/oob/qa-pending-inspection-alerts';
import { qaInspectionKey, type QaInspectionRecord } from '@/types/qa-inspection';
import { qaSpecKey, type QaSpec } from '@/types/qa-spec';
import { qaClosureLogKey } from '@/types/qa-closure-log';
import { comply360QCKey, DEFAULT_QC_CONFIG } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import { vouchersKey } from '@/lib/finecore-engine';

const E = 'TST5P2';

function seedInspection(over: Partial<QaInspectionRecord> = {}): QaInspectionRecord {
  const now = new Date().toISOString();
  const rec: QaInspectionRecord = {
    id: `qa-${Math.random().toString(36).slice(2, 8)}`,
    qa_no: 'QA/202605/0001',
    bill_id: 'bill-1', bill_no: 'BP/0001',
    git_id: null, po_id: 'po-1', po_no: 'PO/0001',
    entity_id: E, branch_id: null,
    inspector_user_id: 'u1',
    inspection_date: now.slice(0, 10),
    inspection_location: 'Stores',
    lines: [{
      id: 'qal-1', bill_line_id: 'bl-1',
      item_id: 'i-1', item_name: 'Steel Rod',
      qty_inspected: 100, qty_passed: 80, qty_failed: 15,
      failure_reason: null, inspection_parameters: {},
      qty_sample: 5, qty_pending: 0, uom: 'kg', batch_id: 'B-1',
    }],
    status: 'passed', notes: '',
    created_at: now, updated_at: now,
    vendor_id: 'V-1', vendor_name: 'Acme Steel',
    parameter_results: { 'p1': 'pass', 'p2': 'fail' },
    inspection_authority: 'internal',
    ...over,
  };
  const raw = localStorage.getItem(qaInspectionKey(E));
  const list: QaInspectionRecord[] = raw ? JSON.parse(raw) : [];
  list.push(rec);
  localStorage.setItem(qaInspectionKey(E), JSON.stringify(list));
  return rec;
}

beforeEach(() => {
  localStorage.removeItem(qaInspectionKey(E));
  localStorage.removeItem(qaSpecKey(E));
  localStorage.removeItem(qaClosureLogKey(E));
  localStorage.removeItem(comply360QCKey(E));
  localStorage.removeItem(vouchersKey(E));
});

describe('qa-closure-resolver · D-338', () => {
  it('routes 3 stock-journal vouchers when QC config has all 4 godowns', async () => {
    const cfg = {
      ...DEFAULT_QC_CONFIG, enableQualiCheck: true,
      quarantineGodownId: 'g-q', approvedGodownId: 'g-a',
      sampleGodownId: 'g-s', rejectionGodownId: 'g-r',
    };
    localStorage.setItem(comply360QCKey(E), JSON.stringify(cfg));
    const rec = seedInspection();
    const r = await routeInspectionClosure(rec.id, E);
    expect(r.ok).toBe(true);
    expect(r.approved_voucher_id).toBeTruthy();
    expect(r.sample_voucher_id).toBeTruthy();
    expect(r.rejection_voucher_id).toBeTruthy();
    expect(listClosureLog(E)).toHaveLength(1);
  });

  it('refuses when quarantine godown is unconfigured', async () => {
    const rec = seedInspection();
    const r = await routeInspectionClosure(rec.id, E);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Quarantine/i);
  });

  it('refuses non-terminal inspections', async () => {
    const cfg = { ...DEFAULT_QC_CONFIG, quarantineGodownId: 'g-q', approvedGodownId: 'g-a',
                  sampleGodownId: 'g-s', rejectionGodownId: 'g-r' };
    localStorage.setItem(comply360QCKey(E), JSON.stringify(cfg));
    const rec = seedInspection({ status: 'pending' });
    const r = await routeInspectionClosure(rec.id, E);
    expect(r.ok).toBe(false);
  });
});

describe('vendor-quality-scorecard-engine · D-340', () => {
  it('computes acceptance + rejection metrics for a vendor', () => {
    seedInspection({ vendor_id: 'V-1', vendor_name: 'Acme' });
    seedInspection({ vendor_id: 'V-1', vendor_name: 'Acme' });
    const cards = computeVendorScorecard(E);
    expect(cards).toHaveLength(1);
    expect(cards[0].vendor_id).toBe('V-1');
    expect(cards[0].total_inspections).toBe(2);
    expect(cards[0].acceptance_rate_pct).toBeGreaterThan(0);
    expect(cards[0].rejection_rate_pct).toBeGreaterThan(0);
  });

  it('skips inspections with no vendor', () => {
    seedInspection({ vendor_id: null, vendor_name: null });
    expect(computeVendorScorecard(E)).toHaveLength(0);
  });
});

describe('qa-coa-print-engine · D-341', () => {
  it('generates and caches CoA on the inspection record', () => {
    const rec = seedInspection();
    const r = generateAndCacheCoA(rec.id, E);
    expect(r.ok).toBe(true);
    expect(r.coa_url).toBeTruthy();
    expect(listGeneratedCoA(E)).toHaveLength(1);
  });
});

describe('qa-pending-inspection-alerts · OOB-59', () => {
  it('flags only inspections older than threshold', () => {
    const oldDate = new Date(Date.now() - 48 * 3600 * 1000).toISOString().slice(0, 10);
    seedInspection({ status: 'pending', inspection_date: oldDate });
    seedInspection({ status: 'pending' }); // today
    const alerts = getPendingInspectionAlerts(E, 24);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].age_hours).toBeGreaterThanOrEqual(24);
  });
});
