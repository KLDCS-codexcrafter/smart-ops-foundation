/**
 * CL-1 · Block 3 · Mech4 + Mech5 — EximX param + RecentErrors reactivity.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { seedSinhaEximX } from '@/data/sinha-eximx-seed';

describe('CL-1 · Mech4 · seedSinhaEximX parameterized', () => {
  beforeEach(() => localStorage.clear());

  it('writes under arbitrary entityCode (no literal sinha-trading)', () => {
    seedSinhaEximX('ABDOS');
    const iec = JSON.parse(localStorage.getItem('erp_ABDOS_iec') || '[]');
    const lut = JSON.parse(localStorage.getItem('erp_ABDOS_lut') || '[]');
    expect(iec.length).toBeGreaterThanOrEqual(1);
    expect(lut.length).toBeGreaterThanOrEqual(1);
    // No spurious write under the legacy literal key
    expect(localStorage.getItem('erp_sinha-trading_iec')).toBeNull();
  });

  it('back-compat: default arg still routes to sinha-trading', () => {
    seedSinhaEximX();
    const iec = JSON.parse(localStorage.getItem('erp_sinha-trading_iec') || '[]');
    expect(iec.length).toBeGreaterThanOrEqual(1);
  });
});

describe('CL-1 · Mech5 · RecentErrorsPage reactivity', () => {
  it('source uses useEntityCode (reactive) and removes lazy getActiveEntity()', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/features/command-center/pages/RecentErrorsPage.tsx', 'utf8');
    expect(src).toMatch(/useEntityCode/);
    expect(src).not.toMatch(/function getActiveEntity/);
    expect(src).not.toMatch(/useState<string>\(\(\) => getActiveEntity/);
  });
});
