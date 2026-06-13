/**
 * @sprint T-B1-Abdos-Group-Seed · capstone behavioural test
 *
 * Verifies the multi-entity ABDOS group seed end-to-end:
 *   · 6 entities registered
 *   · 5 structure nodes with all 3 Ind-AS methods present
 *   · 5 non-empty per-entity TBs (subsidiaries)
 *   · ≥1 IC transaction posted
 *   · consolidate({fy:'2024-25'}) returns entity_count≥4 + eliminations_applied≥1 + balanced=true
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { seedAbdosGroup, ABDOS_GROUP_ENTITIES } from '@/data/demo-abdos-group';
import { loadEntities } from '@/data/mock-entities';
import { listGroupStructure } from '@/lib/intercompany-group-structure-engine';
import { listICTransactions } from '@/lib/intercompany-transaction-engine';
import { vouchersKey } from '@/lib/fincore-engine';
import { consolidate } from '@/lib/group-consolidation-engine';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

describe('T-B1-Abdos-Group-Seed · multi-entity group seed', () => {
  beforeEach(() => localStorage.clear());

  it('Block 1 · registers parent + 5 subsidiaries (6 total)', () => {
    seedAbdosGroup();
    const entities = loadEntities();
    for (const e of ABDOS_GROUP_ENTITIES) {
      const found = entities.find(x => x.shortCode === e.shortCode);
      expect(found, `entity ${e.shortCode} missing`).toBeTruthy();
    }
    const parent = entities.find(e => e.shortCode === 'ABDOS');
    expect(parent?.type).toBe('parent');
    const subs = entities.filter(e =>
      ['ABLSC','ABCMF','ABPKG','ABDST','ABHHC'].includes(e.shortCode),
    );
    expect(subs).toHaveLength(5);
  });

  it('Block 2 · seeds 5 structure nodes with ALL 3 Ind-AS methods', () => {
    seedAbdosGroup();
    const nodes = listGroupStructure();
    const ourIds = ABDOS_GROUP_ENTITIES.filter(e => e.id !== 'e-abdos').map(e => e.id);
    const ours = nodes.filter(n => ourIds.includes(n.entity_id));
    expect(ours).toHaveLength(5);
    const methods = new Set(ours.map(n => n.consolidation_method));
    expect(methods.has('full')).toBe(true);
    expect(methods.has('proportional')).toBe(true);
    expect(methods.has('equity')).toBe(true);
    // ownership mix
    const byId = Object.fromEntries(ours.map(n => [n.entity_id, n]));
    expect(byId['e-abdst'].ownership_pct).toBe(60);
    expect(byId['e-abhhc'].ownership_pct).toBe(30);
  });

  it('Block 3 · each subsidiary vouchers key reads back non-empty posted rows', () => {
    seedAbdosGroup();
    for (const code of ['ABLSC','ABCMF','ABPKG','ABDST','ABHHC']) {
      const raw = localStorage.getItem(vouchersKey(code));
      expect(raw, `${code} vouchers key empty`).toBeTruthy();
      const arr = JSON.parse(raw!);
      expect(arr.length, `${code} vouchers empty`).toBeGreaterThan(0);
      expect(arr.some((v: { status: string }) => v.status === 'posted')).toBe(true);
    }
  });

  it('Block 4 · seeds ≥3 IC transactions (and at least one posts)', () => {
    seedAbdosGroup();
    const txns = listICTransactions();
    expect(txns.length).toBeGreaterThanOrEqual(3);
    expect(txns.some(t => t.status === 'posted')).toBe(true);
  });

  it('Capstone · consolidate({fy}) returns entity_count≥4 + eliminations_applied≥1 + balanced', () => {
    seedAbdosGroup();
    const c = consolidate({ fy: '2024-25' });
    // 5 child structure nodes contribute (parent isn't in the structure side-store)
    expect(c.entity_count).toBeGreaterThanOrEqual(4);
    expect(c.eliminations_applied).toBeGreaterThanOrEqual(1);
    expect(c.balanced).toBe(true);
    // consolidated TB has real lines
    expect(c.lines.length).toBeGreaterThan(0);
  });

  it('institutional · T-B1-Abdos-Group-Seed self-seeded with predecessor dcd42db', () => {
    const s = SPRINTS.find(x => x.code === 'T-B1-Abdos-Group-Seed');
    expect(s).toBeTruthy();
    expect(s!.predecessorSha).toBe('dcd42db');
    expect(s!.newSiblings).toEqual([]);
  });
});
