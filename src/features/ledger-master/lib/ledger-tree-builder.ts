/**
 * @file     ledger-tree-builder.ts
 * @purpose  Group ledger definitions into a 3-level tree:
 *           L1 Parent Group → L2 Entity → L3 Leaf.
 *           Mirrors the party-tree-builder pattern but specialised for ledger
 *           definitions which have a simpler natural hierarchy (no taxonomy).
 * @sprint   T-H1.5-C-S6.5a
 * @finding  CC-059
 */

export interface LedgerLeaf {
  id: string;
  name: string;
  code: string;
  numericCode: string;
  status: string;
  entityShortCode: string | null;
  raw: Record<string, unknown>;
}

export interface LedgerTreeL2 {
  code: string;
  label: string;
  leaves: LedgerLeaf[];
}

export interface LedgerTreeL1 {
  code: string;
  label: string;
  l2: LedgerTreeL2[];
  totalLeaves: number;
}

export interface LedgerTreeConfig {
  /** Field name that holds L1 group code (usually 'parentGroupCode'). */
  parentGroupField: string;
  /** Field name that holds L1 group display label (usually 'parentGroupName'). */
  parentGroupLabelField: string;
  /** Field name that holds L2 entity short code (usually 'entityShortCode'). */
  entityField: string;
}

export function buildLedgerTree<T extends { id: string }>(
  ledgers: T[],
  config: LedgerTreeConfig,
): LedgerTreeL1[] {
  const byGroup = new Map<string, { label: string; byEntity: Map<string, LedgerLeaf[]> }>();

  for (const l of ledgers) {
    const rec = l as unknown as Record<string, unknown>;
    const groupCodeRaw = rec[config.parentGroupField];
    const groupCode = (groupCodeRaw === null || groupCodeRaw === undefined || groupCodeRaw === '')
      ? '__ungrouped__' : String(groupCodeRaw);
    const groupLabel = String(l[config.parentGroupLabelField] ?? 'Ungrouped');
    const entityRaw = l[config.entityField];
    const entityCode = (entityRaw === null || entityRaw === undefined || entityRaw === '')
      ? '__group__' : String(entityRaw);

    if (!byGroup.has(groupCode)) byGroup.set(groupCode, { label: groupLabel, byEntity: new Map() });
    const g = byGroup.get(groupCode)!;
    if (!g.byEntity.has(entityCode)) g.byEntity.set(entityCode, []);
    g.byEntity.get(entityCode)!.push({
      id: String(l.id ?? ''),
      name: String(l.name ?? ''),
      code: String(l.code ?? ''),
      numericCode: String(l.numericCode ?? ''),
      status: String(l.status ?? 'active'),
      entityShortCode: entityCode === '__group__' ? null : entityCode,
      raw: l,
    });
  }

  const result: LedgerTreeL1[] = [];
  for (const [groupCode, { label, byEntity }] of byGroup.entries()) {
    const l2List: LedgerTreeL2[] = [];
    let totalLeaves = 0;
    for (const [entityCode, leaves] of byEntity.entries()) {
      totalLeaves += leaves.length;
      l2List.push({
        code: entityCode,
        label: entityCode === '__group__' ? 'Group Level' : entityCode,
        leaves: leaves.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
    result.push({
      code: groupCode,
      label,
      l2: l2List.sort((a, b) => a.label.localeCompare(b.label)),
      totalLeaves,
    });
  }
  return result.sort((a, b) => a.label.localeCompare(b.label));
}
