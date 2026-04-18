/**
 * distributor-hierarchy.ts — Multi-tier distributor hierarchy
 * Sprint 11a. Models the Indian distribution tree:
 * Super Stockist -> Distributor -> Sub-Dealer -> Retailer
 * [JWT] GET/POST /api/erp/distributor/hierarchy
 */

export type HierarchyRole =
  | 'super_stockist' // top of tree, buys directly from tenant
  | 'distributor'    // second tier, most common level
  | 'sub_dealer'     // buys from distributor
  | 'retailer';      // last-mile seller

export const HIERARCHY_ROLE_LABELS: Record<HierarchyRole, string> = {
  super_stockist: 'Super Stockist',
  distributor: 'Distributor',
  sub_dealer: 'Sub-Dealer',
  retailer: 'Retailer',
};

export const HIERARCHY_ROLE_COLOURS: Record<HierarchyRole, string> = {
  super_stockist: 'bg-indigo-700/15 text-indigo-700 border-indigo-700/30',
  distributor: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
  sub_dealer: 'bg-slate-500/15 text-slate-700 border-slate-500/30',
  retailer: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
};

/** Allowed parent-child transitions — prevents illegal edges. */
export const HIERARCHY_VALID_PARENTS: Record<HierarchyRole, HierarchyRole[]> = {
  super_stockist: [],                                 // no parent — tenant is implicit parent
  distributor:    ['super_stockist'],                 // OR null (direct from tenant)
  sub_dealer:     ['distributor', 'super_stockist'],
  retailer:       ['sub_dealer', 'distributor'],      // rare direct-to-retailer
};

export interface HierarchyNode {
  id: string;                                // PK — 'hn-' + random
  entity_id: string;
  customer_id: string;                       // FK -> CustomerMaster.id
  distributor_id: string | null;             // FK -> Distributor.id (null if not portal-enabled)
  role: HierarchyRole;
  parent_node_id: string | null;             // null = top of tree (SS or direct distributor)
  path: string;                              // denormalised '/hn-root/hn-mid/hn-leaf'
  depth: number;                             // 0 = super_stockist, 1 = distributor, etc.
  display_name: string;                      // denormalised from CustomerMaster
  territory_id: string | null;               // Sprint 7 territory reference
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HierarchyEdge {
  id: string;
  from_node_id: string;                      // child
  to_node_id: string;                        // parent
  effective_from: string;                    // supports reassignment history
  effective_until: string | null;            // null = current
  change_reason: string | null;
  changed_by_user: string;
  created_at: string;
}

export const hierarchyNodesKey = (e: string) => `erp_hierarchy_nodes_${e}`;
export const hierarchyEdgesKey = (e: string) => `erp_hierarchy_edges_${e}`;
