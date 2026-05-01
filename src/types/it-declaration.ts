/** it-declaration.ts - Sprint 8 IT Declaration types */

// ── Investment Proof (one item submitted by employee) ───────────────
export interface InvestmentProof {
  id: string;
  section: string;              // '80C' | '80D' | '80E' | '80G' | '80TTA' | 'HRA' |
                                // 'HOMELOAN' | 'PREV_EMP'
  description: string;          // e.g. "LIC Premium - Policy No 123456"
  declaredAmount: number;
  proofRef: string;             // filename / reference (actual upload is Phase 2)
  status: 'submitted' | 'verified' | 'rejected' | 'pending';
  hrRemarks: string;
  verifiedBy: string;
  verifiedAt: string;
}

// ── HRA Exemption Declaration ──────────────────────────────────────
export interface HRADeclaration {
  landlordName: string;
  landlordPAN: string;
  rentPerMonth: number;
  cityType: 'metro' | 'non-metro';
  rentFromDate: string;
  rentToDate: string;
}

// ── Home Loan (Section 24) ─────────────────────────────────────────
export interface HomeLoanDeclaration {
  lenderName: string;
  loanAccountNo: string;
  interestPaid: number;         // Section 24 deduction
  principalPaid: number;        // Goes into 80C
  propertyCity: string;
}

// ── Full Form 12BB per employee per FY ─────────────────────────────
export interface ITDeclaration {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  financialYear: string;        // "2025-26"
  regime: 'old' | 'new';
  // Section 80C
  pf: number;                   // auto-filled from payroll (read-only)
  vpf: number;
  elss: number;
  ppf: number;
  licPremium: number;           // auto-filled from employee.licPolicies
  tuitionFees: number;
  homeLoanPrincipal: number;
  nscPurchase: number;
  otherSection80C: number;
  // Section 80D
  medicalInsuranceSelf: number;
  medicalInsuranceParents: number;
  // Section 80E (education loan)
  educationLoanInterest: number;
  // Section 80G (donations)
  donations80G: number;
  // Section 80TTA (savings interest)
  savingsInterest80TTA: number;
  // HRA
  hra: HRADeclaration | null;
  // Home Loan (Section 24)
  homeLoan: HomeLoanDeclaration | null;
  // Previous employer income (mid-year joiners)
  prevEmployerGross: number;
  prevEmployerTDS: number;
  prevEmployerPF: number;
  // Computed
  total80C: number;            // computed: sum capped at 150000
  totalDeductions: number;     // computed: 80C + 80D + 80E + 80G + 80TTA
  // Status
  isSubmitted: boolean;
  submittedAt: string;
  hrStatus: 'pending_review' | 'verified' | 'rejected';
  proofs: InvestmentProof[];
  created_at: string;
  updated_at: string;
}

export const IT_DECLARATIONS_KEY = 'erp_it_declarations';

// Computed total80C helper
export function computeTotal80C(d: ITDeclaration): number {
  const sum = d.pf + d.vpf + d.elss + d.ppf + d.licPremium +
    d.tuitionFees + d.homeLoanPrincipal + d.nscPurchase + d.otherSection80C;
  return Math.min(sum, 150000);
}

export function computeTotalDeductions(d: ITDeclaration): number {
  return computeTotal80C(d)
    + Math.min(d.medicalInsuranceSelf + d.medicalInsuranceParents, 75000)
    + d.educationLoanInterest
    + Math.min(d.donations80G, 100000)
    + Math.min(d.savingsInterest80TTA, 10000);
}

export function getCurrentFY(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${String(year + 1).slice(2)}`;
}

// ── Sprint T-Phase-1.2.5h-a · Multi-tenant key migration (Bucket C) ──────
// [JWT] GET /api/peoplepay/it-declarations?entityCode={e}
export const itDeclarationsKey = (e: string): string =>
  e ? `erp_it_declarations_${e}` : 'erp_it_declarations';
