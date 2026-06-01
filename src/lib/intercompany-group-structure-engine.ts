/**
 * @file        src/lib/intercompany-group-structure-engine.ts
 * @sprint      Sprint 105 · T-Phase-6.C.1.1 · Arc 2 OPENER · Pillar C.1
 *              Intercompany Foundation · Group Structure Engine
 * @purpose     Wrap §H-frozen mock-entities (via loadEntities) with a side-store
 *              that captures ownership %, relationship, and Ind AS consolidation
 *              method per entity in the group. NEVER mutates mock-entities.ts.
 *
 *              Side-store: erp_group_structure (voucher-org-tag pattern · DP-A2-1).
 *              Validated FK by entity_id against loadEntities() — orphans rejected.
 *
 * @scope-wall  DP-A2-9 · STRUCTURE ONLY. NO consolidated P&L/BS/CF, NO
 *              eliminations, NO multi-currency / NCI / goodwill. Those land in
 *              S108 / Arc 3.
 *
 * @disciplines FR-44 (no-dup · wraps existing entity loader) ·
 *              FR-19 SIBLING · FR-67 §H 0-DIFF on mock-entities ·
 *              v1.30 §L (DP-A2-1, DP-A2-2, DP-A2-7, DP-A2-9)
 *
 * @standards   Ind AS 110 (Consolidated Financial Statements) — control →
 *              full consolidation; Ind AS 111 (Joint Arrangements) — joint
 *              venture → proportional / equity (we expose proportional for
 *              joint operations and equity for joint ventures classified as
 *              associates); Ind AS 28 (Associates) — significant influence
 *              (20–50%) → equity method.
 *
 * @[JWT]       GET /api/intercompany/group-structure?entity_id=:id
 *              POST /api/intercompany/group-structure (upsert)
 */

import { loadEntities, type MockEntity } from '@/data/mock-entities';
import { logAudit } from '@/lib/audit-trail-engine';
import { dEq, roundTo } from '@/lib/decimal-helpers';

/** Decimal-safe compare · returns -1 / 0 / 1 like Array#sort. */
const dCmp = (a: number, b: number): number => {
  if (dEq(a, b, 6)) return 0;
  return a < b ? -1 : 1;
};
/** Decimal-safe rounding to N places (alias to keep call-sites self-documenting). */
const dRound = (n: number, places: number): number => roundTo(n, places);

// ─── Provenance · READS_FROM (FR-44 disclosure) ──────────────────────────────

/**
 * Source-of-truth declaration. mock-entities.ts is §H-frozen — this engine
 * READS via loadEntities() only · never imports a mutator · never edits.
 */
export const READS_FROM = {
  mockEntities: 'src/data/mock-entities.ts (loadEntities · §H 0-DIFF · no mutator)',
  sideStore: 'localStorage:erp_group_structure (voucher-org-tag-engine pattern · DP-A2-1)',
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

/** Ind AS 110 / 111 / 28 consolidation methods. */
export type ConsolidationMethod = 'full' | 'proportional' | 'equity';

/** Relationship of a node to the parent group. */
export type GroupRelationship =
  | 'parent'
  | 'subsidiary'
  | 'branch'
  | 'joint_venture'
  | 'associate';

/** Per-entity group-structure metadata (side-store row). */
export interface GroupStructureNode {
  /** FK → loadEntities() entity.id · validated · orphan-rejected. */
  entity_id: string;
  /** Group tree pointer · null = root parent. FK → loadEntities() entity.id. */
  parent_entity_id: string | null;
  /** Relationship classification (drives method recommendation). */
  relationship: GroupRelationship;
  /** Ownership % (0–100 inclusive · decimal-safe comparisons). */
  ownership_pct: number;
  /** Ind AS consolidation method applied. */
  consolidation_method: ConsolidationMethod;
  /** ISO date the structure became effective. */
  effective_from: string;
}

/** Group tree row (one per loadEntities() entity · structure attached if any). */
export interface GroupTreeRow {
  entity: MockEntity;
  node: GroupStructureNode | null;
  children: string[]; // entity_ids whose parent_entity_id === this entity.id
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Ind AS 110 / 111 / 28 method catalogue (immutable). */
export const CONSOLIDATION_METHODS: readonly ConsolidationMethod[] = [
  'full',
  'proportional',
  'equity',
] as const;

/** Allowed relationships (immutable). */
export const GROUP_RELATIONSHIPS: readonly GroupRelationship[] = [
  'parent',
  'subsidiary',
  'branch',
  'joint_venture',
  'associate',
] as const;

/** Ind AS 110 control threshold — >50% ownership → control → full consolidation. */
export const CONTROL_THRESHOLD_PCT = 50 as const;
/** Ind AS 28 significant-influence floor — ≥20% → equity method. */
export const SIGNIFICANT_INFLUENCE_FLOOR_PCT = 20 as const;

/** localStorage key — entity-id-keyed side-store · voucher-org-tag pattern. */
export const GROUP_STRUCTURE_KEY = 'erp_group_structure';

// ─── Storage helpers (side-store · NEVER touches mock-entities) ──────────────

function loadAllNodes(): GroupStructureNode[] {
  try {
    // [JWT] GET /api/intercompany/group-structure
    const raw = localStorage.getItem(GROUP_STRUCTURE_KEY);
    return raw ? (JSON.parse(raw) as GroupStructureNode[]) : [];
  } catch {
    return [];
  }
}

function saveAllNodes(nodes: GroupStructureNode[]): void {
  try {
    // [JWT] POST /api/intercompany/group-structure
    localStorage.setItem(GROUP_STRUCTURE_KEY, JSON.stringify(nodes));
  } catch (err) {
    console.error('[intercompany-group-structure] save failed:', err);
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────

function assertValidPct(pct: number): void {
  if (!Number.isFinite(pct) || dCmp(pct, 0) < 0 || dCmp(pct, 100) > 0) {
    throw new Error(
      `[intercompany-group-structure] ownership_pct must be 0–100 (got ${pct})`,
    );
  }
}

function assertValidRelationship(r: GroupRelationship): void {
  if (!GROUP_RELATIONSHIPS.includes(r)) {
    throw new Error(`[intercompany-group-structure] invalid relationship: ${r}`);
  }
}

function assertValidMethod(m: ConsolidationMethod): void {
  if (!CONSOLIDATION_METHODS.includes(m)) {
    throw new Error(`[intercompany-group-structure] invalid consolidation_method: ${m}`);
  }
}

function assertEntityExists(entity_id: string): MockEntity {
  const entities = loadEntities();
  const found = entities.find((e) => e.id === entity_id);
  if (!found) {
    throw new Error(
      `[intercompany-group-structure] orphan entity_id rejected: ${entity_id} (not in loadEntities())`,
    );
  }
  return found;
}

// ─── Method recommendation (Ind AS 110 / 111 / 28) ───────────────────────────

/**
 * Recommend the Ind AS consolidation method given ownership % and relationship.
 *
 * Rules (Ind AS):
 *  - relationship === 'parent' OR 'subsidiary' OR ownership > 50%   → 'full'        (Ind AS 110)
 *  - relationship === 'branch'                                       → 'full'        (branch is integral)
 *  - relationship === 'joint_venture'                                → 'proportional'(Ind AS 111 joint operation
 *                                                                                      treatment · the engine surfaces
 *                                                                                      proportional · equity recommended
 *                                                                                      where the JV is in substance an
 *                                                                                      associate · S108 will refine.)
 *  - relationship === 'associate' OR 20% ≤ ownership ≤ 50%           → 'equity'      (Ind AS 28)
 *  - otherwise (no significant influence)                            → 'equity'      (conservative fallback · the
 *                                                                                      page surfaces an explicit
 *                                                                                      "review" hint when ownership
 *                                                                                      < 20% and relationship is not
 *                                                                                      'associate'.)
 */
export function recommendConsolidationMethod(
  ownership_pct: number,
  relationship: GroupRelationship,
): ConsolidationMethod {
  assertValidPct(ownership_pct);
  assertValidRelationship(relationship);

  // Hard relationship overrides first.
  if (relationship === 'parent' || relationship === 'branch' || relationship === 'subsidiary') {
    // Ind AS 110: control implies full consolidation; branch is integral.
    return 'full';
  }
  if (relationship === 'joint_venture') {
    // Ind AS 111: joint arrangement → proportional surface; refined at S108.
    return 'proportional';
  }
  if (relationship === 'associate') {
    return 'equity';
  }

  // Ownership-band fallback (should be unreachable given relationship guards above).
  if (dCmp(ownership_pct, CONTROL_THRESHOLD_PCT) > 0) return 'full';
  if (dCmp(ownership_pct, SIGNIFICANT_INFLUENCE_FLOOR_PCT) >= 0) return 'equity';
  return 'equity';
}

// ─── CRUD API (idempotent · keyed by entity_id) ──────────────────────────────

/**
 * Idempotent upsert · keyed by entity_id.
 * Validates FK against loadEntities(); rejects orphan entity_id.
 * Validates parent_entity_id (when non-null) against loadEntities() too.
 * Logs `group_structure_change` audit (module: 'mca-roc').
 */
export function upsertGroupStructure(node: GroupStructureNode): GroupStructureNode {
  // Schema validation
  assertValidRelationship(node.relationship);
  assertValidMethod(node.consolidation_method);
  assertValidPct(node.ownership_pct);
  if (!node.effective_from || Number.isNaN(Date.parse(node.effective_from))) {
    throw new Error(
      `[intercompany-group-structure] effective_from must be a valid ISO date (got ${node.effective_from})`,
    );
  }

  // FK validation against §H-frozen loadEntities()
  assertEntityExists(node.entity_id);
  if (node.parent_entity_id) {
    if (node.parent_entity_id === node.entity_id) {
      throw new Error('[intercompany-group-structure] parent_entity_id must differ from entity_id');
    }
    assertEntityExists(node.parent_entity_id);
  }

  const normalized: GroupStructureNode = {
    ...node,
    ownership_pct: dRound(node.ownership_pct, 4),
  };

  const all = loadAllNodes();
  const idx = all.findIndex((n) => n.entity_id === normalized.entity_id);
  const before = idx >= 0 ? all[idx] : null;
  if (idx >= 0) all[idx] = normalized;
  else all.push(normalized);
  saveAllNodes(all);

  // Audit · MCA Rule 3(1) · single canonical type for this engine.
  logAudit({
    entityCode: normalized.entity_id,
    action: before ? 'update' : 'create',
    entityType: 'group_structure_change',
    recordId: normalized.entity_id,
    recordLabel: `Group structure · ${normalized.relationship} · ${normalized.ownership_pct}% · ${normalized.consolidation_method}`,
    beforeState: (before as unknown as Record<string, unknown> | null) ?? null,
    afterState: normalized as unknown as Record<string, unknown>,
    sourceModule: 'intercompany-group-structure-engine',
  });

  return normalized;
}

/** Read a single node by entity_id (null if no structure recorded). */
export function getGroupStructure(entity_id: string): GroupStructureNode | null {
  return loadAllNodes().find((n) => n.entity_id === entity_id) ?? null;
}

/** List every persisted group-structure node (raw side-store rows). */
export function listGroupStructure(): GroupStructureNode[] {
  return loadAllNodes();
}

/**
 * Build the group tree by joining loadEntities() ⨝ group-structure side-store.
 * Every entity in loadEntities() appears exactly once · node is null when no
 * structure is recorded yet · children lists direct sub-entity ids.
 */
export function getGroupTree(): GroupTreeRow[] {
  const entities = loadEntities();
  const nodes = loadAllNodes();
  const byEntity = new Map<string, GroupStructureNode>();
  nodes.forEach((n) => byEntity.set(n.entity_id, n));

  const childrenOf = new Map<string, string[]>();
  for (const n of nodes) {
    if (!n.parent_entity_id) continue;
    const arr = childrenOf.get(n.parent_entity_id) ?? [];
    arr.push(n.entity_id);
    childrenOf.set(n.parent_entity_id, arr);
  }

  return entities.map((entity) => ({
    entity,
    node: byEntity.get(entity.id) ?? null,
    children: childrenOf.get(entity.id) ?? [],
  }));
}

/** Delete a node by entity_id · returns true when a row was removed. */
export function deleteGroupStructure(entity_id: string): boolean {
  const all = loadAllNodes();
  const next = all.filter((n) => n.entity_id !== entity_id);
  if (next.length === all.length) return false;
  saveAllNodes(next);

  const removed = all.find((n) => n.entity_id === entity_id) ?? null;
  logAudit({
    entityCode: entity_id,
    action: 'cancel',
    entityType: 'group_structure_change',
    recordId: entity_id,
    recordLabel: `Group structure removed · ${entity_id}`,
    beforeState: (removed as unknown as Record<string, unknown> | null) ?? null,
    afterState: null,
    sourceModule: 'intercompany-group-structure-engine',
  });
  return true;
}
