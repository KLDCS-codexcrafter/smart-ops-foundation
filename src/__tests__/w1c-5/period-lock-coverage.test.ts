/**
 * W1C-5 Block 6 · Period-lock coverage.
 *
 * Every voucher-posting engine in the roster must either:
 *   (a) directly reference `isPeriodLocked` (own guard), OR
 *   (b) route through `postVoucher` / `saveCycleAdjustmentVouchers` — which
 *       themselves enforce the period-lock guard centrally.
 *
 * This mirrors the DSC-integrity coverage pattern: an explicit roster constant
 * makes additions/removals reviewable; the test asserts coverage without
 * silently shrinking when an engine is renamed.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const LIB = path.resolve(__dirname, '../../lib');

const POSTING_ENGINES = [
  'fincore-engine.ts',
  'bill-settlement-engine.ts',
  'payment-engine.ts',
  'sample-expense-voucher-engine.ts',
  'stock-issue-engine.ts',
  'stock-receipt-ack-engine.ts',
  'vendor-return-engine.ts',
  'intercompany-transaction-engine.ts',
  'procure-capex-fa-cascade-engine.ts',
] as const;

describe('W1C-5 Block 6 · Period-lock coverage', () => {
  it('all posting engines in the roster exist on disk', () => {
    const missing = POSTING_ENGINES.filter((f) => !fs.existsSync(path.join(LIB, f)));
    expect(missing, `missing roster engines: ${missing.join(', ')}`).toEqual([]);
  });

  it('every roster engine guards the period-lock (direct or via postVoucher)', () => {
    const failures: string[] = [];
    for (const f of POSTING_ENGINES) {
      const src = fs.readFileSync(path.join(LIB, f), 'utf8');
      const direct = /\bisPeriodLocked\b/.test(src);
      const viaCentral = /\bpostVoucher\s*\(/.test(src) || /\bsaveCycleAdjustmentVouchers\s*\(/.test(src);
      if (!direct && !viaCentral) failures.push(f);
    }
    expect(failures, `engines missing period-lock coverage: ${failures.join(', ')}`).toEqual([]);
  });

  it('fincore-engine wires isPeriodLocked into postVoucher (central guard intact)', () => {
    const src = fs.readFileSync(path.join(LIB, 'fincore-engine.ts'), 'utf8');
    expect(src).toMatch(/isPeriodLocked/);
    expect(src).toMatch(/export\s+function\s+postVoucher/);
  });
});
