/**
 * @file src/test/procure360-vendor-scoring-listener.test.ts
 * @sprint T-Phase-1.A.5.d-1-Trident-Reports-Reprocess-Bridge · Block B
 * @decisions D-NEW-AJ-revised CLOSED · D-NEW-BV
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mountProcure360VendorScoringListener, readVendorQaInbox,
} from '@/lib/procure360-vendor-scoring-listener';

const ENTITY = 'TEST_P360';

function fire(detail: Record<string, unknown>): void {
  window.dispatchEvent(new CustomEvent('qa.outcome.applied', { detail }));
}

describe('procure360-vendor-scoring-listener', () => {
  let unmount: () => void;
  beforeEach(() => { localStorage.clear(); unmount = mountProcure360VendorScoringListener(); });
  afterEach(() => { unmount(); });

  it('records inbox entry with full payload', () => {
    fire({
      target_card: 'procure360', vendor_id: 'V-1', ncr_id: 'NCR-1',
      severity: 'major', outcome: 'reject', quality_score_delta: -5,
      entity_code: ENTITY,
    });
    const rows = readVendorQaInbox(ENTITY);
    expect(rows).toHaveLength(1);
    expect(rows[0].vendor_id).toBe('V-1');
    expect(rows[0].delta).toBe(-5);
  });

  it('drops events missing entity_code (D-NEW-BV)', () => {
    fire({ vendor_id: 'V-1', ncr_id: 'NCR-1', severity: 'minor', outcome: 'rework', quality_score_delta: -2 });
    expect(readVendorQaInbox(ENTITY)).toEqual([]);
  });

  it('readVendorQaInbox filters by vendor_id', () => {
    fire({ vendor_id: 'V-1', ncr_id: 'N-1', severity: 'minor', outcome: 'rework', quality_score_delta: -2, entity_code: ENTITY });
    fire({ vendor_id: 'V-2', ncr_id: 'N-2', severity: 'major', outcome: 'reject', quality_score_delta: -5, entity_code: ENTITY });
    expect(readVendorQaInbox(ENTITY, 'V-1')).toHaveLength(1);
    expect(readVendorQaInbox(ENTITY, 'V-2')).toHaveLength(1);
    expect(readVendorQaInbox(ENTITY)).toHaveLength(2);
  });
});
