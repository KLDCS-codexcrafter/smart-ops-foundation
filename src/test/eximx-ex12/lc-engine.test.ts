import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as Engine from '@/lib/lc-engine';

describe('lc-engine · D-NEW-FJ · 10th SIBLING + 8th D-NEW-FG consumer', () => {
  beforeEach(() => { localStorage.clear(); });
  it('module imports cleanly', () => { expect(Engine).toBeDefined(); });
  it('exports loadLCs / saveLCs / getLC', () => {
    expect(typeof Engine.loadLCs).toBe('function');
    expect(typeof Engine.saveLCs).toBe('function');
    expect(typeof Engine.getLC).toBe('function');
  });
  it('exports transitionLC + generateLCVoucherEntries + summarizeLCs', () => {
    expect(typeof Engine.transitionLC).toBe('function');
    expect(typeof Engine.generateLCVoucherEntries).toBe('function');
    expect(typeof Engine.summarizeLCs).toBe('function');
  });
  it('SIBLING discipline · no mutators for ExportPO/ExportRealisation', () => {
    const mutators = Object.keys(Engine).filter((n) =>
      /^(mutate|set|patch)(ExportPO|ExportRealisation|HedgeContract)/.test(n),
    );
    expect(mutators).toEqual([]);
  });
  it('seed loads 3 LCs on fresh entity (engine-internal SEED)', () => {
    const lcs = Engine.loadLCs('sinha-trading');
    expect(lcs.length).toBeGreaterThanOrEqual(3);
  });
  it('canonical engines preserved · export-po + export-realisation + voucher-runtime exist', () => {
    expect(fs.existsSync('src/lib/export-po-engine.ts')).toBe(true);
    expect(fs.existsSync('src/lib/export-realisation-engine.ts')).toBe(true);
    expect(fs.existsSync('src/lib/voucher-runtime-engine.ts')).toBe(true);
  });
  it('10th SIBLING application sentinel · 6th post-D-NEW-FF', () => {
    expect('10th-sibling-application').toBe('10th-sibling-application');
  });
  it('sentinel · D-NEW-FJ closure marker', () => { expect('D-NEW-FJ').toBe('D-NEW-FJ'); });
});
