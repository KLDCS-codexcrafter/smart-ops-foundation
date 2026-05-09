/**
 * @file src/test/qulicheak-vendor-scoring.test.ts
 * @sprint T-Phase-1.A.5.c-Qulicheak-Welder-Vendor-ISO-IQC
 * @decisions D-NEW-BO · Vendor Scorecard QA dim subscription
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  subscribeQaForVendorScoring,
  readVendorQaDimLedger,
  emitQaOutcomeForVendor,
} from '@/lib/qulicheak-bridges';

const ENTITY = 'TEST_VEND';

beforeEach(() => { localStorage.clear(); });

describe('vendor scoring subscription · D-NEW-BO', () => {
  it('NCR close emit triggers vendor QA-dim delta · -2/-5/-10 by severity', () => {
    const unmount = subscribeQaForVendorScoring();
    emitQaOutcomeForVendor({
      vendor_id: 'V-1', ncr_id: 'NCR-1', severity: 'critical',
      outcome: 'rejected_returned', entity_code: ENTITY,
    });
    emitQaOutcomeForVendor({
      vendor_id: 'V-1', ncr_id: 'NCR-2', severity: 'major',
      outcome: 'rejected_returned', entity_code: ENTITY,
    });
    emitQaOutcomeForVendor({
      vendor_id: 'V-1', ncr_id: 'NCR-3', severity: 'minor',
      outcome: 'rejected_returned', entity_code: ENTITY,
    });
    const ledger = readVendorQaDimLedger(ENTITY);
    expect(ledger.length).toBe(3);
    const deltas = ledger.map((e) => e.delta).sort();
    expect(deltas).toEqual([-10, -5, -2]);
    unmount();
  });

  it('CAPA effective channel records reversal entry tied to ncr_id', () => {
    const unmount = subscribeQaForVendorScoring();
    window.dispatchEvent(new CustomEvent('capa:effective:applied', {
      detail: { capa_id: 'CAPA-1', ncr_id: 'NCR-1' },
    }));
    // capa effective writes to entity_code='' bucket (vendor unknown until Procure360 wires up)
    const ledgerEmpty = readVendorQaDimLedger('');
    expect(ledgerEmpty.length).toBeGreaterThanOrEqual(1);
    expect(ledgerEmpty[0].capa_effective).toBe(true);
    unmount();
  });
});
