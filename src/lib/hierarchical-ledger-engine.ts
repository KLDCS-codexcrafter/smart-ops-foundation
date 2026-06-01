/**
 * @file        src/lib/hierarchical-ledger-engine.ts
 * @sibling     NEW @ Sprint 97 · T-Phase-6.A.0.2 · Arc 0 Master Data Foundation
 * @realizes    7-tier hierarchical ledger auto-creation engine. When ANY tier
 *              (Parent / Subsidiary / Branch / Division / Department / Project /
 *              Site) is saved, the matching FinFrame L4/L5 ledger sub-tree is
 *              auto-created and nested under the correct L4 industry group.
 *              Cost-centre link is project-only (org-structure architectural lock).
 *
 *              Subsidiary tier reimplements the bidirectional pattern from
 *              entity-setup-service.createBDLedgers (PRIVATE there per
 *              Q-LOCK S97-1 — pattern-cloned in-engine, NOT imported).
 *              Site tier creates named ledger accounts only — SiteRABill /
 *              SiteImprest stubs are deferred (Q-LOCK S97-4 · do NOT wire).
 *
 * @reads-from  finframe-seed-data (L4 industry packs · USE-SITE READ)
 *              entity-setup-service (USE-SITE READ; existing 0-DIFF)
 *              types/projx/project-centre · types/sitex
 * @sprint      Sprint 97 · T-Phase-6.A.0.2
 * [JWT] Phase 8: POST /api/hierarchy/tier-save · GET /api/hierarchy/ledger-tree
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { registerAuditEntityType } from '@/lib/comply360-audit-trail-aggregator-engine';
import { L4_INDUSTRY_PACKS } from '@/data/finframe-seed-data';

export const READS_FROM = {
  engines: ['finframe-seed-data', 'entity-setup-service'],
  storage_keys: [
    'erp_group_ledger_definitions',
    'erp_group_finframe_l4_groups',
    'erp_hierarchical_ledger_tree_*',
  ],
  types: ['projx/project-centre', 'sitex'],
} as const;

// ─── Q-LOCK S97-5 · Register the owned audit entity type under 'mca-roc' ───
registerAuditEntityType({
  id: 'hierarchical_ledger_created',
  module: 'mca-roc',
  label: 'Hierarchical Ledger Auto-Creation Event',
});

// ─── Contract types ────────────────────────────────────────────────────

export type HierarchyTier =
  | 'parent' | 'subsidiary' | 'branch' | 'division'
  | 'department' | 'project' | 'site';

export interface LedgerCreationResult {
  tier: HierarchyTier;
  scope_id: string;
  scope_name: string;
  ledgers_created: { name: string; l4_group: string; reciprocal?: boolean }[];
  cost_centre_linked?: boolean;
  idempotent_skip?: boolean;
}

export interface TierLedgerNode {
  tier: HierarchyTier;
  scope_id: string;
  scope_name: string;
  ledgers: string[];
  children: TierLedgerNode[];
}

interface PersistedLedger {
  id: string;
  tier: HierarchyTier;
  scope_id: string;
  scope_name: string;
  name: string;
  l4_group: string;
  parent_scope?: { tier: HierarchyTier; id: string };
  reciprocal?: boolean;
  cost_centre_link?: { division_id: string | null; department_id: string | null };
  created_at: string;
}

// ─── L4 group resolution (FinFrame USE-SITE READ) ──────────────────────

/**
 * Returns the canonical L4 group name for a given tier. Resolves against the
 * L4 industry packs in finframe-seed-data when a matching seeded group exists;
 * falls back to the documented tier label otherwise. Naming is deterministic
 * so re-runs are idempotent.
 */
export function resolveL4GroupForTier(tier: HierarchyTier): string {
  // Flatten all industry packs once · search by canonical sub-group name.
  const allGroups = Object.values(L4_INDUSTRY_PACKS).flat();
  const targetByTier: Record<HierarchyTier, string[]> = {
    parent:     ['Inter-Company Accounts', 'Branch & Division Accounts'],
    subsidiary: ['Branch & Division Accounts', 'Inter-Company Accounts'],
    branch:     ['Branch & Division Accounts'],
    division:   ['Division Accounts', 'Branch & Division Accounts'],
    department: ['Division Accounts', 'Branch & Division Accounts'],
    project:    ['Project Accounts', 'Work in Progress', 'Loans & Advances (Asset)'],
    site:       ['Site Accounts', 'Project Accounts', 'Branch & Division Accounts'],
  };
  for (const candidate of targetByTier[tier]) {
    if (allGroups.some((g) => g.name === candidate)) return candidate;
  }
  // Deterministic fallback (named per tier).
  const fallback: Record<HierarchyTier, string> = {
    parent: 'Inter-Company Accounts',
    subsidiary: 'Branch & Division Accounts',
    branch: 'Branch & Division Accounts',
    division: 'Division Accounts',
    department: 'Division Accounts',
    project: 'Project Accounts',
    site: 'Site Accounts',
  };
  return fallback[tier];
}

// ─── Persistence helpers ───────────────────────────────────────────────

const LEDGER_KEY = 'erp_hierarchical_ledger_tree';

interface PersistedShape {
  ledgers: PersistedLedger[];
}

function readPersisted(): PersistedShape {
  try {
    // [JWT] GET /api/hierarchy/ledger-tree
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return { ledgers: [] };
    const parsed = JSON.parse(raw) as PersistedShape;
    if (!parsed || !Array.isArray(parsed.ledgers)) return { ledgers: [] };
    return parsed;
  } catch { return { ledgers: [] }; }
}

function writePersisted(shape: PersistedShape): void {
  try {
    // [JWT] POST /api/hierarchy/ledger-tree
    localStorage.setItem(LEDGER_KEY, JSON.stringify(shape));
  } catch { /* quota — ignore */ }
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `hl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Per-tier ledger plans ─────────────────────────────────────────────

interface PlanInput {
  tier: HierarchyTier;
  scope_id: string;
  scope_name: string;
  parent_scope?: { tier: HierarchyTier; id: string };
  cost_centre?: { division_id: string | null; department_id: string | null };
}

interface PlannedLedger {
  name: string;
  l4_group: string;
  reciprocal?: boolean;
  cost_centre_link?: { division_id: string | null; department_id: string | null };
}

/**
 * Per-tier deterministic ledger list. Subsidiary uses the bidirectional
 * pattern: an "<Entity> A/c" in this entity's books plus a reciprocal
 * "<Owner> A/c" in the sibling's books — pattern cloned from
 * entity-setup-service.createBDLedgers (Q-LOCK S97-1 reimpl).
 */
function planLedgersForTier(input: PlanInput): PlannedLedger[] {
  const l4 = resolveL4GroupForTier(input.tier);
  const name = input.scope_name;
  switch (input.tier) {
    case 'parent':
      // 1 named control ledger per parent · siblings auto-appended on subsidiary add.
      return [{ name: `${name} Internal Transactions A/c`, l4_group: l4 }];
    case 'subsidiary':
      // Bidirectional reciprocity — reimplemented createBDLedgers pattern.
      return [
        { name: `${name} A/c`, l4_group: l4, reciprocal: false },
        { name: `${name} Reciprocal A/c`, l4_group: l4, reciprocal: true },
      ];
    case 'branch':
      return [
        { name: `${name} A/c`, l4_group: l4 },
        { name: `${name} Reciprocal A/c`, l4_group: l4, reciprocal: true },
      ];
    case 'division':
      return [
        { name: `${name} Internal A/c`, l4_group: l4 },
        { name: `${name} Inter-Division Transfer A/c`, l4_group: l4 },
      ];
    case 'department':
      // L5 nesting under the parent division ledger · cost-tagged at the
      // ledger name (FinFrame L5 is the leaf-level convention; we do not
      // mutate the L4 seed).
      return [{ name: `${name} A/c`, l4_group: l4 }];
    case 'project': {
      const cc = input.cost_centre ?? { division_id: null, department_id: null };
      return [
        { name: `${name} WIP A/c`, l4_group: l4, cost_centre_link: cc },
        { name: `${name} Receivable A/c`, l4_group: l4, cost_centre_link: cc },
        { name: `${name} Cost A/c`, l4_group: l4, cost_centre_link: cc },
      ];
    }
    case 'site':
      // Named ledger accounts ONLY — Q-LOCK S97-4 · do NOT wire to deferred
      // SiteRABill / SiteImprest stubs.
      return [
        { name: `${name} Imprest A/c`, l4_group: l4 },
        { name: `${name} RA Bill Payable A/c`, l4_group: l4 },
        { name: `${name} Capitalization A/c`, l4_group: l4 },
      ];
  }
}

// ─── Public API ────────────────────────────────────────────────────────

export interface CreateTierLedgersInput {
  tier: HierarchyTier;
  scope_id: string;
  scope_name: string;
  parent_scope?: { tier: HierarchyTier; id: string };
  /** Project tier only — pulled from ProjectCentre.{division_id,department_id} */
  cost_centre?: { division_id: string | null; department_id: string | null };
  /** Entity code used for audit-log scoping (defaults to 'GLOBAL'). */
  entity_code?: string;
}

/**
 * Idempotently auto-create the ledger sub-tree for a freshly-saved tier.
 * Returns a per-tier creation report. Re-invocation for an already-created
 * (tier, scope_id) is a no-op — `idempotent_skip = true`.
 */
export function createTierLedgers(input: CreateTierLedgersInput): LedgerCreationResult {
  const persisted = readPersisted();
  const already = persisted.ledgers.some(
    (l) => l.tier === input.tier && l.scope_id === input.scope_id,
  );
  if (already) {
    const existing = persisted.ledgers.filter(
      (l) => l.tier === input.tier && l.scope_id === input.scope_id,
    );
    return {
      tier: input.tier,
      scope_id: input.scope_id,
      scope_name: input.scope_name,
      ledgers_created: existing.map((e) => ({
        name: e.name, l4_group: e.l4_group, reciprocal: e.reciprocal,
      })),
      cost_centre_linked: input.tier === 'project' && existing.some((e) => !!e.cost_centre_link),
      idempotent_skip: true,
    };
  }

  const planned = planLedgersForTier({
    tier: input.tier,
    scope_id: input.scope_id,
    scope_name: input.scope_name,
    parent_scope: input.parent_scope,
    cost_centre: input.tier === 'project' ? input.cost_centre : undefined,
  });

  const now = new Date().toISOString();
  const toPersist: PersistedLedger[] = planned.map((p) => ({
    id: makeId(),
    tier: input.tier,
    scope_id: input.scope_id,
    scope_name: input.scope_name,
    name: p.name,
    l4_group: p.l4_group,
    parent_scope: input.parent_scope,
    reciprocal: p.reciprocal,
    cost_centre_link: p.cost_centre_link,
    created_at: now,
  }));
  writePersisted({ ledgers: [...persisted.ledgers, ...toPersist] });

  // Subsidiary side-effect: append a reciprocal control ledger inside the
  // parent's Internal Transactions A/c (bidirectional walk · cloned from
  // createBDLedgers).
  if (input.tier === 'subsidiary' && input.parent_scope?.tier === 'parent') {
    const parentL4 = resolveL4GroupForTier('parent');
    const reciprocal: PersistedLedger = {
      id: makeId(),
      tier: 'parent',
      scope_id: input.parent_scope.id,
      scope_name: `Parent ${input.parent_scope.id}`,
      name: `${input.scope_name} A/c (in Parent books)`,
      l4_group: parentL4,
      reciprocal: true,
      created_at: now,
    };
    const next = readPersisted();
    writePersisted({ ledgers: [...next.ledgers, reciprocal] });
    toPersist.push(reciprocal);
  }

  const result: LedgerCreationResult = {
    tier: input.tier,
    scope_id: input.scope_id,
    scope_name: input.scope_name,
    ledgers_created: toPersist.map((p) => ({
      name: p.name, l4_group: p.l4_group, reciprocal: p.reciprocal,
    })),
    cost_centre_linked: input.tier === 'project',
  };

  // Audit — owns its creation (not §P-exempt per S97 spec).
  logAudit({
    entityCode: input.entity_code ?? 'GLOBAL',
    action: 'create',
    entityType: 'hierarchical_ledger_created',
    recordId: `${input.tier}:${input.scope_id}`,
    recordLabel: `${input.tier} · ${input.scope_name}`,
    beforeState: null,
    afterState: {
      tier: input.tier,
      scope_id: input.scope_id,
      ledgers: result.ledgers_created,
      l4_group: planned[0]?.l4_group,
      cost_centre_linked: result.cost_centre_linked ?? false,
    } as Record<string, unknown>,
    reason: null,
    sourceModule: 'master-data-foundation',
  });

  return result;
}

/**
 * Returns the full hierarchical ledger tree grouped by tier, nested under
 * parent_scope when supplied. `entity_code` is reserved for future per-entity
 * scoping (Phase 8 backend); for Phase 1 we read the global blob.
 */
export function getTierLedgerTree(_input: { entity_code: string }): TierLedgerNode[] {
  const { ledgers } = readPersisted();
  const tierOrder: HierarchyTier[] = [
    'parent', 'subsidiary', 'branch', 'division', 'department', 'project', 'site',
  ];

  // First pass — group by (tier, scope_id).
  const grouped = new Map<string, TierLedgerNode>();
  for (const l of ledgers) {
    const key = `${l.tier}:${l.scope_id}`;
    let node = grouped.get(key);
    if (!node) {
      node = {
        tier: l.tier,
        scope_id: l.scope_id,
        scope_name: l.scope_name,
        ledgers: [],
        children: [],
      };
      grouped.set(key, node);
    }
    node.ledgers.push(l.name);
  }

  // Second pass — link to parent_scope when present.
  const orphans: TierLedgerNode[] = [];
  for (const l of ledgers) {
    const key = `${l.tier}:${l.scope_id}`;
    const node = grouped.get(key);
    if (!node) continue;
    if (l.parent_scope) {
      const parentKey = `${l.parent_scope.tier}:${l.parent_scope.id}`;
      const parent = grouped.get(parentKey);
      if (parent) {
        if (!parent.children.find((c) => c.scope_id === node.scope_id && c.tier === node.tier)) {
          parent.children.push(node);
        }
        continue;
      }
    }
    if (!orphans.find((o) => o.scope_id === node.scope_id && o.tier === node.tier)) {
      orphans.push(node);
    }
  }

  // Stable ordering by tier rank then scope_name.
  orphans.sort((a, b) => {
    const r = tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
    return r !== 0 ? r : a.scope_name.localeCompare(b.scope_name);
  });
  return orphans;
}

/** Test-only · clears the persisted tree. */
export function _clearHierarchicalLedgerTreeForTests(): void {
  writePersisted({ ledgers: [] });
}
