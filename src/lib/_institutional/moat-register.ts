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
  // 🆕 Sprint 61 PROD-4 PASS 2 · OOB-PROD-1
  {
    id: 'MOAT-35',
    name: 'OOB-PROD-1 · Distributor Demand Forecast Feed · enterprise-grade demand sensing at SMB price',
    sprintBanked: 61,
    compositeBanked: 61,
    headShaBanked: 'TBD_AT_BANK',
    backingFiles: [
      'src/lib/demand-forecast-engine.ts',
      'src/pages/erp/distributor-hub/reports/DistributorDemandForecastFeed.tsx',
    ],
    competitivePositioning: 'No Indian SMB ERP has cross-card distributor → production demand sensing · SAP/Oracle at 10x cost',
    provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 61 PROD-4 PASS 2 · OOB-PROD-2 · Predictive Machine Condition
  {
    id: 'MOAT-36',
    name: 'OOB-PROD-2 · Predictive Machine Condition · SAP S/4 capability at SMB price',
    sprintBanked: 61,
    compositeBanked: 61,
    headShaBanked: 'TBD_AT_BANK',
    backingFiles: [
      'src/lib/iot-machine-bridge.ts',
      'src/pages/erp/maintainpro/reports/PredictiveMachineHealth.tsx',
    ],
    competitivePositioning: 'Predictive machine condition via telemetry trend regression · SAP S/4 INR 50L+ TCO · no Indian SMB ERP under INR 10L',
    provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 62 PROD-4.5 · MOAT-37 · 21 CFR Part 11 audit trail at SMB price
  {
    id: 'MOAT-37',
    name: '21 CFR Part 11 Electronic Audit Trail Framework at SMB Price · only Indian SMB ERP with FDA-grade e-signature + tamper-evident audit trail',
    sprintBanked: 62,
    compositeBanked: 62,
    headShaBanked: 'TBD_AT_BANK',
    backingFiles: [
      'src/lib/cfr-part-11-engine.ts',
      'src/types/cfr-part-11.ts',
      'src/pages/erp/qualicheck/reports/CFRPart11AuditTrailViewer.tsx',
    ],
    competitivePositioning: 'No Indian SMB ERP under ₹50L has 21 CFR Part 11 e-signature + audit trail · SAP S/4 has at ₹2-10Cr · Operix at ₹3-8L unlocks pharma SMB beachhead',
    provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 63 PROD-5 · MOAT-38 · World-First Carbon-Aware Production Planning at SMB Price
  {
    id: 'MOAT-38',
    name: 'World-First Carbon-Aware Production Planning at SMB Price',
    sprintBanked: 63,
    compositeBanked: 63,
    headShaBanked: 'TBD_AT_BANK',
    backingFiles: [
      'src/lib/carbon-planning-engine.ts',
      'src/types/carbon-planning.ts',
      'src/pages/erp/production/reports/CarbonAwareProductionPlanner.tsx',
      'src/pages/erp/production/reports/ProductionCarbonDashboard.tsx',
    ],
    competitivePositioning: 'Category-defining · only ERP globally offering carbon-aware planning at SMB price · SAP S/4 has partial at ₹2-10Cr · Operix at ₹3-8L TCO 30-300x cheaper',
    provenance: 'CONFIRMED',
  },
];

export function getMoatCount(): number {
  return MOATS.length;
}
