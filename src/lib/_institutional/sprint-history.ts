/**
 * @file        src/lib/_institutional/sprint-history.ts
 * @purpose     Source-of-truth register for banked sprints
 * @sprint      T-Phase-3.HK-D14-InstitutionalRegisters
 */

export interface SprintEntry {
  sprintNumber: number;
  code: string;
  composite: boolean;
  grade: 'A' | 'A first-pass-clean' | 'A composite' | 'B' | 'C' | null;
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
