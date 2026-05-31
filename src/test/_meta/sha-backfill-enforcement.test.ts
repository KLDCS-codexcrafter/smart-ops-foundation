/**
 * @file        src/test/_meta/sha-backfill-enforcement.test.ts
 * @sprint      Sprint 88 · v1.30 §M · prevents future SHA-backfill drift
 */
import { describe, it, expect } from 'vitest';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

describe('v1.30 §M · SHA backfill enforcement', () => {
  it('no banked sprint retains TBD_AT_BANK sentinel for prior sprints', () => {
    // Allowed only on the most recent entry (current sprint pending bank)
    const sorted = [...SPRINTS].filter((s) => s.provenance === 'CONFIRMED');
    const last = sorted[sorted.length - 1];
    for (const s of sorted) {
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
