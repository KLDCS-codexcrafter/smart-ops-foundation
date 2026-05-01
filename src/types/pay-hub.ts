/**
 * pay-hub.ts — Pay Hub Sprint 1 type definitions
 * Pay Head · Salary Structure · Pay Grade · seed data
 */

export type PayHeadType =
  | 'earning'
  | 'deduction'
  | 'employer_contribution'
  | 'reimbursement'
  | 'loan';

export type EarningSubType =
  | 'basic' | 'hra' | 'da' | 'conveyance' | 'special_allowance'
  | 'lta' | 'medical' | 'shift_allowance' | 'night_allowance'
  | 'project_allowance' | 'overtime_pay' | 'incentive' | 'bonus' | 'arrears'
  | 'other_earning';

export type DeductionSubType =
  | 'epf' | 'esi' | 'pt' | 'tds' | 'loan_emi' | 'advance_recovery'
  | 'lop' | 'vpf' | 'other_deduction';

export type EmployerContribSubType =
  | 'epf_employer' | 'eps' | 'edli' | 'esi_employer'
  | 'gratuity_provision' | 'nps_employer' | 'other_er_contrib';

export type PayHeadCalcType =
  | 'fixed'
  | 'percentage_basic'
  | 'percentage_gross'
  | 'percentage_ctc'
  | 'balancing'
  | 'slab'
  | 'computed';

export interface PayHead {
  id: string;
  code: string;
  name: string;
  shortName: string;
  type: PayHeadType;
  subType: string;
  calculationType: PayHeadCalcType;
  calculationBasis: string;
  calculationValue: number;
  calculationFormula: string;
  maxValueMonthly: number;
  conditionalMaxWage: number;
  affectsNet: boolean;
  taxable: boolean;
  partOfCTC: boolean;
  partOfGross: boolean;
  showInPayslip: boolean;
  showInCTCLetter: boolean;
  proRataOnLOP: boolean;
  roundToNearestRupee: boolean;
  status: 'active' | 'inactive';
  effectiveFrom: string;
  effectiveTo: string;
  created_at: string;
  updated_at: string;
}

export const PAY_HEADS_KEY = 'erp_pay_heads';

export function getPayHeadSeeds(): PayHead[] {
  const now = new Date().toISOString();
  const mk = (
    id: string, code: string, name: string, shortName: string,
    type: PayHeadType, subType: string, calcType: PayHeadCalcType,
    calcBasis: string, calcVal: number, maxMonthly: number,
    condMaxWage: number,
    affectsNet: boolean, taxable: boolean, partOfCTC: boolean,
    partOfGross: boolean, showPayslip: boolean, proRata: boolean
  ): PayHead => ({
    id, code, name, shortName, type, subType,
    calculationType: calcType, calculationBasis: calcBasis,
    calculationValue: calcVal, calculationFormula: '',
    maxValueMonthly: maxMonthly, conditionalMaxWage: condMaxWage,
    affectsNet, taxable, partOfCTC, partOfGross,
    showInPayslip: showPayslip, showInCTCLetter: true,
    proRataOnLOP: proRata, roundToNearestRupee: true, status: 'active',
    effectiveFrom: '2024-04-01', effectiveTo: '', created_at: now, updated_at: now,
  });

  return [
    // ── EARNINGS (7) ────────────────────────────────────────────────────
    mk('phseed01','BASIC','Basic Salary','Basic','earning','basic',
      'percentage_ctc','ctc',40,0,0, true,true,true,true,true,true),
    mk('phseed02','HRA','House Rent Allowance','HRA','earning','hra',
      'percentage_basic','basic',50,0,0, true,false,true,true,true,true),
    mk('phseed03','DA','Dearness Allowance','DA','earning','da',
      'percentage_basic','basic',10,0,0, true,true,true,true,true,true),
    mk('phseed04','CONV','Conveyance Allowance','Conv','earning','conveyance',
      'fixed','',1600,0,0, true,false,true,true,true,true),
    mk('phseed05','SPCL','Special Allowance','Special','earning','special_allowance',
      'balancing','',0,0,0, true,true,true,true,true,true),
    mk('phseed06','LTA','Leave Travel Allowance','LTA','earning','lta',
      'percentage_basic','basic',8.33,0,0, true,false,true,true,true,false),
    mk('phseed07','MED','Medical Allowance','Medical','earning','medical',
      'fixed','',1250,0,0, true,false,true,true,true,true),

    // ── DEDUCTIONS (4) ───────────────────────────────────────────────────
    mk('phseed08','EMP_PF','Employee PF','PF','deduction','epf',
      'percentage_basic','basic',12,1800,0, true,false,true,false,true,true),
    mk('phseed09','EMP_ESI','Employee ESI','ESI','deduction','esi',
      'percentage_gross','gross',0.75,0,21000, true,false,false,false,true,true),
    mk('phseed10','PT','Professional Tax','PT','deduction','pt',
      'slab','',0,0,0, true,false,false,false,true,true),
    mk('phseed11','TDS','Income Tax (TDS)','TDS','deduction','tds',
      'computed','',0,0,0, true,false,false,false,true,false),

    // ── EMPLOYER CONTRIBUTIONS (4) ──────────────────────────────────────
    mk('phseed12','ER_EPF','Employer PF (EPF)','ER-EPF','employer_contribution','epf_employer',
      'percentage_basic','basic',3.67,550,0, false,false,true,false,true,true),
    mk('phseed13','ER_EPS','Employer EPS','ER-EPS','employer_contribution','eps',
      'percentage_basic','basic',8.33,1250,0, false,false,true,false,true,true),
    mk('phseed14','ER_EDLI','EDLI','EDLI','employer_contribution','edli',
      'percentage_basic','basic',0.5,75,0, false,false,true,false,false,true),
    mk('phseed15','ER_ESI','Employer ESI','ER-ESI','employer_contribution','esi_employer',
      'percentage_gross','gross',3.25,0,21000, false,false,true,false,true,true),
  ];
}

// ── Salary Structure types ──────────────────────────────────────────────

export interface SalaryStructureComponent {
  payHeadId: string;
  payHeadCode: string;
  payHeadName: string;
  payHeadType: PayHeadType;
  calculationType: PayHeadCalcType;
  calculationBasis: string;
  calculationValue: number;
  maxValueMonthly: number;
  sortOrder: number;
}

export interface SalaryStructure {
  id: string;
  code: string;
  name: string;
  description: string;
  basedOn: 'ctc' | 'gross' | 'basic';
  minCTC: number;
  maxCTC: number;
  components: SalaryStructureComponent[];
  applicableGrades: string[];
  applicableDesignations: string[];
  effectiveFrom: string;
  effectiveTo: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export const SALARY_STRUCTURES_KEY = 'erp_salary_structures';

// ── Pay Grade types ─────────────────────────────────────────────────────

export interface PayGrade {
  id: string;
  code: string;
  name: string;
  level: number;
  minCTC: number;
  maxCTC: number;
  minGross: number;
  maxGross: number;
  minBasic: number;
  maxBasic: number;
  salaryStructureId: string;
  salaryStructureName: string;
  promotionCriteriaYears: number;
  promotionCriteriaRating: number;
  nextGrades: string[];
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export const PAY_GRADES_KEY = 'erp_pay_grades';

// Labels for display
export const PAY_HEAD_TYPE_LABELS: Record<PayHeadType, string> = {
  earning: 'Earning',
  deduction: 'Deduction',
  employer_contribution: 'Employer Contribution',
  reimbursement: 'Reimbursement',
  loan: 'Loan Head',
};

export const CALC_TYPE_LABELS: Record<PayHeadCalcType, string> = {
  fixed: 'Fixed Amount (₹/month)',
  percentage_basic: '% of Basic',
  percentage_gross: '% of Gross',
  percentage_ctc: '% of Annual CTC',
  balancing: 'Balancing (fills to CTC)',
  slab: 'Slab-based',
  computed: 'Computed (IT engine)',
};

// ── Sprint T-Phase-1.2.5h-a · Multi-tenant key migration (Bucket C) ──────
// [JWT] GET /api/peoplepay/salary-structures?entityCode={e}
export const salaryStructuresKey = (e: string): string =>
  e ? `erp_salary_structures_${e}` : 'erp_salary_structures';
