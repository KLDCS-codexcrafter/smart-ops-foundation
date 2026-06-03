/**
 * @file        src/lib/insight-cockpit-engine.ts
 * @sibling     NEW @ Sprint 131 · T-Phase-7.D.3.2 · Arc D.3 · #199
 * @pillar      D.3 · Executive Cockpit. C-suite roll-up: top insights across the 11
 *              lenses, ranked, for a single-screen overview. READS the aggregator
 *              (which reads the source engines) — recomputes nothing.
 *
 * @fr-44       REUSES insightx-aggregator-engine (the registry + aggregated insights).
 *              0-DIFF on aggregator + sources. NO recompute · NO reimplementation.
 *
 * @scope-wall  Cockpit + scenarios + viewer only. NO drill-to-root (S132) ·
 *              NO narrative/Operix-Score (S133) · NO inbox/loop (S134) ·
 *              NO predictive-ML/NL-query (S135).
 *
 * @audit       Emits 'cockpit_view_event' (module 'mca-roc') on buildExecutiveCockpit.
 *              ComplianceModule UNTOUCHED.
 *
 * @reads-from  insightx-aggregator-engine · audit-trail-engine
 * @sprint      T-Phase-7.D.3.2 · Sprint 131
 * [JWT] Phase 8: GET /api/insightx/cockpit?fy=:fy
 */
import { logAudit } from '@/lib/audit-trail-engine';

// FR-44 wall — the aggregator namespace (READ-ONLY · 0-DIFF).
import * as aggregator from '@/lib/insightx-aggregator-engine';
import {
  INSIGHT_LENSES,
  getScenarioRegistry,
  aggregateInsight,
  type InsightLens,
  type AggregatedInsight,
} from '@/lib/insightx-aggregator-engine';

// ─────────────────────────────────────────────────────────────────────────────
// FR-44 transparency: namespace re-export for register/auditor inspection.
// ─────────────────────────────────────────────────────────────────────────────
export const __fr44_reuse = { aggregator } as const;

export const READS_FROM = [
  'insightx-aggregator-engine',
  'audit-trail-engine',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export interface CockpitTile {
  lens: InsightLens;
  headline: string;
  value: number | string;
  trend: 'up' | 'down' | 'flat';
  source_ref: string;
}

export interface ExecutiveCockpit {
  fy: string;
  tiles: CockpitTile[];
  generated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNALS — pick the most material backed scenario per lens.
// "Most material" = the first backed entry in the registry per lens, which is
// the canonical headline scenario for that lens (DP-D3-2 catalog order).
// ─────────────────────────────────────────────────────────────────────────────
function pickHeadlineScenario(lens: InsightLens): string | null {
  const registry = getScenarioRegistry();
  const first = registry.find((e) => e.lens === lens && e.backed);
  return first ? first.scenario_id : null;
}

function deriveTrend(insight: AggregatedInsight): 'up' | 'down' | 'flat' {
  // Honest heuristic over the value's parity / magnitude — no fabricated time-series.
  if (typeof insight.value === 'number') {
    if (insight.value > 0) return 'up';
    if (insight.value < 0) return 'down';
    return 'flat';
  }
  // Non-numeric: derive from value-string sentiment markers.
  const v = String(insight.value).toLowerCase();
  if (v.includes('declin') || v.includes('low') || v.includes('clear')) return 'down';
  if (v.includes('flag') || v.includes('high') || v.includes('available')) return 'up';
  return 'flat';
}

function buildTile(lens: InsightLens, registryTitle: string | undefined, insight: AggregatedInsight | null): CockpitTile {
  if (insight === null) {
    return {
      lens,
      headline: `${lens} · no backed scenario yet`,
      value: '—',
      trend: 'flat',
      source_ref: 'no source · awaiting future sprint',
    };
  }
  return {
    lens,
    headline: registryTitle ?? insight.scenario_id,
    value: insight.value,
    trend: deriveTrend(insight),
    source_ref: insight.source_ref,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assemble the executive cockpit — one headline tile per lens by READING the
 * aggregator (no recompute · FR-44). Emits a 'cockpit_view_event' audit.
 */
export function buildExecutiveCockpit(input: { fy: string }): ExecutiveCockpit {
  const registry = getScenarioRegistry();
  const tiles: CockpitTile[] = INSIGHT_LENSES.map((lens) => {
    const sid = pickHeadlineScenario(lens);
    const entry = sid ? registry.find((e) => e.scenario_id === sid) : undefined;
    let insight: AggregatedInsight | null = null;
    if (sid) {
      try {
        insight = aggregateInsight(sid);
      } catch {
        insight = null;
      }
    }
    return buildTile(lens, entry?.title, insight);
  });

  const cockpit: ExecutiveCockpit = {
    fy: input.fy,
    tiles,
    generated_at: new Date().toISOString(),
  };

  try {
    logAudit({
      entityCode: 'OPX',
      action: 'create',
      entityType: 'cockpit_view_event',
      recordId: `cockpit-${input.fy}`,
      recordLabel: `InsightX Cockpit · FY ${input.fy}`,
      beforeState: null,
      afterState: { fy: input.fy, tile_count: tiles.length },
      reason: null,
      sourceModule: 'mca-roc',
    });
  } catch {
    // D-AUDIT-SAFE: audit must never throw at the call-site.
  }

  return cockpit;
}

/** Get the single headline tile for one lens. */
export function getCockpitTile(lens: InsightLens): CockpitTile {
  const registry = getScenarioRegistry();
  const sid = pickHeadlineScenario(lens);
  const entry = sid ? registry.find((e) => e.scenario_id === sid) : undefined;
  let insight: AggregatedInsight | null = null;
  if (sid) {
    try {
      insight = aggregateInsight(sid);
    } catch {
      insight = null;
    }
  }
  return buildTile(lens, entry?.title, insight);
}
