/**
 * Sprint 66 institutional snapshot · ID-lookup discipline per Lesson 19.
 * NO .length assertions on sprint-66-specific fields — only ID lookups.
 */
import { describe, it, expect } from 'vitest';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { MOATS } from '@/lib/_institutional/moat-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { FAR_CAPABILITIES } from '@/lib/_institutional/far-extended-scorecard';
import { FK_CAPABILITIES } from '@/lib/_institutional/fk-extended-scorecard';

describe('Sprint 66 institutional updates · ID-lookup only', () => {
  it('43rd SIBLING vehicle-fa-bridge present', () => {
    expect(SIBLINGS.find(s => s.id === 'vehicle-fa-bridge')).toBeDefined();
  });
  it('MOAT-42/43/44 present', () => {
    expect(MOATS.find(m => m.id === 'MOAT-42')).toBeDefined();
    expect(MOATS.find(m => m.id === 'MOAT-43')).toBeDefined();
    expect(MOATS.find(m => m.id === 'MOAT-44')).toBeDefined();
  });
  it('Sprint 66 entry · grade A first-pass-clean · vehicle-fa-bridge sibling', () => {
    const s66 = SPRINTS.find(s => s.sprintNumber === 66);
    expect(s66?.grade).toBe('A first-pass-clean');
    expect(s66?.newSiblings).toEqual(['vehicle-fa-bridge']);
    expect(s66?.code).toBe('T-Phase-4.FAR-2');
  });
  it('FAR-CAP-12/13/14/15 are FULL', () => {
    for (const id of ['FAR-CAP-12','FAR-CAP-13','FAR-CAP-14','FAR-CAP-15']) {
      expect(FAR_CAPABILITIES.find(c => c.id === id)?.state).toBe('full');
    }
  });
  it('FK-CAP-1/2/3/5/6/8 FULL · FK-CAP-4 schema-staged · FK-CAP-7 introduced at Sprint 66 close (historical snapshot · current state may have advanced)', () => {
    // Historical Sprint 66 close-state snapshot: FK-CAP-1/2/3/5/6/8 became
    // FULL at Sprint 66 FAR-2 (UI surfaces lit). FK-CAP-4 schema-staged
    // pending UI. FK-CAP-7 was 'absent' at Sprint 66 close · subsequently
    // promoted to 'full' at Sprint 68 FAR-4 Block 13 (Dashboard FA lane).
    //
    // Per Lesson 19 (ID-LOOKUP discipline) + FR-91 honest snapshot pattern:
    // FK-CAP-7 assertion accepts either 'absent' (Sprint 66 historical) OR
    // 'full' (Sprint 68 promoted state).
    for (const id of ['FK-CAP-1','FK-CAP-2','FK-CAP-3','FK-CAP-5','FK-CAP-6','FK-CAP-8']) {
      expect(FK_CAPABILITIES.find(c => c.id === id)?.state).toBe('full');
    }
    expect(FK_CAPABILITIES.find(c => c.id === 'FK-CAP-4')?.state).toBe('schema-staged');
    const fk7 = FK_CAPABILITIES.find(c => c.id === 'FK-CAP-7');
    expect(fk7, 'FK-CAP-7 must exist in FK_CAPABILITIES').toBeDefined();
    expect(['absent', 'full']).toContain(fk7?.state);
    expect(fk7?.lastChangedSprint).toBeGreaterThanOrEqual(66);
  });
});
