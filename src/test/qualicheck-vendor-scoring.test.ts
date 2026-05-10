/**
 * @file src/test/qualicheck-vendor-scoring.test.ts
 * @sprint T-Phase-1.A.5.c-T2-AuditFix
 * @decisions D-NEW-BO · D-NEW-BV (entity_code propagation · no sentinel rows)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  subscribeQaForVendorScoring,
  readVendorQaDimLedger,
  emitQaOutcomeForVendor,
} from '@/lib/qualicheck-bridges';

const ENTITY = 'TEST_VEND';

beforeEach(() => { localStorage.clear(); });

describe('vendor scoring subscription · D-NEW-BO + D-NEW-BV', () => {
  it('NCR close emit triggers vendor QA-dim delta · -2/-5/-10 by severity', () => {
    const unmount = subscribeQaForVendorScoring();
    emitQaOutcomeForVendor({
      vendor_id: 'V-1', ncr_id: 'NCR-1', severity: 'critical',
      outcome: 'reject', entity_code: ENTITY,
    });
    emitQaOutcomeForVendor({
      vendor_id: 'V-1', ncr_id: 'NCR-2', severity: 'major',
      outcome: 'reject', entity_code: ENTITY,
    });
    emitQaOutcomeForVendor({
      vendor_id: 'V-1', ncr_id: 'NCR-3', severity: 'minor',
      outcome: 'reject', entity_code: ENTITY,
    });
    const ledger = readVendorQaDimLedger(ENTITY);
    expect(ledger.length).toBe(3);
    const deltas = ledger.map((e) => e.delta).sort((a, b) => a - b);
    expect(deltas).toEqual([-10, -5, -2]);
    unmount();
  });

  it('CAPA effective with entity_code + vendor_id records reversal in correct tenant bucket', () => {
    const unmount = subscribeQaForVendorScoring();
    window.dispatchEvent(new CustomEvent('capa:effective:applied', {
      detail: { capa_id: 'CAPA-1', ncr_id: 'NCR-1', entity_code: ENTITY, vendor_id: 'V-9' },
    }));
    const ledger = readVendorQaDimLedger(ENTITY);
    expect(ledger.length).toBe(1);
    expect(ledger[0].capa_effective).toBe(true);
    expect(ledger[0].vendor_id).toBe('V-9');
    expect(ledger[0].entity_code).toBe(ENTITY);
    unmount();
  });

  it('events missing entity_code write ZERO rows · no bare-suffix key created', () => {
    const unmount = subscribeQaForVendorScoring();
    window.dispatchEvent(new CustomEvent('capa:effective:applied', {
      detail: { capa_id: 'CAPA-X', ncr_id: 'NCR-X', vendor_id: 'V-X' },
    }));
    window.dispatchEvent(new CustomEvent('capa:ineffective:reopened', {
      detail: { capa_id: 'CAPA-Y', ncr_id: 'NCR-Y' },
    }));
    expect(readVendorQaDimLedger('').length).toBe(0);
    expect(localStorage.getItem('erp_vendor_qa_dim_')).toBeNull();
    unmount();
  });
});
