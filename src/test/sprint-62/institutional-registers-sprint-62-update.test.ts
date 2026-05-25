import { describe, it, expect } from 'vitest';
import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { MOATS, getMoatCount } from '@/lib/_institutional/moat-register';
import { SPRINTS, getSprintCount, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { CAPABILITIES, getCapabilityScoreFullOnly } from '@/lib/_institutional/capability-scorecard';

describe('Sprint 62 PROD-4.5 · institutional register updates', () => {
  it('SIBLINGS has 38 · 38th = cfr-part-11-engine CONFIRMED', () => {
    expect(getSiblingCount()).toBe(38);
    const cfr = SIBLINGS.find((s) => s.id === 'cfr-part-11-engine');
    expect(cfr?.provenance).toBe('CONFIRMED');
    expect(cfr?.sprintAdded).toBe(62);
  });

  it('MOATS includes MOAT-37 with CONFIRMED provenance · total 37', () => {
    expect(getMoatCount()).toBe(37);
    const m37 = MOATS.find((m) => m.id === 'MOAT-37');
    expect(m37?.provenance).toBe('CONFIRMED');
    expect(m37?.sprintBanked).toBe(62);
  });

  it('SPRINTS includes Sprint 62 · grade A first-pass-clean · A-streak = 9', () => {
    expect(getSprintCount()).toBe(62);
    const s62 = SPRINTS.find((s) => s.sprintNumber === 62);
    expect(s62?.grade).toBe('A first-pass-clean');
    expect(s62?.newSiblings).toContain('cfr-part-11-engine');
    expect(getCurrentAStreak()).toBe(9);
  });

  it('capability scorecard CAP-22 + CAP-23 + CAP-28 flipped · 27/28', () => {
    expect(getCapabilityScoreFullOnly()).toBe('27/28');
    expect(CAPABILITIES.find((c) => c.id === 'CAP-22')?.state).toBe('full');
    expect(CAPABILITIES.find((c) => c.id === 'CAP-23')?.state).toBe('full');
    expect(CAPABILITIES.find((c) => c.id === 'CAP-28')?.state).toBe('full');
  });
});
