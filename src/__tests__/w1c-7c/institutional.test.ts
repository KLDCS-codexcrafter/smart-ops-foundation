import { describe, it, expect } from 'vitest';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

describe('W1C-7c · institutional', () => {
  it('W1C-7b headSha backfilled to 28507ed', () => {
    const s = SPRINTS.find(x => x.code === 'T-W1C7b-Demo-Txns-Finance');
    expect(s).toBeTruthy();
    expect(s!.headSha).toBe('28507ed');
  });
  it('W1C-7c self-seeded', () => {
    const s = SPRINTS.find(x => x.code === 'T-W1C7c-Demo-Txns-Ops-Close');
    expect(s).toBeTruthy();
    expect(s!.predecessorSha).toBe('28507ed');
    expect(s!.newSiblings).toEqual([]);
  });
});
