/**
 * @file        src/lib/_institutional/_institutional-cross-ref.test.ts
 * @purpose     Cross-register integrity tests · updated for Sprint 62 PROD-4.5
 */
import { describe, it, expect } from 'vitest';
import { SIBLINGS, getSiblingCount } from './sibling-register';
import { MOATS, getMoatCount } from './moat-register';
import { CAPABILITIES, getCapabilityScore, getCapabilityScoreFullOnly } from './capability-scorecard';
import { SPRINTS, getSprintCount, getCurrentAStreak } from './sprint-history';
import { SUB_PORTALS, getSubPortalCount } from './sub-portal-registry';

describe('Institutional registers · cardinality', () => {
  it('SIBLINGS has 38 entries', () => {
    expect(getSiblingCount()).toBe(38);
  });

  it('MOATS has 37 entries', () => {
    expect(getMoatCount()).toBe(37);
  });

  it('CAPABILITIES has 28 entries', () => {
    expect(CAPABILITIES.length).toBe(28);
  });

  it('SPRINTS has 62 entries', () => {
    expect(getSprintCount()).toBe(62);
  });

  it('SUB_PORTALS has 3 entries', () => {
    expect(getSubPortalCount()).toBe(3);
  });
});

describe('Capability scorecard · post-Sprint-62 (CAP-22 + CAP-23 + CAP-28 lit)', () => {
  it('getCapabilityScoreFullOnly returns 27/28 after Sprint 62 capability flip', () => {
    expect(getCapabilityScoreFullOnly()).toBe('27/28');
  });

  it('breakdown is 27 full · 0 partial · 1 absent · 28 total', () => {
    const score = getCapabilityScore();
    expect(score.full).toBe(27);
    expect(score.partial).toBe(0);
    expect(score.absent).toBe(1);
    expect(score.total).toBe(28);
  });
});

describe('Sprint history · A-streak counter', () => {
  it('current A-streak is 9 (Sprint 54-62 v2 era · NEW Operix record extended)', () => {
    expect(getCurrentAStreak()).toBe(9);
  });

  it('Sprint 62 is the most recent banked sprint', () => {
    const latest = SPRINTS[SPRINTS.length - 1];
    expect(latest.sprintNumber).toBe(62);
    expect(latest.newSiblings.length).toBe(1);
    expect(latest.newSiblings[0]).toBe('cfr-part-11-engine');
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
