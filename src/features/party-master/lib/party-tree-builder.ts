/**
 * @file     party-tree-builder.ts
 * @purpose  Group a flat party master list into 4-level hierarchy:
 *           L1 Customer/Vendor/Logistic Type → L2 Industry Sector → L3 Business Activity → L4 Leaf.
 *           Used by PartyTreeList to render the expand/collapse tree.
 *           Also defines BankAccount + OpeningBill shapes shared by S4 modals.
 * @sprint   T-H1.5-C-S4
 * @finding  CC-016
 */

import { getSectorLabel, getActivityLabel } from '@/data/industry-taxonomy';

export interface PartyLeaf {
  id: string;
  partyCode: string;
  partyName: string;
  status: 'active' | 'inactive';
  /** Raw master object — consumer can read any field for display in leaf row. */
  raw: Record<string, unknown>;
}

export interface PartyTreeL3 {
  code: string;
  label: string;
  leaves: PartyLeaf[];
}

export interface PartyTreeL2 {
  code: string;
  label: string;
  l3: PartyTreeL3[];
}

export interface PartyTreeL1 {
  code: string;
  label: string;
  l2: PartyTreeL2[];
  totalLeaves: number;
}

export interface PartyTreeConfig {
  /** Field name on the master that holds L1 (Type). */
  typeField: string;
  /** Field name on the master that holds L2 (Sector ID from taxonomy). */
  sectorField: string;
  /** Field name on the master that holds L3 (Activity ID from taxonomy). */
  activityField: string;
  /** Maps type ID (e.g. 'manufacturer') to display label. */
  typeLabels: Record<string, string>;
}

/**
 * Optional callback invoked once per L1/L2/L3 node during tree build.
 * Receives the flat list of leaves under that node — caller can compute
 * any aggregate (KPI rollup, count, sum) and return an opaque value that
 * tree consumers can later display via `renderNodeMeta`.
 *
 * S4.5: opt-in only; CustomerMaster computes rollups inline via the
 * `renderNodeMeta` PartyTreeList prop, so this callback is currently a
 * no-op extension point reserved for future engines.
 */
export type ComputeRollupFn = (level: 1 | 2 | 3, code: string, leaves: PartyLeaf[]) => unknown;

export function buildPartyTree<T extends Record<string, unknown>>(
  parties: T[],
  config: PartyTreeConfig,
  computeRollup?: ComputeRollupFn,
): PartyTreeL1[] {
  const byType: Map<string, Map<string, Map<string, PartyLeaf[]>>> = new Map();

  for (const p of parties) {
    const typeId = String(p[config.typeField] ?? '__unassigned__');
    const sectorId = String(p[config.sectorField] ?? '__unassigned__') || '__unassigned__';
    const activityId = String(p[config.activityField] ?? '__unassigned__') || '__unassigned__';

    if (!byType.has(typeId)) byType.set(typeId, new Map());
    const bySector = byType.get(typeId)!;
    if (!bySector.has(sectorId)) bySector.set(sectorId, new Map());
    const byActivity = bySector.get(sectorId)!;
    if (!byActivity.has(activityId)) byActivity.set(activityId, []);

    byActivity.get(activityId)!.push({
      id: String(p.id ?? ''),
      partyCode: String(p.partyCode ?? ''),
      partyName: String(p.partyName ?? ''),
      status: (p.status === 'inactive' ? 'inactive' : 'active'),
      raw: p,
    });
  }

  const result: PartyTreeL1[] = [];
  for (const [typeId, bySector] of byType.entries()) {
    const l2List: PartyTreeL2[] = [];
    let totalLeaves = 0;
    for (const [sectorId, byActivity] of bySector.entries()) {
      const l3List: PartyTreeL3[] = [];
      for (const [activityId, leaves] of byActivity.entries()) {
        totalLeaves += leaves.length;
        l3List.push({
          code: activityId,
          label: activityId === '__unassigned__'
            ? 'Unassigned Activity'
            : getActivityLabel(sectorId, activityId),
          leaves: leaves.sort((a, b) => a.partyName.localeCompare(b.partyName)),
        });
      }
      l2List.push({
        code: sectorId,
        label: sectorId === '__unassigned__'
          ? 'Unassigned Sector'
          : getSectorLabel(sectorId),
        l3: l3List.sort((a, b) => a.label.localeCompare(b.label)),
      });
    }
    result.push({
      code: typeId,
      label: config.typeLabels[typeId] ?? typeId,
      l2: l2List.sort((a, b) => a.label.localeCompare(b.label)),
      totalLeaves,
    });
  }
  return result.sort((a, b) => a.label.localeCompare(b.label));
}

/** Bank account shape — added in S4 as optional field on party masters. */
export interface BankAccount {
  id: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  accountType: 'savings' | 'current' | 'od' | 'cc';
  isPrimary: boolean;
}

/** Opening balance bill-wise breakup line. Optional field on party masters. */
export interface OpeningBill {
  id: string;
  billNumber: string;
  billDate: string; // ISO
  amount: number;
  dueDate: string; // ISO
}
