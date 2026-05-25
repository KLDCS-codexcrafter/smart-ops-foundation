import { describe, it, expect } from 'vitest';
import {
  SIBLINGS,
} from '@/lib/_institutional/sibling-register';
import {
  MOATS,
} from '@/lib/_institutional/moat-register';
import {
  SPRINTS,
} from '@/lib/_institutional/sprint-history';
import {
  CAPABILITIES,
} from '@/lib/_institutional/capability-scorecard';

/**
 * Sprint 61 PROD-4 PASS 2 institutional register snapshot.
 *
 * Re-keyed at Sprint 62 T-fix from count-based assertions (which only held at
 * Sprint 61 state) to ID-lookup assertions (which remain valid across future
 * sprints because they check specific entries by ID rather than aggregate counts).
 *
 * Pattern codification: institutional snapshot tests MUST use find() lookups
 * over === count assertions to be immune to forward-state-drift regressions.
 * Originated at Sprint 62 audit · documented in FR Cheatsheet v1.15 candidate.
 */
describe('Sprint 61 PROD-4 PASS 2 · institutional register snapshot (ID-lookup pattern)', () => {
  it('SIBLINGS contains demand-forecast-engine as Sprint 61 addition · CONFIRMED', () => {
    const dfe = SIBLINGS.find((s) => s.id === 'demand-forecast-engine');
    expect(dfe).toBeDefined();
    expect(dfe!.provenance).toBe('CONFIRMED');
    expect(dfe!.sprintAdded).toBe(61);
    expect(dfe!.functionCount).toBe(11);
    expect(dfe!.moatsRealized).toContain('MOAT-35');
  });

  it('MOATS contains MOAT-35 + MOAT-36 as Sprint 61 additions · both CONFIRMED', () => {
    const m35 = MOATS.find((m) => m.id === 'MOAT-35');
    const m36 = MOATS.find((m) => m.id === 'MOAT-36');
    expect(m35).toBeDefined();
    expect(m36).toBeDefined();
    expect(m35!.provenance).toBe('CONFIRMED');
    expect(m36!.provenance).toBe('CONFIRMED');
    expect(m35!.sprintBanked).toBe(61);
    expect(m36!.sprintBanked).toBe(61);
  });

  it('SPRINTS contains Sprint 61 entry · grade A composite · composite=true · demand-forecast-engine sibling', () => {
    const s61 = SPRINTS.find((s) => s.sprintNumber === 61);
    expect(s61).toBeDefined();
    expect(s61!.grade).toBe('A composite');
    expect(s61!.composite).toBe(true);
    expect(s61!.newSiblings).toContain('demand-forecast-engine');
    expect(s61!.code).toBe('T-Phase-3.PROD-4');
  });

  it('CAPABILITIES has CAP-25 + CAP-26 lit by Sprint 61 (state full · lastChangedSprint 61)', () => {
    const cap25 = CAPABILITIES.find((c) => c.id === 'CAP-25');
    const cap26 = CAPABILITIES.find((c) => c.id === 'CAP-26');
    expect(cap25).toBeDefined();
    expect(cap26).toBeDefined();
    expect(cap25!.state).toBe('full');
    expect(cap26!.state).toBe('full');
    expect(cap25!.lastChangedSprint).toBe(61);
    expect(cap26!.lastChangedSprint).toBe(61);
  });

  it('Sprint 61 was a composite A-grade sprint (snapshot · valid at all future HEADs)', () => {
    const s61 = SPRINTS.find((s) => s.sprintNumber === 61);
    expect(s61).toBeDefined();
    expect(s61!.grade).toMatch(/^A/);
    expect(s61!.provenance).toBe('CONFIRMED');
  });
});
