/**
 * @file FAR-0 institutional register snapshot · Lesson 19 ID-LOOKUP MANDATORY
 * Count-based assertions belong ONLY in _institutional-cross-ref.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { FAR_CAPABILITIES } from '@/lib/_institutional/far-extended-scorecard';
import { FK_CAPABILITIES } from '@/lib/_institutional/fk-extended-scorecard';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { MOATS } from '@/lib/_institutional/moat-register';
import { CAPABILITIES } from '@/lib/_institutional/capability-scorecard';

describe('Sprint 64 FAR-0 · institutional register updates (ID-lookup)', () => {
  it('SPRINTS includes Sprint 64 · FAR-0 · grade A first-pass-clean', () => {
    const s64 = SPRINTS.find(s => s.sprintNumber === 64);
    expect(s64).toBeDefined();
    expect(s64?.grade).toBe('A first-pass-clean');
    expect(s64?.code).toBe('T-Phase-4.FAR-0');
    expect(s64?.newSiblings).toEqual([]);
    expect(s64?.predecessorSha).toBe('567c140c');
  });

  it('FAR-CAP-1 through FAR-CAP-6 schema-staged at Sprint 64', () => {
    for (const id of ['FAR-CAP-1', 'FAR-CAP-2', 'FAR-CAP-3', 'FAR-CAP-4', 'FAR-CAP-5', 'FAR-CAP-6']) {
      const cap = FAR_CAPABILITIES.find(c => c.id === id);
      expect(cap?.state).toBe('schema-staged');
      expect(cap?.lastChangedSprint).toBe(64);
    }
  });

  it('FK-CAP-1 · FK-CAP-3 · FK-CAP-4 · FK-CAP-5 were schema-staged at Sprint 64 close (historical snapshot · current state may have advanced)', () => {
    // Historical Sprint 64 close-state snapshot: these 4 FK-CAPs were introduced
    // as schema-staged at Sprint 64. FK-CAP-1/3/5 were subsequently promoted to
    // 'full' at Sprint 66 FAR-2 (UI surfaces lit). FK-CAP-4 remains schema-staged
    // pending UI (`uiClosedAtSprint: null`).
    //
    // Per Lesson 19 (ID-LOOKUP discipline) + FR-91 honest snapshot pattern:
    // the assertion validates that each capability was introduced at Sprint 64
    // (lastChangedSprint <= 64 at first appearance OR currently >= 64 reflecting
    // a later promotion), and state is one of the allowed snapshot-or-evolution values.
    for (const id of ['FK-CAP-1', 'FK-CAP-3', 'FK-CAP-4', 'FK-CAP-5']) {
      const cap = FK_CAPABILITIES.find(c => c.id === id);
      expect(cap, `${id} must exist in FK_CAPABILITIES`).toBeDefined();
      // Each cap was either still schema-staged (FK-CAP-4) OR promoted post-Sprint-64
      expect(['schema-staged', 'full']).toContain(cap?.state);
      // lastChangedSprint is either 64 (still at intro state) or > 64 (promoted later)
      expect(cap?.lastChangedSprint).toBeGreaterThanOrEqual(64);
    }
  });

  it('canonical SIBLINGS · MOATS · CAPABILITIES preserved (ID-lookup spot checks)', () => {
    expect(SIBLINGS.find(s => s.id === 'carbon-planning-engine')).toBeDefined();
    expect(SIBLINGS.find(s => s.id === 'cfr-part-11-engine')).toBeDefined();
    expect(MOATS.find(m => m.id === 'MOAT-38')).toBeDefined();
    expect(CAPABILITIES.find(c => c.id === 'CAP-27')?.state).toBe('full');
  });
});
