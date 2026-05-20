/**
 * @file        src/lib/ecgc-engine.ts
 * @purpose     ECGC policy register + claim shell · Moat #6 FOUNDATION
 * @sprint      T-Phase-1.EX-7c-ExportRealisation-eBRC-FEMA
 * @decisions   EX-7c-Q5=b FOUNDATION only · Phase 2 API integration
 */
import type { ECGCPolicy, ECGCClaim } from '@/types/ecgc-policy';
import { ecgcPolicyKey, ecgcClaimKey } from '@/types/ecgc-policy';

export function loadECGCPolicies(entityCode: string): ECGCPolicy[] {
  try {
    const raw = localStorage.getItem(ecgcPolicyKey(entityCode));
    if (!raw) {
      const seed: ECGCPolicy[] = [{
        id: 'ecgc-pol-001', policy_no: 'ECGC/STD/2026/SINHA/00042', entity_id: 'sinha-trading',
        status: 'active', policy_type: 'standard_shipment',
        insured_amount_inr: 50000000, premium_paid_inr: 75000,
        validity_from: '2026-04-01', validity_to: '2027-03-31',
        covered_countries: ['US', 'AE', 'JP', 'SG', 'DE'],
        notes: 'Standard Shipment Policy · 5 countries covered · sinha-trading entity',
      }];
      localStorage.setItem(ecgcPolicyKey(entityCode), JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as ECGCPolicy[];
  } catch { return []; }
}

export function saveECGCPolicies(entityCode: string, policies: ECGCPolicy[]): void {
  localStorage.setItem(ecgcPolicyKey(entityCode), JSON.stringify(policies));
}

export function getActivePolicy(entityCode: string, asOfDate: string, country: string): ECGCPolicy | null {
  return loadECGCPolicies(entityCode).find((p) =>
    p.status === 'active' &&
    p.validity_from <= asOfDate &&
    p.validity_to >= asOfDate &&
    p.covered_countries.includes(country),
  ) ?? null;
}

export function loadECGCClaims(entityCode: string): ECGCClaim[] {
  try { const raw = localStorage.getItem(ecgcClaimKey(entityCode)); return raw ? (JSON.parse(raw) as ECGCClaim[]) : []; }
  catch { return []; }
}

export function saveECGCClaims(entityCode: string, claims: ECGCClaim[]): void {
  localStorage.setItem(ecgcClaimKey(entityCode), JSON.stringify(claims));
}

export function fileECGCClaim(
  entityCode: string,
  policyId: string,
  realisationId: string,
  claimAmountINR: number,
): ECGCClaim {
  const claim: ECGCClaim = {
    id: `claim-${Date.now()}`, claim_no: '',
    related_policy_id: policyId, related_realisation_id: realisationId,
    status: 'not_filed', claim_amount_inr: claimAmountINR,
    claim_filed_date: null, claim_paid_date: null, claim_paid_amount_inr: 0,
    notes: 'Phase 1 foundation · full ECGC API integration in Phase 2 EX-API-3',
  };
  const all = loadECGCClaims(entityCode);
  saveECGCClaims(entityCode, [...all, claim]);
  return claim;
}
