/**
 * @file        src/lib/_institutional/_institutional-cross-ref.test.ts
 * @purpose     Cross-register integrity tests · catches drift between registers
 * @sprint      T-Phase-3.HK-D14-InstitutionalRegisters
 *
 * NOTE on capability scorecard: per Block A.6 directive, test expectations
 * are pinned to ACTUAL empirical state of capability-scorecard.ts data,
 * not the "26/28" narrative target. At HEAD the breakdown is 22 full ·
 * 2 partial · 4 absent. Reconciliation deferred to Sprint 61.HK.
 */
import { describe, it, expect } from 'vitest';
import { SIBLINGS, getSiblingCount } from './sibling-register';
import { MOATS, getMoatCount } from './moat-register';
import { CAPABILITIES, getCapabilityScore, getCapabilityScoreFullOnly } from './capability-scorecard';
import { SPRINTS, getSprintCount, getCurrentAStreak } from './sprint-history';
import { SUB_PORTALS, getSubPortalCount } from './sub-portal-registry';

describe('Institutional registers · cardinality', () => {
  it('SIBLINGS has 37 entries', () => {
    expect(getSiblingCount()).toBe(37);
  });

  it('MOATS has 36 entries', () => {
    expect(getMoatCount()).toBe(36);
  });

  it('CAPABILITIES has 28 entries', () => {
    expect(CAPABILITIES.length).toBe(28);
  });

  it('SPRINTS has 61 entries', () => {
    expect(getSprintCount()).toBe(61);
  });

  it('SUB_PORTALS has 3 entries', () => {
    expect(getSubPortalCount()).toBe(3);
  });
});

describe('Capability scorecard · post-Sprint-61 (CAP-25 + CAP-26 lit)', () => {
  it('getCapabilityScoreFullOnly returns 24/28 after Sprint 61 capability flip', () => {
    expect(getCapabilityScoreFullOnly()).toBe('24/28');
  });

  it('breakdown is 24 full · 2 partial · 2 absent · 28 total', () => {
    const score = getCapabilityScore();
    expect(score.full).toBe(24);
    expect(score.partial).toBe(2);
    expect(score.absent).toBe(2);
    expect(score.total).toBe(28);
  });
});

describe('Sprint history · A-streak counter', () => {
  it('current A-streak is 8 (Sprint 54-61 v2 era · NEW Operix record extended)', () => {
    expect(getCurrentAStreak()).toBe(8);
  });

  it('Sprint 61 is the most recent banked composite', () => {
    const latest = SPRINTS[SPRINTS.length - 1];
    expect(latest.sprintNumber).toBe(61);
    expect(latest.newSiblings.length).toBe(1);
    expect(latest.newSiblings[0]).toBe('demand-forecast-engine');
  });
});

describe('Cross-register integrity · CONFIRMED entries only', () => {
  it('every CONFIRMED SIBLING with moatsRealized references existing MOAT IDs', () => {
    const confirmedSiblings = SIBLINGS.filter((s) => s.provenance === 'CONFIRMED');
    const moatIds = new Set(MOATS.map((m) => m.id));
    for (const sib of confirmedSiblings) {
      for (const moatId of sib.moatsRealized) {
        expect(moatIds.has(moatId)).toBe(true);
      }
    }
  });

  it('every CONFIRMED Sprint with newSiblings references existing SIBLING IDs', () => {
    const confirmedSprints = SPRINTS.filter((s) => s.provenance === 'CONFIRMED');
    const sibIds = new Set(SIBLINGS.map((s) => s.id));
    for (const sp of confirmedSprints) {
      for (const sid of sp.newSiblings) {
        expect(sibIds.has(sid)).toBe(true);
      }
    }
  });

  it('every CONFIRMED MOAT with backingFiles has at least one valid path string', () => {
    const confirmed = MOATS.filter((m) => m.provenance === 'CONFIRMED');
    for (const moat of confirmed) {
      for (const f of moat.backingFiles) {
        expect(f.startsWith('src/')).toBe(true);
      }
    }
  });
});

describe('Sub-portal registry · D13 codification', () => {
  it('has all 3 expected sub-portals', () => {
    const ids = SUB_PORTALS.map((p) => p.id);
    expect(ids).toContain('vendor-portal-external');
    expect(ids).toContain('distributor-external');
    expect(ids).toContain('logistic-transporter');
  });
});
