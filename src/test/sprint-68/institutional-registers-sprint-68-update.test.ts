/**
 * Sprint 68 FAR-4 · Block 16 · Institutional Register Updates
 * Lesson 19 ID-lookup discipline · per Q-LOCK-12 A.
 */
import { describe, it, expect } from 'vitest';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { MOATS } from '@/lib/_institutional/moat-register';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { FAR_CAPABILITIES } from '@/lib/_institutional/far-extended-scorecard';
import { FK_CAPABILITIES } from '@/lib/_institutional/fk-extended-scorecard';

describe('Sprint 68 FAR-4 · Institutional Register Updates', () => {
  it('8 NEW SIBLINGs exist by ID', () => {
    [
      'ai-fa-classification-engine',
      'document-ai-fa-engine',
      'iot-asset-bridge',
      'rfid-asset-bridge',
      'predictive-maintenance-fa-engine',
      'brsr-fa-engine',
      'fa-audit-trail-engine',
      'insightx-fa-staging-engine',
    ].forEach((id) => {
      expect(SIBLINGS.find((s) => s.id === id), `missing SIBLING ${id}`).toBeDefined();
    });
  });

  it('MOAT-48/49/50/51/52 exist · sprintBanked 68', () => {
    ['MOAT-48', 'MOAT-49', 'MOAT-50', 'MOAT-51', 'MOAT-52'].forEach((id) => {
      const m = MOATS.find((x) => x.id === id);
      expect(m, `missing ${id}`).toBeDefined();
      expect(m?.sprintBanked).toBe(68);
    });
  });

  it('Sprint 68 entry exists · grade A first-pass-clean', () => {
    const s68 = SPRINTS.find((s) => s.sprintNumber === 68);
    expect(s68).toBeDefined();
    expect(s68?.grade).toBe('A first-pass-clean');
    expect(s68?.code).toBe('T-Phase-4.FAR-4');
  });

  it('A-streak advances to 15 (NEW RECORD)', () => {
    expect(getCurrentAStreak()).toBe(15);
  });

  it('FAR-CAP-19..24 are all FULL', () => {
    ['FAR-CAP-19','FAR-CAP-20','FAR-CAP-21','FAR-CAP-22','FAR-CAP-23','FAR-CAP-24'].forEach((id) => {
      expect(FAR_CAPABILITIES.find((c) => c.id === id)?.state, `${id} not full`).toBe('full');
    });
  });

  it('FK-CAP-7 is FULL (dashboard FA card lane)', () => {
    expect(FK_CAPABILITIES.find((c) => c.id === 'FK-CAP-7')?.state).toBe('full');
  });
});
