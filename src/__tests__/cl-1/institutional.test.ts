/**
 * CL-1 · Block 4 · Institutional self-seed.
 */
import { describe, it, expect } from 'vitest';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

describe('CL-1 · institutional self-seed', () => {
  it('T-CL1-Cleanup-Foundation-Seed-Cosmetics row exists with predecessor 947bd0c', () => {
    const s = SPRINTS.find(x => x.code === 'T-CL1-Cleanup-Foundation-Seed-Cosmetics');
    expect(s).toBeTruthy();
    expect(s!.predecessorSha).toBe('947bd0c');
    expect(s!.newSiblings).toEqual([]);
  });
});
