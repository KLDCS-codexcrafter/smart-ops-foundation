/**
 * @file        src/types/rbi-purpose-code.ts
 * @purpose     RBI Purpose Code master · S-codes for outward remittance classification
 * @sprint      T-Phase-1.EX-8-TT-Hedge-MonthEnd-DayBook-VoucherRuntime
 * @decisions   EX-8-Q7=a master register · 10+ codes seeded
 */

export interface RBIPurposeCode {
  code: string;
  description: string;
  category: 'capital' | 'current' | 'travel' | 'services' | 'imports' | 'other';
  requires_form_15ca: boolean;
  default_part: 'Part_A' | 'Part_B' | 'Part_C' | 'Part_D' | null;
}

export const RBI_PURPOSE_CODES_SEED: RBIPurposeCode[] = [
  { code: 'S0001', description: 'Indian investment abroad in equity capital', category: 'capital', requires_form_15ca: true, default_part: 'Part_C' },
  { code: 'S0005', description: 'Indian portfolio investment abroad in debt instruments', category: 'capital', requires_form_15ca: true, default_part: 'Part_C' },
  { code: 'S0202', description: 'Business travel', category: 'travel', requires_form_15ca: false, default_part: 'Part_A' },
  { code: 'S0204', description: 'Education/study abroad', category: 'travel', requires_form_15ca: true, default_part: 'Part_B' },
  { code: 'S0301', description: 'Imports of goods · advance payment', category: 'imports', requires_form_15ca: true, default_part: 'Part_C' },
  { code: 'S0302', description: 'Imports of goods · payment against documents', category: 'imports', requires_form_15ca: true, default_part: 'Part_C' },
  { code: 'S0801', description: 'Professional services · consultancy', category: 'services', requires_form_15ca: true, default_part: 'Part_C' },
  { code: 'S0901', description: 'Software royalties / license fees', category: 'services', requires_form_15ca: true, default_part: 'Part_C' },
  { code: 'S1001', description: 'Other current account transactions', category: 'other', requires_form_15ca: true, default_part: 'Part_C' },
  { code: 'S1501', description: 'DTAA-exempt remittance · specified list', category: 'other', requires_form_15ca: true, default_part: 'Part_D' },
];

export const rbiPurposeCodeKey = (entityCode: string): string =>
  `erp_${entityCode}_rbi_purpose_codes`;
