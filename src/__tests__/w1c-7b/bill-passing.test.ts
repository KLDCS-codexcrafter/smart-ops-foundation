/**
 * W1C-7b · BillPassing — register key populates AND a read through the
 * real engine (listBillPassing) returns the seeded rows.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { seedFinanceProcurementTxnsForDemo } from '@/data/demo-transactions-finance-procurement';
import { billPassingKey } from '@/types/bill-passing';
import { listBillPassing, getBillsForPo } from '@/lib/bill-passing-engine';

const ENTITY = 'SMRT';

describe('W1C-7b · BillPassing demo seed', () => {
  beforeEach(() => { localStorage.clear(); });

  it('writes records under billPassingKey', () => {
    seedFinanceProcurementTxnsForDemo(ENTITY);
    expect(localStorage.getItem(billPassingKey(ENTITY))).not.toBeNull();
  });

  it('listBillPassing returns the seeded rows', () => {
    seedFinanceProcurementTxnsForDemo(ENTITY);
    const rows = listBillPassing(ENTITY);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.some(r => r.status === 'approved_for_fcpi')).toBe(true);
    expect(rows.some(r => r.status === 'matched_with_variance')).toBe(true);
  });

  it('getBillsForPo resolves the seeded bill against the seeded PO', () => {
    seedFinanceProcurementTxnsForDemo(ENTITY);
    const bills = getBillsForPo('demo-w1c7b-po-1', ENTITY);
    expect(bills.length).toBeGreaterThanOrEqual(1);
    expect(bills[0].vendor_invoice_no).toBe('DSL/24-25/1045');
  });
});
