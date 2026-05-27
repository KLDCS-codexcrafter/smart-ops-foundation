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
  // 🆕 Sprint 61 PROD-4 PASS 1 · 37th SIBLING · AI-driven demand forecast (CAP-26)
  {
    id: 'demand-forecast-engine',
    name: 'Demand Forecast Engine',
    path: 'src/lib/demand-forecast-engine.ts',
    sprintAdded: 61,
    compositeAdded: 61,
    functionCount: 11,
    moatsRealized: ['MOAT-35'],
    provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 62 PROD-4.5 · 38th SIBLING · 21 CFR Part 11 Engine (CAP-28)
  {
    id: 'cfr-part-11-engine',
    name: '21 CFR Part 11 Engine',
    path: 'src/lib/cfr-part-11-engine.ts',
    sprintAdded: 62,
    compositeAdded: 62,
    functionCount: 9,
    moatsRealized: ['MOAT-37'],
    provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 63 PROD-5 · 39th SIBLING · Carbon Planning Engine (CAP-27 · MOAT-38) · ⭐ PHASE 3 v2 CLOSES
  {
    id: 'carbon-planning-engine',
    name: 'Carbon Planning Engine',
    path: 'src/lib/carbon-planning-engine.ts',
    sprintAdded: 63,
    compositeAdded: 63,
    functionCount: 8,
    moatsRealized: ['MOAT-38'],
    provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 65 FAR-1 · 40th SIBLING · CARO 2020 Engine (MOAT-39)
  {
    id: 'caro-2020-engine',
    name: 'CARO 2020 Engine',
    path: 'src/lib/caro-2020-engine.ts',
    sprintAdded: 65,
    compositeAdded: 65,
    functionCount: 7,
    moatsRealized: ['MOAT-39'],
    provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 65 FAR-1 · 41st SIBLING · Ind AS 116 Lease Engine (FAR-CAP-9)
  {
    id: 'ind-as-116-lease-engine',
    name: 'Ind AS 116 Lease Engine',
    path: 'src/lib/ind-as-116-lease-engine.ts',
    sprintAdded: 65,
    compositeAdded: 65,
    functionCount: 6,
    moatsRealized: [],
    provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 65 FAR-1 · 42nd SIBLING · EPCG FA Bridge (FAR-CAP-11 · MOAT-41)
  {
    id: 'epcg-fa-bridge',
    name: 'EPCG FA Bridge',
    path: 'src/lib/epcg-fa-bridge.ts',
    sprintAdded: 65,
    compositeAdded: 65,
    functionCount: 5,
    moatsRealized: ['MOAT-41'],
    provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 66 FAR-2 · 43rd SIBLING · Vehicle FA Bridge (FAR-CAP-15 · MOAT-44)
  {
    id: 'vehicle-fa-bridge',
    name: 'Vehicle FA Bridge',
    path: 'src/lib/vehicle-fa-bridge.ts',
    sprintAdded: 66,
    compositeAdded: 66,
    functionCount: 5,
    moatsRealized: ['MOAT-44'],
    provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 67 FAR-3 · 44th/45th/46th SIBLINGs · Compute Engine trio
  {
    id: 'multi-gaap-depreciation-engine',
    name: 'Multi-GAAP Depreciation Engine',
    path: 'src/lib/multi-gaap-depreciation-engine.ts',
    sprintAdded: 67, compositeAdded: 67, functionCount: 3,
    moatsRealized: ['MOAT-45'], provenance: 'CONFIRMED',
  },
  {
    id: 'uop-depreciation-engine',
    name: 'UOP Depreciation Engine',
    path: 'src/lib/uop-depreciation-engine.ts',
    sprintAdded: 67, compositeAdded: 67, functionCount: 5,
    moatsRealized: ['MOAT-46'], provenance: 'CONFIRMED',
  },
  {
    id: 'component-depreciation-engine',
    name: 'Component Depreciation Engine',
    path: 'src/lib/component-depreciation-engine.ts',
    sprintAdded: 67, compositeAdded: 67, functionCount: 2,
    moatsRealized: ['MOAT-47'], provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 68 FAR-4 · 47th-54th SIBLINGs · AI + Document AI + IoT + RFID + PM + BRSR + Audit + InsightX
  { id: 'ai-fa-classification-engine', name: 'AI FA Classification Engine', path: 'src/lib/ai-fa-classification-engine.ts', sprintAdded: 68, compositeAdded: 68, functionCount: 4, moatsRealized: ['MOAT-48'], provenance: 'CONFIRMED' },
  { id: 'document-ai-fa-engine', name: 'Document AI FA Engine', path: 'src/lib/document-ai-fa-engine.ts', sprintAdded: 68, compositeAdded: 68, functionCount: 4, moatsRealized: ['MOAT-50'], provenance: 'CONFIRMED' },
  { id: 'iot-asset-bridge', name: 'IoT Asset Bridge', path: 'src/lib/iot-asset-bridge.ts', sprintAdded: 68, compositeAdded: 68, functionCount: 5, moatsRealized: ['MOAT-49'], provenance: 'CONFIRMED' },
  { id: 'rfid-asset-bridge', name: 'RFID Asset Bridge', path: 'src/lib/rfid-asset-bridge.ts', sprintAdded: 68, compositeAdded: 68, functionCount: 6, moatsRealized: ['MOAT-49'], provenance: 'CONFIRMED' },
  { id: 'predictive-maintenance-fa-engine', name: 'Predictive Maintenance FA Engine', path: 'src/lib/predictive-maintenance-fa-engine.ts', sprintAdded: 68, compositeAdded: 68, functionCount: 4, moatsRealized: ['MOAT-51'], provenance: 'CONFIRMED' },
  { id: 'brsr-fa-engine', name: 'BRSR FA Engine', path: 'src/lib/brsr-fa-engine.ts', sprintAdded: 68, compositeAdded: 68, functionCount: 3, moatsRealized: ['MOAT-52'], provenance: 'CONFIRMED' },
  { id: 'fa-audit-trail-engine', name: 'FA Audit Trail Engine', path: 'src/lib/fa-audit-trail-engine.ts', sprintAdded: 68, compositeAdded: 68, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'insightx-fa-staging-engine', name: 'InsightX FA Staging Engine', path: 'src/lib/insightx-fa-staging-engine.ts', sprintAdded: 68, compositeAdded: 68, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 69 T-Phase-5.A.1.1 · Comply360 Main Arc 1.1 · 2 NEW SIBLINGs · DP-S69-3 (Health Score) + OOB-5 (Statutory Memory) · A with adaptations ⭐ · 16-streak
  { id: 'comply360-health-score-engine', name: 'Comply360 Health Score Engine', path: 'src/lib/comply360-health-score-engine.ts', sprintAdded: 69, compositeAdded: 69, functionCount: 7, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-statutory-memory', name: 'Comply360 Statutory Memory', path: 'src/lib/comply360-statutory-memory.ts', sprintAdded: 69, compositeAdded: 69, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 70a T-Phase-5.A.1.2-PASS-A · Comply360 Main Arc 1.2 · 3 NEW SIBLINGs · DP-S70-1/2/3 (GST aggregator + GSTR builder + IMS) · A first-pass-clean ⭐ · 17-streak NEW RECORD
  { id: 'comply360-gst-aggregator-engine', name: 'Comply360 GST Aggregator Engine', path: 'src/lib/comply360-gst-aggregator-engine.ts', sprintAdded: 70, compositeAdded: 70, functionCount: 6, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-gstr-builder-engine', name: 'Comply360 GSTR Builder Engine', path: 'src/lib/comply360-gstr-builder-engine.ts', sprintAdded: 70, compositeAdded: 70, functionCount: 6, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-ims-engine', name: 'Comply360 IMS Engine', path: 'src/lib/comply360-ims-engine.ts', sprintAdded: 70, compositeAdded: 70, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
];

export function getSiblingCount(): number {
  return SIBLINGS.length;
}

export function getSiblingsByProvenance(provenance: SiblingEntry['provenance']): SiblingEntry[] {
  return SIBLINGS.filter((s) => s.provenance === provenance);
}
