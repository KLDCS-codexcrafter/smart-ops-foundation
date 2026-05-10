/**
 * @file src/test/qualicheck-mtc-pc-bridge.test.ts
 * @purpose D-NEW-BS · MTC↔PC heat_no observability bridge · read-only sibling consumer
 * @sprint T-Phase-1.A.5.c-QualiCheck-Welder-Vendor-ISO-IQC
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { findPcMatchesForHeat } from '@/lib/qualicheck-bridges';

describe('findPcMatchesForHeat', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns [] when no PC records exist', () => {
    expect(findPcMatchesForHeat('E1', 'HT-100')).toEqual([]);
  });

  it('returns [] when heatNo is null/undefined/empty', () => {
    expect(findPcMatchesForHeat('E1', null)).toEqual([]);
    expect(findPcMatchesForHeat('E1', undefined)).toEqual([]);
    expect(findPcMatchesForHeat('E1', '')).toEqual([]);
  });

  it('matches PC where any line.heat_no equals heatNo', () => {
    localStorage.setItem(
      'erp_production_confirmations_E1',
      JSON.stringify([
        {
          id: 'pc-1', doc_no: 'PC/2026/001', status: 'confirmed',
          confirmation_date: '2026-05-09',
          lines: [{ heat_no: 'HT-100' }, { heat_no: null }],
        },
        {
          id: 'pc-2', doc_no: 'PC/2026/002', status: 'draft',
          confirmation_date: '2026-05-10',
          lines: [{ heat_no: 'HT-999' }],
        },
      ]),
    );
    const matches = findPcMatchesForHeat('E1', 'HT-100');
    expect(matches).toHaveLength(1);
    expect(matches[0].doc_no).toBe('PC/2026/001');
    expect(matches[0].heat_no).toBe('HT-100');
  });

  it('returns [] on malformed storage (silent · no throw)', () => {
    localStorage.setItem('erp_production_confirmations_E1', '{not json');
    expect(findPcMatchesForHeat('E1', 'HT-100')).toEqual([]);
  });
});
