/**
 * @file        src/lib/_institutional/sibling-register.ts
 * @purpose     Source-of-truth register for the 36 institutional SIBLING engines
 * @sprint      T-Phase-3.HK-D14-InstitutionalRegisters
 * @disciplines NOT FR-19 SIBLING · institutional reference data (sui generis category)
 *              Reading-only by domain code · curated by founder + auditor only
 *              Backfill batch for entries 1-29 scheduled in Sprint 61.HK
 */

export interface SiblingEntry {
  id: string;
  name: string;
  path: string | null;
  sprintAdded: number | null;
  compositeAdded: number | null;
  functionCount: number | null;
  moatsRealized: string[];
  provenance: 'CONFIRMED' | 'PENDING_BACKFILL';
}

const PENDING = (n: number): SiblingEntry => ({
  id: `sibling-${String(n).padStart(2, '0')}-pending`,
  name: 'PENDING_BACKFILL',
  path: null,
  sprintAdded: null,
  compositeAdded: null,
  functionCount: null,
  moatsRealized: [],
  provenance: 'PENDING_BACKFILL',
});

export const SIBLINGS: SiblingEntry[] = [
  // ── Entries 1-24 · PENDING BACKFILL in Sprint 61.HK ──────────────────────
  ...Array.from({ length: 24 }, (_, i) => PENDING(i + 1)),
  // ── Entry 25 · KB-confirmed (FR-90 known #25) ────────────────────────────
  {
    id: 'sample-expense-voucher-engine',
    name: 'Sample Expense Voucher Engine',
    path: 'src/lib/sample-expense-voucher-engine.ts',
    sprintAdded: 46,
    compositeAdded: 51,
    functionCount: null,
    moatsRealized: [],
    provenance: 'PENDING_BACKFILL',
  },
  // ── Entries 26-29 · PENDING (between Sprint 47-HK6) ──────────────────────
  ...Array.from({ length: 4 }, (_, i) => ({
    ...PENDING(i + 26),
    name: 'PENDING_BACKFILL · between Sprint 47-HK6',
  })),
  // ── Entries 30-36 · CONFIRMED · v2 era Phase 3 Production Arc ────────────
  {
    id: 'sales-production-bridge',
    name: 'Sales-Production Bridge',
    path: 'src/lib/sales-production-bridge.ts',
    sprintAdded: 55,
    compositeAdded: 55,
    functionCount: 12,
    moatsRealized: ['MOAT-29'],
    provenance: 'CONFIRMED',
  },
  {
    id: 'iot-machine-bridge',
    name: 'IoT Machine Bridge',
    path: 'src/lib/iot-machine-bridge.ts',
    sprintAdded: 59,
    compositeAdded: 59,
    functionCount: 30,
    moatsRealized: ['MOAT-31'],
    provenance: 'CONFIRMED',
  },
  {
    id: 'process-batch-engine',
    name: 'Process Batch Engine',
    path: 'src/lib/process-batch-engine.ts',
    sprintAdded: 60,
    compositeAdded: 60,
    functionCount: 15,
    moatsRealized: [],
    provenance: 'CONFIRMED',
  },
  {
    id: 'recipe-formula-engine',
    name: 'Recipe Formula Engine',
    path: 'src/lib/recipe-formula-engine.ts',
    sprintAdded: 60,
    compositeAdded: 60,
    functionCount: 11,
    moatsRealized: [],
    provenance: 'CONFIRMED',
  },
  {
    id: 'spc-quality-engine',
    name: 'SPC Quality Engine',
    path: 'src/lib/spc-quality-engine.ts',
    sprintAdded: 60,
    compositeAdded: 60,
    functionCount: 9,
    moatsRealized: [],
    provenance: 'CONFIRMED',
  },
  {
    id: 'process-genealogy-engine',
    name: 'Process Genealogy Engine',
    path: 'src/lib/process-genealogy-engine.ts',
    sprintAdded: 60,
    compositeAdded: 60,
    functionCount: 8,
    moatsRealized: [],
    provenance: 'CONFIRMED',
  },
  {
    id: 'tank-flow-inventory-engine',
    name: 'Tank Flow Inventory Engine',
    path: 'src/lib/tank-flow-inventory-engine.ts',
    sprintAdded: 60,
    compositeAdded: 60,
    functionCount: 9,
    moatsRealized: [],
    provenance: 'CONFIRMED',
  },
];

export function getSiblingCount(): number {
  return SIBLINGS.length;
}

export function getSiblingsByProvenance(provenance: SiblingEntry['provenance']): SiblingEntry[] {
  return SIBLINGS.filter((s) => s.provenance === provenance);
}
