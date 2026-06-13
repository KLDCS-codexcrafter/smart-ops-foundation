/**
 * W1C-7b · Comply360 — transactional demo seed populates the engine's
 * marker + writes rows readable through its own list APIs.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { seedFinanceProcurementTxnsForDemo } from '@/data/demo-transactions-finance-procurement';
import { isDemoSeeded } from '@/lib/comply360-demo-seed-engine';

const ENTITY = 'SMRT';

describe('W1C-7b · Comply360 demo seed', () => {
  beforeEach(() => { localStorage.clear(); });

  it('comply360-demo-seed-engine marker flips on after seed', () => {
    expect(isDemoSeeded()).toBe(false);
    seedFinanceProcurementTxnsForDemo(ENTITY);
    expect(isDemoSeeded()).toBe(true);
  });
});
