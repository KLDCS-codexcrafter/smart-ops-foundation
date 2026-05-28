/**
 * @file        src/lib/_institutional/sprint-history.ts
 * @purpose     Source-of-truth register for banked sprints
 * @sprint      T-Phase-3.HK-D14-InstitutionalRegisters
 */

export interface SprintEntry {
  sprintNumber: number;
  code: string;
  composite: boolean;
  grade: 'A' | 'A first-pass-clean' | 'A composite' | 'A with adaptations' | 'B' | 'C' | null;
  headSha: string | null;
  predecessorSha: string | null;
  loc: number | null;
  newSiblings: string[];
  bankDate: string | null;
  provenance: 'CONFIRMED' | 'PENDING_BACKFILL';
}

export const SPRINTS: SprintEntry[] = [
  ...Array.from({ length: 53 }, (_, i) => ({
    sprintNumber: i + 1,
    code: 'PENDING_BACKFILL',
    composite: false,
    grade: null,
    headSha: null,
    predecessorSha: null,
    loc: null,
    newSiblings: [] as string[],
    bankDate: null,
    provenance: 'PENDING_BACKFILL' as const,
  })),
  {
    sprintNumber: 54, code: 'HK-6.T1 Cleanup', composite: true, grade: 'A first-pass-clean',
    headSha: null, predecessorSha: null, loc: null, newSiblings: [], bankDate: null, provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 55, code: 'T-Phase-3.PROD-1', composite: true, grade: 'A',
    headSha: null, predecessorSha: null, loc: 1000, newSiblings: ['sales-production-bridge'], bankDate: null, provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 56, code: 'T-Phase-3.PROD-2', composite: true, grade: 'A',
    headSha: null, predecessorSha: null, loc: 1200, newSiblings: [], bankDate: null, provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 57, code: 'T-Phase-3.PROD-2.5+T1', composite: true, grade: 'A',
    headSha: null, predecessorSha: null, loc: 790, newSiblings: [], bankDate: null, provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 58, code: 'T-Phase-3.PROD-FIX-A', composite: true, grade: 'A composite',
    headSha: '9362729e', predecessorSha: null, loc: 2400, newSiblings: [], bankDate: null, provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 59, code: 'T-Phase-3.PROD-3', composite: true, grade: 'A first-pass-clean',
    headSha: '0cdb7e50', predecessorSha: '9362729e', loc: 1100, newSiblings: ['iot-machine-bridge'], bankDate: null, provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 60, code: 'T-Phase-3.PROD-3.5', composite: true, grade: 'A composite',
    headSha: '3d7483e7', predecessorSha: '0cdb7e50', loc: 3326,
    newSiblings: [
      'process-batch-engine', 'recipe-formula-engine', 'spc-quality-engine',
      'process-genealogy-engine', 'tank-flow-inventory-engine',
    ],
    bankDate: '2026-05-24', provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 61, code: 'T-Phase-3.PROD-4', composite: true, grade: 'A composite',
    headSha: '04c5f2c', predecessorSha: '3d7483e7', loc: 1570,
    newSiblings: ['demand-forecast-engine'], bankDate: '2026-05-25', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 62 PROD-4.5 · Repetitive + Mixed-Mode + GMP Schedule M + 21 CFR Part 11 · 38th SIBLING
  {
    sprintNumber: 62, code: 'T-Phase-3.PROD-4.5', composite: false, grade: 'A first-pass-clean',
    headSha: 'TBD_AT_BANK', predecessorSha: '04c5f2c', loc: 1500,
    newSiblings: ['cfr-part-11-engine'], bankDate: '2026-05-25', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 63 PROD-5 · ESG + Closeout + Carbon-aware · 39th SIBLING · ⭐ PHASE 3 v2 CLOSES · 28/28 CAPABILITY FULL · 10-streak NEW RECORD DOUBLE-DIGIT
  {
    sprintNumber: 63, code: 'T-Phase-3.PROD-5', composite: false, grade: 'A first-pass-clean',
    headSha: 'TBD_AT_BANK', predecessorSha: '2c11f18b', loc: 1200,
    newSiblings: ['carbon-planning-engine'], bankDate: '2026-05-25', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 64 FAR-0 · Demo Seed + Cross-Card-Integrity Schema · Phase 4 FAR Arc OPEN · 6 FAR-CAPs + 4 FK-CAPs schema-staged · 11-streak ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
  {
    sprintNumber: 64, code: 'T-Phase-4.FAR-0', composite: false, grade: 'A first-pass-clean',
    headSha: 'f60f75d17592557a37d7e5ad9adeca446804dc20', predecessorSha: '567c140c', loc: 1300,
    newSiblings: [], bankDate: '2026-05-25', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 65 FAR-1 · Indian Statutory Auto-Pack · 40/41/42 SIBLINGs · MOAT-39/40/41 · 12-streak ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐ DOUBLE-DIGIT MILESTONE+2
  {
    sprintNumber: 65, code: 'T-Phase-4.FAR-1', composite: false, grade: 'A first-pass-clean',
    headSha: '54433a13ab596c73e992233b340cc894aaa063f6', predecessorSha: '9eeecc23', loc: 1450,
    newSiblings: ['caro-2020-engine', 'ind-as-116-lease-engine', 'epcg-fa-bridge'],
    bankDate: '2026-05-26', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 66 FAR-2 · Cross-Card FK UI · 43rd SIBLING · MOAT-42/43/44 · 13-streak NEW RECORD (baker's-dozen)
  {
    sprintNumber: 66, code: 'T-Phase-4.FAR-2', composite: false, grade: 'A first-pass-clean',
    headSha: 'fc6d521d773ef8fbf5211897c3b991239d786020', predecessorSha: '0ebfc779', loc: 1850,
    newSiblings: ['vehicle-fa-bridge'],
    bankDate: '2026-05-26', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 67 FAR-3 · Compute Engine Best-in-Class · 3 NEW SIBLINGs · MOAT-45/46/47 · 14-streak
  {
    sprintNumber: 67, code: 'T-Phase-4.FAR-3', composite: false, grade: 'A first-pass-clean',
    headSha: '01c62d7e6fd1aecd1f26027a9233d286244bf9cd', predecessorSha: 'ad0e1d2d9029d502ac050df8481add0c08501c34', loc: 2170,
    newSiblings: ['multi-gaap-depreciation-engine', 'uop-depreciation-engine', 'component-depreciation-engine'],
    bankDate: '2026-05-27', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 68 FAR-4 · AI + IoT + RFID + PM + BRSR + Dashboard + Audit · 8 NEW SIBLINGs · MOAT-48..52 · 15-streak NEW RECORD ⭐ · FAR Arc CLOSES at 60/60
  {
    sprintNumber: 68, code: 'T-Phase-4.FAR-4', composite: false, grade: 'A first-pass-clean',
    headSha: '12fae25b1c0db799a3bc4270abf2d3383c7b7555', predecessorSha: '01c62d7e6fd1aecd1f26027a9233d286244bf9cd', loc: 2790,
    newSiblings: [
      'ai-fa-classification-engine', 'document-ai-fa-engine',
      'iot-asset-bridge', 'rfid-asset-bridge',
      'predictive-maintenance-fa-engine', 'brsr-fa-engine',
      'fa-audit-trail-engine', 'insightx-fa-staging-engine',
    ],
    bankDate: '2026-05-27', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 69 T-Phase-5.A.1.1 · Comply360 Main Arc 1.1 · 2-cycle audit chain · graded A with adaptations ⭐ · 16-streak NEW RECORD
  {
    sprintNumber: 69, code: 'T-Phase-5.A.1.1', composite: false, grade: 'A with adaptations',
    headSha: '1919be0f3820204191b481b00479da49c95c6f3d', predecessorSha: '9925e6269e53e5a0d30b8e2669fb3fde5398e9fb', loc: 1290,
    newSiblings: ['comply360-health-score-engine', 'comply360-statutory-memory'],
    bankDate: '2026-05-27', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 70a T-Phase-5.A.1.2-PASS-A · Comply360 Main Arc 1.2 · Path α Pass A (engine layer) · graded A with adaptations ⭐ (2-cycle chain · grade-updated in Sprint 70b Cycle-2) · 17-streak
  {
    sprintNumber: 70, code: 'T-Phase-5.A.1.2-PASS-A', composite: false, grade: 'A with adaptations',
    headSha: '9a4ec95dffb03cf35387c553b03c6ef41dd13cc0', predecessorSha: '1919be0f3820204191b481b00479da49c95c6f3d', loc: 1480,
    newSiblings: ['comply360-gst-aggregator-engine', 'comply360-gstr-builder-engine', 'comply360-ims-engine'],
    bankDate: '2026-05-27', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 70b T-Phase-5.A.1.2-PASS-B · Comply360 Main Arc 1.2 · Path α Pass B (UI layer · 4 NATIVE pages + tab-shell + multi-GSTIN hook · PATTERN-S70b-NAVIGATION-CANONICAL ratified) · A with adaptations ⭐ (2-cycle chain) · 18-streak NEW RECORD
  {
    sprintNumber: 70, code: 'T-Phase-5.A.1.2-PASS-B', composite: false, grade: 'A with adaptations',
    headSha: '16f4ea2b3f320c8f1db8f81e11591b25e01c1bc5', predecessorSha: '9a4ec95dffb03cf35387c553b03c6ef41dd13cc0', loc: 1354,
    newSiblings: ['use-entity-gstins-hook', 'comply360-tax-gst-shell'],
    bankDate: '2026-05-28', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 71 T-Phase-5.A.1.3 · Comply360 Main Arc 1.3 · Q3 Part 2 (GSTR-3B + tax-tolerance + ECRS + cross-return recon) · single-pass · 19-streak NEW RECORD
  {
    sprintNumber: 71, code: 'T-Phase-5.A.1.3', composite: false, grade: 'A with adaptations',
    headSha: '9d47ec68e75552e80363e1656523e6448be02a28', predecessorSha: '16f4ea2b3f320c8f1db8f81e11591b25e01c1bc5', loc: 1200,
    newSiblings: ['comply360-tax-tolerance-engine', 'comply360-ecrs-engine'],
    bankDate: '2026-05-28', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 72 T-Phase-5.A.1.4 · Comply360 Main Arc 1.4 · Q4 NATIVE TDS suite (194Q + 194-O + SFT + Form 26AS reco · NEW 24th `tds` mega-menu · Option C) · 20-streak NEW RECORD ⭐
  {
    sprintNumber: 72, code: 'T-Phase-5.A.1.4', composite: false, grade: 'A first-pass-clean',
    headSha: null, predecessorSha: '9d47ec68e75552e80363e1656523e6448be02a28', loc: 1710,
    newSiblings: [
      'comply360-tds-aggregator-engine',
      'comply360-tds-194q-engine',
      'comply360-sft-engine',
      'comply360-form26as-reco-engine',
    ],
    bankDate: '2026-05-28', provenance: 'CONFIRMED',
  },
];

export function getSprintCount(): number {
  return SPRINTS.length;
}

export function getCurrentAStreak(): number {
  let streak = 0;
  for (let i = SPRINTS.length - 1; i >= 0; i--) {
    const g = SPRINTS[i].grade;
    if (g && g.startsWith('A')) streak++;
    else break;
  }
  return streak;
}
