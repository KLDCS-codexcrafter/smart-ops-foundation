/**
 * institutional-registers-sprint-67-update.test.ts
 * Sprint 67 FAR-3 · Block 12 · Q-LOCK-12 A · Lesson 19 ID-lookup discipline
 */
import { describe, it, expect } from 'vitest';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { MOATS } from '@/lib/_institutional/moat-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { FAR_CAPABILITIES } from '@/lib/_institutional/far-extended-scorecard';

describe('Sprint 67 FAR-3 · Institutional Register Updates', () => {
  it('3 NEW SIBLINGs exist by ID', () => {
    expect(SIBLINGS.find((s) => s.id === 'multi-gaap-depreciation-engine')).toBeDefined();
    expect(SIBLINGS.find((s) => s.id === 'uop-depreciation-engine')).toBeDefined();
    expect(SIBLINGS.find((s) => s.id === 'component-depreciation-engine')).toBeDefined();
  });

  it('MOAT-45/46/47 exist · sprintBanked 67', () => {
    expect(MOATS.find((m) => m.id === 'MOAT-45')).toBeDefined();
    expect(MOATS.find((m) => m.id === 'MOAT-46')).toBeDefined();
    expect(MOATS.find((m) => m.id === 'MOAT-47')).toBeDefined();
    expect(MOATS.find((m) => m.id === 'MOAT-45')?.sprintBanked).toBe(67);
  });

  it('Sprint 67 entry exists · grade A first-pass-clean', () => {
    const s67 = SPRINTS.find((s) => s.sprintNumber === 67);
    expect(s67).toBeDefined();
    expect(s67?.grade).toBe('A first-pass-clean');
    expect(s67?.code).toBe('T-Phase-4.FAR-3');
  });

  it('FAR-CAP-16/17/18 are FULL', () => {
    ['FAR-CAP-16', 'FAR-CAP-17', 'FAR-CAP-18'].forEach((id) => {
      expect(FAR_CAPABILITIES.find((c) => c.id === id)?.state).toBe('full');
    });
  });
});
