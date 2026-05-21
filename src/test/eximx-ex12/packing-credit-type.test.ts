import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as Types from '@/types/packing-credit';

describe('packing-credit SIBLING type · D-NEW-FK', () => {
  it('SIBLING type file exists', () => {
    expect(fs.existsSync('src/types/packing-credit.ts')).toBe(true);
  });
  it('exports packingCreditKey FR-26 helper', () => {
    expect(typeof Types.packingCreditKey).toBe('function');
    expect(Types.packingCreditKey('sinha-trading')).toBe('erp_sinha-trading_eximx_packing_credit_contracts');
  });
  it('exports RBI_PC_TENOR_DAYS = 270', () => {
    expect(Types.RBI_PC_TENOR_DAYS).toBe(270);
  });
  it('exports PC_VALID_TRANSITIONS state machine', () => {
    expect(typeof Types.PC_VALID_TRANSITIONS).toBe('object');
    expect(Types.PC_VALID_TRANSITIONS.draft).toContain('sanctioned');
  });
  it('SIBLING discipline · does NOT redefine ExportPurchaseOrder or ExportRealisation', () => {
    const content = fs.readFileSync('src/types/packing-credit.ts', 'utf-8');
    expect(content).not.toMatch(/export\s+(interface|type)\s+(ExportPurchaseOrder|ExportRealisation)\b/);
  });
});
