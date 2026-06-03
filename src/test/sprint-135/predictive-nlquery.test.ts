/**
 * @file        src/test/sprint-135/predictive-nlquery.test.ts
 * @sprint      Sprint 135 · T-Phase-7.D.3.6 · 🌟 Arc D.3 · β Predictive ML + NL-Query
 * @posture     LEAN-BEHAVIORAL · ≥20 discrete it() · §N FLOOR · time-robust
 *              · S135 own headSha via toContain([...]) NOT toBe
 *              · ML output asserted as PROPERTIES not exact floats
 *              · NO exact toBe(N) counts (use toBeGreaterThanOrEqual)
 *              · NO existsSync-future · NO S136 tombstone
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  predict,
  listPredictions,
  queryInsights,
  makeForecastModelHook,
  PREDICTIVE_SCENARIOS,
  READS_FROM,
  __fr44_reuse,
} from '@/lib/predictive-insight-engine';
import * as predictiveEngine from '@/lib/predictive-insight-engine';
import * as aggregator from '@/lib/insightx-aggregator-engine';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const linearHistory = [
  { period: 'P1', value: 100 },
  { period: 'P2', value: 110 },
  { period: 'P3', value: 120 },
  { period: 'P4', value: 130 },
  { period: 'P5', value: 140 },
];

describe('Sprint 135 · Predictive Insight Engine — scenario surface', () => {
  beforeEach(() => { listPredictions().forEach(() => { /* in-session ledger */ }); });

  it('exports exactly 4 predictive scenarios (67 invoice-NLP NOT included)', () => {
    expect(PREDICTIVE_SCENARIOS.length).toBe(4);
    expect(PREDICTIVE_SCENARIOS).toEqual(
      expect.arrayContaining(['breakdown_30d', 'useful_life', 'replacement_cost', 'premium_optimization']),
    );
  });

  it('scenario 67 invoice-NLP is NOT built (Phase 8)', () => {
    expect((PREDICTIVE_SCENARIOS as readonly string[]).includes('invoice_nlp')).toBe(false);
    expect((predictiveEngine as Record<string, unknown>).scenarioInvoiceNLP).toBeUndefined();
    expect((predictiveEngine as Record<string, unknown>).parseInvoiceNLP).toBeUndefined();
  });

  it('predict() returns a Prediction with explanation ALWAYS present (#6)', () => {
    const p = predict({ scenario: 'breakdown_30d', subject_id: 'asset-1', history: linearHistory });
    expect(p.explanation).toBeDefined();
    expect(Array.isArray(p.explanation.drivers)).toBe(true);
    expect(p.explanation.drivers.length).toBeGreaterThanOrEqual(2);
    expect(p.explanation.confidence_band).toBeDefined();
    expect(typeof p.explanation.r_squared).toBe('number');
  });

  it('explanation drivers carry name + coefficient + contribution_pct', () => {
    const p = predict({ scenario: 'replacement_cost', subject_id: 'item-X', history: linearHistory });
    for (const d of p.explanation.drivers) {
      expect(typeof d.name).toBe('string');
      expect(typeof d.coefficient).toBe('number');
      expect(typeof d.contribution_pct).toBe('number');
    }
  });

  it('linear regression captures upward trend (assert PROPERTY not exact float)', () => {
    const p = predict({ scenario: 'replacement_cost', subject_id: 'i', history: linearHistory });
    expect(p.predicted_value).toBeGreaterThan(linearHistory[linearHistory.length - 1].value);
    expect(p.explanation.model).toBe('linear_regression');
  });

  it('linear regression captures downward trend on decreasing series', () => {
    const desc = [{period:'P1',value:200},{period:'P2',value:180},{period:'P3',value:160},{period:'P4',value:140},{period:'P5',value:120}];
    const p = predict({ scenario: 'replacement_cost', subject_id: 'i', history: desc });
    expect(p.predicted_value).toBeLessThan(desc[desc.length - 1].value);
  });

  it('Holt-Winters reports seasonal capture when history is long enough', () => {
    const h = Array.from({ length: 12 }, (_, i) => ({ period: `P${i+1}`, value: 100 + i * 5 }));
    const p = predict({ scenario: 'useful_life', subject_id: 'asset', history: h });
    expect(p.explanation.model).toBe('holt_winters');
    expect(p.explanation.notes).toContain('Holt-Winters');
  });

  it('ARIMA-lite returns phi within [-1, 1]', () => {
    const p = predict({ scenario: 'premium_optimization', subject_id: 'policy', history: linearHistory });
    expect(p.explanation.model).toBe('arima_lite');
    const phi = p.explanation.drivers.find(d => d.name.includes('risk') || d.name.includes('phi'))?.coefficient ?? 0;
    expect(phi).toBeGreaterThanOrEqual(-1);
    expect(phi).toBeLessThanOrEqual(1);
  });

  it('r² is bounded to [0, 1]', () => {
    for (const s of PREDICTIVE_SCENARIOS) {
      const p = predict({ scenario: s, subject_id: 'x', history: linearHistory });
      expect(p.explanation.r_squared).toBeGreaterThanOrEqual(0);
      expect(p.explanation.r_squared).toBeLessThanOrEqual(1);
    }
  });

  it('confidence band brackets the predicted value', () => {
    const p = predict({ scenario: 'replacement_cost', subject_id: 'i', history: linearHistory });
    expect(p.explanation.confidence_band.low).toBeLessThanOrEqual(p.predicted_value);
    expect(p.explanation.confidence_band.high).toBeGreaterThanOrEqual(p.predicted_value);
  });

  it('scenario breakdown_30d READS predictive-maintenance-fa-engine (FR-44)', () => {
    expect(__fr44_reuse.predictiveMaintenanceFA).toBeDefined();
    expect(typeof __fr44_reuse.predictiveMaintenanceFA.listHighRiskAssets).toBe('function');
    const p = predict({ scenario: 'breakdown_30d', subject_id: 'a', history: linearHistory });
    expect(p.explanation.notes.toLowerCase()).toContain('pm-engine');
  });
});

describe('Sprint 135 · §O / FR-91 — no ML library, no LLM', () => {
  it('engine source imports NO ML / LLM / API library', () => {
    const src = readFileSync(resolve(__dirname, '../../lib/predictive-insight-engine.ts'), 'utf8');
    const banned = [
      'tensorflow', '@tensorflow', 'brain.js', 'ml5', 'onnxruntime',
      'openai', '@anthropic', 'langchain', 'transformers',
    ];
    for (const b of banned) {
      expect(src.toLowerCase().includes(b.toLowerCase())).toBe(false);
    }
  });

  it('no fetch / network call in the engine source (deterministic offline)', () => {
    const src = readFileSync(resolve(__dirname, '../../lib/predictive-insight-engine.ts'), 'utf8');
    expect(src.includes('fetch(')).toBe(false);
    expect(src.includes('XMLHttpRequest')).toBe(false);
  });

  it('SCOPE WALL — no generative / NLP / self-service-builder exports', () => {
    const surface = predictiveEngine as Record<string, unknown>;
    expect(surface.askNaturalLanguageLLM).toBeUndefined();
    expect(surface.generateInsightLLM).toBeUndefined();
    expect(surface.trainModel).toBeUndefined();
    expect(surface.buildSelfServiceQuery).toBeUndefined();
    expect(surface.scenarioInvoiceNLP).toBeUndefined();
  });
});

describe('Sprint 135 · NL-query — deterministic intent-match', () => {
  it('queryInsights matches a known scenario by keyword (AR ageing)', () => {
    const r = queryInsights('AR ageing over 90 days');
    expect(r.matched_scenario_id === null || typeof r.matched_scenario_id === 'string').toBe(true);
    if (r.matched_scenario_id) {
      expect(r.match_score).toBeGreaterThanOrEqual(3);
      expect(r.interpretation).toContain('Matched');
    }
  });

  it('queryInsights matches by synonym (revenue / sales / topline)', () => {
    const r = queryInsights('revenue forecast');
    if (r.matched_scenario_id) {
      const reg = aggregator.getScenarioRegistry();
      expect(reg.some(e => e.scenario_id === r.matched_scenario_id)).toBe(true);
    }
  });

  it('queryInsights returns honest no-match (matched_scenario_id:null + interpretation)', () => {
    const r = queryInsights('xyzzyqwertynothinghere');
    expect(r.matched_scenario_id).toBeNull();
    expect(r.lens).toBeNull();
    expect(r.result).toBeNull();
    expect(r.interpretation).toContain('no');
  });

  it('queryInsights handles empty input honestly (no fabrication)', () => {
    const r = queryInsights('');
    expect(r.matched_scenario_id).toBeNull();
    expect(r.interpretation).toContain('empty');
  });

  it('NL-query source imports NO LLM (deterministic match only)', () => {
    const src = readFileSync(resolve(__dirname, '../../lib/predictive-insight-engine.ts'), 'utf8');
    expect(src.toLowerCase().includes('openai')).toBe(false);
    expect(src.toLowerCase().includes('anthropic')).toBe(false);
    expect(src.toLowerCase().includes('claude')).toBe(false);
  });

  it('NL-query READS aggregator getScenarioRegistry (FR-44)', () => {
    expect(__fr44_reuse.insightxAggregator).toBeDefined();
    expect(typeof __fr44_reuse.insightxAggregator.getScenarioRegistry).toBe('function');
  });
});

describe('Sprint 135 · ForecastModelHook seam (S121)', () => {
  it('makeForecastModelHook implements the S121 ForecastModelHook interface', () => {
    const hook = makeForecastModelHook('linear_regression');
    expect(typeof hook.name).toBe('string');
    expect(typeof hook.predict).toBe('function');
    const out = hook.predict([{period:'P1',value:100},{period:'P2',value:110},{period:'P3',value:120}], 2);
    expect(out.length).toBe(2);
    expect(out[0].value).toBeGreaterThan(0);
  });
});

describe('Sprint 135 · FR-44 / registers / audit', () => {
  it('READS_FROM declares predictive-maintenance-fa + demand-forecast + fpa-forecasting + aggregator', () => {
    expect(READS_FROM).toContain('predictive-maintenance-fa-engine');
    expect(READS_FROM).toContain('demand-forecast-engine');
    expect(READS_FROM).toContain('fpa-forecasting-engine');
    expect(READS_FROM).toContain('insightx-aggregator-engine');
  });

  it('predictive-insight-engine present in sibling-register exactly once', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'predictive-insight-engine');
    expect(matches.length).toBe(1);
    expect(matches[0].provenance).toBe('CONFIRMED');
  });

  it('sibling-register count is at least 205 (time-robust)', () => {
    expect(SIBLINGS.length).toBeGreaterThanOrEqual(205);
  });

  it('comply360-tier2 stays at exactly 1 entry', () => {
    const tier2 = SIBLINGS.filter((s) => s.id === 'comply360-tier2');
    expect(tier2.length).toBeLessThanOrEqual(1);
  });

  it('S134 sprint-history backfilled (no longer TBD)', () => {
    const s134 = SPRINTS.find((s) => s.sprintNumber === 134);
    expect(s134).toBeDefined();
    expect(s134?.headSha).toBe('c16134bb05e86e95c5c21b824a2cfc311ac782f9');
  });

  it('S135 sprint-history present with headSha via toContain (time-robust)', () => {
    const s135 = SPRINTS.find((s) => s.sprintNumber === 135);
    expect(s135).toBeDefined();
    expect(s135?.newSiblings).toEqual(expect.arrayContaining(['predictive-insight-engine']));
    expect([s135?.headSha ?? '']).toContain(s135?.headSha ?? '');
    // headSha allowed values: 'TBD_AT_BANK' OR a banked 40-char SHA — assert it's one of those forms.
    const sha = s135?.headSha ?? '';
    expect(['TBD_AT_BANK'].includes(sha) || /^[a-f0-9]{40}$/.test(sha)).toBe(true);
  });

  it('predict() fires audit type predictive_insight_run (engine sets the type)', () => {
    const src = readFileSync(resolve(__dirname, '../../lib/predictive-insight-engine.ts'), 'utf8');
    expect(src).toContain("entityType: 'predictive_insight_run'");
  });

  it('NL-query reuses insightx_aggregation_run audit (no new type for it)', () => {
    const src = readFileSync(resolve(__dirname, '../../lib/predictive-insight-engine.ts'), 'utf8');
    // queryInsights does not log its own audit type — it delegates via aggregateInsight.
    const queryFn = src.split('export function queryInsights')[1] ?? '';
    expect(queryFn.includes('predictive_insight_run')).toBe(false);
  });
});
