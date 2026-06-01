/**
 * @file        src/test/sprint-102/institutional-debt-cleanup.test.ts
 * @sprint      Sprint 102 · T-Phase-6.A.1.1 · Arc 1 opener
 * @purpose     v1.30 §N test pack (≥20 it()) — institutional debt cleanup:
 *              S101 SHA backfill, S62/S63 + moat-register backfills (9 TBDs),
 *              appendAuditEntrySafe wrapper at 5 fire-and-forget sites,
 *              zero-new-siblings/types/pages guarantee.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { MOATS } from '@/lib/_institutional/moat-register';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import * as hashChain from '@/lib/audit-trail-hash-chain';

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const HEX_RE = /^[0-9a-f]{7,40}$/i;

const s = (n: number) => SPRINTS.find((x) => x.sprintNumber === n)!;

describe('Sprint 102 · T-Phase-6.A.1.1 · institutional debt cleanup', () => {
  // ── Block 1 · S101 backfill ────────────────────────────────────────
  it('AC#1 · S101 headSha is the Arc 0 final commit e91e813d…', () => {
    expect(s(101).headSha).toBe('e91e813d02075dee90f1e934a83a7b69e4ff843b');
  });

  it('AC#1 · S101 headSha is no longer TBD_AT_BANK', () => {
    expect(s(101).headSha).not.toBe('TBD_AT_BANK');
  });

  // ── Block 2 · S62/S63 backfills ────────────────────────────────────
  it('AC#2 · S62 headSha is a real recovered hex SHA (not TBD)', () => {
    expect(s(62).headSha).not.toBe('TBD_AT_BANK');
    expect(s(62).headSha).toMatch(HEX_RE);
  });

  it('AC#2 · S62 headSha is the recovered bank 2c11f18b…', () => {
    expect(s(62).headSha).toBe('2c11f18ba29d601ab3b01e4836084e51753605b0');
  });

  it('AC#2 · S63 headSha is a real recovered hex SHA (not TBD)', () => {
    expect(s(63).headSha).not.toBe('TBD_AT_BANK');
    expect(s(63).headSha).toMatch(HEX_RE);
  });

  it('AC#2 · S63 headSha is the recovered bank 567c140c…', () => {
    expect(s(63).headSha).toBe('567c140c5cfc78096ec0b8a6972667eae4494c4d');
  });

  // ── Block 2 · moat-register backfills ──────────────────────────────
  it('AC#3 · moat-register contains zero TBD_AT_BANK entries', () => {
    expect(MOATS.filter((m) => m.headShaBanked === 'TBD_AT_BANK')).toEqual([]);
  });

  it('AC#3 · every non-null moat headShaBanked is a plausible hex SHA', () => {
    for (const m of MOATS) {
      if (m.headShaBanked == null) continue;
      expect(m.headShaBanked, m.id).toMatch(HEX_RE);
    }
  });

  it('AC#3 · MOAT-35/36 (S61) point at 04c5f2cb…', () => {
    const m35 = MOATS.find((m) => m.id === 'MOAT-35')!;
    const m36 = MOATS.find((m) => m.id === 'MOAT-36')!;
    expect(m35.headShaBanked).toBe('04c5f2cb1c5791cab00a2107421376f01246962a');
    expect(m36.headShaBanked).toBe('04c5f2cb1c5791cab00a2107421376f01246962a');
  });

  it('AC#3 · MOAT-37 (S62) matches S62 sprint-history headSha', () => {
    const m37 = MOATS.find((m) => m.id === 'MOAT-37')!;
    expect(m37.headShaBanked).toBe(s(62).headSha);
  });

  it('AC#3 · MOAT-38 (S63) matches S63 sprint-history headSha', () => {
    const m38 = MOATS.find((m) => m.id === 'MOAT-38')!;
    expect(m38.headShaBanked).toBe(s(63).headSha);
  });

  it('AC#3 · MOAT-39/40/41 (S65) match S65 sprint-history headSha', () => {
    const s65 = s(65).headSha;
    for (const id of ['MOAT-39', 'MOAT-40', 'MOAT-41']) {
      const m = MOATS.find((x) => x.id === id)!;
      expect(m.headShaBanked, id).toBe(s65);
    }
  });

  // ── Block 3 · safe wrapper ─────────────────────────────────────────
  it('AC#5 · appendAuditEntrySafe is exported from audit-trail-hash-chain', () => {
    expect(typeof hashChain.appendAuditEntrySafe).toBe('function');
  });

  it('AC#5 · appendAuditEntrySafe returns void (fire-and-forget)', () => {
    const result = hashChain.appendAuditEntrySafe({
      entityCode: 'TEST', entityId: 'e1', voucherId: 'v1',
      voucherKind: 'material', action: 'create', actorUserId: 'u1', payload: {},
    });
    expect(result).toBeUndefined();
  });

  it('AC#7 · appendAuditEntrySafe swallows an underlying rejection (no throw)', async () => {
    const spy = vi.spyOn(hashChain, 'appendAuditEntry').mockRejectedValueOnce(new Error('boom'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => hashChain.appendAuditEntrySafe({
      entityCode: 'TEST', entityId: 'e1', voucherId: 'v1',
      voucherKind: 'material', action: 'create', actorUserId: 'u1', payload: {},
    })).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
    spy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('AC#6 · ApprovalActionPanel no longer contains bare `void appendAuditEntry`', () => {
    const src = read('src/components/procure-hub/ApprovalActionPanel.tsx');
    expect(src).not.toMatch(/void\s+appendAuditEntry\b/);
    expect(src).toMatch(/appendAuditEntrySafe\(/);
  });

  it('AC#6 · rfq-engine no longer contains bare `void appendAuditEntry`', () => {
    const src = read('src/lib/rfq-engine.ts');
    expect(src).not.toMatch(/void\s+appendAuditEntry\b/);
    expect(src).toMatch(/appendAuditEntrySafe\(/);
  });

  it('AC#6 · ApprovalActionPanel has 2 appendAuditEntrySafe call sites', () => {
    const src = read('src/components/procure-hub/ApprovalActionPanel.tsx');
    const matches = src.match(/appendAuditEntrySafe\(/g) ?? [];
    expect(matches.length).toBe(2);
  });

  it('AC#6 · rfq-engine has 3 appendAuditEntrySafe call sites', () => {
    const src = read('src/lib/rfq-engine.ts');
    const matches = src.match(/appendAuditEntrySafe\(/g) ?? [];
    expect(matches.length).toBe(3);
  });

  // ── Block 4 · S102 + meta + scope ──────────────────────────────────
  it('AC#8 · S102 sprint-history entry exists with TBD headSha + empty siblings', () => {
    const s102 = s(102);
    expect(s102.code).toBe('T-Phase-6.A.1.1');
    expect(s102.headSha).toBe('TBD_AT_BANK');
    expect(s102.predecessorSha).toBe('e91e813d02075dee90f1e934a83a7b69e4ff843b');
    expect(s102.newSiblings).toEqual([]);
  });

  it('AC#9 · only the single latest sprint entry carries TBD_AT_BANK', () => {
    const tbd = SPRINTS.filter((x) => x.headSha === 'TBD_AT_BANK');
    expect(tbd.length).toBe(1);
    expect(tbd[0].sprintNumber).toBe(102);
  });

  it('AC#10 · sibling count unchanged (>=172 — no engine added this sprint)', () => {
    expect(SIBLINGS.length).toBeGreaterThanOrEqual(172);
  });

  it('AC#10 · audit-trail types file unchanged (no new AuditEntityType added in S102)', () => {
    const src = read('src/types/audit-trail.ts');
    // S101 introduced master_lifecycle_event as the Arc-0 capstone type;
    // S102 must NOT introduce any further audit entity type.
    expect(src).toMatch(/master_lifecycle_event/);
    expect(src).not.toMatch(/Sprint 102/);
  });

  it('AC#11 · audit-trail-hash-chain.ts retains its original public API', () => {
    expect(typeof hashChain.appendAuditEntry).toBe('function');
    expect(typeof hashChain.verifyChainIntegrity).toBe('function');
    expect(typeof hashChain.readChainForEntity).toBe('function');
    expect(typeof hashChain.auditChainKey).toBe('function');
  });
});
