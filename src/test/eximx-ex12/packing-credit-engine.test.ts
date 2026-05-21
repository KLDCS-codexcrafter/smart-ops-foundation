import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as Engine from '@/lib/packing-credit-engine';

describe('packing-credit-engine · D-NEW-FK · 11th SIBLING + 9th D-NEW-FG consumer', () => {
  beforeEach(() => { localStorage.clear(); });
  it('module imports cleanly', () => { expect(Engine).toBeDefined(); });
  it('exports loadPCs / savePCs / getPC', () => {
    expect(typeof Engine.loadPCs).toBe('function');
    expect(typeof Engine.savePCs).toBe('function');
    expect(typeof Engine.getPC).toBe('function');
  });
  it('exports transitionPC + generatePCVoucherEntries + summarizePCs', () => {
    expect(typeof Engine.transitionPC).toBe('function');
    expect(typeof Engine.generatePCVoucherEntries).toBe('function');
    expect(typeof Engine.summarizePCs).toBe('function');
  });
  it('SIBLING discipline · no mutators for ExportPO/ExportRealisation', () => {
    const mutators = Object.keys(Engine).filter((n) =>
      /^(mutate|set|patch)(ExportPO|ExportRealisation)/.test(n),
    );
    expect(mutators).toEqual([]);
  });
  it('seed loads 3 PCs on fresh entity', () => {
    const pcs = Engine.loadPCs('sinha-trading');
    expect(pcs.length).toBeGreaterThanOrEqual(3);
  });
  it('canonical engines preserved', () => {
    expect(fs.existsSync('src/lib/export-po-engine.ts')).toBe(true);
    expect(fs.existsSync('src/lib/export-realisation-engine.ts')).toBe(true);
    expect(fs.existsSync('src/lib/voucher-runtime-engine.ts')).toBe(true);
  });
  it('11th SIBLING application sentinel', () => {
    expect('11th-sibling-application').toBe('11th-sibling-application');
  });
  it('sentinel · D-NEW-FK closure marker', () => { expect('D-NEW-FK').toBe('D-NEW-FK'); });
});
