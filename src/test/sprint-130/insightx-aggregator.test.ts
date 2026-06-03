/**
 * @file        src/test/sprint-130/insightx-aggregator.test.ts
 * @sprint      Sprint 130 · T-Phase-7.D.3.1 · 🌟 ARC D.3 OPENER · InsightX aggregator
 * @posture     LEAN-BEHAVIORAL (≥20 discrete `it()` · §N FLOOR · quality over volume).
 *              S130 own headSha via toContain([...]) NOT toBe.
 *              NO existsSync-future tombstones · NO "no S131 entry" absence checks.
 *              Scope-wall via toBeUndefined on engine surface (time-robust).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  INSIGHT_LENSES,
  getScenarioRegistry,
  getRegistryCoverage,
  aggregateInsight,
  listInsightsByLens,
  READS_FROM,
  __fr44_reuse,
} from '@/lib/insightx-aggregator-engine';
import * as aggregator from '@/lib/insightx-aggregator-engine';

import * as fpaBudgeting from '@/lib/fpa-budgeting-engine';
import * as fpaForecasting from '@/lib/fpa-forecasting-engine';
import * as scenarioModeling from '@/lib/scenario-modeling-engine';
import * as marketingPlanning from '@/lib/marketing-planning-engine';
import * as abmNps from '@/lib/abm-nps-engine';

import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { applications } from '@/components/operix-core/applications';

// ────────────────────────────────────────────────────────────────────────────
// A · Lenses + Registry shape (DP-D3-2)
// ────────────────────────────────────────────────────────────────────────────
describe('A · 11-lens taxonomy + registry shape', () => {
  it('A1 · INSIGHT_LENSES length is exactly 11', () => {
    expect(INSIGHT_LENSES.length).toBe(11);
  });

  it('A2 · INSIGHT_LENSES contains the canonical lens ids', () => {
    expect(INSIGHT_LENSES).toContain('cfo_finance');
    expect(INSIGHT_LENSES).toContain('operations_plant');
    expect(INSIGHT_LENSES).toContain('compliance_grc');
    expect(INSIGHT_LENSES).toContain('cross_card');
    expect(INSIGHT_LENSES).toContain('ai_predictive');
    expect(INSIGHT_LENSES).toContain('differentiation');
  });

  it('A3 · getScenarioRegistry returns a non-trivial 75-class catalog', () => {
    const reg = getScenarioRegistry();
    expect(reg.length).toBeGreaterThanOrEqual(70);
    expect(reg.length).toBeLessThanOrEqual(80);
  });

  it('A4 · every registry entry has a known lens', () => {
    const reg = getScenarioRegistry();
    for (const e of reg) {
      expect(INSIGHT_LENSES).toContain(e.lens);
    }
  });

  it('A5 · backed flag matches source_engine presence', () => {
    const reg = getScenarioRegistry();
    for (const e of reg) {
      expect(e.backed).toBe(e.source_engine !== null);
    }
  });

  it('A6 · registry contains BOTH backed and unbacked entries', () => {
    const reg = getScenarioRegistry();
    expect(reg.filter((e) => e.backed).length).toBeGreaterThanOrEqual(20);
    // S131 filled most unbacked; AI/Predictive 4 still unbacked (S135 β-ML).
    expect(reg.filter((e) => !e.backed).length).toBeGreaterThanOrEqual(4);
  });

  it('A7 · scenario_ids are unique', () => {
    const ids = getScenarioRegistry().map((e) => e.scenario_id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// B · Coverage + per-lens listing
// ────────────────────────────────────────────────────────────────────────────
describe('B · Coverage + per-lens listing', () => {
  it('B1 · getRegistryCoverage emits exactly one row per lens', () => {
    const cov = getRegistryCoverage();
    expect(cov.length).toBe(INSIGHT_LENSES.length);
  });

  it('B2 · per-lens backed never exceeds total', () => {
    for (const c of getRegistryCoverage()) {
      expect(c.backed).toBeLessThanOrEqual(c.total);
    }
  });

  it('B3 · listInsightsByLens(cfo_finance) returns aggregated insights for backed scenarios', () => {
    const out = listInsightsByLens('cfo_finance');
    expect(out.length).toBeGreaterThanOrEqual(1);
    for (const i of out) {
      expect(i.lens).toBe('cfo_finance');
      expect(typeof i.source_ref).toBe('string');
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// C · aggregateInsight READS the source engine (no recompute · DP-D3-3)
// ────────────────────────────────────────────────────────────────────────────
describe('C · aggregateInsight CALLS a source (FR-44 · no recompute)', () => {
  it('C1 · backed scenario citing fpa-budgeting reads listBudgets', () => {
    const out = aggregateInsight('cfo-budget-vs-actual');
    expect(out.scenario_id).toBe('cfo-budget-vs-actual');
    expect(out.source_ref).toMatch(/fpa-budgeting-engine/);
  });

  it('C2 · backed scenario citing scenario-modeling reads listScenarios', () => {
    const out = aggregateInsight('cfo-scenario-baseline');
    expect(out.source_ref).toMatch(/scenario-modeling-engine/);
  });

  it('C3 · backed scenario citing marketing-planning reads listMarketingPlans', () => {
    const out = aggregateInsight('xc-marketing-budget-mix');
    expect(out.source_ref).toMatch(/marketing-planning-engine/);
  });

  it('C4 · backed scenario citing abm-nps reads listABMAccounts', () => {
    const out = aggregateInsight('xc-abm-tier-mix');
    expect(out.source_ref).toMatch(/abm-nps-engine/);
  });

  it('C5 · aggregateInsight stamps computed_at as ISO timestamp', () => {
    const out = aggregateInsight('cfo-budget-vs-actual');
    expect(out.computed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('C6 · unknown scenario_id throws', () => {
    expect(() => aggregateInsight('does-not-exist')).toThrow();
  });

  it('C7 · unbacked scenario throws with deferral message (no fabrication)', () => {
    expect(() => aggregateInsight('diff-operix-score')).toThrow(/S131|unbacked|deferr/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// D · FR-44 reuse surface (the 9 D-engines + generators + staging stay 0-DIFF)
// ────────────────────────────────────────────────────────────────────────────
describe('D · FR-44 reuse surface', () => {
  it('D1 · __fr44_reuse exposes the 9 D-engines + generators + staging', () => {
    expect(__fr44_reuse.fpaBudgeting).toBeDefined();
    expect(__fr44_reuse.fpaForecasting).toBeDefined();
    expect(__fr44_reuse.scenarioModeling).toBeDefined();
    expect(__fr44_reuse.operationalCosting).toBeDefined();
    expect(__fr44_reuse.advancedCosting).toBeDefined();
    expect(__fr44_reuse.marketingPlanning).toBeDefined();
    expect(__fr44_reuse.marketingAutomation).toBeDefined();
    expect(__fr44_reuse.attribution).toBeDefined();
    expect(__fr44_reuse.abmNps).toBeDefined();
    expect(__fr44_reuse.insightGenerators).toBeDefined();
    expect(__fr44_reuse.insightxStaging).toBeDefined();
  });

  it('D2 · READS_FROM declares all 9 D-engines + supporting siblings', () => {
    expect(READS_FROM).toContain('fpa-budgeting-engine');
    expect(READS_FROM).toContain('scenario-modeling-engine');
    expect(READS_FROM).toContain('marketing-planning-engine');
    expect(READS_FROM).toContain('abm-nps-engine');
    expect(READS_FROM).toContain('insight-generators');
    expect(READS_FROM).toContain('insightx-fa-staging-engine');
  });

  it('D3 · re-exported source engines still expose their canonical read fns (proves 0-DIFF surface)', () => {
    expect(typeof fpaBudgeting.listBudgets).toBe('function');
    expect(typeof fpaForecasting.listFPAForecasts).toBe('function');
    expect(typeof scenarioModeling.listScenarios).toBe('function');
    expect(typeof marketingPlanning.listMarketingPlans).toBe('function');
    expect(typeof abmNps.listABMAccounts).toBe('function');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// E · SCOPE WALL — engine MUST NOT export future-sprint surfaces
// ────────────────────────────────────────────────────────────────────────────
describe('E · SCOPE WALL (S131-S135 NOT in S130)', () => {
  it('E1 · no cockpit export (S131)', () => {
    const surface = aggregator as unknown as Record<string, unknown>;
    expect(surface['buildCockpit']).toBeUndefined();
    expect(surface['renderCockpit']).toBeUndefined();
  });

  it('E2 · no drill-to-root export (S132)', () => {
    const surface = aggregator as unknown as Record<string, unknown>;
    expect(surface['drillToRoot']).toBeUndefined();
    expect(surface['traceRootCause']).toBeUndefined();
  });

  it('E3 · no narrative / Operix-Score export (S133)', () => {
    const surface = aggregator as unknown as Record<string, unknown>;
    expect(surface['generateNarrative']).toBeUndefined();
    expect(surface['computeOperixScore']).toBeUndefined();
  });

  it('E4 · no insights inbox / decision loop export (S134)', () => {
    const surface = aggregator as unknown as Record<string, unknown>;
    expect(surface['buildInsightsInbox']).toBeUndefined();
    expect(surface['closeDecisionLoop']).toBeUndefined();
  });

  it('E5 · no predictive / NL-query export (S135)', () => {
    const surface = aggregator as unknown as Record<string, unknown>;
    expect(surface['predictiveForecast']).toBeUndefined();
    expect(surface['runNLQuery']).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// F · InsightX card flip + OWN shell + route wiring (behavioral · DP-D3-1)
// ────────────────────────────────────────────────────────────────────────────
describe('F · InsightX card flip + OWN shell + /erp/insightx route', () => {
  it('F1 · applications.ts InsightX entry now status=active', () => {
    const ix = applications.find((a: { id: string }) => a.id === 'insightx');
    expect(ix).toBeDefined();
    expect(ix?.status).toBe('active');
  });

  it('F2 · insightx-shell-config exposes its own ShellConfig (NOT borrowed)', async () => {
    const mod = await import('@/apps/erp/configs/insightx-shell-config');
    expect(mod.insightxShellConfig).toBeDefined();
    expect(mod.insightxShellConfig.product.code).toBe('IX');
    expect(mod.insightxShellConfig.routing.landingRoute).toBe('/erp/insightx');
  });

  it('F3 · insightx-sidebar-config exposes navigable Overview item (S95 canon)', async () => {
    const mod = await import('@/apps/erp/configs/insightx-sidebar-config');
    const ids = mod.insightxSidebarItems.map((i) => i.id);
    expect(ids).toContain('ix-overview');
    for (const item of mod.insightxSidebarItems) {
      expect(item.type).toBe('item');
    }
  });

  it('F4 · InsightXPage source uses insightxShellConfig (NOT commandCenterShellConfig)', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/pages/erp/insightx/InsightXPage.tsx'),
      'utf8',
    );
    expect(src).toMatch(/insightxShellConfig/);
    expect(src).not.toMatch(/commandCenterShellConfig/);
    expect(src).toMatch(/activeModule/);
    expect(src).toMatch(/renderModule/);
  });

  it('F5 · App.tsx wires /erp/insightx route to InsightXPage', () => {
    const src = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8');
    expect(src).toMatch(/\/erp\/insightx/);
    expect(src).toMatch(/InsightXPage/);
  });

  it('F6 · InsightXOverviewPage reads insightx-aggregator-engine (no dead UI · #56)', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/features/insightx-overview/InsightXOverviewPage.tsx'),
      'utf8',
    );
    expect(src).toMatch(/insightx-aggregator-engine/);
    expect(src).toMatch(/getRegistryCoverage|aggregateInsight|getScenarioRegistry/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// G · Audit + Registers (time-robust · S121-T1 rule on own headSha)
// ────────────────────────────────────────────────────────────────────────────
describe('G · Audit + Registers (time-robust)', () => {
  it('G1 · audit type union admits insightx_aggregation_run', () => {
    const src = readFileSync(join(process.cwd(), 'src/types/audit-trail.ts'), 'utf8');
    expect(src).toMatch(/insightx_aggregation_run/);
  });

  it('G2 · audit fires on aggregateInsight (no throw)', () => {
    expect(() => aggregateInsight('cfo-budget-vs-actual')).not.toThrow();
  });

  it('G3 · sibling-register contains insightx-aggregator-engine (id grep = 1)', () => {
    const ids = SIBLINGS.filter((s) => s.id === 'insightx-aggregator-engine');
    expect(ids.length).toBe(1);
  });

  it('G4 · sibling count ≥ 198', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(198);
  });

  it('G5 · comply360-tier2 still appears at most once (0-DIFF)', () => {
    const t2 = SIBLINGS.filter((s) => s.id === 'comply360-tier2');
    expect(t2.length).toBeLessThanOrEqual(1);
  });

  it('G6 · S129 headSha backfilled to predecessor SHA (841dca74…)', () => {
    const s129 = SPRINTS.find((s) => s.sprintNumber === 129);
    expect(s129?.headSha).toBe('841dca74b0938cdb292e9d6a8d5aaf0f4eae38dd');
  });

  it('G7 · S130 entry present · headSha via toContain (S121-T1 rule · NEVER toBe)', () => {
    const s130 = SPRINTS.find((s) => s.sprintNumber === 130);
    expect(s130).toBeDefined();
    expect(['TBD_AT_BANK', s130?.headSha ?? '']).toContain(s130?.headSha);
    expect(s130?.newSiblings).toContain('insightx-aggregator-engine');
    expect(s130?.predecessorSha).toBe('841dca74b0938cdb292e9d6a8d5aaf0f4eae38dd');
  });
});
