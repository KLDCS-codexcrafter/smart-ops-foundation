/**
 * @file        src/lib/_institutional/moat-register.ts
 * @purpose     Source-of-truth register for the 34 competitive moats
 * @sprint      T-Phase-3.HK-D14-InstitutionalRegisters
 * @disciplines NOT FR-19 SIBLING · institutional reference data
 *              Backfill batch for entries 1-25 scheduled in Sprint 61.HK
 */

export interface MoatEntry {
  id: string;
  name: string;
  sprintBanked: number | null;
  compositeBanked: number | null;
  headShaBanked: string | null;
  backingFiles: string[];
  competitivePositioning: string;
  provenance: 'CONFIRMED' | 'PENDING_BACKFILL';
}

export const MOATS: MoatEntry[] = [
  ...Array.from({ length: 25 }, (_, i) => ({
    id: `MOAT-${String(i + 1).padStart(2, '0')}`,
    name: 'PENDING_BACKFILL',
    sprintBanked: null,
    compositeBanked: null,
    headShaBanked: null,
    backingFiles: [] as string[],
    competitivePositioning: 'PENDING_BACKFILL · backfill in Sprint 61.HK',
    provenance: 'PENDING_BACKFILL' as const,
  })),
  {
    id: 'MOAT-26',
    name: 'UPRA arc closure · 33/33 fy-stamped records canonical',
    sprintBanked: null,
    compositeBanked: null,
    headShaBanked: null,
    backingFiles: [],
    competitivePositioning: 'May 17 · UPRA closure milestone',
    provenance: 'CONFIRMED',
  },
  {
    id: 'MOAT-27',
    name: 'TXUI arc closure · 14/14 FinCore canonical adoption · Path B-Lite institutionalized',
    sprintBanked: null,
    compositeBanked: null,
    headShaBanked: null,
    backingFiles: [],
    competitivePositioning: 'May 18 · 15 canonical-adopted forms',
    provenance: 'CONFIRMED',
  },
  {
    id: 'MOAT-28',
    name: 'Sprint 46 Closure + FR Ceremony 47 cohesive · 25 SIBLINGs · Procure360 100% production-ready',
    sprintBanked: 46,
    compositeBanked: 51,
    headShaBanked: '89c150a0',
    backingFiles: [],
    competitivePositioning: 'May 23 · 51st A POST-T2 · 9-promotion ceremony',
    provenance: 'CONFIRMED',
  },
  {
    id: 'MOAT-29',
    name: 'PROD-1 Cross-Card Foundation · sales-production-bridge SIBLING',
    sprintBanked: 55,
    compositeBanked: 55,
    headShaBanked: null,
    backingFiles: ['src/lib/sales-production-bridge.ts'],
    competitivePositioning: 'Phase 3 v2 Production Arc · cross-card discipline',
    provenance: 'CONFIRMED',
  },
  {
    id: 'MOAT-30',
    name: 'PROD-FIX-A Multi-Factory + FY-Close',
    sprintBanked: 58,
    compositeBanked: 58,
    headShaBanked: '9362729e',
    backingFiles: [],
    competitivePositioning: 'Indian-statutory multi-factory + financial-year close mechanics',
    provenance: 'CONFIRMED',
  },
  {
    id: 'MOAT-31',
    name: 'PROD-3 Mobile + IoT · iot-machine-bridge SIBLING (387 LOC · 30+ exports)',
    sprintBanked: 59,
    compositeBanked: 59,
    headShaBanked: '0cdb7e50',
    backingFiles: ['src/lib/iot-machine-bridge.ts'],
    competitivePositioning: 'Mobile shop-floor + IoT telemetry · no Indian SMB ERP comparable',
    provenance: 'CONFIRMED',
  },
  {
    id: 'MOAT-32',
    name: 'PROD-3.5 Process Mfg MEGA · institutional flagship · 5 NEW SIBLINGs',
    sprintBanked: 60,
    compositeBanked: 60,
    headShaBanked: '3d7483e7',
    backingFiles: [
      'src/lib/process-batch-engine.ts',
      'src/lib/recipe-formula-engine.ts',
      'src/lib/spc-quality-engine.ts',
      'src/lib/process-genealogy-engine.ts',
      'src/lib/tank-flow-inventory-engine.ts',
    ],
    competitivePositioning: '3,326 LOC composite · NEW Operix LOC record · first Indian ERP with process mfg depth at SMB price',
    provenance: 'CONFIRMED',
  },
  {
    id: 'MOAT-33',
    name: '6 NEW process-mfg competitive moats operational',
    sprintBanked: 60,
    compositeBanked: 60,
    headShaBanked: '3d7483e7',
    backingFiles: [],
    competitivePositioning: 'Moat 15 mode-aware · 16 co/by-product costing · 17 GMP genealogy · 18 recipe semver+ECN · 19 tank/flow · 20 pharma recall sim',
    provenance: 'CONFIRMED',
  },
  {
    id: 'MOAT-34',
    name: '5 NEW institutional patterns originated in single sprint',
    sprintBanked: 60,
    compositeBanked: 60,
    headShaBanked: '3d7483e7',
    backingFiles: [],
    competitivePositioning: 'Q-LOCK-14 MANDATORY ASK + 24-pillar at scale + 14-Q-LOCK upfront + Path B canon + Lesson 17 banners',
    provenance: 'CONFIRMED',
  },
];

export function getMoatCount(): number {
  return MOATS.length;
}
