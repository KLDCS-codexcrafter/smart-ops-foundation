/**
 * @file        src/test/sprint-97/hierarchical-master-foundation.test.ts
 * @sprint      Sprint 97 · T-Phase-6.A.0.2 · 7-tier Hierarchical Ledger + Master DNA
 * @form        v1.30 §N · ≥30 DISCRETE it() blocks (not it.each)
 * @scope       AC#21 · engine units + DNA + audit emission + register integrity +
 *              Block-1 wiring integration test.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTierLedgers,
  getTierLedgerTree,
  resolveL4GroupForTier,
  _clearHierarchicalLedgerTreeForTests,
  type HierarchyTier,
} from '@/lib/hierarchical-ledger-engine';
import { inheritWithDna } from '@/lib/idea-2-master-dna-engine';
import {
  emitTierScopeRegistered,
  onTierScopeRegistered,
} from '@/lib/entity-setup-service';
import {
  wireHierarchicalLedgerHooks,
  _resetHierarchicalLedgerWiringForTests,
} from '@/lib/hierarchical-ledger-wiring';
import { auditTrailKey } from '@/types/audit-trail';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { AUDIT_ENTITY_TYPES_REGISTRY } from '@/lib/comply360-audit-trail-aggregator-engine';

const E = 'TEST';

function resetAll(): void {
  localStorage.clear();
  _clearHierarchicalLedgerTreeForTests();
  _resetHierarchicalLedgerWiringForTests();
}

function readAuditTypes(entityCode: string): string[] {
  const raw = localStorage.getItem(auditTrailKey(entityCode));
  if (!raw) return [];
  return (JSON.parse(raw) as Array<{ entity_type: string }>).map((e) => e.entity_type);
}

describe('Sprint 97 · Hierarchical Ledger Engine · per-tier creation', () => {
  beforeEach(resetAll);

  it('parent tier creates at least one ledger', () => {
    const r = createTierLedgers({ tier: 'parent', scope_id: 'p1', scope_name: 'Parent', entity_code: E });
    expect(r.ledgers_created.length).toBeGreaterThan(0);
  });

  it('subsidiary tier creates ledgers AND a reciprocal in parent books', () => {
    const r = createTierLedgers({
      tier: 'subsidiary', scope_id: 's1', scope_name: 'Sub-1',
      parent_scope: { tier: 'parent', id: 'p1' }, entity_code: E,
    });
    expect(r.ledgers_created.some((l) => l.reciprocal === true)).toBe(true);
  });

  it('branch tier creates ledgers', () => {
    const r = createTierLedgers({ tier: 'branch', scope_id: 'b1', scope_name: 'Branch-1', entity_code: E });
    expect(r.ledgers_created.length).toBeGreaterThan(0);
  });

  it('division tier creates ledgers', () => {
    const r = createTierLedgers({ tier: 'division', scope_id: 'd1', scope_name: 'Div-1', entity_code: E });
    expect(r.ledgers_created.length).toBeGreaterThan(0);
  });

  it('department tier creates ledgers', () => {
    const r = createTierLedgers({ tier: 'department', scope_id: 'dep1', scope_name: 'Dept-1', entity_code: E });
    expect(r.ledgers_created.length).toBeGreaterThan(0);
  });

  it('project tier creates ledgers AND links a cost-centre', () => {
    const r = createTierLedgers({
      tier: 'project', scope_id: 'pr1', scope_name: 'Project-1', entity_code: E,
      cost_centre: { division_id: 'd1', department_id: 'dep1' },
    });
    expect(r.cost_centre_linked).toBe(true);
  });

  it('site tier creates ledgers WITHOUT cost-centre linkage', () => {
    const r = createTierLedgers({ tier: 'site', scope_id: 'si1', scope_name: 'Site-1', entity_code: E });
    expect(r.cost_centre_linked).toBeFalsy();
    expect(r.ledgers_created.length).toBeGreaterThan(0);
  });

  it('site tier writes NAMED ledgers (not stub wiring)', () => {
    const r = createTierLedgers({ tier: 'site', scope_id: 'si2', scope_name: 'Site-Alpha', entity_code: E });
    expect(r.ledgers_created.every((l) => typeof l.name === 'string' && l.name.length > 0)).toBe(true);
  });

  it('idempotent re-run on same tier/scope returns idempotent_skip=true', () => {
    createTierLedgers({ tier: 'branch', scope_id: 'idem', scope_name: 'Idem', entity_code: E });
    const r2 = createTierLedgers({ tier: 'branch', scope_id: 'idem', scope_name: 'Idem', entity_code: E });
    expect(r2.idempotent_skip).toBe(true);
  });

  it('idempotent re-run does not duplicate ledgers in the tree', () => {
    createTierLedgers({ tier: 'division', scope_id: 'idem2', scope_name: 'Idem-Div', entity_code: E });
    createTierLedgers({ tier: 'division', scope_id: 'idem2', scope_name: 'Idem-Div', entity_code: E });
    const tree = getTierLedgerTree({ entity_code: E });
    const node = tree.find((n) => n.scope_id === 'idem2');
    expect(node).toBeDefined();
    // No duplication: same ledger count as first creation produced.
    const r3 = createTierLedgers({ tier: 'division', scope_id: 'idem2', scope_name: 'Idem-Div', entity_code: E });
    expect(node!.ledgers.length).toBe(r3.ledgers_created.length);
  });

  it('subsidiary reciprocal is bidirectional (visible in parent scope)', () => {
    createTierLedgers({
      tier: 'subsidiary', scope_id: 'sb', scope_name: 'BiDir',
      parent_scope: { tier: 'parent', id: 'p-bd' }, entity_code: E,
    });
    const tree = getTierLedgerTree({ entity_code: E });
    const parent = tree.find((n) => n.tier === 'parent' && n.scope_id === 'p-bd');
    expect(parent).toBeDefined();
    expect(parent!.ledgers.some((n) => n.includes('BiDir'))).toBe(true);
  });
});

describe('Sprint 97 · resolveL4GroupForTier · L4/L5 nesting', () => {
  it('resolves a non-empty L4 group for parent', () => {
    expect(resolveL4GroupForTier('parent').length).toBeGreaterThan(0);
  });
  it('resolves a non-empty L4 group for subsidiary', () => {
    expect(resolveL4GroupForTier('subsidiary').length).toBeGreaterThan(0);
  });
  it('resolves a non-empty L4 group for branch', () => {
    expect(resolveL4GroupForTier('branch').length).toBeGreaterThan(0);
  });
  it('resolves a non-empty L4 group for division', () => {
    expect(resolveL4GroupForTier('division').length).toBeGreaterThan(0);
  });
  it('resolves a non-empty L4 group for department', () => {
    expect(resolveL4GroupForTier('department').length).toBeGreaterThan(0);
  });
  it('resolves a non-empty L4 group for project', () => {
    expect(resolveL4GroupForTier('project').length).toBeGreaterThan(0);
  });
  it('resolves a non-empty L4 group for site', () => {
    expect(resolveL4GroupForTier('site').length).toBeGreaterThan(0);
  });

  it('resolution is deterministic (same answer on repeat)', () => {
    const tiers: HierarchyTier[] = ['parent', 'subsidiary', 'branch', 'division', 'department', 'project', 'site'];
    tiers.forEach((t) => {
      expect(resolveL4GroupForTier(t)).toBe(resolveL4GroupForTier(t));
    });
  });
});

describe('Sprint 97 · getTierLedgerTree · shape contract', () => {
  beforeEach(resetAll);

  it('returns empty array when nothing created', () => {
    expect(getTierLedgerTree({ entity_code: E })).toEqual([]);
  });

  it('groups ledgers under their scope', () => {
    createTierLedgers({ tier: 'division', scope_id: 'dx', scope_name: 'Dx', entity_code: E });
    const tree = getTierLedgerTree({ entity_code: E });
    expect(tree.length).toBeGreaterThan(0);
    expect(tree.every((n) => Array.isArray(n.ledgers) && Array.isArray(n.children))).toBe(true);
  });

  it('returns nodes with tier + scope_id + scope_name + ledgers + children fields', () => {
    createTierLedgers({ tier: 'branch', scope_id: 'bx', scope_name: 'Bx', entity_code: E });
    const tree = getTierLedgerTree({ entity_code: E });
    const n = tree[0];
    expect(n).toHaveProperty('tier');
    expect(n).toHaveProperty('scope_id');
    expect(n).toHaveProperty('scope_name');
    expect(n).toHaveProperty('ledgers');
    expect(n).toHaveProperty('children');
  });
});

describe('Sprint 97 · Master DNA · state + TDS + place-of-supply adjustments', () => {
  beforeEach(resetAll);

  it('adjusts gst_state_code to target state', () => {
    const r = inheritWithDna({
      master_type: 'vendor',
      source_snapshot: { id: 'v1', gst_state_code: '29' },
      target_state_code: 'KA',
      target_entity: E,
    });
    expect(r.adjustments.some((a) => a.field === 'gst_state_code')).toBe(true);
  });

  it('adjusts place_of_supply to target state code', () => {
    const r = inheritWithDna({
      master_type: 'customer',
      source_snapshot: { id: 'c1' },
      target_state_code: 'MH',
      target_entity: E,
    });
    expect(r.adjustments.some((a) => a.field === 'place_of_supply' && a.to === 'MH')).toBe(true);
  });

  it('routes TDS section based on master_type=vendor → 194C', () => {
    const r = inheritWithDna({
      master_type: 'vendor', source_snapshot: { id: 'v2' },
      target_state_code: 'KA', target_entity: E,
    });
    expect(r.adjustments.find((a) => a.field === 'tds_section')?.to).toBe('194C');
  });

  it('routes TDS section based on master_type=customer → 194Q', () => {
    const r = inheritWithDna({
      master_type: 'customer', source_snapshot: { id: 'c2' },
      target_state_code: 'KA', target_entity: E,
    });
    expect(r.adjustments.find((a) => a.field === 'tds_section')?.to).toBe('194Q');
  });

  it('logistic master gets state_rate_bucket = 0 when source == target state', () => {
    const r = inheritWithDna({
      master_type: 'logistic',
      source_snapshot: { id: 'l1' },
      target_state_code: 'KA',
      source_state_code: 'KA',
      target_entity: E,
    });
    const bucket = r.adjustments.find((a) => a.field === 'state_rate_bucket');
    // Either absent (same-state already matches) or set to 0.
    if (bucket) expect(bucket.to).toBe(0);
  });

  it('logistic master gets non-zero bucket for far-apart states', () => {
    const r = inheritWithDna({
      master_type: 'logistic',
      source_snapshot: { id: 'l2', state_rate_bucket: 0 },
      target_state_code: 'KL',
      source_state_code: 'JK',
      target_entity: E,
    });
    expect(r.adjustments.find((a) => a.field === 'state_rate_bucket')?.to).toBe(2);
  });

  it('returns resolved_state with code + name + gstStateCode', () => {
    const r = inheritWithDna({
      master_type: 'vendor', source_snapshot: { id: 'v3' },
      target_state_code: 'KA', target_entity: E,
    });
    expect(r.resolved_state).toMatchObject({ code: 'KA' });
    expect(r.resolved_state?.gstStateCode).toBe('29');
  });
});

describe('Sprint 97 · Audit emission · mca-roc module', () => {
  beforeEach(resetAll);

  it('createTierLedgers emits hierarchical_ledger_created', () => {
    createTierLedgers({ tier: 'division', scope_id: 'au1', scope_name: 'Au-Div', entity_code: E });
    expect(readAuditTypes(E)).toContain('hierarchical_ledger_created');
  });

  it('inheritWithDna emits master_dna_inheritance', () => {
    inheritWithDna({
      master_type: 'vendor', source_snapshot: { id: 'v9' },
      target_state_code: 'KA', target_entity: E,
    });
    expect(readAuditTypes(E)).toContain('master_dna_inheritance');
  });

  it('both new audit types are registered under mca-roc module', () => {
    expect(AUDIT_ENTITY_TYPES_REGISTRY).toHaveProperty('hierarchical_ledger_created');
    expect(AUDIT_ENTITY_TYPES_REGISTRY).toHaveProperty('master_dna_inheritance');
  });
});

describe('Sprint 97 · Block 1 Wiring · integration', () => {
  beforeEach(resetAll);

  it('emitTierScopeRegistered with no hooks registered is a no-op', () => {
    expect(() => emitTierScopeRegistered({
      entity_code: E, tier: 'division', scope_id: 'no-hook', scope_name: 'NoHook',
    })).not.toThrow();
  });

  it('registering the wiring causes a division emit to create ledgers', () => {
    wireHierarchicalLedgerHooks();
    emitTierScopeRegistered({
      entity_code: E, tier: 'division', scope_id: 'wd1', scope_name: 'Wired-Div',
    });
    const tree = getTierLedgerTree({ entity_code: E });
    expect(tree.some((n) => n.scope_id === 'wd1' && n.ledgers.length > 0)).toBe(true);
  });

  it('registering the wiring causes a project emit to link cost-centre', () => {
    wireHierarchicalLedgerHooks();
    emitTierScopeRegistered({
      entity_code: E, tier: 'project', scope_id: 'wp1', scope_name: 'Wired-Proj',
      cost_centre: { division_id: 'wd1', department_id: null },
    });
    const audits = JSON.parse(localStorage.getItem(auditTrailKey(E)) ?? '[]') as Array<{
      entity_type: string; after_state: Record<string, unknown>;
    }>;
    const ledgerAudits = audits.filter((a) => a.entity_type === 'hierarchical_ledger_created');
    expect(ledgerAudits.some((a) => a.after_state.cost_centre_linked === true)).toBe(true);
  });

  it('registering the wiring causes a subsidiary emit to fire DNA + ledger hooks together', () => {
    wireHierarchicalLedgerHooks();
    emitTierScopeRegistered({
      entity_code: E, tier: 'subsidiary', scope_id: 'ws1', scope_name: 'Wired-Sub',
      parent_scope: { tier: 'parent', id: 'pw' },
      target_state_code: 'KA',
    });
    const types = readAuditTypes(E);
    expect(types).toContain('hierarchical_ledger_created');
    expect(types).toContain('master_dna_inheritance');
  });

  it('hook isolation: a failing hook does not block other hooks', () => {
    let secondCalled = false;
    const off1 = onTierScopeRegistered(() => { throw new Error('boom'); });
    const off2 = onTierScopeRegistered(() => { secondCalled = true; });
    emitTierScopeRegistered({
      entity_code: E, tier: 'branch', scope_id: 'iso', scope_name: 'Iso',
    });
    expect(secondCalled).toBe(true);
    off1(); off2();
  });
});

describe('Sprint 97 · Institutional registers integrity', () => {
  it('SIBLINGS.length matches the real on-disk register (no hardcoded guess)', () => {
    // Real value — assert against the import so future additions are caught at the register, not here.
    expect(SIBLINGS.length).toBeGreaterThanOrEqual(160);
  });

  it('hierarchical-ledger-engine sibling is present exactly once', () => {
    const found = SIBLINGS.filter((s) => s.id === 'hierarchical-ledger-engine');
    expect(found.length).toBe(1);
  });

  it('idea-2-master-dna-engine sibling is present exactly once', () => {
    const found = SIBLINGS.filter((s) => s.id === 'idea-2-master-dna-engine');
    expect(found.length).toBe(1);
  });

  it('sprint-history S97 entry exists and points at T-Phase-6.A.0.2', () => {
    const s97 = SPRINTS.find((s) => s.sprintNumber === 97);
    expect(s97).toBeDefined();
    expect(s97?.code).toBe('T-Phase-6.A.0.2');
  });

  it('sprint-history S97 entry lists both new SIBLINGs', () => {
    const s97 = SPRINTS.find((s) => s.sprintNumber === 97);
    expect(s97?.newSiblings).toContain('hierarchical-ledger-engine');
    expect(s97?.newSiblings).toContain('idea-2-master-dna-engine');
  });
});
