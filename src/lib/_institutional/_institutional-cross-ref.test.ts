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
  it('SIBLINGS has 43 entries', () => {
    expect(getSiblingCount()).toBe(43);
  });

  it('MOATS has 44 entries', () => {
    expect(getMoatCount()).toBe(44);
  });

  it('CAPABILITIES has 28 entries', () => {
    expect(CAPABILITIES.length).toBe(28);
  });

  it('SPRINTS has 66 entries', () => {
    expect(getSprintCount()).toBe(66);
  });

  it('SUB_PORTALS has 3 entries', () => {
    expect(getSubPortalCount()).toBe(3);
  });
});

describe('Capability scorecard · post-Sprint-66 (canonical 28/28 ⭐ FULL PRESERVED at Sprint 66 FAR-2)', () => {
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

describe('FAR + FK extended scorecards · Sprint 66 FAR-2 (4 FAR-CAPs + 6 FK-CAPs flipped to FULL)', () => {
  it('FAR_CAPABILITIES has 24 entries · 6 schema-staged retained', () => {
    expect(getFARCapabilityCount()).toBe(24);
    expect(getFARCapabilityScoreSchemaStaged()).toBe('6/24');
  });
  it('FK_CAPABILITIES has 8 entries · 1 schema-staged · 6 full', () => {
    expect(getFKCapabilityCount()).toBe(8);
    expect(getFKCapabilityScoreSchemaStaged()).toBe('1/8');
  });
  it('Combined score is 50/60 (schema-stage + full active)', () => {
    const canonical = CAPABILITIES.filter(c => c.state === 'full').length;
    const far = FAR_CAPABILITIES.filter(c => c.state === 'schema-staged' || c.state === 'full').length;
    const fk = FK_CAPABILITIES.filter(c => c.state === 'schema-staged' || c.state === 'full').length;
    expect(`${canonical + far + fk}/60`).toBe('50/60');
  });
});

describe('Sprint history · A-streak counter', () => {
  it('current A-streak is 13 (Sprint 54-66 v2 era · DOUBLE-DIGIT MILESTONE+3 baker\'s-dozen)', () => {
    expect(getCurrentAStreak()).toBe(13);
  });

  it('Sprint 66 FAR-2 is the most recent banked sprint · 1 new SIBLING', () => {
    const latest = SPRINTS[SPRINTS.length - 1];
    expect(latest.sprintNumber).toBe(66);
    expect(latest.code).toBe('T-Phase-4.FAR-2');
    expect(latest.newSiblings.length).toBe(1);
    expect(latest.newSiblings[0]).toBe('vehicle-fa-bridge');
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
