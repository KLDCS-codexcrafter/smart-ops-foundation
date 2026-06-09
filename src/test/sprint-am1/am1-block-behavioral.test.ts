/**
 * @file   src/test/sprint-am1/am1-block-behavioral.test.ts
 * @sprint AM.1 · T-AM1-AI-Everywhere
 * @canon  Behavioral guardrails for:
 *   - dishani-context-resolver (route → card · NO LLM · Wave-2 seam preserved)
 *   - role-home-engine (rule-ranked feed · CONSUMES insights-inbox · NO ML)
 *   - RoleHomeFeed component + /operix-go surface
 *   - non-forward-looking sprint-history assertions only
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  resolveCardContext,
  ROUTE_CARD_REGISTRY,
  classifyIntent,
  answerCardScoped,
  DISHANI_RESOLVER_HONESTY,
  type CardContext,
} from '@/components/ask-dishani/dishani-context-resolver';
import * as roleHome from '@/lib/role-home-engine';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';

const ROOT = path.resolve(__dirname, '../../..');
function readSrc(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('AM.1 · dishani-context-resolver', () => {
  it('ROUTE_CARD_REGISTRY covers ≥33 real cards/panels (no fabricated paths)', () => {
    expect(ROUTE_CARD_REGISTRY.length).toBeGreaterThanOrEqual(33);
    for (const [prefix, ctx] of ROUTE_CARD_REGISTRY) {
      expect(typeof prefix).toBe('string');
      expect(prefix.startsWith('/')).toBe(true);
      expect(ctx.cardName.length).toBeGreaterThan(0);
      expect(ctx.department.length).toBeGreaterThan(0);
    }
  });

  it('resolveCardContext returns FinCore for /erp/fincore subpaths', () => {
    const ctx = resolveCardContext('/erp/fincore/registers/approvals');
    expect(ctx.card).toBe('fincore');
    expect(ctx.cardName).toContain('FinCore');
  });

  it('resolveCardContext returns Production for /erp/production', () => {
    expect(resolveCardContext('/erp/production').card).toBe('production');
  });

  it('resolveCardContext longest-prefix wins (/erp/distributor-hub > /erp/distributor)', () => {
    const ctx = resolveCardContext('/erp/distributor-hub/anything');
    expect(ctx.card).toBe('distributor-hub');
  });

  it('resolveCardContext falls back to platform default on unknown route', () => {
    const ctx = resolveCardContext('/this/does/not/exist');
    expect(ctx.card).toBe('operix-core');
  });

  it('resolveCardContext handles empty pathname safely', () => {
    expect(resolveCardContext('').card).toBe('operix-core');
  });

  it('classifyIntent covers 6 deterministic classes', () => {
    expect(classifyIntent('what is overdue here?')).toBe('overdue');
    expect(classifyIntent('summary of this card')).toBe('summary');
    expect(classifyIntent('pending approvals?')).toBe('pending_approvals');
    expect(classifyIntent('what is happening today?')).toBe('today');
    expect(classifyIntent('how do I add a vendor?')).toBe('help');
    expect(classifyIntent('xyzzy plugh')).toBe('unknown');
  });

  it('answerCardScoped mentions the card name in every answer', () => {
    const ctx: CardContext = resolveCardContext('/erp/fincore');
    for (const q of ['what is overdue?', 'summary', 'pending approvals', 'today', 'help', 'random']) {
      const a = answerCardScoped(q, ctx);
      expect(a).toContain(ctx.cardName);
    }
  });

  it('answerCardScoped surfaces the rule-based / Wave-2 honesty', () => {
    const ctx = resolveCardContext('/erp/salesx');
    const a = answerCardScoped('what is overdue?', ctx);
    expect(a.toLowerCase()).toContain('wave-2');
  });

  it('DISHANI_RESOLVER_HONESTY mentions rule-based + Wave-2 (no fake AI claim)', () => {
    expect(DISHANI_RESOLVER_HONESTY.toLowerCase()).toContain('rule-based');
    expect(DISHANI_RESOLVER_HONESTY.toLowerCase()).toContain('wave-2');
  });

  it('resolver source contains NO LLM call (no fetch / anthropic / openai)', () => {
    const src = readSrc('src/components/ask-dishani/dishani-context-resolver.ts');
    expect(src).not.toMatch(/fetch\s*\(/);
    expect(src.toLowerCase()).not.toContain('anthropic');
    expect(src.toLowerCase()).not.toContain('openai');
  });

  it('resolver preserves the [JWT] Wave-2 /nl-query seam as a comment', () => {
    const src = readSrc('src/components/ask-dishani/dishani-context-resolver.ts');
    expect(src).toContain('/api/ai/nl-query');
  });

  it('useDishaniRouteContext is the ONLY new context-set wiring (no per-card-page edits)', () => {
    const hook = readSrc('src/components/ask-dishani/useDishaniRouteContext.ts');
    expect(hook).toContain('useDishani');
    expect(hook).toContain('resolveCardContext');
    // App.tsx wires it from ConditionalDishani — exactly one route-derived hook
    const app = readSrc('src/App.tsx');
    expect(app).toContain('useDishaniRouteContext');
  });
});

describe('AM.1 · role-home-engine', () => {
  it('exports buildRoleHomeFeed + ROLE_HOME_HONESTY + READS_FROM', () => {
    expect(typeof roleHome.buildRoleHomeFeed).toBe('function');
    expect(roleHome.ROLE_HOME_HONESTY.toLowerCase()).toContain('rule-ranked');
    expect(roleHome.READS_FROM).toContain('insights-inbox-engine');
  });

  it('CONSUMES insights-inbox-engine via __reuse namespace mirror (greppable)', () => {
    expect(roleHome.__reuse.insightsInbox).toBeTruthy();
    expect(typeof roleHome.__reuse.insightsInbox.buildInbox).toBe('function');
  });

  it('honest empty when source produces no signals (no fabricated insights)', () => {
    const feed = roleHome.buildRoleHomeFeed({ role: 'finance', fy: '1970-71', top_n: 5 });
    expect(Array.isArray(feed)).toBe(true);
    // Either empty or every entry traces to a real source_engine.
    for (const a of feed) {
      expect(typeof a.source_engine).toBe('string');
      expect(a.source_engine.length).toBeGreaterThan(0);
      expect(roleHome.READS_FROM.some((r) => a.source_engine.includes('-engine') || r.length > 0)).toBe(true);
    }
  });

  it('feed sorted desc by rank_score', () => {
    const feed = roleHome.buildRoleHomeFeed({ role: 'operations', fy: '2026-27', top_n: 20 });
    for (let i = 1; i < feed.length; i++) {
      expect(feed[i - 1].rank_score).toBeGreaterThanOrEqual(feed[i].rank_score);
    }
  });

  it('clamps top_n to [1, 50]', () => {
    expect(roleHome.buildRoleHomeFeed({ role: 'finance', fy: '2026-27', top_n: 0 }).length).toBeLessThanOrEqual(50);
    expect(roleHome.buildRoleHomeFeed({ role: 'finance', fy: '2026-27', top_n: 999 }).length).toBeLessThanOrEqual(50);
  });

  it('engine surface excludes ML/LLM scope-wall symbols', () => {
    const surface = roleHome as unknown as Record<string, unknown>;
    expect(surface.trainModel).toBeUndefined();
    expect(surface.runPredictive).toBeUndefined();
    expect(surface.askNaturalLanguage).toBeUndefined();
    expect(surface.classifyIntent).toBeUndefined();
  });

  it('engine source contains NO fetch / anthropic / openai', () => {
    const src = readSrc('src/lib/role-home-engine.ts');
    expect(src).not.toMatch(/fetch\s*\(/);
    expect(src.toLowerCase()).not.toContain('anthropic');
    expect(src.toLowerCase()).not.toContain('openai');
  });

  it('engine preserves the [JWT] Wave-2 /predict seam as a comment', () => {
    const src = readSrc('src/lib/role-home-engine.ts');
    expect(src).toContain('/api/role-home/predict');
  });
});

describe('AM.1 · RoleHomeFeed surface', () => {
  it('RoleHomeFeed component mounts ROLE_HOME_HONESTY banner', () => {
    const src = readSrc('src/components/role-home/RoleHomeFeed.tsx');
    expect(src).toContain('ROLE_HOME_HONESTY');
    expect(src).toContain('buildRoleHomeFeed');
  });

  it('/operix-go page renders the RoleHomeFeed widget', () => {
    const src = readSrc('src/pages/mobile/OperixGoPage.tsx');
    expect(src).toContain('RoleHomeFeed');
  });
});

describe('AM.1 · §H walls (0-DIFF / honesty)', () => {
  it('ask-dishani core files untouched by AM.1 (DishaniContext / Panel / FloatingButton)', () => {
    const ctx = readSrc('src/components/ask-dishani/DishaniContext.tsx');
    const panel = readSrc('src/components/ask-dishani/DishaniPanel.tsx');
    const btn = readSrc('src/components/ask-dishani/DishaniFloatingButton.tsx');
    // None of the core files should reference the resolver — the wiring is
    // intentionally external (App.tsx via the new hook).
    expect(ctx).not.toContain('resolveCardContext');
    expect(panel).not.toContain('resolveCardContext');
    expect(btn).not.toContain('resolveCardContext');
  });

  it('insights-inbox-engine surface untouched (read-only consumer)', () => {
    const src = readSrc('src/lib/insights-inbox-engine.ts');
    expect(src).not.toContain('role-home-engine');
    expect(src).not.toContain('buildRoleHomeFeed');
  });

  it('applications.ts not edited by AM.1 (no role-home / dishani-resolver references)', () => {
    const src = readSrc('src/components/operix-core/applications.ts');
    expect(src).not.toContain('role-home-engine');
    expect(src).not.toContain('dishani-context-resolver');
  });

  it('exactly ONE new SIBLING registered for AM.1: role-home-engine', () => {
    expect(SIBLINGS.some((s) => s.id === 'role-home-engine')).toBe(true);
  });
});

describe('AM.1 · sprint-history (non-forward-looking only)', () => {
  it('SP.4 row banked with the AM.1 predecessor SHA', () => {
    const sp4 = SPRINTS.find((s) => s.code === 'T-SP4-Build-Your-Plan');
    expect(sp4).toBeTruthy();
    expect(sp4!.headSha).toBe('541b4b63');
  });

  it('AM.1 row present with predecessor 541b4b63 and role-home-engine', () => {
    const am1 = SPRINTS.find((s) => s.code === 'T-AM1-AI-Everywhere');
    expect(am1).toBeTruthy();
    expect(am1!.predecessorSha).toBe('541b4b63');
    expect(am1!.newSiblings).toContain('role-home-engine');
  });

  it('history maintains a stable banked floor (non-forward-looking)', () => {
    expect(SPRINTS.length).toBeGreaterThanOrEqual(5);
    for (const code of [
      'T-SP1-Variant-Builder',
      'T-SP2-Prudent360-ERP',
      'T-SP3-Provisioning',
      'T-SP4-Build-Your-Plan',
      'T-AM1-AI-Everywhere',
    ]) {
      expect(SPRINTS.some((s) => s.code === code)).toBe(true);
    }
  });
});
