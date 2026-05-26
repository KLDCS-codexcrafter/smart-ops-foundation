/**
 * @file Sprint 65 FAR-1 · institutional register snapshot · Lesson 19 ID-LOOKUP MANDATORY
 * Count-based assertions belong ONLY in _institutional-cross-ref.test.ts.
 * @sprint T-Phase-4.FAR-1.TFix
 */
import { describe, it, expect } from 'vitest';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { FAR_CAPABILITIES } from '@/lib/_institutional/far-extended-scorecard';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { MOATS } from '@/lib/_institutional/moat-register';

describe('Sprint 65 FAR-1 · institutional register updates (ID-lookup)', () => {
  it('SPRINTS includes Sprint 65 · FAR-1 · grade A first-pass-clean', () => {
    const s65 = SPRINTS.find(s => s.sprintNumber === 65);
    expect(s65).toBeDefined();
    expect(s65?.grade).toBe('A first-pass-clean');
    expect(s65?.code).toBe('T-Phase-4.FAR-1');
    expect(s65?.predecessorSha).toBe('9eeecc23');
    // headSha may be 'TBD_AT_BANK' (pending harness SHA-fill) OR real SHA
    expect((s65?.headSha?.length ?? 0)).toBeGreaterThan(0);
  });

  it('FAR-CAP-7 through FAR-CAP-11 are FULL at Sprint 65', () => {
    for (const id of ['FAR-CAP-7', 'FAR-CAP-8', 'FAR-CAP-9', 'FAR-CAP-10', 'FAR-CAP-11']) {
      const cap = FAR_CAPABILITIES.find(c => c.id === id);
      expect(cap?.state).toBe('full');
      expect(cap?.lastChangedSprint).toBe(65);
    }
  });

  it('3 NEW SIBLINGs introduced at Sprint 65 · CONFIRMED provenance', () => {
    for (const id of ['caro-2020-engine', 'ind-as-116-lease-engine', 'epcg-fa-bridge']) {
      const s = SIBLINGS.find(x => x.id === id);
      expect(s).toBeDefined();
      expect(s?.sprintAdded).toBe(65);
      expect(s?.provenance).toBe('CONFIRMED');
    }
  });

  it('MOAT-39/40/41 introduced at Sprint 65', () => {
    for (const id of ['MOAT-39', 'MOAT-40', 'MOAT-41']) {
      const m = MOATS.find(x => x.id === id);
      expect(m).toBeDefined();
      expect(m?.sprintBanked).toBe(65);
      expect((m?.headShaBanked?.length ?? 0)).toBeGreaterThan(0);
    }
  });

  it('canonical SIBLINGS preserved (sales-production-bridge + iot-machine-bridge ID-lookup)', () => {
    expect(SIBLINGS.find(s => s.id === 'sales-production-bridge')).toBeDefined();
    expect(SIBLINGS.find(s => s.id === 'iot-machine-bridge')).toBeDefined();
  });

  it('canonical MOATs preserved · MOAT-39/41 backingFiles cite expected SIBLING engines', () => {
    const moat39 = MOATS.find(m => m.id === 'MOAT-39');
    expect(moat39?.backingFiles).toContain('src/lib/caro-2020-engine.ts');
    const moat41 = MOATS.find(m => m.id === 'MOAT-41');
    expect(moat41?.backingFiles).toContain('src/lib/epcg-fa-bridge.ts');
  });
});
