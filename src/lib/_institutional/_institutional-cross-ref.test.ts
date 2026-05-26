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
import { FAR_CAPABILITIES, getFARCapabilityCount, getFARCapabilityScoreSchemaStaged } from './far-extended-scorecard';
import { FK_CAPABILITIES, getFKCapabilityCount, getFKCapabilityScoreSchemaStaged } from './fk-extended-scorecard';

describe('Institutional registers · cardinality', () => {
  it('SIBLINGS has 42 entries', () => {
    expect(getSiblingCount()).toBe(42);
  });

  it('MOATS has 41 entries', () => {
    expect(getMoatCount()).toBe(41);
  });

  it('CAPABILITIES has 28 entries', () => {
    expect(CAPABILITIES.length).toBe(28);
  });

  it('SPRINTS has 65 entries', () => {
    expect(getSprintCount()).toBe(65);
  });

  it('SUB_PORTALS has 3 entries', () => {
    expect(getSubPortalCount()).toBe(3);
  });
});

describe('Capability scorecard · post-Sprint-65 (canonical 28/28 ⭐ FULL PRESERVED at Sprint 65 FAR-1)', () => {
  it('getCapabilityScoreFullOnly returns 28/28 · canonical untouched', () => {
    expect(getCapabilityScoreFullOnly()).toBe('28/28');
  });

  it('breakdown is 28 full · 0 partial · 0 absent · 28 total', () => {
    const score = getCapabilityScore();
    expect(score.full).toBe(28);
    expect(score.partial).toBe(0);
    expect(score.absent).toBe(0);
    expect(score.total).toBe(28);
  });
});

describe('FAR + FK extended scorecards · Sprint 65 FAR-1 (5 FAR-CAPs flipped to FULL)', () => {
  it('FAR_CAPABILITIES has 24 entries · 6 schema-staged retained', () => {
    expect(getFARCapabilityCount()).toBe(24);
    expect(getFARCapabilityScoreSchemaStaged()).toBe('6/24');
  });
  it('FK_CAPABILITIES has 8 entries · 4 schema-staged at Sprint 64', () => {
    expect(getFKCapabilityCount()).toBe(8);
    expect(getFKCapabilityScoreSchemaStaged()).toBe('4/8');
  });
  it('Combined score is 43/60 (schema-stage + full active)', () => {
    const canonical = CAPABILITIES.filter(c => c.state === 'full').length;
    const far = FAR_CAPABILITIES.filter(c => c.state === 'schema-staged' || c.state === 'full').length;
    const fk = FK_CAPABILITIES.filter(c => c.state === 'schema-staged' || c.state === 'full').length;
    expect(`${canonical + far + fk}/60`).toBe('43/60');
  });
});

describe('Sprint history · A-streak counter', () => {
  it('current A-streak is 12 (Sprint 54-65 v2 era · DOUBLE-DIGIT MILESTONE+2)', () => {
    expect(getCurrentAStreak()).toBe(12);
  });

  it('Sprint 65 FAR-1 is the most recent banked sprint · 3 new SIBLINGs', () => {
    const latest = SPRINTS[SPRINTS.length - 1];
    expect(latest.sprintNumber).toBe(65);
    expect(latest.code).toBe('T-Phase-4.FAR-1');
    expect(latest.newSiblings.length).toBe(3);
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
