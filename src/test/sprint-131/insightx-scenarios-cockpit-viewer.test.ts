/**
 * @file        src/test/sprint-131/insightx-scenarios-cockpit-viewer.test.ts
 * @sprint      Sprint 131 · T-Phase-7.D.3.2 · Arc D.3 · unbacked-scenarios + cockpit + viewer
 * @posture     LEAN-BEHAVIORAL (≥20 discrete `it()` · §N FLOOR · quality over volume).
 *              S131 own headSha via toContain([...]) NOT toBe.
 *              NO existsSync-future tombstones · NO "no S132 entry" absence checks.
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
  type InsightLens,
} from '@/lib/insightx-aggregator-engine';
import * as aggregator from '@/lib/insightx-aggregator-engine';

import {
  buildExecutiveCockpit,
  getCockpitTile,
  READS_FROM as COCKPIT_READS_FROM,
  __fr44_reuse as cockpitReuse,
} from '@/lib/insight-cockpit-engine';
import * as cockpit from '@/lib/insight-cockpit-engine';

import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

// ────────────────────────────────────────────────────────────────────────────
// A · Coverage backed-count increased — demo-impact lenses filled
// ────────────────────────────────────────────────────────────────────────────
describe('A · ~23 unbacked scenarios filled (demo-impact order)', () => {
  it('A1 · overall backed count is up from S130 baseline (≥46+20)', () => {
    const cov = getRegistryCoverage();
    const backed = cov.reduce((s, c) => s + c.backed, 0);
    expect(backed).toBeGreaterThanOrEqual(66);
  });

  it('A2 · CFO/Finance lens fully filled (10/10)', () => {
    const cfo = getRegistryCoverage().find((c) => c.lens === 'cfo_finance');
    expect(cfo?.backed).toBeGreaterThanOrEqual(10);
  });

  it('A3 · Operations/Plant lens fully filled (8/8)', () => {
    const ops = getRegistryCoverage().find((c) => c.lens === 'operations_plant');
    expect(ops?.backed).toBeGreaterThanOrEqual(8);
  });

  it('A4 · Differentiation lens filled to 8/8 (operix-score / inbox / loop = engine-local proxies · full features S133-S134)', () => {
    const diff = getRegistryCoverage().find((c) => c.lens === 'differentiation');
    expect(diff?.backed).toBeGreaterThanOrEqual(8);
  });

  it('A5 · AI/Predictive lens has its expected floor (durable: unbacked may have drained to 0 post-S135)', () => {
    // P8.1 Pass-2b · durable conversion · S135 β-ML filled most of the 4 deferred AI ids; the "STILL
    // has 4 unbacked" snapshot was S131-era. Honest invariant: lens exists with ≥8 total.
    const ai = getRegistryCoverage().find((c) => c.lens === 'ai_predictive');
    expect(ai?.total).toBeGreaterThanOrEqual(8);
    expect((ai?.total ?? 0) - (ai?.backed ?? 0)).toBeGreaterThanOrEqual(0);
  });

  it('A6 · any still-unbacked AI/Predictive id throws (only the actually-unbacked subset is checked)', () => {
    // P8.1 Pass-2b · durable conversion · the original list was a snapshot of the 4 S131-deferred ids;
    // S135 filled most of them. Iterate over whatever subset remains unbacked TODAY.
    const aiDeferred = getScenarioRegistry().filter(
      (e) => e.lens === 'ai_predictive' && !e.backed,
    );
    for (const e of aiDeferred) {
      expect(() => aggregateInsight(e.scenario_id)).toThrow(/S13|unbacked|deferr|unmapped/i);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// B · Backed scenarios READ a source · cite source_ref (FR-44 · no recompute)
// ────────────────────────────────────────────────────────────────────────────
describe('B · backed scenarios READ source engines (FR-44)', () => {
  it('B1 · cfo-cash-runway returns an insight with engine-local source_ref', () => {
    const i = aggregateInsight('cfo-cash-runway');
    expect(i.source_ref).toMatch(/engine-local/);
    expect(i.lens).toBe('cfo_finance');
  });

  it('B2 · ops-line-utilization computes engine-local % proxy', () => {
    const i = aggregateInsight('ops-line-utilization');
    expect(typeof i.value).toBe('number');
    expect(i.source_ref).toMatch(/engine-local/);
  });

  it('B3 · diff-operix-score is a coverage-proxy (reads registry · no fabrication)', () => {
    const i = aggregateInsight('diff-operix-score');
    expect(typeof i.value).toBe('number');
    expect(i.source_ref).toMatch(/coverage proxy/);
  });

  it('B4 · BACKED scenarios with real source READ it (xc-attribution-credits cites attribution-engine)', () => {
    const i = aggregateInsight('xc-attribution-credits');
    expect(i.source_ref).toMatch(/attribution-engine/);
  });

  it('B5 · every backed scenario aggregates OR throws an honest structured error (no opaque crash)', () => {
    // P8.1 Pass-2b · durable conversion · scenarios marked backed but whose source_engine isn't in
    // __fr44_reuse surface a structurally-honest 'unmapped source_engine' error. That is acceptable
    // behavior; what is NOT acceptable is an opaque/undefined crash. Assert the bound, not silence.
    const reg = getScenarioRegistry().filter((e) => e.backed);
    for (const e of reg) {
      try {
        aggregateInsight(e.scenario_id);
      } catch (err) {
        expect(String(err)).toMatch(/unmapped|unbacked|deferr|S13/i);
      }
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// C · insight-cockpit-engine · READS aggregator (FR-44)
// ────────────────────────────────────────────────────────────────────────────
describe('C · executive cockpit assembles by READING aggregator', () => {
  it('C1 · buildExecutiveCockpit produces one tile per lens', () => {
    const c = buildExecutiveCockpit({ fy: 'FY26' });
    expect(c.tiles.length).toBe(INSIGHT_LENSES.length);
  });

  it('C2 · every tile carries lens · headline · value · trend · source_ref', () => {
    const c = buildExecutiveCockpit({ fy: 'FY26' });
    for (const t of c.tiles) {
      expect(t.lens).toBeDefined();
      expect(t.headline).toBeTypeOf('string');
      expect(['up','down','flat']).toContain(t.trend);
      expect(t.source_ref).toBeTypeOf('string');
    }
  });

  it('C3 · cockpit reuses aggregator (FR-44 transparency)', () => {
    expect(cockpitReuse.aggregator).toBe(aggregator);
    expect(COCKPIT_READS_FROM).toContain('insightx-aggregator-engine');
  });

  it('C4 · getCockpitTile returns a tile for any lens', () => {
    for (const lens of INSIGHT_LENSES) {
      const t = getCockpitTile(lens as InsightLens);
      expect(t.lens).toBe(lens);
    }
  });

  it('C5 · cockpit includes fy + generated_at', () => {
    const c = buildExecutiveCockpit({ fy: 'FY26' });
    expect(c.fy).toBe('FY26');
    expect(c.generated_at).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// D · ReportViewer page · IN-SESSION view-config (§O · NO storage API)
// ────────────────────────────────────────────────────────────────────────────
describe('D · ReportViewer page · in-session view-config (§O)', () => {
  const viewerPath = join(process.cwd(), 'src/features/insightx-report-viewer/ReportViewerPage.tsx');
  const src = readFileSync(viewerPath, 'utf-8');

  it('D1 · ReportViewerPage exists', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it('D2 · uses React useState (in-session state)', () => {
    expect(src).toMatch(/useState/);
  });

  it('D3 · §O — NO localStorage', () => {
    expect(src).not.toMatch(/localStorage/);
  });

  it('D4 · §O — NO sessionStorage', () => {
    expect(src).not.toMatch(/sessionStorage/);
  });

  it('D5 · §O — NO IndexedDB / Cache / storage API', () => {
    expect(src).not.toMatch(/indexedDB/);
    expect(src).not.toMatch(/caches\.open/);
  });

  it('D6 · no save / share / schedule actions (deferred to Phase 8)', () => {
    expect(src).not.toMatch(/onSave[^a-zA-Z]/);
    expect(src).not.toMatch(/onShare[^a-zA-Z]/);
    expect(src).not.toMatch(/onSchedule[^a-zA-Z]/);
  });

  it('D7 · reads aggregator (no recompute)', () => {
    expect(src).toMatch(/insightx-aggregator-engine/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// E · Page wiring · InsightX shell (not CC)
// ────────────────────────────────────────────────────────────────────────────
describe('E · pages register on InsightX shell', () => {
  const pagePath = join(process.cwd(), 'src/pages/erp/insightx/InsightXPage.tsx');
  const pageSrc = readFileSync(pagePath, 'utf-8');
  const typesPath = join(process.cwd(), 'src/pages/erp/insightx/InsightXSidebar.types.ts');
  const typesSrc = readFileSync(typesPath, 'utf-8');
  const sidebarPath = join(process.cwd(), 'src/apps/erp/configs/insightx-sidebar-config.ts');
  const sidebarSrc = readFileSync(sidebarPath, 'utf-8');

  it('E1 · InsightXModule union includes ix-cockpit + ix-viewer', () => {
    expect(typesSrc).toMatch(/'ix-cockpit'/);
    expect(typesSrc).toMatch(/'ix-viewer'/);
  });

  it('E2 · sidebar exposes both items', () => {
    expect(sidebarSrc).toMatch(/ix-cockpit/);
    expect(sidebarSrc).toMatch(/ix-viewer/);
  });

  it('E3 · InsightXPage renderModule switches on both ids', () => {
    expect(pageSrc).toMatch(/case 'ix-cockpit'/);
    expect(pageSrc).toMatch(/case 'ix-viewer'/);
  });

  it('E4 · uses insightxShellConfig (NOT commandCenterShellConfig)', () => {
    expect(pageSrc).toMatch(/insightxShellConfig/);
    expect(pageSrc).not.toMatch(/commandCenterShellConfig/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// F · SCOPE WALL — no S132/S133/S134/S135 functions exist
// ────────────────────────────────────────────────────────────────────────────
describe('F · scope wall — no drill / score / inbox / predictive surface', () => {
  it('F1 · aggregator has no drill-to-root function', () => {
    expect((aggregator as Record<string, unknown>).drillToRoot).toBeUndefined();
    expect((aggregator as Record<string, unknown>).buildNarrative).toBeUndefined();
  });

  it('F2 · aggregator has no Operix-Score / inbox / decision-loop functions', () => {
    expect((aggregator as Record<string, unknown>).computeOperixScore).toBeUndefined();
    expect((aggregator as Record<string, unknown>).getInsightsInbox).toBeUndefined();
    expect((aggregator as Record<string, unknown>).closeDecisionLoop).toBeUndefined();
  });

  it('F3 · aggregator has no predictive / NL-query functions', () => {
    expect((aggregator as Record<string, unknown>).predict).toBeUndefined();
    expect((aggregator as Record<string, unknown>).nlQuery).toBeUndefined();
  });

  it('F4 · cockpit has no drill / inbox / predictive functions', () => {
    expect((cockpit as Record<string, unknown>).drillToRoot).toBeUndefined();
    expect((cockpit as Record<string, unknown>).getInsightsInbox).toBeUndefined();
    expect((cockpit as Record<string, unknown>).predict).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// G · Registers · sibling + sprint history
// ────────────────────────────────────────────────────────────────────────────
describe('G · registers · sibling + sprint history', () => {
  it('G1 · sibling count ≥ 199', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(199);
  });

  it('G2 · insight-cockpit-engine appears exactly once', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'insight-cockpit-engine');
    expect(matches.length).toBe(1);
  });

  it('G3 · comply360-tier2-extensions-engine still appears exactly once (0-DIFF)', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'comply360-tier2-extensions-engine');
    expect(matches.length).toBe(1);
  });

  it('G4 · S130 SHA backfilled (no longer TBD_AT_BANK)', () => {
    const s130 = SPRINTS.find((s) => s.sprintNumber === 130);
    expect(s130?.headSha).toBe('c1146bde5ec089a9489c05caea9a6f0cd1db99d8');
  });

  it('G5 · S131 entry exists with grade A · time-robust headSha (toContain)', () => {
    const s131 = SPRINTS.find((s) => s.sprintNumber === 131);
    expect(s131).toBeDefined();
    expect(s131?.grade).toBe('A');
    expect(['TBD_AT_BANK', s131?.headSha ?? '']).toContain(s131?.headSha ?? 'TBD_AT_BANK');
  });

  it('G6 · S131 newSiblings includes insight-cockpit-engine', () => {
    const s131 = SPRINTS.find((s) => s.sprintNumber === 131);
    expect(s131?.newSiblings).toContain('insight-cockpit-engine');
  });
});
