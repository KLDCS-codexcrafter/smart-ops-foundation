/**
 * tds-engine.ts — TDS auto-deduction engine
 * Based on TDL-03 Compliance TDL patterns
 * [JWT] Replace with POST /api/accounting/tds/compute
 */

import type { TDSSection } from '@/data/compliance-seed-data';

export interface TDSComputeResult {
  applicable: boolean;
  section: string;
  sectionName: string;
  rate: number;
  grossAmount: number;
  tdsAmount: number;
  netAmount: number;
  thresholdCrossed: boolean;
  is194QApplicable: boolean;
  ledgerSuggestion: string;
}

// Reads TDS sections from localStorage (seeded by TDSSectionMaster)
function loadSections(): TDSSection[] {
  // [JWT] GET /api/accounting/tds-sections
  try { return JSON.parse(localStorage.getItem('erp_tds_sections') || '[]'); }
  catch { return []; }
}

// Reads aggregate amount paid to vendor in current FY
function getAggregateYTD(vendorId: string, sectionCode: string, entityCode: string): number {
  // [JWT] GET /api/accounting/tds/ytd-aggregate
  try {
    // [JWT] GET /api/accounting/vouchers
    const vouchers = JSON.parse(localStorage.getItem(`erp_group_vouchers_${entityCode}`) || '[]');
    return vouchers
      .filter((v: Record<string, unknown>) => v.party_id === vendorId && vendorId &&
        v.tds_section === sectionCode && v.status === 'posted')
      .reduce((s: number, v: Record<string, unknown>) => s + ((v.gross_amount as number) || 0), 0);
  } catch { return 0; }
}

export function computeTDS(
  grossAmount: number,
  sectionCode: string,
  deducteeType: 'individual' | 'company' | 'no_pan',
  vendorId: string,
  entityCode: string
): TDSComputeResult {
  const sections = loadSections();
  const sec = sections.find(s => s.sectionCode === sectionCode);

  if (!sec) return {
    applicable: false, section: sectionCode, sectionName: '',
    rate: 0, grossAmount, tdsAmount: 0, netAmount: grossAmount,
    thresholdCrossed: false, is194QApplicable: false, ledgerSuggestion: '',
  };

  const ytd = getAggregateYTD(vendorId, sectionCode, entityCode);
  const thresholdCrossed = checkThreshold(sec, grossAmount, ytd);

  if (!thresholdCrossed) return {
    applicable: false, section: sectionCode, sectionName: sec.sectionName,
    rate: 0, grossAmount, tdsAmount: 0, netAmount: grossAmount,
    thresholdCrossed: false, is194QApplicable: false, ledgerSuggestion: '',
  };

  const rate = deducteeType === 'no_pan' ? sec.rateNoPAN :
    deducteeType === 'company' ? sec.rateCompany : sec.rateIndividual;
  const tdsAmount = Math.round(grossAmount * rate / 100);

  return {
    applicable: true, section: sectionCode, sectionName: sec.sectionName,
    rate, grossAmount, tdsAmount, netAmount: grossAmount - tdsAmount,
    thresholdCrossed: true,
    is194QApplicable: is194QApplicable(ytd + grossAmount),
    ledgerSuggestion: `TDS Payable u/s ${sectionCode}`,
  };
}

export function checkThreshold(
  sec: TDSSection, currentPayment: number, aggregateYTD: number
): boolean {
  if (sec.thresholdPerTransaction && currentPayment < sec.thresholdPerTransaction)
    return false;
  if (sec.thresholdAggregateAnnual &&
    (aggregateYTD + currentPayment) < sec.thresholdAggregateAnnual)
    return false;
  return true;
}

// Section 194Q: applicable when buyer's purchases from a vendor exceed 50L in FY
export function is194QApplicable(aggregatePurchasesYTD: number): boolean {
  return aggregatePurchasesYTD >= 5000000;
}
