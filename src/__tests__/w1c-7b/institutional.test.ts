/**
 * W1C-7b · Institutional — sprint-history backfill of W1C-7a headSha
 * to predecessor 34ae6f8 and self-seed of W1C-7b.
 */
import { describe, it, expect } from 'vitest';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

describe('W1C-7b · institutional', () => {
  it('backfills W1C-7a headSha to 34ae6f8', () => {
    const e = SPRINTS.find(s => s.code === 'T-W1C7a-CC-Config-Seed');
    expect(e).toBeDefined();
    expect(e!.headSha).toBe('34ae6f8');
  });

  it('self-seeds W1C-7b with predecessor 34ae6f8', () => {
    const e = SPRINTS.find(s => s.code === 'T-W1C7b-Demo-Txns-Finance');
    expect(e).toBeDefined();
    expect(e!.predecessorSha).toBe('34ae6f8');
    expect(e!.grade).toBe('A');
  });
});
