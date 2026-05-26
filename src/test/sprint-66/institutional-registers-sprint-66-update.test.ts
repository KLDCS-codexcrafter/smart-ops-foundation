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
  it('FK-CAP-1/2/3/5/6/8 are FULL · FK-CAP-4 schema-staged · FK-CAP-7 absent', () => {
    for (const id of ['FK-CAP-1','FK-CAP-2','FK-CAP-3','FK-CAP-5','FK-CAP-6','FK-CAP-8']) {
      expect(FK_CAPABILITIES.find(c => c.id === id)?.state).toBe('full');
    }
    expect(FK_CAPABILITIES.find(c => c.id === 'FK-CAP-4')?.state).toBe('schema-staged');
    expect(FK_CAPABILITIES.find(c => c.id === 'FK-CAP-7')?.state).toBe('absent');
  });
});
