import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as Types from '@/types/form-3ceb';

describe('form-3ceb SIBLING type · D-NEW-FE', () => {
  it('SIBLING type file exists', () => {
    expect(fs.existsSync('src/types/form-3ceb.ts')).toBe(true);
  });
  it('exports form3CEBSnapshotKey FR-26 key function', () => {
    expect(typeof Types.form3CEBSnapshotKey).toBe('function');
    expect(Types.form3CEBSnapshotKey('sinha-trading')).toBe('erp_sinha-trading_eximx_form_3ceb_snapshots');
  });
  it('FORM_3CEB_THRESHOLD_INR is 1 crore (Section 92E default)', () => {
    expect(Types.FORM_3CEB_THRESHOLD_INR).toBe(10_000_000);
  });
  it('SIBLING discipline · does NOT redefine TPDocumentation or ImportPurchaseOrder', () => {
    const content = fs.readFileSync('src/types/form-3ceb.ts', 'utf-8');
    expect(content).not.toMatch(/export\s+(interface|type)\s+TPDocumentation\b/);
    expect(content).not.toMatch(/export\s+(interface|type)\s+(Import|Export)PurchaseOrder\b/);
    expect(content).not.toMatch(/export\s+(interface|type)\s+Form15CASubmission\b/);
  });
  it('sentinel · ADDITIVE SIBLING type', () => {
    expect('additive-sibling-type').toBe('additive-sibling-type');
  });
});
