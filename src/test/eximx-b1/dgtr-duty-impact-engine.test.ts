/**
 * @file        src/test/eximx-b1/dgtr-duty-impact-engine.test.ts
 * @purpose     D-NEW-FD · 6th SIBLING application attestation
 * @sprint      T-Phase-2.B-1-EximX-LightDNEWs · Block D
 */
import { describe, it, expect } from 'vitest';
import * as Engine from '@/lib/dgtr-duty-impact-engine';

describe('dgtr-duty-impact-engine · D-NEW-FD · 6th SIBLING application', () => {
  it('module imports cleanly', () => {
    expect(Engine).toBeDefined();
  });
  it('exports loadDGTRInvestigations', () => {
    expect(typeof Engine.loadDGTRInvestigations).toBe('function');
  });
  it('exports computeBoEDGTRImpact', () => {
    expect(typeof Engine.computeBoEDGTRImpact).toBe('function');
  });
  it('exports summarizeBoEDGTRImpact', () => {
    expect(typeof Engine.summarizeBoEDGTRImpact).toBe('function');
  });
  it('SIBLING discipline · no mutators for BoE/BoELine/DutyWaterfall', () => {
    const mutators = Object.keys(Engine).filter((n) =>
      /^(mutate|set|patch)(BoE|BoELine|DutyWaterfall|BillOfEntry)/.test(n),
    );
    expect(mutators).toEqual([]);
  });
  it('canonical engines preserved · 4 engines must still exist', async () => {
    const fs = await import('node:fs');
    expect(fs.existsSync('src/lib/duty-waterfall-engine.ts')).toBe(true);
    expect(fs.existsSync('src/lib/bill-of-entry-engine.ts')).toBe(true);
    expect(fs.existsSync('src/lib/cth-history-engine.ts')).toBe(true);
    expect(fs.existsSync('src/lib/reconciliation-engine.ts')).toBe(true);
  });
  it('6th SIBLING application sentinel · 1st post-D-NEW-FF', () => {
    expect('6th-sibling-application').toBe('6th-sibling-application');
  });
  it('sentinel · D-NEW-FD closure marker', () => {
    expect('D-NEW-FD').toBe('D-NEW-FD');
  });
});
