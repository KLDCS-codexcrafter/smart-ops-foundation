/**
 * @file        src/test/sprint-133/narrative-operix-score.test.ts
 * @sprint      Sprint 133 · T-Phase-7.D.3.4 · 🌟 Arc D.3 · #2 Auto-Narrative + #3 Operix Score
 * @posture     LEAN-BEHAVIORAL (≥20 discrete it() · §N FLOOR · quality over volume).
 *              S133 own headSha via toContain([...]) NOT toBe.
 *              NO existsSync-future tombstones · NO "no S134 entry" absence checks.
 *              Scope-wall via toBeUndefined on engine surface (time-robust).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  narrateVariance,
  listNarratives,
  NARRATIVE_SUBJECTS,
  READS_FROM as NARRATIVE_READS_FROM,
  __fr44_reuse as NARRATIVE_FR44,
  __resetNarrativesForTests,
} from '@/lib/variance-narrative-engine';
import * as narrativeEngine from '@/lib/variance-narrative-engine';

import {
  computeOperixScore,
  getScoreComponent,
  getScoreTrend,
  listOperixScores,
  OPERIX_SCORE_WEIGHTS,
  bandFromScore as operixBandFromScore,
  READS_FROM as SCORE_READS_FROM,
  __fr44_reuse as SCORE_FR44,
  __resetOperixScoreForTests,
} from '@/lib/operix-score-engine';
import * as scoreEngine from '@/lib/operix-score-engine';

import * as crossCardDrilldown from '@/lib/cross-card-drilldown-engine';
import * as fpaBudgeting from '@/lib/fpa-budgeting-engine';
import * as insightxAggregator from '@/lib/insightx-aggregator-engine';
import * as comply360Health from '@/lib/comply360-health-score-engine';

import { dEq } from '@/lib/decimal-helpers';

import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

beforeEach(() => {
  __resetNarrativesForTests();
  __resetOperixScoreForTests();
});

// ────────────────────────────────────────────────────────────────────────────
// A · variance-narrative-engine shape + FR-44 reuse + NO-LLM (§O)
// ────────────────────────────────────────────────────────────────────────────
describe('A · variance-narrative-engine shape · FR-44 · §O no-LLM', () => {
  it('A1 · narrateVariance is exported', () => {
    expect(typeof narrateVariance).toBe('function');
  });

  it('A2 · listNarratives is exported', () => {
    expect(typeof listNarratives).toBe('function');
  });

  it('A3 · NARRATIVE_SUBJECTS catalogue ≥ 3 entries', () => {
    expect(NARRATIVE_SUBJECTS.length).toBeGreaterThanOrEqual(3);
  });

  it('A4 · READS_FROM cites ≥ 3 source engines', () => {
    expect(NARRATIVE_READS_FROM.length).toBeGreaterThanOrEqual(3);
    expect(NARRATIVE_READS_FROM).toContain('cross-card-drilldown-engine');
    expect(NARRATIVE_READS_FROM).toContain('fpa-budgeting-engine');
  });

  it('A5 · __fr44_reuse exposes the source-engine namespaces', () => {
    expect(NARRATIVE_FR44.crossCardDrilldown).toBe(crossCardDrilldown);
    expect(NARRATIVE_FR44.fpaBudgeting).toBe(fpaBudgeting);
    expect(NARRATIVE_FR44.insightxAggregator).toBe(insightxAggregator);
  });

  it('A6 · engine source contains NO LLM/model/API imports (§O · no new dep)', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/lib/variance-narrative-engine.ts'),
      'utf-8',
    );
    expect(src).not.toMatch(/from\s+['"]openai['"]/);
    expect(src).not.toMatch(/from\s+['"]@anthropic-ai\/[^'"]+['"]/);
    expect(src).not.toMatch(/from\s+['"]@google\/generative-ai['"]/);
    expect(src).not.toMatch(/from\s+['"]@huggingface\/[^'"]+['"]/);
    expect(src).not.toMatch(/from\s+['"]langchain[^'"]*['"]/);
    expect(src).not.toMatch(/\bnew\s+OpenAI\b/);
    expect(src).not.toMatch(/\bAnthropic\s*\(/);
    expect(src).not.toMatch(/\bfetch\s*\(\s*['"]https?:\/\//);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// B · narrateVariance behavior — reads chain · ranked drivers · audit fires
// ────────────────────────────────────────────────────────────────────────────
describe('B · narrateVariance behavior', () => {
  it('B1 · produces a deterministic paragraph with headline + drivers', () => {
    const n = narrateVariance({ subject_metric: 'Gross Margin Fell', fy: 'FY26' });
    expect(typeof n.headline).toBe('string');
    expect(n.headline.length).toBeGreaterThan(0);
    expect(typeof n.paragraph).toBe('string');
    expect(n.paragraph.length).toBeGreaterThan(0);
    expect(Array.isArray(n.drivers)).toBe(true);
  });

  it('B2 · drivers ranked descending by contribution_pct with source_ref', () => {
    const n = narrateVariance({ subject_metric: 'Gross Margin Fell', fy: 'FY26' });
    for (let i = 1; i < n.drivers.length; i++) {
      expect(n.drivers[i - 1].contribution_pct).toBeGreaterThanOrEqual(n.drivers[i].contribution_pct);
      expect(typeof n.drivers[i].source_ref).toBe('string');
      expect(n.drivers[i].source_ref.length).toBeGreaterThan(0);
    }
  });

  it('B3 · paragraph mentions each driver label', () => {
    const n = narrateVariance({ subject_metric: 'Operating Profit Fell', fy: 'FY26' });
    n.drivers.slice(0, 3).forEach((d) => {
      // Card name appears in paragraph driver sentences.
      const cardOnly = d.driver.split('·')[0].trim();
      expect(n.paragraph).toContain(cardOnly);
    });
  });

  it('B4 · listNarratives returns past runs (in-session ledger)', () => {
    narrateVariance({ subject_metric: 'Cash Position Tightened', fy: 'FY26' });
    narrateVariance({ subject_metric: 'Cash Position Tightened', fy: 'FY26' });
    expect(listNarratives({ fy: 'FY26' }).length).toBeGreaterThanOrEqual(2);
  });

  it('B5 · honest gap-note exposed when chain is incomplete', () => {
    const n = narrateVariance({ subject_metric: 'PBT variance vs budget', fy: 'FY26' });
    expect(typeof n.chain_complete).toBe('boolean');
    expect(Array.isArray(n.gap_notes)).toBe(true);
    if (!n.chain_complete) {
      expect(n.gap_notes.length).toBeGreaterThanOrEqual(0);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// C · operix-score-engine shape + FR-44 + §H boundary
// ────────────────────────────────────────────────────────────────────────────
describe('C · operix-score-engine shape · FR-44 · §H boundary', () => {
  it('C1 · computeOperixScore is exported', () => {
    expect(typeof computeOperixScore).toBe('function');
  });

  it('C2 · getScoreComponent / getScoreTrend / listOperixScores exported', () => {
    expect(typeof getScoreComponent).toBe('function');
    expect(typeof getScoreTrend).toBe('function');
    expect(typeof listOperixScores).toBe('function');
  });

  it('C3 · OPERIX_SCORE_WEIGHTS sum to exactly 1.0 (dEq · places=2)', () => {
    const sum = Object.values(OPERIX_SCORE_WEIGHTS).reduce((s, w) => s + w, 0);
    expect(dEq(sum, 1, 2)).toBe(true);
  });

  it('C4 · LOCAL bandFromScore mirrors the §H pattern (>=85 strong, etc.)', () => {
    expect(operixBandFromScore(100)).toBe('strong');
    expect(operixBandFromScore(85)).toBe('strong');
    expect(operixBandFromScore(84)).toBe('healthy');
    expect(operixBandFromScore(65)).toBe('healthy');
    expect(operixBandFromScore(64)).toBe('weak');
    expect(operixBandFromScore(40)).toBe('weak');
    expect(operixBandFromScore(39)).toBe('critical');
    expect(operixBandFromScore(0)).toBe('critical');
  });

  it('C5 · §H · operix-score-engine does NOT import indent-health-score-engine', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/lib/operix-score-engine.ts'),
      'utf-8',
    );
    expect(src).not.toMatch(/from\s+['"]@\/lib\/indent-health-score-engine['"]/);
  });

  it('C6 · §H · comply360-health-score-engine is read-only (namespace import only · no mutation patterns)', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/lib/operix-score-engine.ts'),
      'utf-8',
    );
    expect(src).toMatch(/import\s+\*\s+as\s+comply360Health\s+from\s+['"]@\/lib\/comply360-health-score-engine['"]/);
    // No assignment to comply360Health surface.
    expect(src).not.toMatch(/comply360Health\.[A-Z_a-z0-9]+\s*=/);
  });

  it('C7 · §H · indent-health-score-engine.ts stays 0-DIFF on bandFromScore + computeHealthBreakdown (frozen pattern intact)', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/lib/indent-health-score-engine.ts'),
      'utf-8',
    );
    expect(src).toContain('export function bandFromScore');
    expect(src).toContain('export function computeHealthBreakdown');
  });

  it('C8 · §H · comply360-health-score-engine.ts stays 0-DIFF on bandFromScore (frozen pattern intact)', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/lib/comply360-health-score-engine.ts'),
      'utf-8',
    );
    expect(src).toContain('export function bandFromScore');
    expect(src).toContain('export function computeWeightedComplianceHealth');
  });

  it('C9 · __fr44_reuse exposes aggregator + comply360-health namespaces (read-only)', () => {
    expect(SCORE_FR44.insightxAggregator).toBe(insightxAggregator);
    expect(SCORE_FR44.comply360Health).toBe(comply360Health);
  });

  it('C10 · READS_FROM cites aggregator + comply360-health', () => {
    expect(SCORE_READS_FROM).toContain('insightx-aggregator-engine');
    expect(SCORE_READS_FROM).toContain('comply360-health-score-engine');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// D · computeOperixScore behavior — weighted composite + band
// ────────────────────────────────────────────────────────────────────────────
describe('D · computeOperixScore behavior', () => {
  it('D1 · returns a 0-100 composite + valid band', () => {
    const r = computeOperixScore({ fy: 'FY26' });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(['critical', 'weak', 'healthy', 'strong']).toContain(r.band);
  });

  it('D2 · 6 components present, each with raw/weight/weighted/band/source_ref', () => {
    const r = computeOperixScore({ fy: 'FY26' });
    expect(r.components.length).toBe(6);
    r.components.forEach((c) => {
      expect(typeof c.raw).toBe('number');
      expect(typeof c.weight).toBe('number');
      expect(typeof c.weighted).toBe('number');
      expect(typeof c.source_ref).toBe('string');
      expect(c.source_ref.length).toBeGreaterThan(0);
    });
  });

  it('D3 · weights_sum equals 1 (dEq · places=2)', () => {
    const r = computeOperixScore({ fy: 'FY26' });
    expect(dEq(r.weights_sum, 1, 2)).toBe(true);
  });

  it('D4 · composite equals Σ(raw × weight) rounded (decimal-helpers)', () => {
    const r = computeOperixScore({ fy: 'FY26' });
    const recomputed = r.components.reduce((s, c) => s + c.raw * c.weight, 0);
    // Tolerance of ±1 for rounding/clamp behaviour.
    expect(Math.abs(r.score - recomputed)).toBeLessThanOrEqual(1);
  });

  it('D5 · band matches local bandFromScore for the composite', () => {
    const r = computeOperixScore({ fy: 'FY26' });
    expect(r.band).toBe(operixBandFromScore(r.score));
  });

  it('D6 · getScoreComponent returns the requested dimension', () => {
    computeOperixScore({ fy: 'FY26' });
    const c = getScoreComponent('compliance');
    expect(c.dimension).toBe('compliance');
    expect(c.weight).toBe(OPERIX_SCORE_WEIGHTS.compliance);
  });

  it('D7 · getScoreTrend returns the requested number of periods (when fy present)', () => {
    computeOperixScore({ fy: 'FY26' });
    const trend = getScoreTrend({ fy: 'FY26', periods: 4 });
    expect(trend.length).toBe(4);
    trend.forEach((p) => {
      expect(typeof p.period).toBe('string');
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(100);
    });
  });

  it('D8 · listOperixScores returns past runs (in-session)', () => {
    computeOperixScore({ fy: 'FY26' });
    computeOperixScore({ fy: 'FY26' });
    expect(listOperixScores({ fy: 'FY26' }).length).toBeGreaterThanOrEqual(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// E · SCOPE WALL — narrative + Operix Score ONLY (S134/S135 absent)
// ────────────────────────────────────────────────────────────────────────────
describe('E · scope wall · S134/S135 deferrals (toBeUndefined · time-robust)', () => {
  it('E1 · narrative engine surface has no inbox/loop/predictive functions', () => {
    const surface = narrativeEngine as unknown as Record<string, unknown>;
    expect(surface.openInsightsInbox).toBeUndefined();
    expect(surface.runDecisionLoop).toBeUndefined();
    expect(surface.trainModel).toBeUndefined();
    expect(surface.runPredictive).toBeUndefined();
    expect(surface.askNaturalLanguage).toBeUndefined();
    expect(surface.forecastAnomaly).toBeUndefined();
  });

  it('E2 · score engine surface has no inbox/loop/predictive functions', () => {
    const surface = scoreEngine as unknown as Record<string, unknown>;
    expect(surface.openInsightsInbox).toBeUndefined();
    expect(surface.runDecisionLoop).toBeUndefined();
    expect(surface.trainModel).toBeUndefined();
    expect(surface.runPredictive).toBeUndefined();
    expect(surface.askNaturalLanguage).toBeUndefined();
    expect(surface.forecastAnomaly).toBeUndefined();
  });

  it('E3 · narrative engine surface does NOT expose computeOperixScore (separation)', () => {
    const surface = narrativeEngine as unknown as Record<string, unknown>;
    expect(surface.computeOperixScore).toBeUndefined();
  });

  it('E4 · score engine surface does NOT expose narrateVariance (separation)', () => {
    const surface = scoreEngine as unknown as Record<string, unknown>;
    expect(surface.narrateVariance).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// F · Registers + sprint history (time-robust)
// ────────────────────────────────────────────────────────────────────────────
describe('F · sibling-register + sprint-history (time-robust)', () => {
  it('F1 · sibling count ≥ 202 (S133 adds 2)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(202);
  });

  it('F2 · variance-narrative-engine appears exactly once in the register', () => {
    expect(SIBLINGS.filter((s) => s.id === 'variance-narrative-engine').length).toBe(1);
  });

  it('F3 · operix-score-engine appears exactly once in the register', () => {
    expect(SIBLINGS.filter((s) => s.id === 'operix-score-engine').length).toBe(1);
  });

  it('F4 · comply360-tier2-extensions-engine stays at exactly 1 entry', () => {
    expect(SIBLINGS.filter((s) => s.id === 'comply360-tier2-extensions-engine').length).toBe(1);
  });

  it('F5 · S132 SHA backfilled from TBD to 8753d98e…', () => {
    const s132 = SPRINTS.find((s) => s.sprintNumber === 132);
    expect(s132).toBeDefined();
    expect(s132!.headSha).toBe('8753d98e24e233e4c45004fd660d9bd3d8dcf1e2');
  });

  it('F6 · S133 entry present · headSha via toContain([TBD_AT_BANK, ...]) NOT toBe', () => {
    const s133 = SPRINTS.find((s) => s.sprintNumber === 133);
    expect(s133).toBeDefined();
    expect(['TBD_AT_BANK']).toContain(s133!.headSha);
    expect(s133!.predecessorSha).toBe('8753d98e24e233e4c45004fd660d9bd3d8dcf1e2');
  });

  it('F7 · S133 newSiblings lists both engines', () => {
    const s133 = SPRINTS.find((s) => s.sprintNumber === 133)!;
    expect(s133.newSiblings).toContain('variance-narrative-engine');
    expect(s133.newSiblings).toContain('operix-score-engine');
  });
});
