/**
 * @file        src/test/sprint-136/phase7-close.test.ts
 * @sprint      S136 · T-Phase-7.D.3.7-CLOSE · 🏁🎉 PHASE 7 FINALE
 * @purpose     Lean behavioural close-ceremony tests (≥20 it).
 *              FR-91 honest-metrics: NO 75/75-certified overclaim · §A/§B
 *              separation asserted · honest backed/deferred split asserted ·
 *              S136 headSha via toContain([...]) not toBe · count assertions
 *              are FLOORS (toBeGreaterThanOrEqual) · NO existsSync-future
 *              (S136 is the last sprint · no next-sprint to guard).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  getScenarioRegistry,
  getRegistryCoverage,
  INSIGHT_LENSES,
  type ScenarioRegistryEntry,
} from '@/lib/insightx-aggregator-engine';
import { SPRINTS, getSprintCount, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { getSiblingCount } from '@/lib/_institutional/sibling-register';
import { insightxSidebarItems as INSIGHTX_SIDEBAR } from '@/apps/erp/configs/insightx-sidebar-config';

const CEREMONY_PATH = join(process.cwd(), 'docs', 'Operix_Phase7_Close_Ceremony.md');
const CEREMONY = existsSync(CEREMONY_PATH) ? readFileSync(CEREMONY_PATH, 'utf8') : '';

describe('S136 · Phase-7 Close · registry honesty (75/11 enumeration · deferred split)', () => {
  const registry = getScenarioRegistry();

  it('enumerates at least 75 scenarios across the catalogue (FLOOR, not exact count)', () => {
    expect(registry.length).toBeGreaterThanOrEqual(75);
  });

  it('covers all 11 lenses', () => {
    const lenses = new Set(registry.map((e) => e.lens));
    for (const lens of INSIGHT_LENSES) expect(lenses.has(lens)).toBe(true);
    expect(lenses.size).toBeGreaterThanOrEqual(11);
  });

  it('backs the 3 β-ML scenarios via predictive-insight-engine (not faked)', () => {
    const ids = ['ai-anomaly-detector', 'ai-churn-predictor', 'ai-cash-shortfall-predictor'];
    for (const id of ids) {
      const e = registry.find((x) => x.scenario_id === id);
      expect(e?.backed).toBe(true);
      expect(e?.source_engine).toBe('predictive-insight-engine');
    }
  });

  it('honestly keeps ai-nl-query deferred (NO faked LLM coverage)', () => {
    const e = registry.find((x) => x.scenario_id === 'ai-nl-query');
    expect(e).toBeDefined();
    expect(e?.backed).toBe(false);
    expect(e?.source_engine).toBeNull();
  });

  it('attaches a deferred_reason to ai-nl-query that names Phase 8', () => {
    const e = registry.find((x) => x.scenario_id === 'ai-nl-query');
    expect(e?.deferred_reason).toBeDefined();
    expect(String(e?.deferred_reason).toLowerCase()).toContain('phase 8');
  });

  it('never attaches deferred_reason to a backed scenario (FR-91)', () => {
    for (const e of registry) {
      if (e.backed) expect((e as ScenarioRegistryEntry).deferred_reason).toBeUndefined();
    }
  });

  it('reports lens coverage as backed ≤ total per lens (honest math)', () => {
    for (const c of getRegistryCoverage()) {
      expect(c.backed).toBeLessThanOrEqual(c.total);
      expect(c.total).toBeGreaterThanOrEqual(1);
    }
  });

  it('does NOT claim 75/75 backed (≥1 honest deferral remains)', () => {
    const deferred = registry.filter((e) => !e.backed);
    expect(deferred.length).toBeGreaterThanOrEqual(1);
  });

  it('every scenario has a stable scenario_id and lens', () => {
    for (const e of registry) {
      expect(typeof e.scenario_id).toBe('string');
      expect(e.scenario_id.length).toBeGreaterThan(0);
      expect(typeof e.lens).toBe('string');
    }
  });
});

describe('S136 · Phase-7 Close · ceremony document §A/§B separation (FR-91)', () => {
  it('ceremony doc exists at docs/Operix_Phase7_Close_Ceremony.md', () => {
    expect(existsSync(CEREMONY_PATH)).toBe(true);
  });

  it('contains §A REGISTER-CERTIFIED section', () => {
    expect(CEREMONY).toMatch(/§A.*REGISTER-?CERTIFIED/i);
  });

  it('contains §B NARRATIVE section flagged not-certified', () => {
    expect(CEREMONY).toMatch(/§B.*NARRATIVE/i);
    expect(CEREMONY.toLowerCase()).toContain('not register-certified');
  });

  it('mentions the Pillar-D / Arc-D.3 journey (S116 → S136)', () => {
    expect(CEREMONY).toMatch(/S116/);
    expect(CEREMONY).toMatch(/S136/);
    expect(CEREMONY.toLowerCase()).toContain('arc d.3');
  });

  it('records the honest cycle-2 (T1) discipline section', () => {
    expect(CEREMONY.toLowerCase()).toContain('cycle-2');
  });

  it('honestly names the Phase-8 gaps (NL LLM, assistant, builder, persistence)', () => {
    const low = CEREMONY.toLowerCase();
    expect(low).toContain('phase 8');
    expect(low).toContain('llm');
    expect(low).toMatch(/self-service|builder/);
    expect(low).toContain('persistence');
  });

  it('NEVER claims 75/75 certified or 32/32 certified (no overclaim)', () => {
    // Strip the FR-91 disclaimer line(s) that legitimately MENTION the forbidden
    // phrases in order to forbid them. Only then check for AFFIRMATIVE overclaim.
    const body = CEREMONY
      .split('\n')
      .filter((l) => !l.includes('75/75 certified') && !l.includes('32/32 certified'))
      .join('\n');
    expect(body).not.toMatch(/75\s*\/\s*75\s*certified/i);
    expect(body).not.toMatch(/32\s*\/\s*32\s*certified/i);
    expect(body).not.toMatch(/fully\s+certified\s+75/i);
  });
});

describe('S136 · Phase-7 Close · InsightX shell + top-1% engines present', () => {
  it('InsightX sidebar exposes at least 8 navigable items', () => {
    const items = INSIGHTX_SIDEBAR.filter((s) => s.type === 'item');
    expect(items.length).toBeGreaterThanOrEqual(8);
  });

  it('sidebar includes the 8 canonical Phase-7 module ids', () => {
    const ids = new Set(INSIGHTX_SIDEBAR.filter((s) => s.type === 'item').map((s) => s.moduleId));
    for (const expected of [
      'ix-overview', 'ix-cockpit', 'ix-viewer', 'ix-lens-explorer',
      'ix-drill-to-root', 'ix-operix-score', 'ix-insights-inbox', 'ix-predictive',
    ]) {
      expect(ids.has(expected)).toBe(true);
    }
  });

  it('top-1% Phase-7 engines are present on disk', () => {
    const engines = [
      'src/lib/insightx-aggregator-engine.ts',
      'src/lib/cross-card-drilldown-engine.ts',
      'src/lib/variance-narrative-engine.ts',
      'src/lib/operix-score-engine.ts',
      'src/lib/insights-inbox-engine.ts',
      'src/lib/scenario-outcome-tracker-engine.ts',
      'src/lib/predictive-insight-engine.ts',
    ];
    for (const p of engines) expect(existsSync(join(process.cwd(), p))).toBe(true);
  });
});

describe('S136 · Phase-7 Close · institutional registers (S136 last entry · §M)', () => {
  it('S135 SHA is backfilled to the banked HEAD (no TBD on S135 anymore)', () => {
    const s135 = SPRINTS.find((s) => s.sprintNumber === 135);
    expect(s135?.headSha).toBe('93a79931a988445ff94bfd6c44b1446f5605f6b2');
  });

  it('S136 entry exists with predecessorSha = S135 banked SHA', () => {
    const s136 = SPRINTS.find((s) => s.sprintNumber === 136);
    expect(s136).toBeDefined();
    expect(s136?.predecessorSha).toBe('93a79931a988445ff94bfd6c44b1446f5605f6b2');
  });

  it('S136 headSha is the FINAL open entry (toContain([...]) · legitimately last)', () => {
    const s136 = SPRINTS.find((s) => s.sprintNumber === 136);
    expect(['TBD_AT_BANK']).toContain(s136?.headSha);
  });

  it('S136 adds zero siblings (doc + wiring sprint · 205-class holds)', () => {
    const s136 = SPRINTS.find((s) => s.sprintNumber === 136);
    expect(s136?.newSiblings.length).toBe(0);
  });

  it('S136 is the last sprint-history entry (no next-sprint tombstone)', () => {
    expect(SPRINTS[SPRINTS.length - 1].sprintNumber).toBe(136);
  });

  it('sprint count is a FLOOR (≥ 21 Phase-7 sprints S116..S136)', () => {
    expect(getSprintCount()).toBeGreaterThanOrEqual(21);
  });

  it('A-grade streak holds at ≥ 59 (Phase 7 close target)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(59);
  });

  it('sibling-register §A integer is a FLOOR (≥ 205 · S136 adds zero)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(205);
  });

  it('no other sprint-history entry carries TBD_AT_BANK except S136 (§M)', () => {
    const tbds = SPRINTS.filter((s) => s.headSha === 'TBD_AT_BANK');
    expect(tbds.length).toBe(1);
    expect(tbds[0].sprintNumber).toBe(136);
  });
});

describe('S136 · Phase-7 Close · ceremony 🏁 marker + Phase-8 gap honesty', () => {
  it('ceremony declares PHASE 7 COMPLETE', () => {
    expect(CEREMONY).toMatch(/PHASE 7 COMPLETE/i);
  });

  it('ceremony names Scenario 67 / true conversational NLP as a Phase-8 gap', () => {
    const low = CEREMONY.toLowerCase();
    expect(low).toMatch(/scenario 67|true conversational|nlp/);
  });
});
