/**
 * @file        src/lib/comply360-brsr-comprehensive-engine.ts
 * @sibling     NEW @ Sprint 77a · Comply360 Main Arc 1.9 · Pass A
 * @realizes    BRSR Comprehensive (SEBI 9-Principle disclosure) engine ·
 *              extends FA-specific brsr-fa-engine to cover all 9 NGRBC principles.
 * @approach    Pure computation · pulls FA disclosure pack (read-only) for
 *              Principle 6 (environment) · greenfield localStorage for the other 8.
 * @reads-from  brsr-fa-engine.ts (computeBRSRFADisclosurePack · 0-DIFF · §H boundary)
 * [JWT] Phase 5: GET /api/comply360/brsr/:entity/:fy · POST /api/comply360/brsr/principle
 */
import { computeBRSRFADisclosurePack } from './brsr-fa-engine';

export type BRSRPrinciple = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9';

export const PRINCIPLE_LABELS: Record<BRSRPrinciple, string> = {
  P1: 'Ethical, transparent and accountable conduct',
  P2: 'Safe and sustainable goods and services',
  P3: 'Respect and well-being of employees',
  P4: 'Stakeholder responsiveness',
  P5: 'Respect for human rights',
  P6: 'Environment protection and restoration',
  P7: 'Responsible policy advocacy',
  P8: 'Inclusive growth and equitable development',
  P9: 'Customer value provision',
};

export interface BRSRPrincipleDisclosure {
  principle: BRSRPrinciple;
  label: string;
  essential_indicators_disclosed: number;
  leadership_indicators_disclosed: number;
  total_indicators_expected: number;
  coverage_pct: number;
  data_points_count: number;
}

export interface BRSRComprehensiveReport {
  entity_code: string;
  financial_year: string;
  principles: BRSRPrincipleDisclosure[];
  fa_carbon_kg_per_year: number;
  fa_coverage_pct: number;
  overall_coverage_pct: number;
  filing_eligible: boolean;
  generated_at: string;
}

interface BRSRIndicatorRecord {
  id: string;
  principle: BRSRPrinciple;
  indicator_ref: string;
  is_leadership: boolean;
  value: string;
  recorded_at: string;
}

const EXPECTED_INDICATORS_PER_PRINCIPLE: Record<BRSRPrinciple, number> = {
  P1: 13, P2: 9, P3: 19, P4: 7, P5: 17, P6: 18, P7: 5, P8: 12, P9: 9,
};

export const brsrIndicatorsKey = (entityCode: string, fy: string): string =>
  `erp_brsr_indicators_${entityCode}_${fy}`;

export function loadBRSRIndicators(entityCode: string, fy: string): BRSRIndicatorRecord[] {
  try {
    const raw = localStorage.getItem(brsrIndicatorsKey(entityCode, fy));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as BRSRIndicatorRecord[]) : [];
  } catch {
    return [];
  }
}

export function recordBRSRIndicator(
  entityCode: string,
  fy: string,
  rec: Omit<BRSRIndicatorRecord, 'id' | 'recorded_at'>,
): BRSRIndicatorRecord {
  const list = loadBRSRIndicators(entityCode, fy);
  const next: BRSRIndicatorRecord = {
    id: `BRSR-${entityCode}-${fy}-${Date.now()}`,
    recorded_at: new Date().toISOString(),
    ...rec,
  };
  localStorage.setItem(brsrIndicatorsKey(entityCode, fy), JSON.stringify([...list, next]));
  return next;
}

export function summarizePrinciple(
  indicators: BRSRIndicatorRecord[],
  principle: BRSRPrinciple,
): BRSRPrincipleDisclosure {
  const scoped = indicators.filter((i) => i.principle === principle);
  const essential = scoped.filter((i) => !i.is_leadership).length;
  const leadership = scoped.filter((i) => i.is_leadership).length;
  const expected = EXPECTED_INDICATORS_PER_PRINCIPLE[principle];
  return {
    principle,
    label: PRINCIPLE_LABELS[principle],
    essential_indicators_disclosed: essential,
    leadership_indicators_disclosed: leadership,
    total_indicators_expected: expected,
    coverage_pct: expected > 0 ? Math.round(((essential + leadership) / expected) * 100) : 0,
    data_points_count: scoped.length,
  };
}

export function buildBRSRComprehensiveReport(
  entityCode: string,
  financialYear: string,
): BRSRComprehensiveReport {
  const indicators = loadBRSRIndicators(entityCode, financialYear);
  const principles = (Object.keys(EXPECTED_INDICATORS_PER_PRINCIPLE) as BRSRPrinciple[])
    .map((p) => summarizePrinciple(indicators, p));

  // Read-only pull from brsr-fa-engine (§H boundary)
  const faPack = computeBRSRFADisclosurePack(entityCode, financialYear);

  const overall = principles.reduce((s, p) => s + p.coverage_pct, 0) / principles.length;
  return {
    entity_code: entityCode,
    financial_year: financialYear,
    principles,
    fa_carbon_kg_per_year: faPack.summary.total_co2_kg_per_year,
    fa_coverage_pct: faPack.summary.coverage_pct,
    overall_coverage_pct: Math.round(overall),
    filing_eligible: overall >= 70,
    generated_at: new Date().toISOString(),
  };
}

export function validateBRSRReport(report: BRSRComprehensiveReport): {
  ready: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  if (report.fa_coverage_pct < 50) {
    warnings.push('FA BRSR metadata coverage below 50% · Principle 6 disclosure incomplete');
  }
  for (const p of report.principles) {
    if (p.coverage_pct < 50) {
      warnings.push(`${p.principle} (${p.label}) coverage ${p.coverage_pct}% · below 50%`);
    }
  }
  return { ready: warnings.length === 0, warnings };
}
