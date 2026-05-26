/**
 * statutory-pack.ts — FAR-1 (Sprint 65) Indian Statutory Auto-Pack types
 * @sprint T-Phase-4.FAR-1
 */

export type CAROSubRuleId =
  | 'a-completeness'
  | 'b-verification'
  | 'c-title-deeds'
  | 'd-revaluation'
  | 'e-benami';

export interface CAROSubRuleResult {
  id: CAROSubRuleId;
  label: string;
  pass: boolean;
  finding: string;
  count: number;
  evidence: string[];
}

export interface CAROAssessmentResult {
  entityCode: string;
  fyStart: string;
  fyEnd: string;
  paragraph: '3(i)';
  overallPass: boolean;
  subRules: CAROSubRuleResult[];
  generatedAt: string;
}

export interface EPCGObligation {
  entityCode: string;
  assetId: string;
  dutySavedInr: number;       // duty saved at import
  exportObligationInr: number; // 6x duty saved
  periodStart: string;
  periodEnd: string;           // 6 years later
  fulfilledInr: number;
  remainingInr: number;
  status: 'active' | 'fulfilled' | 'breached' | 'expired';
}

export interface EPCGFulfillmentEntry {
  shippingBillId: string;
  shippingBillNo: string;
  date: string;
  fobInr: number;
  countryOfDestination: string;
}

export interface EPCGStatusReport {
  entityCode: string;
  totalObligations: number;
  activeCount: number;
  fulfilledCount: number;
  breachedCount: number;
  expiredCount: number;
  totalExportObligationInr: number;
  totalFulfilledInr: number;
}

export interface LeaseTerms {
  leaseId: string;
  entityCode: string;
  description: string;
  commencementDate: string;
  termMonths: number;
  monthlyRentInr: number;
  discountRatePct: number;   // annual incremental borrowing rate
  initialDirectCostsInr?: number;
}

export interface ROUScheduleRow {
  monthIndex: number;
  date: string;
  openingLiability: number;
  interest: number;
  payment: number;
  closingLiability: number;
  amortization: number;
  rouOpening: number;
  rouClosing: number;
}

export interface ROUSchedule {
  leaseId: string;
  entityCode: string;
  initialRou: number;
  initialLiability: number;
  rows: ROUScheduleRow[];
}

export interface ROUDisclosureRow {
  entityCode: string;
  fyStart: string;
  fyEnd: string;
  openingRou: number;
  additions: number;
  amortization: number;
  closingRou: number;
  interestExpense: number;
  totalCashOutflow: number;
}

export interface LeaseModification {
  effectiveFromMonthIndex: number;
  newMonthlyRentInr?: number;
  newTermMonths?: number;
  newDiscountRatePct?: number;
}

export interface MSMECapitalBreachEntry {
  entityCode: string;
  assetId: string;
  vendorId: string;
  vendorName: string;
  capitalPurchaseVoucherId: string;
  purchaseDate: string;
  invoiceAmountInr: number;
  deadlineDate: string;
  daysOverdue: number;
  disallowedInr: number;
}
