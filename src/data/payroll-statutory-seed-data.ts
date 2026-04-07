/**
 * payroll-statutory-seed-data.ts — Zone 3 Session 2
 * Seed data for Professional Tax, EPF, ESI, LWF masters.
 * [JWT] Replace with GET /api/payroll-statutory/* when backend is ready.
 */

// ── Professional Tax Slabs ─────────────────────────────────
export interface ProfessionalTaxSlab {
  stateCode: string;
  stateName: string;
  slabFrom: number;
  slabTo: number | null;
  monthlyTax: number;
  annualMax: number | null;
  genderExemption: 'none' | 'female' | 'all';
  effectiveFrom: string;
  notificationRef: string;
}

export const PROFESSIONAL_TAX_SLABS: ProfessionalTaxSlab[] = [
  // Maharashtra
  { stateCode: 'MH', stateName: 'Maharashtra', slabFrom: 0, slabTo: 7500, monthlyTax: 0, annualMax: null, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'MH PT Act 1975' },
  { stateCode: 'MH', stateName: 'Maharashtra', slabFrom: 7501, slabTo: 10000, monthlyTax: 175, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'MH PT Act 1975' },
  { stateCode: 'MH', stateName: 'Maharashtra', slabFrom: 10001, slabTo: null, monthlyTax: 200, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'MH PT Act 1975' },
  // Karnataka
  { stateCode: 'KA', stateName: 'Karnataka', slabFrom: 0, slabTo: 15000, monthlyTax: 0, annualMax: null, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'KA PT Act 1976' },
  { stateCode: 'KA', stateName: 'Karnataka', slabFrom: 15001, slabTo: 25000, monthlyTax: 200, annualMax: 2400, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'KA PT Act 1976' },
  { stateCode: 'KA', stateName: 'Karnataka', slabFrom: 25001, slabTo: null, monthlyTax: 200, annualMax: 2400, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'KA PT Act 1976' },
  // West Bengal
  { stateCode: 'WB', stateName: 'West Bengal', slabFrom: 0, slabTo: 10000, monthlyTax: 0, annualMax: null, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'WB PT Act 1979' },
  { stateCode: 'WB', stateName: 'West Bengal', slabFrom: 10001, slabTo: 15000, monthlyTax: 110, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'WB PT Act 1979' },
  { stateCode: 'WB', stateName: 'West Bengal', slabFrom: 15001, slabTo: 25000, monthlyTax: 130, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'WB PT Act 1979' },
  { stateCode: 'WB', stateName: 'West Bengal', slabFrom: 25001, slabTo: 40000, monthlyTax: 150, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'WB PT Act 1979' },
  { stateCode: 'WB', stateName: 'West Bengal', slabFrom: 40001, slabTo: null, monthlyTax: 200, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'WB PT Act 1979' },
  // Gujarat
  { stateCode: 'GJ', stateName: 'Gujarat', slabFrom: 0, slabTo: 5999, monthlyTax: 0, annualMax: null, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'GJ PT Act 1976' },
  { stateCode: 'GJ', stateName: 'Gujarat', slabFrom: 6000, slabTo: 8999, monthlyTax: 80, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'GJ PT Act 1976' },
  { stateCode: 'GJ', stateName: 'Gujarat', slabFrom: 9000, slabTo: 11999, monthlyTax: 150, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'GJ PT Act 1976' },
  { stateCode: 'GJ', stateName: 'Gujarat', slabFrom: 12000, slabTo: null, monthlyTax: 200, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'GJ PT Act 1976' },
  // Andhra Pradesh
  { stateCode: 'AP', stateName: 'Andhra Pradesh', slabFrom: 0, slabTo: 15000, monthlyTax: 0, annualMax: null, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'AP PT Act 1987' },
  { stateCode: 'AP', stateName: 'Andhra Pradesh', slabFrom: 15001, slabTo: 20000, monthlyTax: 150, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'AP PT Act 1987' },
  { stateCode: 'AP', stateName: 'Andhra Pradesh', slabFrom: 20001, slabTo: null, monthlyTax: 200, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'AP PT Act 1987' },
  // Telangana
  { stateCode: 'TS', stateName: 'Telangana', slabFrom: 0, slabTo: 15000, monthlyTax: 0, annualMax: null, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'TS PT Act 1987' },
  { stateCode: 'TS', stateName: 'Telangana', slabFrom: 15001, slabTo: 20000, monthlyTax: 150, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'TS PT Act 1987' },
  { stateCode: 'TS', stateName: 'Telangana', slabFrom: 20001, slabTo: null, monthlyTax: 200, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'TS PT Act 1987' },
  // Tamil Nadu
  { stateCode: 'TN', stateName: 'Tamil Nadu', slabFrom: 0, slabTo: 21000, monthlyTax: 0, annualMax: null, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'TN PT Act 1992' },
  { stateCode: 'TN', stateName: 'Tamil Nadu', slabFrom: 21001, slabTo: 30000, monthlyTax: 135, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'TN PT Act 1992' },
  { stateCode: 'TN', stateName: 'Tamil Nadu', slabFrom: 30001, slabTo: 45000, monthlyTax: 315, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'TN PT Act 1992' },
  { stateCode: 'TN', stateName: 'Tamil Nadu', slabFrom: 45001, slabTo: 60000, monthlyTax: 690, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'TN PT Act 1992' },
  { stateCode: 'TN', stateName: 'Tamil Nadu', slabFrom: 60001, slabTo: 75000, monthlyTax: 1025, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'TN PT Act 1992' },
  { stateCode: 'TN', stateName: 'Tamil Nadu', slabFrom: 75001, slabTo: null, monthlyTax: 1250, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'TN PT Act 1992' },
  // Madhya Pradesh
  { stateCode: 'MP', stateName: 'Madhya Pradesh', slabFrom: 0, slabTo: 18750, monthlyTax: 0, annualMax: null, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'MP Vritti Kar Adhiniyam 1995' },
  { stateCode: 'MP', stateName: 'Madhya Pradesh', slabFrom: 18751, slabTo: 25000, monthlyTax: 125, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'MP Vritti Kar Adhiniyam 1995' },
  { stateCode: 'MP', stateName: 'Madhya Pradesh', slabFrom: 25001, slabTo: null, monthlyTax: 208, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'MP Vritti Kar Adhiniyam 1995' },
  // Kerala
  { stateCode: 'KL', stateName: 'Kerala', slabFrom: 0, slabTo: 11999, monthlyTax: 0, annualMax: null, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'Kerala Municipality Act' },
  { stateCode: 'KL', stateName: 'Kerala', slabFrom: 12000, slabTo: 17999, monthlyTax: 120, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'Kerala Municipality Act' },
  { stateCode: 'KL', stateName: 'Kerala', slabFrom: 18000, slabTo: 29999, monthlyTax: 180, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'Kerala Municipality Act' },
  { stateCode: 'KL', stateName: 'Kerala', slabFrom: 30000, slabTo: null, monthlyTax: 250, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'Kerala Municipality Act' },
  // Odisha
  { stateCode: 'OR', stateName: 'Odisha', slabFrom: 0, slabTo: 13304, monthlyTax: 0, annualMax: null, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'Odisha Municipal Corp Act' },
  { stateCode: 'OR', stateName: 'Odisha', slabFrom: 13305, slabTo: 25000, monthlyTax: 125, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'Odisha Municipal Corp Act' },
  { stateCode: 'OR', stateName: 'Odisha', slabFrom: 25001, slabTo: null, monthlyTax: 200, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'Odisha Municipal Corp Act' },
  // Assam
  { stateCode: 'AS', stateName: 'Assam', slabFrom: 0, slabTo: 10000, monthlyTax: 0, annualMax: null, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'Assam Professions Tax Act 1947' },
  { stateCode: 'AS', stateName: 'Assam', slabFrom: 10001, slabTo: 15000, monthlyTax: 150, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'Assam Professions Tax Act 1947' },
  { stateCode: 'AS', stateName: 'Assam', slabFrom: 15001, slabTo: 25000, monthlyTax: 180, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'Assam Professions Tax Act 1947' },
  { stateCode: 'AS', stateName: 'Assam', slabFrom: 25001, slabTo: null, monthlyTax: 208, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'Assam Professions Tax Act 1947' },
  // Meghalaya
  { stateCode: 'ML', stateName: 'Meghalaya', slabFrom: 0, slabTo: 4166, monthlyTax: 0, annualMax: null, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'Meghalaya PT Rules' },
  { stateCode: 'ML', stateName: 'Meghalaya', slabFrom: 4167, slabTo: 6250, monthlyTax: 16, annualMax: 200, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'Meghalaya PT Rules' },
  { stateCode: 'ML', stateName: 'Meghalaya', slabFrom: 6251, slabTo: 8333, monthlyTax: 25, annualMax: 300, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'Meghalaya PT Rules' },
  { stateCode: 'ML', stateName: 'Meghalaya', slabFrom: 8334, slabTo: null, monthlyTax: 208, annualMax: 2500, genderExemption: 'none', effectiveFrom: '2023-04-01', notificationRef: 'Meghalaya PT Rules' },
];

// ── EPF Rates ──────────────────────────────────────────────
export interface EPFRate {
  contributionType: 'employee' | 'employer';
  ratePercentage: number;
  component: 'epf' | 'eps' | 'edli' | 'admin_epf' | 'admin_edli';
  wageCeiling: number | null;
  maxAmount: number | null;
  minAmount: number | null;
  effectiveFrom: string;
  notificationRef: string;
  notes: string;
}

export const EPF_RATES: EPFRate[] = [
  { contributionType: 'employee', ratePercentage: 12, component: 'epf', wageCeiling: 15000, maxAmount: null, minAmount: null, effectiveFrom: '2014-09-01', notificationRef: 'EPF Act 1952', notes: '12% of Basic+DA' },
  { contributionType: 'employer', ratePercentage: 3.67, component: 'epf', wageCeiling: 15000, maxAmount: null, minAmount: null, effectiveFrom: '2014-09-01', notificationRef: 'EPF Act 1952', notes: '3.67% of Basic+DA to PF account' },
  { contributionType: 'employer', ratePercentage: 8.33, component: 'eps', wageCeiling: 15000, maxAmount: 1250, minAmount: null, effectiveFrom: '2014-09-01', notificationRef: 'EPS 1995', notes: '8.33% of Basic+DA, capped at Rs 1,250/month' },
  { contributionType: 'employer', ratePercentage: 0.5, component: 'edli', wageCeiling: 15000, maxAmount: 75, minAmount: null, effectiveFrom: '2014-09-01', notificationRef: 'EDLI Scheme 1976', notes: '0.5% of Basic+DA, max Rs 75' },
  { contributionType: 'employer', ratePercentage: 0.5, component: 'admin_epf', wageCeiling: null, maxAmount: null, minAmount: 500, effectiveFrom: '2014-09-01', notificationRef: 'EPF Admin Charges', notes: '0.5% of Basic+DA, min Rs 500/month' },
  { contributionType: 'employer', ratePercentage: 0.01, component: 'admin_edli', wageCeiling: null, maxAmount: null, minAmount: 200, effectiveFrom: '2014-09-01', notificationRef: 'EDLI Admin Charges', notes: '0.01% of Basic+DA, min Rs 200/month' },
];

// ── ESI Rates ──────────────────────────────────────────────
export interface ESIRate {
  contributionType: 'employee' | 'employer';
  ratePercentage: number;
  wageCeiling: number;
  effectiveFrom: string;
  notes: string;
}

export const ESI_RATES: ESIRate[] = [
  { contributionType: 'employee', ratePercentage: 0.75, wageCeiling: 21000, effectiveFrom: '2019-07-01', notes: 'Employee ESI: 0.75% of gross wages up to Rs 21,000/month' },
  { contributionType: 'employer', ratePercentage: 3.25, wageCeiling: 21000, effectiveFrom: '2019-07-01', notes: 'Employer ESI: 3.25% of gross wages up to Rs 21,000/month' },
];

// ── LWF Rates ──────────────────────────────────────────────
export interface LWFRate {
  stateCode: string;
  stateName: string;
  employeeContribution: number;
  employerContribution: number;
  frequency: 'monthly' | 'half_yearly' | 'annual';
  dueMonth: string | null;
  effectiveFrom: string;
  notes: string;
}

export const LWF_RATES: LWFRate[] = [
  { stateCode: 'MH', stateName: 'Maharashtra', employeeContribution: 6, employerContribution: 12, frequency: 'half_yearly', dueMonth: 'June + December', effectiveFrom: '2023-04-01', notes: 'Payable in June and December each year' },
  { stateCode: 'KA', stateName: 'Karnataka', employeeContribution: 20, employerContribution: 40, frequency: 'annual', dueMonth: 'December', effectiveFrom: '2023-04-01', notes: 'Annual payment due in December' },
  { stateCode: 'TN', stateName: 'Tamil Nadu', employeeContribution: 10, employerContribution: 20, frequency: 'half_yearly', dueMonth: 'June + December', effectiveFrom: '2023-04-01', notes: 'Payable in June and December each year' },
  { stateCode: 'GJ', stateName: 'Gujarat', employeeContribution: 6, employerContribution: 12, frequency: 'half_yearly', dueMonth: 'June + December', effectiveFrom: '2023-04-01', notes: 'Payable in June and December each year' },
  { stateCode: 'AP', stateName: 'Andhra Pradesh', employeeContribution: 30, employerContribution: 70, frequency: 'annual', dueMonth: 'December', effectiveFrom: '2023-04-01', notes: 'Annual payment due in December' },
  { stateCode: 'TS', stateName: 'Telangana', employeeContribution: 30, employerContribution: 70, frequency: 'annual', dueMonth: 'December', effectiveFrom: '2023-04-01', notes: 'Annual payment due in December' },
  { stateCode: 'MP', stateName: 'Madhya Pradesh', employeeContribution: 10, employerContribution: 10, frequency: 'monthly', dueMonth: null, effectiveFrom: '2023-04-01', notes: 'Monthly deduction and payment' },
  { stateCode: 'KL', stateName: 'Kerala', employeeContribution: 4, employerContribution: 8, frequency: 'half_yearly', dueMonth: 'June + December', effectiveFrom: '2023-04-01', notes: 'Payable in June and December each year' },
  { stateCode: 'OR', stateName: 'Odisha', employeeContribution: 8, employerContribution: 12, frequency: 'annual', dueMonth: 'December', effectiveFrom: '2023-04-01', notes: 'Annual payment due in December' },
  { stateCode: 'WB', stateName: 'West Bengal', employeeContribution: 3, employerContribution: 15, frequency: 'monthly', dueMonth: null, effectiveFrom: '2023-04-01', notes: 'Monthly deduction and payment' },
];
