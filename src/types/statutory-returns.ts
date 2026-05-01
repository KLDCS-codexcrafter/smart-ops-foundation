/** statutory-returns.ts — Sprint 9 Statutory Returns types */

export type ChallanType = 'EPF' | 'ESI' | 'PT' | 'TDS';
export type ChallanStatus = 'pending' | 'paid' | 'overdue';

export interface ChallanRecord {
  id: string;
  challanType: ChallanType;
  period: string;          // "YYYY-MM" for monthly; "YYYY-QN" for quarterly e.g. "2025-Q3"
  periodLabel: string;     // "December 2025" or "Q3 FY 2025-26"
  dueDate: string;         // YYYY-MM-DD
  totalAmount: number;
  challanNo: string;       // TRRN/challan reference after payment
  paymentDate: string;
  bankName: string;
  status: ChallanStatus;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export const STATUTORY_CHALLANS_KEY = 'erp_statutory_challans';

export const CHALLAN_STATUS_COLORS: Record<ChallanStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  paid:    'bg-green-500/10 text-green-700 border-green-500/30',
  overdue: 'bg-red-500/10 text-red-700 border-red-500/30',
};

// ── PF ECR row (one per employee per month) ──────────────────────
export interface PFECRRow {
  uan: string;
  employeeName: string;
  epfWages: number;
  epsWages: number;
  edliWages: number;
  empEPF: number;       // Employee PF = 12% of EPF wages (max 1800)
  erEPF: number;        // Employer EPF = 3.67% of EPF wages (max 550)
  erEPS: number;        // Employer EPS = 8.33% of EPS wages (max 1250)
  erEDLI: number;       // 0.5% (max 75)
  empCode: string;
}

// ── ESI Contribution row ─────────────────────────────────────────
export interface ESIRow {
  ipNo: string;          // ESI IP Number
  employeeName: string;
  grossWages: number;    // esiWage from payslip
  empESI: number;        // 0.75%
  erESI: number;         // 3.25%
  empCode: string;
}

// ── PT Register row ──────────────────────────────────────────────
export interface PTRow {
  employeeName: string;
  grossMonthly: number;
  ptDeducted: number;
  stateCode: string;
  empCode: string;
}

// ── Form 24Q row (Annexure II) ────────────────────────────────────
export interface Form24QRow {
  employeeName: string;
  pan: string;
  grossSalaryFY: number;       // sum of all payslips this FY
  taxableIncomeFY: number;
  totalTDSFY: number;          // sum of TDS across FY
  tdsThisQuarter: number;
  regime: string;
  empCode: string;
}

// ── Form 16 Part B row (per employee for FY) ─────────────────────
export interface Form16Row {
  employeeName: string;
  empCode: string;
  pan: string;
  designation: string;
  grossSalaryFY: number;
  standardDeduction: number;
  taxableIncomeFY: number;
  taxBeforeCess: number;
  cess: number;
  rebate87A: number;
  surcharge: number;
  totalTaxFY: number;
  totalTDSFY: number;
  regime: string;
}

// ── Statutory due date entry ──────────────────────────────────────
export interface StatutoryDueDate {
  type: ChallanType | '24Q' | 'RETURN';
  label: string;
  dueDate: string;     // YYYY-MM-DD computed from today
  daysLeft: number;
  color: 'green' | 'amber' | 'red';
  description: string;
}

// ── Tab type ──────────────────────────────────────────────────────
export type StatutoryTab = 'pf-ecr' | 'esi' | 'pt' | 'tds-24q' | 'form16' | 'calendar';

// ── Sprint T-Phase-1.2.5h-a · Multi-tenant key migration (Bucket C) ──────
// [JWT] GET /api/comply360/statutory-challans?entityCode={e}
export const statutoryChallansKey = (e: string): string =>
  e ? `erp_statutory_challans_${e}` : 'erp_statutory_challans';
