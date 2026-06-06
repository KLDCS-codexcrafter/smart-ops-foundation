import { describe, it } from 'vitest';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { MOATS } from '@/lib/_institutional/moat-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

describe('dump dangling refs', () => {
  it('moatsRealized dangling', () => {
    const moatIds = new Set(MOATS.map(m => m.id));
    const dangling: Array<{sib: string; missing: string}> = [];
    for (const s of SIBLINGS.filter(x => x.provenance === 'CONFIRMED')) {
      for (const m of s.moatsRealized) if (!moatIds.has(m)) dangling.push({sib: s.id, missing: m});
    }
    console.log('MOAT_DANGLING', JSON.stringify(dangling, null, 2));
  });
  it('newSiblings dangling', () => {
    const sibIds = new Set(SIBLINGS.map(s => s.id));
    const dangling: Array<{sprint: string|number; missing: string}> = [];
    for (const sp of SPRINTS.filter(x => x.provenance === 'CONFIRMED')) {
      for (const sid of sp.newSiblings) if (!sibIds.has(sid)) dangling.push({sprint: `${sp.sprintNumber}/${sp.code}`, missing: sid});
    }
    console.log('SIB_DANGLING', JSON.stringify(dangling, null, 2));
  });
});
