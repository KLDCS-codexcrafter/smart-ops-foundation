/**
 * W1C-7b · Procure360 — PO + GRN register keys populate and rows
 * referentially link (GRN.po_id → PO.id).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { seedFinanceProcurementTxnsForDemo } from '@/data/demo-transactions-finance-procurement';
import { purchaseOrdersKey } from '@/types/po';
import { grnsKey } from '@/types/grn';

const ENTITY = 'SMRT';

describe('W1C-7b · Procure360 demo seed', () => {
  beforeEach(() => { localStorage.clear(); });

  it('populates PO register with at least one fully_received PO', () => {
    seedFinanceProcurementTxnsForDemo(ENTITY);
    const pos = JSON.parse(localStorage.getItem(purchaseOrdersKey(ENTITY))!);
    expect(pos.length).toBeGreaterThanOrEqual(2);
    expect(pos.some((p: { status: string }) => p.status === 'fully_received')).toBe(true);
  });

  it('populates GRN register with a posted GRN linked to the seeded PO', () => {
    seedFinanceProcurementTxnsForDemo(ENTITY);
    const grns = JSON.parse(localStorage.getItem(grnsKey(ENTITY))!);
    expect(grns.length).toBeGreaterThanOrEqual(1);
    expect(grns[0].status).toBe('posted');
    expect(grns[0].po_id).toBe('demo-w1c7b-po-1');
  });
});
