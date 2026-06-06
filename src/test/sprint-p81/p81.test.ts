/**
 * P8.1 · Block 7 · Behavioral tests (≥30 it() · LEAN-BEHAVIORAL posture).
 *
 * Scope:
 *   - manifest primitives (record/key/entity tracking + idempotency tokens)
 *   - purge two-sweep correctness + survivor safety
 *   - seedable-domain catalog (computeSeedCoverage honesty)
 *   - storage-key alignment with engine truth (regression for Pass-2 fix)
 *   - SEEDABLE_DOMAINS catalog stability
 *
 * Test posture: behavioral, lean, no future-file tombstones, no exact-count
 * brittle assertions, time-robust `>=` comparisons throughout.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  recordDemoKey, recordDemoKeys,
  recordDemoEntity, recordDemoEntities,
  hasSeederRun, markSeederRun,
  getDemoManifest, purgeDemoData,
  demoSeedManifestKey,
} from '@/lib/demo-seed-manifest';
import {
  SEEDABLE_DOMAINS,
  computeSeedCoverage,
} from '@/lib/demo-seed-orchestrator';

const E = 'TEST-E1';

function reset(): void {
  // jsdom-safe wipe between tests so manifest + storage are pristine.
  try { localStorage.clear(); } catch { /* ignore */ }
}

beforeEach(reset);

// ─────────────────────────────────────────────────────────────────────
// Group A · Manifest primitives (8)
// ─────────────────────────────────────────────────────────────────────
describe('P8.1 · manifest primitives', () => {
  it('starts with an empty manifest', () => {
    const m = getDemoManifest(E);
    expect(m.keys).toEqual([]);
    expect(m.records).toEqual([]);
    expect(m.sentinel).toBe('1');
  });

  it('recordDemoKey tracks a single key', () => {
    recordDemoKey(E, 'erp_demo_alpha');
    expect(getDemoManifest(E).keys).toContain('erp_demo_alpha');
  });

  it('recordDemoKey is idempotent for the same key', () => {
    recordDemoKey(E, 'erp_demo_alpha');
    recordDemoKey(E, 'erp_demo_alpha');
    const keys = getDemoManifest(E).keys.filter((k) => k === 'erp_demo_alpha');
    expect(keys.length).toBe(1);
  });

  it('recordDemoKeys bulk-adds without duplicates', () => {
    recordDemoKeys(E, ['a', 'b', 'c', 'a']);
    expect(getDemoManifest(E).keys.sort()).toEqual(['a', 'b', 'c']);
  });

  it('recordDemoEntity tracks an (key,id) tuple', () => {
    recordDemoEntity(E, 'k1', 'id-1');
    expect(getDemoManifest(E).records).toContainEqual({ key: 'k1', id: 'id-1' });
  });

  it('recordDemoEntities bulk-adds (key,id) tuples without duplicates', () => {
    recordDemoEntities(E, 'k1', ['a', 'b', 'a']);
    const rec = getDemoManifest(E).records.filter((r) => r.key === 'k1');
    expect(rec.map((r) => r.id).sort()).toEqual(['a', 'b']);
  });

  it('hasSeederRun is false initially and true after mark', () => {
    expect(hasSeederRun(E, 'taskflow')).toBe(false);
    markSeederRun(E, 'taskflow');
    expect(hasSeederRun(E, 'taskflow')).toBe(true);
  });

  it('writes manifest under demoSeedManifestKey(entityCode)', () => {
    recordDemoKey(E, 'k');
    const raw = localStorage.getItem(demoSeedManifestKey(E));
    expect(raw).toBeTruthy();
    expect(raw!.includes('"k"')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Group B · Purge two-sweep correctness (10)
// ─────────────────────────────────────────────────────────────────────
describe('P8.1 · purgeDemoData', () => {
  it('returns zero counts on an empty manifest', () => {
    const r = purgeDemoData(E);
    expect(r.keysRemoved).toBe(0);
    expect(r.recordsRemoved).toBe(0);
  });

  it('whole-key sweep removes the entire key', () => {
    localStorage.setItem('demo_whole_key', JSON.stringify([{ id: 'x' }]));
    recordDemoKey(E, 'demo_whole_key');
    const r = purgeDemoData(E);
    expect(r.keysRemoved).toBe(1);
    expect(localStorage.getItem('demo_whole_key')).toBeNull();
  });

  it('whole-key sweep skips missing keys without throwing', () => {
    recordDemoKey(E, 'never_written_key');
    const r = purgeDemoData(E);
    expect(r.keysRemoved).toBe(0);
  });

  it('record-id sweep removes only matching ids', () => {
    localStorage.setItem('mix_key', JSON.stringify([
      { id: 'demo-1', src: 'demo' },
      { id: 'user-1', src: 'user' },
      { id: 'demo-2', src: 'demo' },
    ]));
    recordDemoEntities(E, 'mix_key', ['demo-1', 'demo-2']);
    const r = purgeDemoData(E);
    expect(r.recordsRemoved).toBe(2);
    const survivors = JSON.parse(localStorage.getItem('mix_key')!);
    expect(survivors).toEqual([{ id: 'user-1', src: 'user' }]);
  });

  it('record-id sweep counts missing-key cases separately', () => {
    recordDemoEntity(E, 'absent_key', 'id-a');
    const r = purgeDemoData(E);
    expect(r.recordsSkippedMissing).toBeGreaterThanOrEqual(1);
  });

  it('survivor safety · user records NEVER recorded are preserved', () => {
    localStorage.setItem('shared_key', JSON.stringify([
      { id: 'demo' }, { id: 'user-A' }, { id: 'user-B' },
    ]));
    recordDemoEntity(E, 'shared_key', 'demo');
    purgeDemoData(E);
    const after = JSON.parse(localStorage.getItem('shared_key')!);
    expect(after.find((r: { id: string }) => r.id === 'user-A')).toBeTruthy();
    expect(after.find((r: { id: string }) => r.id === 'user-B')).toBeTruthy();
  });

  it('survivor safety · purging when manifest is empty leaves storage intact', () => {
    localStorage.setItem('user_key', JSON.stringify([{ id: 'u' }]));
    purgeDemoData(E);
    expect(localStorage.getItem('user_key')).not.toBeNull();
  });

  it('purge clears the manifest itself afterwards', () => {
    recordDemoKey(E, 'k');
    purgeDemoData(E);
    expect(localStorage.getItem(demoSeedManifestKey(E))).toBeNull();
  });

  it('purge clears seeder tokens so future seeds can re-run', () => {
    markSeederRun(E, 'taskflow');
    expect(hasSeederRun(E, 'taskflow')).toBe(true);
    purgeDemoData(E);
    expect(hasSeederRun(E, 'taskflow')).toBe(false);
  });

  it('purge handles malformed JSON without throwing', () => {
    localStorage.setItem('bad_json', '{not json');
    recordDemoKey(E, 'bad_json');
    expect(() => purgeDemoData(E)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────
// Group C · Coverage catalog honesty (8)
// ─────────────────────────────────────────────────────────────────────
describe('P8.1 · SEEDABLE_DOMAINS + computeSeedCoverage', () => {
  it('catalog is non-empty and stable as a literal tuple', () => {
    expect(SEEDABLE_DOMAINS.length).toBeGreaterThanOrEqual(15);
  });

  it('catalog includes the six P8.1 new domains', () => {
    for (const d of ['taskflow', 'operix_chat', 'frontdesk',
                     'webstorex', 'ecomx', 'fpa_planning'] as const) {
      expect(SEEDABLE_DOMAINS).toContain(d);
    }
  });

  it('catalog has no duplicate entries', () => {
    expect(new Set(SEEDABLE_DOMAINS).size).toBe(SEEDABLE_DOMAINS.length);
  });

  it('coverage on an empty entity reports zero seeded', () => {
    const c = computeSeedCoverage(E);
    expect(c.seededCount).toBe(0);
    expect(c.percentage).toBe(0);
  });

  it('coverage totalCount matches SEEDABLE_DOMAINS length', () => {
    const c = computeSeedCoverage(E);
    expect(c.totalCount).toBe(SEEDABLE_DOMAINS.length);
  });

  it('seeding masters_customers flips its bit', () => {
    localStorage.setItem('erp_group_customer_master', JSON.stringify([{ id: 'c1' }]));
    const c = computeSeedCoverage(E);
    expect(c.perDomain.masters_customers).toBe(true);
    expect(c.seededCount).toBeGreaterThanOrEqual(1);
  });

  it('an empty array does NOT count as seeded (presence-derived)', () => {
    localStorage.setItem('erp_inventory_items', JSON.stringify([]));
    const c = computeSeedCoverage(E);
    expect(c.perDomain.masters_items).toBe(false);
  });

  it('percentage is a rounded integer 0-100', () => {
    const c = computeSeedCoverage(E);
    expect(c.percentage).toBeGreaterThanOrEqual(0);
    expect(c.percentage).toBeLessThanOrEqual(100);
    expect(Number.isInteger(c.percentage)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Group D · Storage-key alignment regression (6)
// Locks in the Pass-2 correction: seeders and coverage MUST read/write the
// same keys the engines actually use.
// ─────────────────────────────────────────────────────────────────────
describe('P8.1 · storage-key alignment (engine truth)', () => {
  it('taskflow coverage reads taskflow_v1_<entity>', () => {
    localStorage.setItem(`taskflow_v1_${E}`, JSON.stringify([{ id: 't1' }]));
    expect(computeSeedCoverage(E).perDomain.taskflow).toBe(true);
  });

  it('operix_chat coverage reads oc_conversations_<entity>', () => {
    localStorage.setItem(`oc_conversations_${E}`, JSON.stringify([{ id: 'c1' }]));
    expect(computeSeedCoverage(E).perDomain.operix_chat).toBe(true);
  });

  it('frontdesk coverage reads fd_visitors_<entity> OR fd_mail_<entity>', () => {
    localStorage.setItem(`fd_mail_${E}`, JSON.stringify([{ id: 'm1' }]));
    expect(computeSeedCoverage(E).perDomain.frontdesk).toBe(true);
  });

  it('webstorex coverage reads ws_items_<entity>', () => {
    localStorage.setItem(`ws_items_${E}`, JSON.stringify([{ id: 'w1' }]));
    expect(computeSeedCoverage(E).perDomain.webstorex).toBe(true);
  });

  it('ecomx coverage reads ecomx_marketplaces_<entity>', () => {
    localStorage.setItem(`ecomx_marketplaces_${E}`, JSON.stringify([{ id: 'mkt1' }]));
    expect(computeSeedCoverage(E).perDomain.ecomx).toBe(true);
  });

  it('legacy "tf_tasks_" / "chat_conversations_" / "ec_marketplaces_" keys do NOT count', () => {
    localStorage.setItem(`tf_tasks_${E}`, JSON.stringify([{ id: 't1' }]));
    localStorage.setItem(`chat_conversations_${E}`, JSON.stringify([{ id: 'c1' }]));
    localStorage.setItem(`ec_marketplaces_${E}`, JSON.stringify([{ id: 'm1' }]));
    const c = computeSeedCoverage(E);
    expect(c.perDomain.taskflow).toBe(false);
    expect(c.perDomain.operix_chat).toBe(false);
    expect(c.perDomain.ecomx).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Group E · Seeder-options + idempotency wiring (4)
// ─────────────────────────────────────────────────────────────────────
describe('P8.1 · seeder idempotency tokens', () => {
  it('different entities have independent tokens', () => {
    markSeederRun('E1', 'taskflow');
    expect(hasSeederRun('E2', 'taskflow')).toBe(false);
  });

  it('different domains have independent tokens within one entity', () => {
    markSeederRun(E, 'taskflow');
    expect(hasSeederRun(E, 'operix-chat')).toBe(false);
  });

  it('clearing storage resets token state (fresh entity)', () => {
    markSeederRun(E, 'taskflow');
    localStorage.clear();
    expect(hasSeederRun(E, 'taskflow')).toBe(false);
  });

  it('token sentinel value is the literal "1"', () => {
    markSeederRun(E, 'frontdesk');
    expect(localStorage.getItem(`demo_seed_token_${E}_frontdesk`)).toBe('1');
  });
});
