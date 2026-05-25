/**
 * Sprint 63 PROD-5 institutional register snapshot · Lesson 19 ID-LOOKUP pattern.
 * Count-based assertions belong ONLY in _institutional-cross-ref.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { MOATS } from '@/lib/_institutional/moat-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { CAPABILITIES } from '@/lib/_institutional/capability-scorecard';

describe('Sprint 63 PROD-5 · institutional register snapshot (ID-lookup)', () => {
  it('SIBLINGS contains carbon-planning-engine · Sprint 63 · 39th · CONFIRMED', () => {
    const e = SIBLINGS.find((s) => s.id === 'carbon-planning-engine');
    expect(e).toBeDefined();
    expect(e!.provenance).toBe('CONFIRMED');
    expect(e!.sprintAdded).toBe(63);
    expect(e!.functionCount).toBe(8);
    expect(e!.moatsRealized).toContain('MOAT-38');
  });

  it('MOATS contains MOAT-38 banked at Sprint 63 · CONFIRMED', () => {
    const m = MOATS.find((x) => x.id === 'MOAT-38');
    expect(m).toBeDefined();
    expect(m!.provenance).toBe('CONFIRMED');
    expect(m!.sprintBanked).toBe(63);
    expect(m!.backingFiles).toContain('src/lib/carbon-planning-engine.ts');
  });

  it('SPRINTS contains Sprint 63 entry · grade A first-pass-clean · carbon-planning-engine', () => {
    const s = SPRINTS.find((x) => x.sprintNumber === 63);
    expect(s).toBeDefined();
    expect(s!.grade).toBe('A first-pass-clean');
    expect(s!.code).toBe('T-Phase-3.PROD-5');
    expect(s!.newSiblings).toContain('carbon-planning-engine');
    expect(s!.predecessorSha).toBe('2c11f18b');
  });

  it('CAPABILITIES has CAP-27 lit by Sprint 63 (state full · lastChangedSprint 63)', () => {
    const cap = CAPABILITIES.find((c) => c.id === 'CAP-27');
    expect(cap).toBeDefined();
    expect(cap!.state).toBe('full');
    expect(cap!.lastChangedSprint).toBe(63);
    expect(cap!.evidenceFiles).toContain('src/lib/carbon-planning-engine.ts');
  });

  it('Sprint 63 was an A-grade sprint (snapshot · valid at all future HEADs)', () => {
    const s = SPRINTS.find((x) => x.sprintNumber === 63);
    expect(s!.grade).toMatch(/^A/);
    expect(s!.provenance).toBe('CONFIRMED');
  });
});
