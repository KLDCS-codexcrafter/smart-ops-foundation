/**
 * @sprint W1C-6 · Block 4 — institutional self-seed + W1C-5 backfill
 */
import { describe, it, expect } from 'vitest';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

describe('W1C-6 · institutional', () => {
  it('W1C-6 row exists with predecessor b710a79', () => {
    const row = SPRINTS.find(s => s.code === 'T-W1C6-First-Run-Seed');
    expect(row).toBeTruthy();
    expect(row!.predecessorSha).toBe('b710a79');
    expect(row!.newSiblings).toEqual([]);
  });

  it('W1C-5 headSha backfilled to b710a79', () => {
    const row = SPRINTS.find(s => s.code === 'T-W1C5-Fraud-Guard');
    expect(row).toBeTruthy();
    expect(row!.headSha).toBe('b710a79');
  });
});
