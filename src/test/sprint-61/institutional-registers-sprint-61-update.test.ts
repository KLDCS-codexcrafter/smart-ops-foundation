import { describe, it, expect } from 'vitest';
import {
  SIBLINGS,
  getSiblingCount,
} from '@/lib/_institutional/sibling-register';
import {
  MOATS,
  getMoatCount,
} from '@/lib/_institutional/moat-register';
import {
  SPRINTS,
  getSprintCount,
  getCurrentAStreak,
} from '@/lib/_institutional/sprint-history';
import {
  CAPABILITIES,
  getCapabilityScore,
  getCapabilityScoreFullOnly,
} from '@/lib/_institutional/capability-scorecard';

describe('Sprint 61 PROD-4 PASS 2 · institutional register updates', () => {
  it('SIBLINGS now has 37 entries · 37th = demand-forecast-engine CONFIRMED', () => {
    expect(getSiblingCount()).toBe(37);
    const dfe = SIBLINGS.find((s) => s.id === 'demand-forecast-engine');
    expect(dfe).toBeDefined();
    expect(dfe!.provenance).toBe('CONFIRMED');
    expect(dfe!.sprintAdded).toBe(61);
  });

  it('MOATS includes MOAT-35 + MOAT-36 with CONFIRMED provenance · total 36', () => {
    expect(getMoatCount()).toBe(36);
    const m35 = MOATS.find((m) => m.id === 'MOAT-35');
    const m36 = MOATS.find((m) => m.id === 'MOAT-36');
    expect(m35?.provenance).toBe('CONFIRMED');
    expect(m36?.provenance).toBe('CONFIRMED');
    expect(m35?.sprintBanked).toBe(61);
    expect(m36?.sprintBanked).toBe(61);
  });

  it('SPRINTS includes Sprint 61 · grade A composite · composite=true', () => {
    expect(getSprintCount()).toBe(61);
    const s61 = SPRINTS.find((s) => s.sprintNumber === 61);
    expect(s61).toBeDefined();
    expect(s61!.grade).toBe('A composite');
    expect(s61!.composite).toBe(true);
    expect(s61!.newSiblings).toContain('demand-forecast-engine');
  });

  it('getCurrentAStreak returns 8 · NEW Operix record extended', () => {
    expect(getCurrentAStreak()).toBe(8);
  });

  it('capability scorecard CAP-25 + CAP-26 flipped to full · 24/28', () => {
    expect(getCapabilityScoreFullOnly()).toBe('24/28');
    const cap25 = CAPABILITIES.find((c) => c.id === 'CAP-25');
    const cap26 = CAPABILITIES.find((c) => c.id === 'CAP-26');
    expect(cap25?.state).toBe('full');
    expect(cap26?.state).toBe('full');
    expect(cap25?.lastChangedSprint).toBe(61);
    expect(cap26?.lastChangedSprint).toBe(61);
    expect(getCapabilityScore()).toEqual({ full: 24, partial: 2, absent: 2, total: 28 });
  });
});
