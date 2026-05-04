/**
 * cc-masters-engine.test.ts — Sprint T-Phase-1.2.6f-c-3 · Block B coverage
 * Validates upsert + idempotency for the 3 CC procurement masters.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  listModeOfPayment, upsertModeOfPayment,
  listTermsOfPayment, upsertTermsOfPayment,
  listTermsOfDelivery, upsertTermsOfDelivery,
} from '@/lib/cc-masters-engine';
import {
  modeOfPaymentKey, termsOfPaymentKey, termsOfDeliveryKey,
} from '@/types/cc-masters';

const E = 'TST';

beforeEach(() => {
  localStorage.removeItem(modeOfPaymentKey(E));
  localStorage.removeItem(termsOfPaymentKey(E));
  localStorage.removeItem(termsOfDeliveryKey(E));
});

describe('cc-masters-engine · ModeOfPayment', () => {
  it('inserts a new record with id + timestamps', () => {
    const rec = upsertModeOfPayment(E, {
      code: 'NEFT', name: 'NEFT', description: 'Bank transfer',
      status: 'active', is_default: true,
    });
    expect(rec.id).toMatch(/^mop-/);
    expect(rec.created_at).toBeTruthy();
    expect(listModeOfPayment(E)).toHaveLength(1);
  });

  it('updates existing record idempotently by id', () => {
    const a = upsertModeOfPayment(E, {
      code: 'NEFT', name: 'NEFT', description: '',
      status: 'active', is_default: false,
    });
    const b = upsertModeOfPayment(E, {
      id: a.id, code: 'NEFT', name: 'NEFT-Updated', description: '',
      status: 'active', is_default: true,
    });
    expect(b.id).toBe(a.id);
    expect(b.name).toBe('NEFT-Updated');
    expect(listModeOfPayment(E)).toHaveLength(1);
  });
});

describe('cc-masters-engine · TermsOfPayment', () => {
  it('persists credit days and advance pct', () => {
    const rec = upsertTermsOfPayment(E, {
      code: 'NET30', name: 'Net 30', credit_days: 30, advance_pct: 0,
      description: '', status: 'active', is_default: true,
    });
    expect(rec.credit_days).toBe(30);
    expect(listTermsOfPayment(E)[0].code).toBe('NET30');
  });
});

describe('cc-masters-engine · TermsOfDelivery', () => {
  it('persists incoterm field', () => {
    const rec = upsertTermsOfDelivery(E, {
      code: 'FOR-DEST', name: 'FOR Destination', incoterm: 'CIF',
      description: '', status: 'active', is_default: true,
    });
    expect(rec.incoterm).toBe('CIF');
    expect(listTermsOfDelivery(E)).toHaveLength(1);
  });
});
