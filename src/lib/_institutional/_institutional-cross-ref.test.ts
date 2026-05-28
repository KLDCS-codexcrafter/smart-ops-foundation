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

describe('Institutional registers · cardinality (post-Sprint-75 Comply360 Main Arc 1.7 · Q28 Part 1 · Extended GST Forms)', () => {
  it('SIBLINGS has 75 entries', () => {
    expect(getSiblingCount()).toBe(75);
  });

  it('MOATS has 52 entries', () => {
    expect(getMoatCount()).toBe(52);
  });

  it('CAPABILITIES has 28 entries', () => {
    expect(CAPABILITIES.length).toBe(28);
  });

  it('SPRINTS has 78 entries', () => {
    expect(getSprintCount()).toBe(78);
  });

  it('SUB_PORTALS has 3 entries', () => {
    expect(getSubPortalCount()).toBe(3);
  });
});

describe('Capability scorecard · canonical 28/28 ⭐ FULL PRESERVED', () => {
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

describe('FAR + FK extended scorecards · Sprint 68 FAR-4 (24 FAR-CAPs FULL · 7 FK-CAPs FULL · FAR Arc CLOSES 60/60)', () => {
  it('FAR_CAPABILITIES has 24 entries · 6 schema-staged retained', () => {
    expect(getFARCapabilityCount()).toBe(24);
    expect(getFARCapabilityScoreSchemaStaged()).toBe('6/24');
  });
  it('FK_CAPABILITIES has 8 entries · 1 schema-staged (FK-CAP-4 only)', () => {
    expect(getFKCapabilityCount()).toBe(8);
    expect(getFKCapabilityScoreSchemaStaged()).toBe('1/8');
  });
  it('Combined active is 60/60 ⭐ FAR Arc CLOSES', () => {
    const canonical = CAPABILITIES.filter(c => c.state === 'full').length;
    const far = FAR_CAPABILITIES.filter(c => c.state === 'schema-staged' || c.state === 'full').length;
    const fk = FK_CAPABILITIES.filter(c => c.state === 'schema-staged' || c.state === 'full').length;
    expect(`${canonical + far + fk}/60`).toBe('60/60');
  });
});

describe('Sprint history · A-streak counter', () => {
  // Lesson 24 historical-snapshot pattern · bounds-check not equality
  it('current A-streak is at least 25 (Sprint 54-75 · NEW Operix record ⭐)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(25);
  });

  it('Sprint 72 Comply360 Main Arc 1.4 is the most recent banked sprint · 4 new SIBLINGs (Lesson 24 id-lookup)', () => {
    // Lesson 24 · id-lookup not array-index (future sprints append; index drifts)
    const s72 = SPRINTS.find((s) => s.sprintNumber === 72 && s.code === 'T-Phase-5.A.1.4');
    expect(s72).toBeDefined();
    expect(s72?.newSiblings.length).toBe(4);
    // Sprint 70a (Pass A) entry still present · grade ratified to A-with-adaptations:
    const s70a = SPRINTS.find((s) => s.sprintNumber === 70 && s.code === 'T-Phase-5.A.1.2-PASS-A');
    expect(s70a?.grade).toBe('A with adaptations');
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
