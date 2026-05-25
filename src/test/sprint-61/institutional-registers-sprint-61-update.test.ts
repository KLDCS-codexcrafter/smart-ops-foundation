/**
 * Sprint 61 PROD-4 · institutional register snapshot test
 *
 * T-fix (Sprint 62 close): rewritten as INCREMENTAL DELTA test (no forward-state pins).
 * Asserts the specific contributions Sprint 61 made to the registers, without binding
 * to mutable counters that advance with later sprints (sibling count, A-streak, etc.).
 */
import { describe, it, expect } from 'vitest';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { MOATS } from '@/lib/_institutional/moat-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { CAPABILITIES } from '@/lib/_institutional/capability-scorecard';

describe('Sprint 61 PROD-4 · incremental register delta (forward-state safe)', () => {
  it('37th SIBLING demand-forecast-engine present + CONFIRMED + sprintAdded=61', () => {
    const dfe = SIBLINGS.find((s) => s.id === 'demand-forecast-engine');
    expect(dfe).toBeDefined();
    expect(dfe!.provenance).toBe('CONFIRMED');
    expect(dfe!.sprintAdded).toBe(61);
  });

  it('MOAT-35 + MOAT-36 present + CONFIRMED + sprintBanked=61', () => {
    const m35 = MOATS.find((m) => m.id === 'MOAT-35');
    const m36 = MOATS.find((m) => m.id === 'MOAT-36');
    expect(m35?.provenance).toBe('CONFIRMED');
    expect(m36?.provenance).toBe('CONFIRMED');
    expect(m35?.sprintBanked).toBe(61);
    expect(m36?.sprintBanked).toBe(61);
  });

  it('Sprint 61 entry shape · composite A · newSiblings includes demand-forecast-engine', () => {
    const s61 = SPRINTS.find((s) => s.sprintNumber === 61);
    expect(s61).toBeDefined();
    expect(s61!.grade).toBe('A composite');
    expect(s61!.composite).toBe(true);
    expect(s61!.newSiblings).toContain('demand-forecast-engine');
  });

  it('CAP-25 + CAP-26 flipped to full at Sprint 61', () => {
    const cap25 = CAPABILITIES.find((c) => c.id === 'CAP-25');
    const cap26 = CAPABILITIES.find((c) => c.id === 'CAP-26');
    expect(cap25?.state).toBe('full');
    expect(cap26?.state).toBe('full');
    expect(cap25?.lastChangedSprint).toBe(61);
    expect(cap26?.lastChangedSprint).toBe(61);
  });
});
