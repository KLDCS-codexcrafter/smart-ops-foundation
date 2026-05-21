import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as Types from '@/types/letter-of-credit';

describe('letter-of-credit SIBLING type · D-NEW-FJ', () => {
  it('SIBLING type file exists', () => {
    expect(fs.existsSync('src/types/letter-of-credit.ts')).toBe(true);
  });
  it('exports lcKey FR-26 helper', () => {
    expect(typeof Types.lcKey).toBe('function');
    expect(Types.lcKey('sinha-trading')).toBe('erp_sinha-trading_eximx_letters_of_credit');
  });
  it('exports STANDARD_LC_DOCUMENT_SET (UCP 600)', () => {
    expect(Array.isArray(Types.STANDARD_LC_DOCUMENT_SET)).toBe(true);
    expect(Types.STANDARD_LC_DOCUMENT_SET.length).toBeGreaterThanOrEqual(5);
  });
  it('exports LC_VALID_TRANSITIONS state machine', () => {
    expect(typeof Types.LC_VALID_TRANSITIONS).toBe('object');
    expect(Types.LC_VALID_TRANSITIONS.draft).toContain('opened');
  });
  it('SIBLING discipline · does NOT redefine ExportPurchaseOrder', () => {
    const content = fs.readFileSync('src/types/letter-of-credit.ts', 'utf-8');
    expect(content).not.toMatch(/export\s+(interface|type)\s+ExportPurchaseOrder\b/);
  });
});
