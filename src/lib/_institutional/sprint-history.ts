/**
 * @file        src/lib/_institutional/sprint-history.ts
 * @purpose     Source-of-truth register for 60 banked sprints
 * @sprint      T-Phase-3.HK-D14-InstitutionalRegisters
 * @disciplines NOT FR-19 SIBLING · institutional reference data
 *              Backfill batch for Sprints 1-53 scheduled in Sprint 61.HK
 *              v2 era (Sprints 54-60) fully populated · 7-sprint A-streak NEW RECORD
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
    sprintNumber: 54,
    code: 'HK-6.T1 Cleanup',
    composite: true,
    grade: 'A first-pass-clean',
    headSha: null,
    predecessorSha: null,
    loc: null,
    newSiblings: [],
    bankDate: null,
    provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 55,
    code: 'T-Phase-3.PROD-1',
    composite: true,
    grade: 'A',
    headSha: null,
    predecessorSha: null,
    loc: 1000,
    newSiblings: ['sales-production-bridge'],
    bankDate: null,
    provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 56,
    code: 'T-Phase-3.PROD-2',
    composite: true,
    grade: 'A',
    headSha: null,
    predecessorSha: null,
    loc: 1200,
    newSiblings: [],
    bankDate: null,
    provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 57,
    code: 'T-Phase-3.PROD-2.5+T1',
    composite: true,
    grade: 'A',
    headSha: null,
    predecessorSha: null,
    loc: 790,
    newSiblings: [],
    bankDate: null,
    provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 58,
    code: 'T-Phase-3.PROD-FIX-A',
    composite: true,
    grade: 'A composite',
    headSha: '9362729e',
    predecessorSha: null,
    loc: 2400,
    newSiblings: [],
    bankDate: null,
    provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 59,
    code: 'T-Phase-3.PROD-3',
    composite: true,
    grade: 'A first-pass-clean',
    headSha: '0cdb7e50',
    predecessorSha: '9362729e',
    loc: 1100,
    newSiblings: ['iot-machine-bridge'],
    bankDate: null,
    provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 60,
    code: 'T-Phase-3.PROD-3.5',
    composite: true,
    grade: 'A composite',
    headSha: '3d7483e7',
    predecessorSha: '0cdb7e50',
    loc: 3326,
    newSiblings: [
      'process-batch-engine',
      'recipe-formula-engine',
      'spc-quality-engine',
      'process-genealogy-engine',
      'tank-flow-inventory-engine',
    ],
    bankDate: '2026-05-24',
    provenance: 'CONFIRMED',
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
