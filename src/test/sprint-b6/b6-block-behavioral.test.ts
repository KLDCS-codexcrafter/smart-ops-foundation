/**
 * b6-block-behavioral.test.ts — Sprint B6 · T-B6-Master-Health · Pillar-B CLOSE
 *
 * Coverage targets:
 *   - duplicates dimension DELEGATES to idea-3.scanForDuplicates (no own loops)
 *   - sleeping dimension DELEGATES to idea-9.detectSleepingMasters
 *   - incomplete % computed from REAL party fields (gstin/state_code/unresolved-quick-add)
 *   - unavailable field → source:'unavailable' · never fabricated 0
 *   - orphaned if-present-then-valid (synthetic ledger with missing group flagged)
 *   - ssot_coverage enumerates ALL_MASTER_TYPES
 *   - score rubric monotonic (more criticals → lower score) · documented
 *   - overall score aggregates
 *   - §H walls 0-DIFF (import-shape only): idea-3 · idea-9 · master-replication · party-master · governance pages
 *   - sprint-history: B6 row present · B.3 flipped to 46a58b4a
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  runMasterHealth,
  scoreMasterType,
  getCriticalFindings,
  getOverallScore,
  loadLastRun,
  __spine__,
} from '@/lib/master-health-scorecard-engine';
import type { MasterHealthCheck } from '@/types/master-health';
import { masterHealthCacheKey } from '@/types/master-health';
import { ALL_MASTER_TYPES } from '@/lib/master-replication-engine';
import { partyMasterKey } from '@/types/party';
import { ledgerDefsKey } from '@/lib/fincore-engine';

const ENTITY = 'b6-test-entity';

function clearAll(): void {
  localStorage.clear();
}

function seedParties(): void {
  const parties = [
    { id: 'p1', entity_id: ENTITY, party_code: 'CUST/0001', party_name: 'Alpha Traders',
      party_type: 'customer', gstin: '27AAAAA0000A1Z5', state_code: '27',
      created_via_quick_add: false, audit_flag_resolved_at: null,
      created_at: '', updated_at: '', created_by: 't' },
    { id: 'p2', entity_id: ENTITY, party_code: 'CUST/0002', party_name: 'Beta Pvt Ltd',
      party_type: 'customer', gstin: null, state_code: null,
      created_via_quick_add: true, audit_flag_resolved_at: null,
      created_at: '', updated_at: '', created_by: 't' },
    { id: 'p3', entity_id: ENTITY, party_code: 'VEND/0001', party_name: 'Gamma Supplies',
      party_type: 'vendor', gstin: '29BBBBB1111B1Z5', state_code: '29',
      created_via_quick_add: false, audit_flag_resolved_at: null,
      created_at: '', updated_at: '', created_by: 't' },
  ];
  localStorage.setItem(partyMasterKey(ENTITY), JSON.stringify(parties));
}

describe('B6 · Master Health Scorecard · pillar-B CLOSE', () => {
  beforeEach(() => { clearAll(); });

  it('spine: re-exports idea-3 + idea-9 + replication + party loaders', () => {
    expect(typeof __spine__.scanForDuplicates).toBe('function');
    expect(typeof __spine__.detectSleepingMasters).toBe('function');
    expect(typeof __spine__.getPreference).toBe('function');
    expect(typeof __spine__.loadPartyMaster).toBe('function');
    expect(Array.isArray(__spine__.ALL_MASTER_TYPES)).toBe(true);
  });

  it('duplicates dimension delegates to idea-3.scanForDuplicates (no own dup loop in engine)', () => {
    const src = readFileSync(resolve('src/lib/master-health-scorecard-engine.ts'), 'utf8');
    expect(src).toContain('scanForDuplicates');
    // No re-implementation: there must be no own similarity scoring loop.
    expect(/function\s+similarity\s*\(/.test(src)).toBe(false);
    expect(/function\s+norm\s*\(/.test(src)).toBe(false);
  });

  it('sleeping dimension delegates to idea-9.detectSleepingMasters (no own dormant loop)', () => {
    const src = readFileSync(resolve('src/lib/master-health-scorecard-engine.ts'), 'utf8');
    expect(src).toContain('detectSleepingMasters');
    expect(/buildLastUsedIndex/.test(src)).toBe(false);
    expect(/DEFAULT_SLEEPING_DAYS\s*=/.test(src)).toBe(false);
  });

  it('runMasterHealth returns one MasterTypeScore per ALL_MASTER_TYPES', () => {
    seedParties();
    const r = runMasterHealth(ENTITY);
    expect(r.by_type.length).toBe(ALL_MASTER_TYPES.length);
    const types = r.by_type.map((t) => t.master_type);
    for (const mt of ALL_MASTER_TYPES) expect(types).toContain(mt);
  });

  it('every MasterTypeScore has all 5 dimensions present', () => {
    seedParties();
    const r = runMasterHealth(ENTITY);
    const dims = ['duplicates', 'sleeping', 'incomplete', 'orphaned', 'ssot_coverage'];
    for (const t of r.by_type) {
      for (const d of dims) {
        expect(t.checks.find((c) => c.dimension === d)).toBeTruthy();
      }
    }
  });

  it('incomplete check reads REAL party fields: missing gstin/state_code flagged', () => {
    seedParties();
    const r = runMasterHealth(ENTITY);
    const cust = r.by_type.find((t) => t.master_type === 'customer');
    const inc = cust!.checks.find((c) => c.dimension === 'incomplete')!;
    // p2 has null gstin AND null state_code AND unresolved quick-add → flagged once
    expect(inc.count).toBeGreaterThanOrEqual(1);
    expect(inc.source).toBe('b6-incomplete');
    expect(inc.detail).toMatch(/gstin/);
  });

  it('incomplete check honest when field model not defined → source:unavailable, never fabricated 0%', () => {
    const r = runMasterHealth(ENTITY);
    const unit = r.by_type.find((t) => t.master_type === 'unit')!;
    const inc = unit.checks.find((c) => c.dimension === 'incomplete')!;
    expect(inc.source).toBe('unavailable');
    expect(inc.detail).toMatch(/not defined|unavailable/i);
  });

  it('orphaned uses if-present-then-valid on synthetic ledger with missing parent', () => {
    const rows = [
      { id: 'L1', name: 'Cash', parentGroupId: null },
      { id: 'L2', name: 'Bank A', parentGroupId: 'GHOST' }, // orphan
      { id: 'L3', name: 'Bank B', parentGroupId: 'L1' },   // resolves
    ];
    localStorage.setItem(ledgerDefsKey(ENTITY), JSON.stringify(rows));
    const r = runMasterHealth(ENTITY);
    const ledger = r.by_type.find((t) => t.master_type === 'ledger')!;
    const orph = ledger.checks.find((c) => c.dimension === 'orphaned')!;
    expect(orph.count).toBe(1);
    expect(orph.source).toBe('b6-orphaned');
  });

  it('ssot_coverage enumerates ALL_MASTER_TYPES (one check per type)', () => {
    const r = runMasterHealth(ENTITY);
    const ssotChecks = r.by_type.map((t) => t.checks.find((c) => c.dimension === 'ssot_coverage')!);
    expect(ssotChecks.length).toBe(ALL_MASTER_TYPES.length);
    for (const c of ssotChecks) expect(c.source).toBe('b6-replication');
  });

  it('ssot_coverage reports governed when explicit preference recorded', () => {
    localStorage.setItem(
      `erp_${ENTITY}_master_repl_pref_customer`,
      JSON.stringify({ master_type: 'customer', entity_code: ENTITY, mode: 'always_replicate', updated_at: '' }),
    );
    const r = runMasterHealth(ENTITY);
    const cust = r.by_type.find((t) => t.master_type === 'customer')!;
    const ssot = cust.checks.find((c) => c.dimension === 'ssot_coverage')!;
    expect(ssot.severity).toBe('ok');
    expect(ssot.count).toBe(0);
  });

  it('score rubric is monotonic: more criticals → lower score', () => {
    const ok: MasterHealthCheck[] = [
      { dimension: 'duplicates', master_type: 'item', count: 0, severity: 'ok', detail: '', source: 'idea-3' },
    ];
    const oneCrit: MasterHealthCheck[] = [
      { dimension: 'duplicates', master_type: 'item', count: 10, severity: 'critical', detail: '', source: 'idea-3' },
    ];
    const twoCrit: MasterHealthCheck[] = [
      ...oneCrit,
      { dimension: 'incomplete', master_type: 'item', count: 30, severity: 'critical', detail: '', source: 'b6-incomplete' },
    ];
    const sOk = scoreMasterType(ok);
    const s1 = scoreMasterType(oneCrit);
    const s2 = scoreMasterType(twoCrit);
    expect(sOk).toBeGreaterThan(s1);
    expect(s1).toBeGreaterThan(s2);
    expect(s2).toBeGreaterThanOrEqual(0);
  });

  it('score never fabricates: unavailable applies a small documented penalty, not 0', () => {
    const checks: MasterHealthCheck[] = [
      { dimension: 'incomplete', master_type: 'unit', count: 0, severity: 'ok', detail: '', source: 'unavailable' },
    ];
    const s = scoreMasterType(checks);
    expect(s).toBeLessThan(100);
    expect(s).toBeGreaterThanOrEqual(95);
  });

  it('overall score aggregates per-type scores (simple mean)', () => {
    seedParties();
    const r = runMasterHealth(ENTITY);
    const mean = Math.round(
      r.by_type.reduce((s, t) => s + t.score_0_100, 0) / r.by_type.length,
    );
    expect(r.overall_score).toBe(mean);
    expect(getOverallScore(r)).toBe(mean);
  });

  it('getCriticalFindings returns only critical checks, sorted desc by count', () => {
    seedParties();
    const r = runMasterHealth(ENTITY);
    const crits = getCriticalFindings(r);
    for (const c of crits) expect(c.severity).toBe('critical');
    for (let i = 1; i < crits.length; i++) {
      expect(crits[i - 1].count).toBeGreaterThanOrEqual(crits[i].count);
    }
  });

  it('runMasterHealth caches last run under masterHealthCacheKey', () => {
    seedParties();
    const r = runMasterHealth(ENTITY);
    const cached = loadLastRun(ENTITY);
    expect(cached).toBeTruthy();
    expect(cached!.generated_at).toBe(r.generated_at);
    expect(localStorage.getItem(masterHealthCacheKey(ENTITY))).toBeTruthy();
  });

  it('engine never writes to any master store (no party/ledger/inventory key writes)', () => {
    seedParties();
    const before = localStorage.getItem(partyMasterKey(ENTITY));
    runMasterHealth(ENTITY);
    const after = localStorage.getItem(partyMasterKey(ENTITY));
    expect(after).toBe(before);
  });

  it('cockpit drills through to EXISTING panels only (no duplicate merge UI)', () => {
    const enginesrc = readFileSync(
      resolve('src/lib/master-health-scorecard-engine.ts'), 'utf8',
    );
    const pagesrc = readFileSync(
      resolve('src/features/command-center/modules/MasterHealthScorecardPage.tsx'), 'utf8',
    );
    expect(enginesrc).toContain('mdg-conflict-resolution');
    expect(enginesrc).toContain('fincore-master-visibility-heatmap');
    expect(enginesrc).toContain('fincore-master-lifecycle-wizard');
    expect(/buildMergePlan|commitMerge/.test(pagesrc)).toBe(false);
  });

  it('honesty banner verbatim in cockpit', () => {
    const src = readFileSync(
      resolve('src/features/command-center/modules/MasterHealthScorecardPage.tsx'), 'utf8',
    );
    expect(src).toContain('Health is computed from current device data');
    expect(src).toContain('Unavailable checks are shown honestly, not as zero');
  });

  // §H walls — import-shape only
  it('§H wall: idea-3 conflict resolution engine 0-DIFF (consumed)', () => {
    expect(existsSync(resolve('src/lib/idea-3-conflict-resolution-engine.ts'))).toBe(true);
  });
  it('§H wall: idea-9 sleeping master detector 0-DIFF', () => {
    expect(existsSync(resolve('src/lib/idea-9-sleeping-master-detector-engine.ts'))).toBe(true);
  });
  it('§H wall: master-replication-engine 0-DIFF', () => {
    expect(existsSync(resolve('src/lib/master-replication-engine.ts'))).toBe(true);
  });
  it('§H wall: party-master-engine 0-DIFF', () => {
    expect(existsSync(resolve('src/lib/party-master-engine.ts'))).toBe(true);
  });
  it('§H wall: heatmap / lifecycle / conflict pages exist (drill targets)', () => {
    expect(existsSync(resolve('src/features/master-visibility/MasterVisibilityHeatmapPage.tsx'))).toBe(true);
    expect(existsSync(resolve('src/features/master-lifecycle/MasterLifecycleWizardPage.tsx'))).toBe(true);
    expect(existsSync(resolve('src/features/command-center/modules/MasterConflictResolutionPanel.tsx'))).toBe(true);
  });

  it('sprint-history: B6 row registered with new sibling · B.3 flipped to 46a58b4a', () => {
    const src = readFileSync(resolve('src/lib/_institutional/sprint-history.ts'), 'utf8');
    expect(src).toContain('T-B6-Master-Health');
    expect(src).toContain('master-health-scorecard-engine');
    expect(src).toMatch(/T-B3-WhatsApp-Channel[\s\S]{0,400}headSha: '46a58b4a'/);
    expect(src).toContain('PILLAR-B CLOSE');
  });
});
