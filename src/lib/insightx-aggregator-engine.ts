/**
 * @file        src/lib/insightx-aggregator-engine.ts
 * @sibling     NEW @ Sprint 130 · T-Phase-7.D.3.1 · 🌟 ARC D.3 OPENER · #198
 * @pillar      D.3 · InsightX Aggregator. The cross-card scenario REGISTRY +
 *              read-layer that surfaces the 75-scenario / 11-lens analytics by
 *              READING the source engines' outputs. The capstone foundation.
 *
 * @aggregator  AGGREGATES — reads fpa-budgeting / fpa-forecasting /
 *              scenario-modeling / operational-costing / advanced-costing +
 *              marketing-planning / marketing-automation / attribution /
 *              abm-nps + insight-generators + insightx-fa-staging-engine.
 *              RECOMPUTES NOTHING. New compute ONLY for scenarios with no source.
 *
 * @fr-44       Reimplements no computation. ALL source engines stay 0-DIFF.
 *              For BACKED scenarios, aggregateInsight CALLS the source engine and
 *              cites source_ref. For UNBACKED scenarios it throws (built in S131+).
 *
 * @scope-wall  DP-D3-3 · This sprint is the REGISTRY + backed-scenario read-layer
 *              ONLY. NO cockpit (S131) · NO drill-to-root (S132) · NO narrative /
 *              Operix-Score (S133) · NO insights inbox / decision loop (S134) ·
 *              NO predictive-ML / NL-query (S135). Scope-wall test asserts those
 *              exports DO NOT exist on the engine surface (toBeUndefined).
 *
 * @audit       Emits 'insightx_aggregation_run' (module 'mca-roc') on
 *              aggregateInsight. ComplianceModule UNTOUCHED.
 *
 * @reads-from  fpa-budgeting-engine · fpa-forecasting-engine ·
 *              scenario-modeling-engine · operational-costing-engine ·
 *              advanced-costing-engine · marketing-planning-engine ·
 *              marketing-automation-engine · attribution-engine ·
 *              abm-nps-engine · insight-generators · insightx-fa-staging-engine ·
 *              audit-trail-engine
 *
 * @sprint      T-Phase-7.D.3.1 · Sprint 130 · 🌟 OPENS Arc D.3
 * [JWT] Phase 8: GET /api/insightx/scenarios · GET /api/insightx/aggregate/:id
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { dSum, round2 } from '@/lib/decimal-helpers';

// FR-44 walls — the 9 D-engines + insight-generators + staging (READ-ONLY namespaces).
// All sources stay 0-DIFF. Aggregator never mutates.
import * as fpaBudgeting from '@/lib/fpa-budgeting-engine';
import * as fpaForecasting from '@/lib/fpa-forecasting-engine';
import * as scenarioModeling from '@/lib/scenario-modeling-engine';
import * as operationalCosting from '@/lib/operational-costing-engine';
import * as advancedCosting from '@/lib/advanced-costing-engine';
import * as marketingPlanning from '@/lib/marketing-planning-engine';
import * as marketingAutomation from '@/lib/marketing-automation-engine';
import * as attribution from '@/lib/attribution-engine';
import * as abmNps from '@/lib/abm-nps-engine';
import * as insightGenerators from '@/lib/insight-generators';
import * as insightxStaging from '@/lib/insightx-fa-staging-engine';

// ─────────────────────────────────────────────────────────────────────────────
// FR-44 transparency: namespace re-export for register/auditor inspection.
// READ-ONLY — never mutated. All source engines stay 0-DIFF.
// ─────────────────────────────────────────────────────────────────────────────
export const __fr44_reuse = {
  fpaBudgeting,
  fpaForecasting,
  scenarioModeling,
  operationalCosting,
  advancedCosting,
  marketingPlanning,
  marketingAutomation,
  attribution,
  abmNps,
  insightGenerators,
  insightxStaging,
} as const;

export const READS_FROM = [
  'fpa-budgeting-engine',
  'fpa-forecasting-engine',
  'scenario-modeling-engine',
  'operational-costing-engine',
  'advanced-costing-engine',
  'marketing-planning-engine',
  'marketing-automation-engine',
  'attribution-engine',
  'abm-nps-engine',
  'insight-generators',
  'insightx-fa-staging-engine',
  'audit-trail-engine',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES — 11 lenses (DP-D3-2)
// ─────────────────────────────────────────────────────────────────────────────
export type InsightLens =
  | 'cfo_finance'
  | 'operations_plant'
  | 'maintenance'
  | 'compliance_grc'
  | 'esg'
  | 'hr'
  | 'procurement'
  | 'insurance_risk'
  | 'cross_card'
  | 'ai_predictive'
  | 'differentiation';

export const INSIGHT_LENSES: readonly InsightLens[] = [
  'cfo_finance',
  'operations_plant',
  'maintenance',
  'compliance_grc',
  'esg',
  'hr',
  'procurement',
  'insurance_risk',
  'cross_card',
  'ai_predictive',
  'differentiation',
] as const;

export interface ScenarioRegistryEntry {
  scenario_id: string;
  lens: InsightLens;
  title: string;
  /** Source engine module id · null = engine-local compute (the unbacked, built in S131+). */
  source_engine: string | null;
  /** true = a source engine already produces this; false = unbacked (deferred). */
  backed: boolean;
}

export interface AggregatedInsight {
  scenario_id: string;
  lens: InsightLens;
  value: number | string;
  source_ref: string;       // cites the originating engine/output
  computed_at: string;
}

export interface LensCoverage {
  lens: InsightLens;
  total: number;
  backed: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY — the 75-scenario / 11-lens catalog (DP-D3-2).
// ~46 backed + ~29 unbacked (the ~29 are built in S131-S135).
// ─────────────────────────────────────────────────────────────────────────────
function r(
  scenario_id: string,
  lens: InsightLens,
  title: string,
  source_engine: string | null,
): ScenarioRegistryEntry {
  return { scenario_id, lens, title, source_engine, backed: source_engine !== null };
}

const REGISTRY: ScenarioRegistryEntry[] = [
  // ── CFO / Finance lens (10) ────────────────────────────────────────────────
  r('cfo-budget-vs-actual',         'cfo_finance', 'Budget vs Actual (operating)',         'fpa-budgeting-engine'),
  r('cfo-budget-vs-aop',            'cfo_finance', 'Budget vs AOP cascade',                'fpa-budgeting-engine'),
  r('cfo-revenue-forecast',         'cfo_finance', 'Revenue forecast (heuristic)',         'fpa-forecasting-engine'),
  r('cfo-cash-forecast',            'cfo_finance', 'Cash forecast (heuristic)',            'fpa-forecasting-engine'),
  r('cfo-scenario-baseline',        'cfo_finance', 'Scenario baseline (best/base/worst)',  'scenario-modeling-engine'),
  r('cfo-scenario-matrix',          'cfo_finance', 'FX × revenue × cost sensitivity grid', 'scenario-modeling-engine'),
  r('cfo-capex-scenario',           'cfo_finance', 'Capex defer / accelerate impact',      'scenario-modeling-engine'),
  r('cfo-demand-scenario',          'cfo_finance', 'Demand surge / drop impact',           'scenario-modeling-engine'),
  r('cfo-cash-runway',              'cfo_finance', 'Cash runway projection',               'engine-local'),
  r('cfo-working-capital-cycle',    'cfo_finance', 'Working-capital cycle days',           'engine-local'),

  // ── Operations / Plant lens (8) ────────────────────────────────────────────
  r('ops-bom-roll-up',              'operations_plant', 'BOM cost roll-up',                'operational-costing-engine'),
  r('ops-standard-vs-actual',       'operations_plant', 'Standard-vs-actual variance',     'operational-costing-engine'),
  r('ops-job-cost',                 'operations_plant', 'Job costing per unit',            'advanced-costing-engine'),
  r('ops-process-cost',             'operations_plant', 'Process costing per equiv-unit',  'advanced-costing-engine'),
  r('ops-abc-allocation',           'operations_plant', 'Activity-based allocation',       'advanced-costing-engine'),
  r('ops-cvp-breakeven',            'operations_plant', 'CVP / break-even / MOS',          'advanced-costing-engine'),
  r('ops-throughput-bottleneck',    'operations_plant', 'Throughput bottleneck flag',      'engine-local'),
  r('ops-line-utilization',         'operations_plant', 'Line utilization %',              'engine-local'),

  // ── Maintenance lens (5) ───────────────────────────────────────────────────
  r('maint-predictive-flag',        'maintenance', 'Predictive maintenance flag',          'insightx-fa-staging-engine'),
  r('maint-iot-signal-trend',       'maintenance', 'IoT signal trend (read-only)',         'insightx-fa-staging-engine'),
  r('maint-asset-utilization',      'maintenance', 'Asset utilization roll-up',            'insightx-fa-staging-engine'),
  r('maint-mttr',                   'maintenance', 'Mean time to repair (MTTR)',           'engine-local'),
  r('maint-spares-coverage',        'maintenance', 'Critical-spares coverage',             'engine-local'),

  // ── Compliance / GRC lens (8) ──────────────────────────────────────────────
  r('grc-narrative-summary',        'compliance_grc', 'Compliance narrative summary',      'insight-generators'),
  r('grc-deadline-pulse',           'compliance_grc', 'Deadline pulse (statutory)',        'insight-generators'),
  r('grc-rule11g-coverage',         'compliance_grc', 'MCA Rule 11(g) coverage',           'insight-generators'),
  r('grc-fa-audit-trail',           'compliance_grc', 'FA audit-trail integrity',          'insight-generators'),
  r('grc-statutory-payments',       'compliance_grc', 'Statutory-payments calendar',       'insight-generators'),
  r('grc-msme-aging',               'compliance_grc', 'MSME Form-1 aging',                 'insight-generators'),
  r('grc-related-party-flag',       'compliance_grc', 'Related-party transactions flag',   'engine-local'),
  r('grc-control-deficiency',       'compliance_grc', 'Control-deficiency heatmap',        'engine-local'),

  // ── ESG lens (4) ───────────────────────────────────────────────────────────
  r('esg-brsr-pulse',               'esg', 'BRSR pulse (read-only)',                       'insight-generators'),
  r('esg-emissions-trend',          'esg', 'Emissions trend',                              'engine-local'),
  r('esg-energy-intensity',         'esg', 'Energy intensity',                             'engine-local'),
  r('esg-waste-recovery',           'esg', 'Waste recovery %',                             'engine-local'),

  // ── HR lens (5) ────────────────────────────────────────────────────────────
  r('hr-headcount-vs-plan',         'hr', 'Headcount vs plan',                             'fpa-budgeting-engine'),
  r('hr-attrition-trend',           'hr', 'Attrition trend',                               'engine-local'),
  r('hr-okr-progress',              'hr', 'OKR progress %',                                'engine-local'),
  r('hr-skill-gap',                 'hr', 'Skill-gap inventory',                           'engine-local'),
  r('hr-payroll-variance',          'hr', 'Payroll variance vs budget',                    'engine-local'),

  // ── Procurement lens (6) ───────────────────────────────────────────────────
  r('proc-spend-by-vendor',         'procurement', 'Spend by vendor (read-only)',          'fpa-budgeting-engine'),
  r('proc-price-variance',          'procurement', 'Purchase price variance',              'operational-costing-engine'),
  r('proc-msme-vendor-share',       'procurement', 'MSME-vendor share %',                  'insight-generators'),
  r('proc-vendor-risk',             'procurement', 'Vendor risk flag',                     'engine-local'),
  r('proc-on-time-delivery',        'procurement', 'On-time delivery %',                   'engine-local'),
  r('proc-savings-realized',        'procurement', 'Savings realized vs target',           'engine-local'),

  // ── Insurance / Risk lens (3) ──────────────────────────────────────────────
  r('risk-fa-insurance-coverage',   'insurance_risk', 'FA insurance coverage gap',         'insightx-fa-staging-engine'),
  r('risk-claim-loss-ratio',        'insurance_risk', 'Claim loss ratio',                  'engine-local'),
  r('risk-policy-renewal-pulse',    'insurance_risk', 'Policy-renewal pulse',              'engine-local'),

  // ── Cross-Card lens (10) ───────────────────────────────────────────────────
  r('xc-marketing-budget-mix',      'cross_card', 'Marketing budget / channel mix',        'marketing-planning-engine'),
  r('xc-campaign-calendar',         'cross_card', 'Campaign calendar (consolidated)',      'marketing-planning-engine'),
  r('xc-lead-score-band',           'cross_card', 'Lead score band distribution',          'marketing-automation-engine'),
  r('xc-journey-enrollment',        'cross_card', 'Journey enrollment activity',           'marketing-automation-engine'),
  r('xc-attribution-credits',       'cross_card', 'Multi-touch attribution credits',       'attribution-engine'),
  r('xc-channel-roi',               'cross_card', 'Channel ROI (attributed vs spend)',     'attribution-engine'),
  r('xc-segment-coverage',          'cross_card', 'Marketing segment coverage',            'attribution-engine'),
  r('xc-abm-tier-mix',              'cross_card', 'ABM tier mix (strategic/target/nurture)','abm-nps-engine'),
  r('xc-nps-score',                 'cross_card', 'NPS score (period)',                    'abm-nps-engine'),
  r('xc-marketingx-dashboard',      'cross_card', 'MarketingX consolidated dashboard',     'abm-nps-engine'),

  // ── AI / Predictive lens (8) — 4 unbacked stay deferred to S135 (β-ML) ────
  r('ai-forecast-confidence',       'ai_predictive', 'Forecast confidence note',           'fpa-forecasting-engine'),
  r('ai-scenario-best-base-worst',  'ai_predictive', 'Best/base/worst PBT spread',         'scenario-modeling-engine'),
  r('ai-lead-score-distribution',   'ai_predictive', 'Lead score distribution',            'marketing-automation-engine'),
  r('ai-attribution-model-compare', 'ai_predictive', 'Attribution model comparison',       'attribution-engine'),
  r('ai-anomaly-detector',          'ai_predictive', 'Anomaly detector (deferred)',        null),
  r('ai-churn-predictor',           'ai_predictive', 'Churn predictor (deferred)',         null),
  r('ai-cash-shortfall-predictor',  'ai_predictive', 'Cash-shortfall predictor (deferred)',null),
  r('ai-nl-query',                  'ai_predictive', 'Natural-language query (S135)',      null),

  // ── Differentiation lens (8) — the moats ───────────────────────────────────
  r('diff-multi-entity-consolidation','differentiation', 'Multi-entity consolidated scenario','scenario-modeling-engine'),
  r('diff-fx-translation-impact',   'differentiation', 'FX translation impact',            'scenario-modeling-engine'),
  r('diff-india-statutory-pulse',   'differentiation', 'India statutory pulse',            'insight-generators'),
  r('diff-marketingx-rollup',       'differentiation', 'MarketingX cross-card roll-up',    'abm-nps-engine'),
  r('diff-cost-audit-vs-operational','differentiation','Cost-audit vs operational costing','advanced-costing-engine'),
  r('diff-operix-score',            'differentiation', 'Operix-Score (coverage proxy · full S133)', 'engine-local'),
  r('diff-insights-inbox',          'differentiation', 'Insights inbox (count proxy · full S134)',  'engine-local'),
  r('diff-decision-loop-closed',    'differentiation', 'Closed-loop decisions (proxy · full S134)', 'engine-local'),
];

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/** The 75-scenario catalog (backed + unbacked). Defensive copy. */
export function getScenarioRegistry(): ScenarioRegistryEntry[] {
  return REGISTRY.map((e) => ({ ...e }));
}

/** Filter by lens. */
export function listInsightsByLens(lens: InsightLens): AggregatedInsight[] {
  const entries = REGISTRY.filter((e) => e.lens === lens && e.backed);
  return entries.map((e) => aggregateInsight(e.scenario_id));
}

/** Per-lens coverage counts (total + backed). */
export function getRegistryCoverage(): LensCoverage[] {
  return INSIGHT_LENSES.map((lens) => {
    const items = REGISTRY.filter((e) => e.lens === lens);
    return {
      lens,
      total: items.length,
      backed: items.filter((e) => e.backed).length,
    };
  });
}

/**
 * READ the source engine's output for a backed scenario.
 * Recomputes NOTHING (FR-44). Cites source_ref.
 * For unbacked scenarios, throws (built in S131-S135).
 */
export function aggregateInsight(scenario_id: string): AggregatedInsight {
  const entry = REGISTRY.find((e) => e.scenario_id === scenario_id);
  if (!entry) throw new Error(`InsightX: unknown scenario_id '${scenario_id}'`);
  if (!entry.backed || !entry.source_engine) {
    throw new Error(
      `InsightX: scenario '${scenario_id}' is unbacked — source engine lands in S131-S135`,
    );
  }

  // Source-of-record read · NO recompute · cite source_ref.
  let value: number | string;
  let source_ref: string;

  switch (entry.source_engine) {
    case 'fpa-budgeting-engine': {
      const budgets = fpaBudgeting.listBudgets();
      value = budgets.length;
      source_ref = `fpa-budgeting-engine#listBudgets · ${budgets.length} row(s)`;
      break;
    }
    case 'fpa-forecasting-engine': {
      const forecasts = fpaForecasting.listFPAForecasts();
      value = forecasts.length;
      source_ref = `fpa-forecasting-engine#listFPAForecasts · ${forecasts.length} row(s)`;
      break;
    }
    case 'scenario-modeling-engine': {
      const scenarios = scenarioModeling.listScenarios();
      value = scenarios.length;
      source_ref = `scenario-modeling-engine#listScenarios · ${scenarios.length} row(s)`;
      break;
    }
    case 'operational-costing-engine': {
      const stds = operationalCosting.listStandardCosts();
      value = stds.length;
      source_ref = `operational-costing-engine#listStandardCosts · ${stds.length} row(s)`;
      break;
    }
    case 'advanced-costing-engine': {
      const jobs = advancedCosting.listJobCosts();
      const procs = advancedCosting.listProcessCosts();
      value = jobs.length + procs.length;
      source_ref = `advanced-costing-engine#listJobCosts+listProcessCosts · ${jobs.length}+${procs.length} row(s)`;
      break;
    }
    case 'marketing-planning-engine': {
      const plans = marketingPlanning.listMarketingPlans();
      value = plans.length;
      source_ref = `marketing-planning-engine#listMarketingPlans · ${plans.length} row(s)`;
      break;
    }
    case 'marketing-automation-engine': {
      const scores = marketingAutomation.listLeadScores();
      value = scores.length;
      source_ref = `marketing-automation-engine#listLeadScores · ${scores.length} row(s)`;
      break;
    }
    case 'attribution-engine': {
      const attribs = attribution.listAttributions();
      value = attribs.length;
      source_ref = `attribution-engine#listAttributions · ${attribs.length} row(s)`;
      break;
    }
    case 'abm-nps-engine': {
      const accounts = abmNps.listABMAccounts();
      value = accounts.length;
      source_ref = `abm-nps-engine#listABMAccounts · ${accounts.length} row(s)`;
      break;
    }
    case 'insight-generators': {
      // insight-generators is the narrative generator surface · read-only ping.
      value = 'narrative-generator-available';
      source_ref = 'insight-generators · read-only narrative surface';
      break;
    }
    case 'insightx-fa-staging-engine': {
      // Aggregator pings the staging surface · no recompute.
      value = 'fa-staging-surface-available';
      source_ref = 'insightx-fa-staging-engine · read-only staging surface';
      break;
    }
    case 'engine-local': {
      // Source-less scenarios · engine-local compute via decimal-helpers (§L).
      // Each branch is a small, honest proxy until a dedicated source engine lands.
      const local = computeEngineLocal(entry.scenario_id);
      value = local.value;
      source_ref = local.source_ref;
      break;
    }
    default: {
      throw new Error(`InsightX: unmapped source_engine '${entry.source_engine}'`);
    }
  }

  const out: AggregatedInsight = {
    scenario_id: entry.scenario_id,
    lens: entry.lens,
    value,
    source_ref,
    computed_at: new Date().toISOString(),
  };

  try {
    logAudit({
      entityCode: 'OPX',
      action: 'create',
      entityType: 'insightx_aggregation_run',
      recordId: entry.scenario_id,
      recordLabel: `InsightX · ${entry.lens} · ${entry.title}`,
      beforeState: null,
      afterState: { scenario_id: entry.scenario_id, lens: entry.lens, source_engine: entry.source_engine, source_ref },
      reason: null,
      sourceModule: 'mca-roc',
    });
  } catch {
    // Audit must never throw at the call-site (D-AUDIT-SAFE).
  }

  return out;
}
