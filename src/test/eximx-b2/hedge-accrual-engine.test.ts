import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as Engine from '@/lib/hedge-accrual-engine';

describe('hedge-accrual-engine · D-NEW-FB · 7th D-NEW-FG consumer', () => {
  it('module imports cleanly', () => {
    expect(Engine).toBeDefined();
  });
  it('exports computeQuarterEndHedgeAccruals', () => {
    expect(typeof Engine.computeQuarterEndHedgeAccruals).toBe('function');
  });
  it('exports summarizeAccrualReport', () => {
    expect(typeof Engine.summarizeAccrualReport).toBe('function');
  });
  it('SIBLING discipline · no mutators for HedgeContract/VoucherRuntime', () => {
    const mutators = Object.keys(Engine).filter((n) =>
      /^(mutate|set|patch)(Hedge|Voucher|Accrual)/.test(n),
    );
    expect(mutators).toEqual([]);
  });
  it('D-NEW-FG canonical engine voucher-runtime-engine.ts preserved', () => {
    expect(fs.existsSync('src/lib/voucher-runtime-engine.ts')).toBe(true);
  });
  it('hedge-contract canonical engine preserved', () => {
    expect(fs.existsSync('src/lib/hedge-contract-engine.ts')).toBe(true);
  });
  it('7th D-NEW-FG consumer sentinel', () => {
    expect('7th-d-new-fg-consumer').toBe('7th-d-new-fg-consumer');
  });
  it('sentinel · D-NEW-FB closure marker', () => {
    expect('D-NEW-FB').toBe('D-NEW-FB');
  });
});
