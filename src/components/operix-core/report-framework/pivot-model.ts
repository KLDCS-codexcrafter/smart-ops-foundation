/**
 * @file        pivot-model.ts
 * @sprint      RPT-12a · Block 1 · Pure matrix-model helper
 *              Split out so the React component file only exports a component
 *              (Vite fast-refresh friendly).
 */

export interface PivotModel {
  rowKeys: string[];
  colKeys: string[];
  cells: Map<string, number>; // `${row}\u0001${col}` → value
  rowTotals: Map<string, number>;
  colTotals: Map<string, number>;
  grandTotal: number;
}

export function buildPivotModel(
  rows: ReadonlyArray<Record<string, unknown>>,
  groupBy: [string, string],
  measureKey: string,
): PivotModel {
  const [rDim, cDim] = groupBy;
  const cells = new Map<string, number>();
  const rowTotals = new Map<string, number>();
  const colTotals = new Map<string, number>();
  const rowKeySet = new Set<string>();
  const colKeySet = new Set<string>();
  let grand = 0;

  for (const row of rows) {
    const r = String(row[rDim] ?? '');
    const c = String(row[cDim] ?? '');
    const raw = row[measureKey];
    const v = typeof raw === 'number' ? raw : Number(raw ?? 0);
    if (!Number.isFinite(v)) continue;
    rowKeySet.add(r);
    colKeySet.add(c);
    cells.set(`${r}\u0001${c}`, (cells.get(`${r}\u0001${c}`) ?? 0) + v);
    rowTotals.set(r, (rowTotals.get(r) ?? 0) + v);
    colTotals.set(c, (colTotals.get(c) ?? 0) + v);
    grand += v;
  }

  return {
    rowKeys: Array.from(rowKeySet).sort(),
    colKeys: Array.from(colKeySet).sort(),
    cells,
    rowTotals,
    colTotals,
    grandTotal: grand,
  };
}
