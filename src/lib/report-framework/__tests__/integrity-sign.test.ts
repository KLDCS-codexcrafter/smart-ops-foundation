/**
 * @file        integrity-sign.test.ts
 * @purpose     Verify signReport/verifyReport round-trip + tamper detection.
 * @sprint      RPT-1a
 */
import { describe, it, expect } from 'vitest';
import { signReport, verifyReport } from '../integrity-sign';

describe('RPT-1a · integrity-sign', () => {
  const rows = [
    { id: 'r1', party: 'Acme', amount: 12_345 },
    { id: 'r2', party: 'Beta', amount: 67_890 },
  ];

  it('signReport returns a deterministic fnv1a-prefixed hash', () => {
    const a = signReport(rows);
    const b = signReport(rows);
    expect(a).toBe(b);
    expect(a.startsWith('fnv1a:')).toBe(true);
  });

  it('verifyReport returns true for an untampered row-set', () => {
    const hash = signReport(rows);
    expect(verifyReport(rows, hash)).toBe(true);
  });

  it('verifyReport returns false when a row is tampered', () => {
    const hash = signReport(rows);
    const tampered = [{ ...rows[0], amount: 99_999 }, rows[1]];
    expect(verifyReport(tampered, hash)).toBe(false);
  });

  it('verifyReport returns false when rows are added', () => {
    const hash = signReport(rows);
    const extra = [...rows, { id: 'r3', party: 'Gamma', amount: 1 }];
    expect(verifyReport(extra, hash)).toBe(false);
  });

  it('handles empty row-sets', () => {
    const h = signReport([]);
    expect(verifyReport([], h)).toBe(true);
  });
});
