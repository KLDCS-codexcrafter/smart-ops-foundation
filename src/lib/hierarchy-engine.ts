/**
 * hierarchy-engine.ts — Pure hierarchy helpers
 * Sprint 11a. Walk tree, find ancestors/descendants, cascade targets, validate edges.
 * NO localStorage, NO React, NO toast. All exports are pure.
 */

import type { HierarchyNode, HierarchyRole } from '@/types/distributor-hierarchy';
import { HIERARCHY_VALID_PARENTS } from '@/types/distributor-hierarchy';

/** Recompute node.path from root to here. Used after parent change. */
export function computeNodePath(nodeId: string, allNodes: HierarchyNode[]): string {
  const byId = new Map(allNodes.map(n => [n.id, n]));
  const parts: string[] = [];
  let cur: HierarchyNode | undefined = byId.get(nodeId);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    parts.unshift(cur.id);
    cur = cur.parent_node_id ? byId.get(cur.parent_node_id) : undefined;
  }
  return '/' + parts.join('/');
}

/** Depth = number of ancestors. Root (no parent) = 0. */
export function computeDepth(nodeId: string, allNodes: HierarchyNode[]): number {
  return computeNodePath(nodeId, allNodes).split('/').filter(Boolean).length - 1;
}

/** All descendants of a node (recursive). Self not included. */
export function getDescendants(rootId: string, allNodes: HierarchyNode[]): HierarchyNode[] {
  const root = allNodes.find(n => n.id === rootId);
  if (!root) return [];
  const prefix = root.path + '/';
  return allNodes.filter(n => n.id !== rootId && n.path.startsWith(prefix));
}

/** Direct children only. */
export function getChildren(parentId: string, allNodes: HierarchyNode[]): HierarchyNode[] {
  return allNodes.filter(n => n.parent_node_id === parentId);
}

/** All ancestors. Ordered from root to immediate parent. */
export function getAncestors(nodeId: string, allNodes: HierarchyNode[]): HierarchyNode[] {
  const byId = new Map(allNodes.map(n => [n.id, n]));
  const out: HierarchyNode[] = [];
  let cur = byId.get(nodeId);
  const seen = new Set<string>();
  while (cur?.parent_node_id && !seen.has(cur.id)) {
    seen.add(cur.id);
    const parent = byId.get(cur.parent_node_id);
    if (!parent) break;
    out.unshift(parent);
    cur = parent;
  }
  return out;
}

/** Validate that role can have parent of another role. */
export function canAssignParent(
  childRole: HierarchyRole,
  parentRole: HierarchyRole | null,
): { ok: boolean; reason: string | null } {
  if (parentRole === null) {
    return childRole === 'super_stockist' || childRole === 'distributor'
      ? { ok: true, reason: null }
      : { ok: false, reason: `${childRole} cannot be top-level` };
  }
  const allowed = HIERARCHY_VALID_PARENTS[childRole];
  if (!allowed.includes(parentRole)) {
    return {
      ok: false,
      reason: `${childRole} cannot have ${parentRole} as parent. Valid parents: ${allowed.join(', ') || 'none'}`,
    };
  }
  return { ok: true, reason: null };
}

/** Detect cycle: would assigning `parent` to `child` create a loop? */
export function wouldCreateCycle(
  childId: string,
  newParentId: string | null,
  allNodes: HierarchyNode[],
): boolean {
  if (!newParentId) return false;
  if (newParentId === childId) return true;
  const descendants = getDescendants(childId, allNodes);
  return descendants.some(d => d.id === newParentId);
}

/** Reach = sum of (monthly_achieved) across my direct descendants (children).
 * Used on super-stockist dashboards. Pure — caller supplies distributor data. */
export function computeReach(
  nodeId: string,
  allNodes: HierarchyNode[],
  distributorMonthlyAchieved: Map<string, number>, // customer_id -> paise
): number {
  return getDescendants(nodeId, allNodes)
    .reduce((sum, n) => sum + (distributorMonthlyAchieved.get(n.customer_id) ?? 0), 0);
}

/** Cascade target: given a parent's monthly_target, split proportionally to children
 * weighted by their previous-month achievement (or equal if first cycle). */
export function cascadeTarget(
  parentNodeId: string,
  parentTargetPaise: number,
  allNodes: HierarchyNode[],
  previousMonthAchieved: Map<string, number>,
): Map<string, number> { // customer_id -> target paise
  const children = getChildren(parentNodeId, allNodes);
  const out = new Map<string, number>();
  if (children.length === 0) return out;
  const weights = children.map(c => previousMonthAchieved.get(c.customer_id) ?? 0);
  const sumW = weights.reduce((s, w) => s + w, 0);
  children.forEach((child, i) => {
    const share = sumW > 0
      ? Math.floor(parentTargetPaise * (weights[i] / sumW))
      : Math.floor(parentTargetPaise / children.length);
    out.set(child.customer_id, share);
  });
  return out;
}

/** Build a tree-shaped structure for rendering. */
export interface HierarchyTreeNode {
  node: HierarchyNode;
  children: HierarchyTreeNode[];
}

export function buildTree(allNodes: HierarchyNode[]): HierarchyTreeNode[] {
  const byParent = new Map<string | null, HierarchyNode[]>();
  for (const n of allNodes) {
    const arr = byParent.get(n.parent_node_id) ?? [];
    arr.push(n);
    byParent.set(n.parent_node_id, arr);
  }
  const build = (parentId: string | null): HierarchyTreeNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.display_name.localeCompare(b.display_name))
      .map(node => ({ node, children: build(node.id) }));
  return build(null);
}
