/**
 * @file        src/test/sprint-121/fpa-forecasting.test.ts
 * @sprint      Sprint 121 · T-Phase-7.D.1.2 · Arc D.1 · FP&A Forecasting
 * @posture     LEAN-BEHAVIORAL (Phase 7 standard · §N FLOOR ≥20 discrete it()).
 *              Behavioral only — toBeGreaterThanOrEqual on counts, NO existsSync-future
 *              tombstones, NO "no S122 entry" absence checks. Scope-wall via
 *              toBeUndefined on the engine's own surface (time-robust).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  generateFPAForecast,
  getForecastVsBudget,
  listFPAForecasts,
  forecastMovingAverage,
  forecastLinearTrend,
  forecastSeasonal,
  FORECAST_METHODS,
  FORECAST_TARGETS,
  READS_FROM,
  __resetFPAForecastingForTests,
  type ForecastModelHook,
  type ForecastPoint,
} from '@/lib/fpa-forecasting-engine';
import * as fpaForecasting from '@/lib/fpa-forecasting-engine';
import * as groupConsolidation from '@/lib/group-consolidation-engine';
import * as demandForecast from '@/lib/demand-forecast-engine';
import * as fpaBudgeting from '@/lib/fpa-budgeting-engine';

import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ROOT = process.cwd();
const ENGINE_PATH = join(ROOT, 'src/lib/fpa-forecasting-engine.ts');
const PAGE_PATH = join(ROOT, 'src/features/forecasting/ForecastingPage.tsx');
const SIDEBAR_PATH = join(ROOT, 'src/apps/erp/configs/command-center-sidebar-config.ts');
const CC_PAGE_PATH = join(ROOT, 'src/features/command-center/pages/CommandCenterPage.tsx');
const AUDIT_TYPES_PATH = join(ROOT, 'src/types/audit-trail.ts');

const engineSrc = readFileSync(ENGINE_PATH, 'utf8');
const pageSrc = readFileSync(PAGE_PATH, 'utf8');
const sidebarSrc = readFileSync(SIDEBAR_PATH, 'utf8');
const ccPageSrc = readFileSync(CC_PAGE_PATH, 'utf8');
const auditSrc = readFileSync(AUDIT_TYPES_PATH, 'utf8');

beforeEach(() => {
  localStorage.clear();
  __resetFPAForecastingForTests();
  vi.restoreAllMocks();
});

// ─── §A · Surface, headers, honest-AI declaration ────────────────────────────
describe('§A · fpa-forecasting-engine · surface and honesty', () => {
  it('declares @pillar D.1 in the engine header', () => {
    expect(engineSrc).toMatch(/@pillar\s+D\.1/);
  });

  it('declares @fr-44 reuse contract', () => {
    expect(engineSrc).toMatch(/@fr-44/);
  });

  it('declares @no-ml honesty marker', () => {
    expect(engineSrc).toMatch(/@no-ml/);
  });

  it('exports READS_FROM with the three reused engines', () => {
    expect(READS_FROM.engines).toEqual(
      expect.arrayContaining([
        'demand-forecast-engine',
        'fpa-budgeting-engine',
        'group-consolidation-engine',
      ]),
    );
  });

  it('exposes the 3 heuristic methods (moving_average · linear_trend · seasonal)', () => {
    expect(FORECAST_METHODS).toEqual(['moving_average', 'linear_trend', 'seasonal']);
  });

  it('exposes the 3 forecast targets (revenue · cash · demand)', () => {
    expect(FORECAST_TARGETS).toEqual(['revenue', 'cash', 'demand']);
  });
});

// ─── §B · Heuristic math · decimal-helpers · explainable ─────────────────────
describe('§B · heuristic methods compute correctly', () => {
  const history: ForecastPoint[] = [
    { period: 'FY23-24', value: 100 },
    { period: 'FY24-25', value: 200 },
    { period: 'FY25-26', value: 300 },
  ];

  it('moving_average projects the rolling mean of recent values', () => {
    const out = forecastMovingAverage(history, 1);
    // mean(100, 200, 300) = 200
    expect(out.length).toBe(1);
    expect(out[0].value).toBe(200);
  });

  it('moving_average is decimal-safe (no float drift)', () => {
    const h: ForecastPoint[] = [
      { period: 'a', value: 0.1 },
      { period: 'b', value: 0.2 },
    ];
    const out = forecastMovingAverage(h, 1, 2);
    // (0.1 + 0.2) / 2 = 0.15 — not 0.150000…0001
    expect(out[0].value).toBe(0.15);
  });

  it('linear_trend recovers a perfect linear series (slope 100)', () => {
    const out = forecastLinearTrend(history, 2);
    // continuation: index 3 → 400, index 4 → 500
    expect(out[0].value).toBe(400);
    expect(out[1].value).toBe(500);
  });

  it('linear_trend handles a single history point by holding it flat', () => {
    const out = forecastLinearTrend([{ period: 'a', value: 42 }], 3);
    expect(out.every((p) => p.value === 42)).toBe(true);
  });

  it('seasonal projects via period-index (length 4 default)', () => {
    const h: ForecastPoint[] = [
      { period: 'Q1', value: 100 },
      { period: 'Q2', value: 200 },
      { period: 'Q3', value: 300 },
      { period: 'Q4', value: 400 },
    ];
    const out = forecastSeasonal(h, 4);
    // overall mean = 250; seasonal_index[k] = bucketMean/250
    // For perfectly-cyclic single-cycle history each bucket mean equals its only value.
    expect(out[0].value).toBe(100); // Q1 next cycle
    expect(out[3].value).toBe(400);
  });

  it('all 3 heuristics return an empty projection when horizon=0', () => {
    expect(forecastMovingAverage(history, 0)).toEqual([]);
    expect(forecastLinearTrend(history, 0)).toEqual([]);
    expect(forecastSeasonal(history, 0)).toEqual([]);
  });
});

// ─── §C · FR-44 wiring · history sourced from consolidated P&L / demand ──────
describe('§C · generateFPAForecast · CALLS source engines (FR-44)', () => {
  it('CALLS group-consolidation-engine.buildConsolidatedPnL for revenue history', () => {
    const spy = vi.spyOn(groupConsolidation, 'buildConsolidatedPnL').mockReturnValue({
      fy: 'FY25-26', revenue: 1000, cogs: 0, gross_profit: 1000, expenses: 0,
      operating_profit: 1000, other_income: 0, profit_before_tax: 1000, lines: [],
    });
    const f = generateFPAForecast({
      fy: 'FY26-27', target: 'revenue', method: 'moving_average',
      scope_id: 'GROUP', horizon: 1,
    });
    expect(spy).toHaveBeenCalled();
    // History becomes whatever the spy returns (revenue = 1000) for each prior FY.
    expect(f.history.length).toBeGreaterThanOrEqual(1);
    expect(f.history.every((p) => p.value === 1000)).toBe(true);
  });

  it('CALLS demand-forecast-engine.listForecasts for demand history', () => {
    const spy = vi.spyOn(demandForecast, 'listForecasts').mockReturnValue([]);
    generateFPAForecast({
      fy: 'FY26-27', target: 'demand', method: 'moving_average',
      scope_id: 'ENT-1', horizon: 1,
    });
    expect(spy).toHaveBeenCalledWith('ENT-1');
  });

  it('CALLS buildConsolidatedPnL for cash history (target=cash)', () => {
    const spy = vi.spyOn(groupConsolidation, 'buildConsolidatedPnL').mockReturnValue({
      fy: 'FY25-26', revenue: 0, cogs: 0, gross_profit: 0, expenses: 0,
      operating_profit: 0, other_income: 0, profit_before_tax: 500, lines: [],
    });
    const f = generateFPAForecast({
      fy: 'FY26-27', target: 'cash', method: 'moving_average',
      scope_id: 'GROUP', horizon: 1,
    });
    expect(spy).toHaveBeenCalled();
    // Cash proxy = profit_before_tax in this engine (decimal-safe pass-through)
    expect(f.history.every((p) => p.value === 500)).toBe(true);
  });
});

// ─── §D · ML SEAM (DP-D1-5) · default heuristic vs custom model ──────────────
describe('§D · ForecastModelHook ML-interface seam', () => {
  it('uses the named heuristic when no model is passed', () => {
    vi.spyOn(groupConsolidation, 'buildConsolidatedPnL').mockReturnValue({
      fy: 'FY25-26', revenue: 100, cogs: 0, gross_profit: 0, expenses: 0,
      operating_profit: 0, other_income: 0, profit_before_tax: 0, lines: [],
    });
    const f = generateFPAForecast({
      fy: 'FY26-27', target: 'revenue', method: 'moving_average',
      scope_id: 'GROUP', horizon: 1,
    });
    expect(f.projection.length).toBe(1);
    expect(f.confidence_note).toMatch(/heuristic/i);
    expect(f.confidence_note).not.toMatch(/Custom ML model/);
  });

  it('uses the custom model.predict when a ForecastModelHook is passed', () => {
    vi.spyOn(groupConsolidation, 'buildConsolidatedPnL').mockReturnValue({
      fy: 'FY25-26', revenue: 100, cogs: 0, gross_profit: 0, expenses: 0,
      operating_profit: 0, other_income: 0, profit_before_tax: 0, lines: [],
    });
    const calls: number[] = [];
    const model: ForecastModelHook = {
      name: 'test-arima',
      predict(_h, horizon) {
        calls.push(horizon);
        return Array.from({ length: horizon }, (_, i) => ({
          period: `M+${i + 1}`, value: 999,
        }));
      },
    };
    const f = generateFPAForecast({
      fy: 'FY26-27', target: 'revenue', method: 'moving_average',
      scope_id: 'GROUP', horizon: 2, model,
    });
    expect(calls).toEqual([2]);
    expect(f.projection.every((p) => p.value === 999)).toBe(true);
    expect(f.confidence_note).toMatch(/Custom ML model 'test-arima'/);
  });

  it('declares the ForecastModelHook interface in the engine source (the seam)', () => {
    expect(engineSrc).toMatch(/interface ForecastModelHook/);
    expect(engineSrc).toMatch(/predict\(history:.+horizon: number\)/);
  });
});

// ─── §E · confidence_note explains, doesn't hide ─────────────────────────────
describe('§E · confidence_note is explainable (not black-box)', () => {
  beforeEach(() => {
    vi.spyOn(groupConsolidation, 'buildConsolidatedPnL').mockReturnValue({
      fy: 'FY25-26', revenue: 10, cogs: 0, gross_profit: 0, expenses: 0,
      operating_profit: 0, other_income: 0, profit_before_tax: 0, lines: [],
    });
  });

  it('moving_average note names the method and a near-term assumption', () => {
    const f = generateFPAForecast({
      fy: 'FY26-27', target: 'revenue', method: 'moving_average',
      scope_id: 'GROUP', horizon: 1,
    });
    expect(f.confidence_note).toMatch(/moving average/i);
    expect(f.confidence_note).toMatch(/Not ML/);
  });

  it('linear_trend note names the slope/intercept method', () => {
    const f = generateFPAForecast({
      fy: 'FY26-27', target: 'revenue', method: 'linear_trend',
      scope_id: 'GROUP', horizon: 1,
    });
    expect(f.confidence_note).toMatch(/linear trend/i);
  });

  it('seasonal note names the cycle / period-length assumption', () => {
    const f = generateFPAForecast({
      fy: 'FY26-27', target: 'revenue', method: 'seasonal',
      scope_id: 'GROUP', horizon: 1,
    });
    expect(f.confidence_note).toMatch(/seasonal/i);
  });
});

// ─── §F · getForecastVsBudget · reads S120 budget baseline ───────────────────
describe('§F · getForecastVsBudget · FR-44 wiring into fpa-budgeting', () => {
  it('CALLS fpa-budgeting-engine.listBudgets with the requested fy + scope', () => {
    vi.spyOn(groupConsolidation, 'buildConsolidatedPnL').mockReturnValue({
      fy: 'FY25-26', revenue: 100, cogs: 0, gross_profit: 0, expenses: 0,
      operating_profit: 0, other_income: 0, profit_before_tax: 0, lines: [],
    });
    const spy = vi.spyOn(fpaBudgeting, 'listBudgets').mockReturnValue([]);
    generateFPAForecast({
      fy: 'FY26-27', target: 'revenue', method: 'moving_average',
      scope_id: 'GROUP', horizon: 1,
    });
    getForecastVsBudget({ fy: 'FY26-27', target: 'revenue', scope_id: 'GROUP' });
    expect(spy).toHaveBeenCalledWith({ fy: 'FY26-27', scope_id: 'GROUP' });
  });

  it('variance = forecast_total − budget_total (decimal-safe)', () => {
    vi.spyOn(groupConsolidation, 'buildConsolidatedPnL').mockReturnValue({
      fy: 'FY25-26', revenue: 100, cogs: 0, gross_profit: 0, expenses: 0,
      operating_profit: 0, other_income: 0, profit_before_tax: 0, lines: [],
    });
    vi.spyOn(fpaBudgeting, 'listBudgets').mockReturnValue([
      {
        budget_id: 'B1', fy: 'FY26-27', budget_type: 'operating',
        scope_level: 'entity', scope_id: 'GROUP', lines: [],
        total_budgeted: 90, total_actual: 0, total_variance: 0,
        created_at: '', updated_at: '',
      },
    ]);
    generateFPAForecast({
      fy: 'FY26-27', target: 'revenue', method: 'moving_average',
      scope_id: 'GROUP', horizon: 1,
    });
    // moving_average on flat history of 100 → projection 100 (total = 100)
    const r = getForecastVsBudget({ fy: 'FY26-27', target: 'revenue', scope_id: 'GROUP' });
    expect(r.forecast_total).toBe(100);
    expect(r.budget_total).toBe(90);
    expect(r.variance).toBe(10);
  });

  it('returns zeros when there is no matching forecast', () => {
    vi.spyOn(fpaBudgeting, 'listBudgets').mockReturnValue([]);
    const r = getForecastVsBudget({ fy: 'FY26-27', target: 'demand', scope_id: 'NONE' });
    expect(r.forecast_total).toBe(0);
    expect(r.budget_total).toBe(0);
    expect(r.variance).toBe(0);
  });
});

// ─── §G · Audit + listing + persistence ──────────────────────────────────────
describe('§G · forecast_event audit + listFPAForecasts', () => {
  it('AuditEntityType union includes "forecast_event" (mca-roc)', () => {
    expect(auditSrc).toMatch(/\|\s*'forecast_event'/);
  });

  it('engine logs via audit-trail-engine with entityType "forecast_event"', () => {
    expect(engineSrc).toMatch(/entityType:\s*'forecast_event'/);
  });

  it('generateFPAForecast persists the forecast (listFPAForecasts returns it)', () => {
    vi.spyOn(groupConsolidation, 'buildConsolidatedPnL').mockReturnValue({
      fy: 'FY25-26', revenue: 10, cogs: 0, gross_profit: 0, expenses: 0,
      operating_profit: 0, other_income: 0, profit_before_tax: 0, lines: [],
    });
    generateFPAForecast({
      fy: 'FY26-27', target: 'revenue', method: 'moving_average',
      scope_id: 'GROUP', horizon: 1,
    });
    expect(listFPAForecasts({ fy: 'FY26-27' }).length).toBeGreaterThanOrEqual(1);
  });
});

// ─── §H · Scope wall + no-ML import + FR-44 0-DIFF anchors ───────────────────
describe('§H · scope wall · no-ML · 0-DIFF source anchors', () => {
  it('SCOPE WALL: engine does NOT export scenario / costing functions', () => {
    const surface = fpaForecasting as unknown as Record<string, unknown>;
    expect(surface.simulateScenario).toBeUndefined();
    expect(surface.runScenario).toBeUndefined();
    expect(surface.computeCost).toBeUndefined();
    expect(surface.runDriver).toBeUndefined();
    expect(surface.activityBasedCost).toBeUndefined();
  });

  it('engine source does NOT import any known ML/AI runtime dependency (§O)', () => {
    expect(engineSrc).not.toMatch(/from\s+['"]@tensorflow/);
    expect(engineSrc).not.toMatch(/from\s+['"]onnxruntime/);
    expect(engineSrc).not.toMatch(/from\s+['"]openai['"]/);
    expect(engineSrc).not.toMatch(/from\s+['"]@huggingface/);
    expect(engineSrc).not.toMatch(/from\s+['"]brain\.js['"]/);
    expect(engineSrc).not.toMatch(/from\s+['"]ml-/);
    expect(engineSrc).not.toMatch(/from\s+['"]prophet/);
  });

  it('engine reuses demand-forecast-engine (listForecasts)', () => {
    expect(engineSrc).toMatch(/from '@\/lib\/demand-forecast-engine'/);
    expect(engineSrc).toMatch(/listForecasts/);
  });

  it('engine reuses fpa-budgeting-engine (listBudgets)', () => {
    expect(engineSrc).toMatch(/from '@\/lib\/fpa-budgeting-engine'/);
    expect(engineSrc).toMatch(/listBudgets/);
  });

  it('engine reuses group-consolidation-engine (buildConsolidatedPnL)', () => {
    expect(engineSrc).toMatch(/from '@\/lib\/group-consolidation-engine'/);
    expect(engineSrc).toMatch(/buildConsolidatedPnL/);
  });
});

// ─── §I · Page + sidebar + CC wiring ─────────────────────────────────────────
describe('§I · ForecastingPage wiring (Standalone Page #48)', () => {
  it('sidebar exposes the new fpa-planning-forecasting item under fpa-planning', () => {
    expect(sidebarSrc).toMatch(/fpa-planning-forecasting/);
    expect(sidebarSrc).toMatch(/requiredCards:\s*\['fpa-planning'\]/);
  });

  it('CommandCenterPage wires the fpa-planning-forecasting case to ForecastingPage', () => {
    expect(ccPageSrc).toMatch(/case 'fpa-planning-forecasting':\s*return <ForecastingPage \/>;/);
  });

  it('ForecastingPage reads the engine (no dead UI)', () => {
    expect(pageSrc).toMatch(/from '@\/lib\/fpa-forecasting-engine'/);
    expect(pageSrc).toMatch(/generateFPAForecast/);
    expect(pageSrc).toMatch(/getForecastVsBudget/);
  });
});

// ─── §J · Register + history (time-robust) ───────────────────────────────────
describe('§J · sibling-register + sprint-history (time-robust)', () => {
  it('sibling-register count is ≥ 190 and contains the new engine exactly once', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(190);
    const hits = SIBLINGS.filter((s) => s.id === 'fpa-forecasting-engine');
    expect(hits.length).toBe(1);
  });

  it('sibling-register: comply360-tier2-extensions-engine still appears exactly once', () => {
    const hits = SIBLINGS.filter((s) => s.id === 'comply360-tier2-extensions-engine');
    expect(hits.length).toBe(1);
  });

  it('sprint-history: S120 backfilled to the real HEAD; S121 carries TBD_AT_BANK', () => {
    const s120 = SPRINTS.find((s) => s.sprintNumber === 120);
    expect(s120?.headSha).toBe('749907701208bf70e6e1bedb3863b3b7b37b014f');
    const s121 = SPRINTS.find((s) => s.sprintNumber === 121);
    expect(s121?.headSha).toBe('TBD_AT_BANK');
    expect(s121?.newSiblings).toEqual(['fpa-forecasting-engine']);
    expect(s121?.predecessorSha).toBe('749907701208bf70e6e1bedb3863b3b7b37b014f');
  });
});
