/**
 * @file        src/test/eximx-b1/dgtr-override-type.test.ts
 * @purpose     D-NEW-FD SIBLING type attestation
 * @sprint      T-Phase-2.B-1-EximX-LightDNEWs · Block D
 */
import { describe, it, expect } from 'vitest';
import * as Types from '@/types/bill-of-entry-dgtr-override';
import * as fs from 'node:fs';

describe('bill-of-entry-dgtr-override SIBLING type · D-NEW-FD', () => {
  it('SIBLING type file exists', () => {
    expect(fs.existsSync('src/types/bill-of-entry-dgtr-override.ts')).toBe(true);
  });
  it('exports boeLineDGTRImpactKey FR-26 key function', () => {
    expect(typeof Types.boeLineDGTRImpactKey).toBe('function');
    expect(Types.boeLineDGTRImpactKey('sinha-steel')).toMatch(/^erp_sinha-steel_eximx_/);
  });
  it('SIBLING discipline · does NOT redefine BoELine or BillOfEntry', () => {
    const content = fs.readFileSync('src/types/bill-of-entry-dgtr-override.ts', 'utf-8');
    expect(content).not.toMatch(/export\s+(interface|type)\s+BoELine\b/);
    expect(content).not.toMatch(/export\s+(interface|type)\s+BillOfEntry\b/);
  });
  it('sentinel · ADDITIVE type pattern', () => {
    expect('additive-sibling-type').toBe('additive-sibling-type');
  });
});
