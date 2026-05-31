/**
 * @file        src/lib/comply360-demo-seed-engine.ts
 * @sibling     NEW @ Sprint 88 · Comply360 Polish Slot · DP-S88 · 15th USE-SITE READ application · MAXIMUM SCALE
 * @realizes    Idempotent + clearable demo seeder · seeds across Floor 1-4 engines for first-impression demo.
 * @reads-from  comply360-sector-nbfc-engine · comply360-sector-rera-engine · comply360-ai-control-center-engine
 * @sprint      Sprint 88 · T-Phase-5.E.5.0 · POLISH SLOT
 */
import { listLoanAccounts, recordLoanAccount } from './comply360-sector-nbfc-engine';
import { listRERAProjects, registerRERAProject } from './comply360-sector-rera-engine';
import { computeComplianceROI, listROICalculations } from './comply360-ai-control-center-engine';
import { getActiveBAPAccount } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-sector-nbfc-engine',
    'comply360-sector-rera-engine',
    'comply360-ai-control-center-engine',
    'comply360-audit-framework-engine',
  ],
  storage_keys: [
    'erp_nbfc_loans', 'erp_rera_projects',
    'erp_ai_roi_calculations',
    'erp_comply360_demo_seed_marker',
  ],
} as const;

const MARKER = 'erp_comply360_demo_seed_marker';

export interface DemoSeedSummary {
  alreadySeeded: boolean;
  nbfcLoans: number;
  reraProjects: number;
  aiROIs: number;
  seededAt: string;
}

function readMarker(): string | null {
  try { return localStorage.getItem(MARKER); } catch { return null; }
}

export function isDemoSeeded(): boolean {
  return readMarker() !== null;
}

export function applyDemoSeed(): DemoSeedSummary {
  const existing = readMarker();
  if (existing) {
    return {
      alreadySeeded: true,
      nbfcLoans: listLoanAccounts().length,
      reraProjects: listRERAProjects().length,
      aiROIs: listROICalculations().length,
      seededAt: existing,
    };
  }
  const bap = getActiveBAPAccount();

  recordLoanAccount({
    borrower_name: 'Sharma Industries', borrower_id: 'BRW-001',
    loan_amount_inr: 5000000, outstanding_inr: 4200000, days_past_due: 45,
    recorded_by_bap: bap,
  });
  recordLoanAccount({
    borrower_name: 'Mehta Textiles', borrower_id: 'BRW-002',
    loan_amount_inr: 2500000, outstanding_inr: 2100000, days_past_due: 180,
    recorded_by_bap: bap,
  });
  recordLoanAccount({
    borrower_name: 'Patel Constructions', borrower_id: 'BRW-003',
    loan_amount_inr: 8000000, outstanding_inr: 7500000, days_past_due: 500,
    recorded_by_bap: bap,
  });

  registerRERAProject({
    project_name: 'Skyline Heights · Phase 1',
    rera_registration_no: 'P51700045123',
    state_rera_authority: 'MahaRERA', promoter_name: 'Skyline Builders Pvt Ltd',
    project_type: 'residential', total_units: 240, total_area_sqft: 350000,
    estimated_completion_date: '2027-12-31', recorded_by_bap: bap,
  });
  registerRERAProject({
    project_name: 'Greenfield Commercial Park',
    rera_registration_no: null,
    state_rera_authority: 'KarRERA', promoter_name: 'Greenfield Developers LLP',
    project_type: 'commercial', total_units: 80, total_area_sqft: 180000,
    estimated_completion_date: '2026-09-30', recorded_by_bap: bap,
  });

  computeComplianceROI({
    fy: '2025-26',
    industry_baseline_inr: 4800000, operix_actual_inr: 1200000,
    manual_hours_baseline: 2400, operix_hours_actual: 480,
    recorded_by_bap: bap,
  });

  const now = new Date().toISOString();
  try { localStorage.setItem(MARKER, now); } catch { /* quota */ }

  return {
    alreadySeeded: false,
    nbfcLoans: listLoanAccounts().length,
    reraProjects: listRERAProjects().length,
    aiROIs: listROICalculations().length,
    seededAt: now,
  };
}

export function clearDemoSeed(): void {
  for (const k of READS_FROM.storage_keys) {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  }
}

export function getDemoSeedStats(): { nbfcLoans: number; reraProjects: number; aiROIs: number; seededAt: string | null } {
  return {
    nbfcLoans: listLoanAccounts().length,
    reraProjects: listRERAProjects().length,
    aiROIs: listROICalculations().length,
    seededAt: readMarker(),
  };
}
