/**
 * W1C-7b · EximX — eBRC + EDPMS register keys populate and parse.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { seedFinanceProcurementTxnsForDemo } from '@/data/demo-transactions-finance-procurement';
import { ebrcKey, edpmsKey } from '@/types/ebrc-edpms';

const ENTITY = 'SMRT';

describe('W1C-7b · EximX demo seed', () => {
  beforeEach(() => { localStorage.clear(); });

  it('writes an issued eBRC under ebrcKey', () => {
    seedFinanceProcurementTxnsForDemo(ENTITY);
    const rows = JSON.parse(localStorage.getItem(ebrcKey(ENTITY))!);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].status).toBe('issued');
    expect(rows[0].full_value_inr).toBeGreaterThan(0);
  });

  it('writes a closed EDPMS declaration under edpmsKey', () => {
    seedFinanceProcurementTxnsForDemo(ENTITY);
    const rows = JSON.parse(localStorage.getItem(edpmsKey(ENTITY))!);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].state).toBe('closed');
    expect(rows[0].related_shipping_bill_no).toBe('SB/26-27/0001');
  });
});
