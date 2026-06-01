/**
 * @file        src/test/_meta/sha-backfill-enforcement.test.ts
 * @sprint      Sprint 88 · v1.30 §M · prevents future SHA-backfill drift
 */
import { describe, it, expect } from 'vitest';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { MOATS } from '@/lib/_institutional/moat-register';

describe('v1.30 §M · SHA backfill enforcement', () => {
  it('no banked Comply360-era sprint (>=80) retains TBD_AT_BANK except current', () => {
    const era = SPRINTS.filter((s) => s.sprintNumber >= 80 && s.provenance === 'CONFIRMED');
    const last = era[era.length - 1];
    for (const s of era) {
      if (s === last) continue;
      expect(
        s.headSha,
        `Sprint ${s.sprintNumber} (${s.code}) must have a real headSha, not TBD_AT_BANK`,
      ).not.toBe('TBD_AT_BANK');
    }
  });

  it('predecessorSha is set for all post-S60 sprints', () => {
    for (const s of SPRINTS) {
      if (s.sprintNumber < 60) continue;
      if (s.provenance !== 'CONFIRMED') continue;
      expect(s.predecessorSha, `Sprint ${s.sprintNumber}`).toBeTruthy();
    }
  });

  // Sprint 102 · T-Phase-6.A.1.1 · DP-A1-1 reinforcement
  it('only the single latest sprint-history entry may carry TBD_AT_BANK', () => {
    const confirmed = SPRINTS.filter((s) => s.provenance === 'CONFIRMED');
    const tbd = confirmed.filter((s) => s.headSha === 'TBD_AT_BANK');
    expect(tbd.length, 'at most one TBD_AT_BANK allowed (the current sprint)').toBeLessThanOrEqual(1);
    if (tbd.length === 1) {
      const last = confirmed[confirmed.length - 1];
      expect(tbd[0].sprintNumber, 'the lone TBD must be the latest entry').toBe(last.sprintNumber);
    }
  });

  it('moat-register has zero TBD_AT_BANK after S102 cleanup', () => {
    const tbd = MOATS.filter((m) => m.headShaBanked === 'TBD_AT_BANK');
    expect(tbd.map((m) => m.id), 'moat-register must be fully backfilled').toEqual([]);
  });
});
