/**
 * @file        src/test/_meta/sha-backfill-enforcement.test.ts
 * @sprint      Sprint 88 · v1.30 §M · prevents future SHA-backfill drift
 */
import { describe, it, expect } from 'vitest';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

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
});
