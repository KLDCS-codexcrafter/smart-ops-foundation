/** employee.ts — Pay Hub Employee Master types · Sprint 2 */

// ── Family Member ─────────────────────────────────────────────────────
export interface FamilyMember {
  id: string;
  name: string;
  relation: string;           // Spouse | Child | Father | Mother | Sibling | Other
  dob: string;
  pfNomineePct: number;       // 0–100. Sum across all members must = 100 if any set.
  gratuityNomineePct: number; // 0–100. Same rule.
  esiDependent: boolean;
  medicalInsDependent: boolean;
}

// ── Equipment Issued ──────────────────────────────────────────────────
export interface EquipmentIssued {
  id: string;
  assetCode: string;
  description: string;
  serialNo: string;
  dateIssued: string;
  expectedReturn: string;
  status: 'issued' | 'returned' | 'lost';
}

// ── LIC / Insurance Policy ────────────────────────────────────────────
export interface LICPolicy {
  id: string;
  policyNo: string;
  insurer: string;
  premiumAnnual: number;
  sumAssured: number;
  dueDate: string;
}

// ── Loan Detail (TDL-05 style) ────────────────────────────────────────
export interface LoanDetail {
  id: string;
  loanTypeName: string;
  principalAmount: number;
  emiAmount: number;
  startDate: string;
  remainingBalance: number;
  status: 'active' | 'closed' | 'foreclosed';
}

// ── Previous Employer (mid-year joiners — Form 12BB) ──────────────────
export interface PrevEmployerDetail {
  id: string;
  employerName: string;
  employerTAN: string;
  fromDate: string;
  toDate: string;
  grossSalary: number;
  taxableIncome: number;
  tdsDeducted: number;
  pfContributed: number;
}

// ── Employee Document ─────────────────────────────────────────────────
export type DocType = 'aadhaar' | 'pan' | 'passport' | 'driving_licence'
  | 'qualification_10' | 'qualification_12' | 'graduation' | 'post_graduation'
  | 'experience_letter' | 'offer_letter' | 'appointment_letter'
  | 'relieving_letter' | 'form_16' | 'other';

export interface EmployeeDocument {
  id: string;
  docType: DocType;
  docName: string;
  fileRef: string;          // filename / ref — actual upload in Phase 2
  issueDate: string;
  expiryDate: string;
  verified: boolean;
  verifiedDate: string;
  verifiedBy: string;
}

// ── Salary Revision ───────────────────────────────────────────────────
export interface SalaryRevision {
  id: string;
  revisionDate: string;
  oldCTC: number;
  newCTC: number;
  pctChange: number;
  reason: string;
  revisedBy: string;
}

// ── Main Employee ─────────────────────────────────────────────────────
export interface Employee {
  id: string;
  empCode: string;             // EMP-000001

  // ── TAB 1 — Identity & Personal ──────────────────────────────────
  salutation: string;          // Mr | Mrs | Ms | Dr | Er
  firstName: string;
  middleName: string;
  lastName: string;
  displayName: string;         // auto: firstName + ' ' + lastName
  photoRef: string;
  dob: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  bloodGroup: string;          // A+ A- B+ B- O+ O- AB+ AB-
  nationality: string;         // default: Indian
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  anniversary: string;
  aadhaar: string;
  pan: string;
  passportNo: string;
  passportExpiry: string;
  passportIssueCountry: string;
  drivingLicenceNo: string;
  drivingLicenceExpiry: string;

  // ── TAB 2 — Employment ───────────────────────────────────────────
  employmentType: 'permanent' | 'contract' | 'intern' | 'consultant' | 'probation' | 'retainer';
  doj: string;
  confirmationDate: string;
  noticePeriodDays: number;
  departmentId: string;
  departmentName: string;
  divisionId: string;
  divisionName: string;
  designation: string;
  gradeId: string;
  gradeName: string;
  reportingManagerId: string;
  reportingManagerName: string;
  workLocation: string;
  shiftCode: string;
  weeklyOff: string[];
  biometricId: string;
  essLoginEnabled: boolean;
  /**
   * SAM: when companySalesManSource === 'payhub', employees with
   * is_salesman = true populate the SalesX salesman dropdown on transactions.
   * Default: false.
   */
  is_salesman: boolean;

  // ── TAB 3 — Contact ──────────────────────────────────────────────
  personalMobile: string;
  personalEmail: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  currentAddressLine: string;
  currentStateCode: string;
  currentStateName: string;
  currentDistrictCode: string;
  currentDistrictName: string;
  currentCityCode: string;
  currentCityName: string;
  currentPincode: string;
  permanentSameAsCurrent: boolean;
  permanentAddressLine: string;
  permanentStateCode: string;
  permanentStateName: string;
  permanentDistrictCode: string;
  permanentDistrictName: string;
  permanentCityCode: string;
  permanentCityName: string;
  permanentPincode: string;

  // ── TAB 4 — Bank & Statutory ─────────────────────────────────────
  bankAccountHolder: string;
  bankAccountNo: string;
  bankIfsc: string;
  bankName: string;
  bankBranchName: string;
  bankBranchCity: string;
  bankAccountType: 'savings' | 'current' | 'salary';
  uan: string;
  esiIpNumber: string;
  pfApplicable: boolean;
  pfWageCeilingOverride: number;  // 0 = use standard ₹15,000
  esiApplicable: boolean;
  ptStateCode: string;
  tdsApplicable: boolean;
  taxRegime: 'old' | 'new';
  form12BBSubmitted: boolean;
  vpfPercentage: number;

  // ── TAB 5 — Salary & CTC ─────────────────────────────────────────
  salaryStructureId: string;
  salaryStructureName: string;
  annualCTC: number;
  ctcEffectiveFrom: string;
  salaryRevisions: SalaryRevision[];

  // ── TAB 6 — Family & Nominees ────────────────────────────────────
  familyMembers: FamilyMember[];

  // ── TAB 7 — Documents ────────────────────────────────────────────
  documents: EmployeeDocument[];

  // ── TAB 8 — Additional (TDL-05) ──────────────────────────────────
  equipmentIssued: EquipmentIssued[];
  loanDetails: LoanDetail[];
  licPolicies: LICPolicy[];
  elOpeningBalance: number;       // Earned Leave opening balance
  medicalRembCap: number;         // Annual cap ₹
  prevEmployerDetails: PrevEmployerDetail[];

  // ── Entity scope ─────────────────────────────────────────────────
  entityId: string;  // ID of entity this employee belongs to.
  // "parent-root" | company.id | subsidiary.id | branch.id
  // Reads as undefined on old records — treat as "parent-root".
  status: 'active' | 'inactive' | 'on_notice' | 'relieved';
  created_at: string;
  updated_at: string;
}

export const EMPLOYEES_KEY = 'erp_employees';

// ── Blank form default ────────────────────────────────────────────────
export const BLANK_EMPLOYEE: Omit<Employee, "id" | "empCode" | "created_at" | "updated_at"> = {
  salutation: 'Mr', firstName: '', middleName: '', lastName: '', displayName: '',
  photoRef: '', dob: '', gender: 'male', bloodGroup: '', nationality: 'Indian',
  maritalStatus: 'single', anniversary: '', aadhaar: '', pan: '',
  passportNo: '', passportExpiry: '', passportIssueCountry: '',
  drivingLicenceNo: '', drivingLicenceExpiry: '',
  employmentType: 'permanent', doj: '', confirmationDate: '', noticePeriodDays: 30,
  departmentId: '', departmentName: '', divisionId: '', divisionName: '',
  designation: '', gradeId: '', gradeName: '',
  reportingManagerId: '', reportingManagerName: '',
  workLocation: '', shiftCode: '', weeklyOff: ['Sunday'],
  biometricId: '', essLoginEnabled: true,
  is_salesman: false,
  personalMobile: '', personalEmail: '',
  emergencyContactName: '', emergencyContactRelation: '', emergencyContactPhone: '',
  currentAddressLine: '', currentStateCode: '', currentStateName: '',
  currentDistrictCode: '', currentDistrictName: '', currentCityCode: '', currentCityName: '', currentPincode: '',
  permanentSameAsCurrent: true,
  permanentAddressLine: '', permanentStateCode: '', permanentStateName: '',
  permanentDistrictCode: '', permanentDistrictName: '', permanentCityCode: '', permanentCityName: '', permanentPincode: '',
  bankAccountHolder: '', bankAccountNo: '', bankIfsc: '',
  bankName: '', bankBranchName: '', bankBranchCity: '', bankAccountType: 'savings',
  uan: '', esiIpNumber: '', pfApplicable: true, pfWageCeilingOverride: 0,
  esiApplicable: true, ptStateCode: '', tdsApplicable: true, taxRegime: 'new',
  form12BBSubmitted: false, vpfPercentage: 0,
  salaryStructureId: '', salaryStructureName: '', annualCTC: 0, ctcEffectiveFrom: '',
  salaryRevisions: [],
  familyMembers: [], documents: [],
  equipmentIssued: [], loanDetails: [], licPolicies: [],
  elOpeningBalance: 0, medicalRembCap: 15000, prevEmployerDetails: [],
  entityId: 'parent-root',
  status: 'active',
};

// ── DOC_TYPE_LABELS ───────────────────────────────────────────────────
export const DOC_TYPE_LABELS: Record<DocType, string> = {
  aadhaar: 'Aadhaar Card', pan: 'PAN Card', passport: 'Passport',
  driving_licence: 'Driving Licence', qualification_10: '10th Certificate',
  qualification_12: '12th Certificate', graduation: 'Graduation Certificate',
  post_graduation: 'Post Graduation Certificate',
  experience_letter: 'Experience Letter', offer_letter: 'Offer Letter',
  appointment_letter: 'Appointment Letter', relieving_letter: 'Relieving Letter',
  form_16: 'Form 16', other: 'Other',
};

// ── STATUS labels & colors ─────────────────────────────────────────────
export const EMPLOYEE_STATUS_COLORS: Record<Employee['status'], string> = {
  active: 'bg-green-500/10 text-green-700 border-green-500/30',
  inactive: 'bg-muted text-muted-foreground border-border',
  on_notice: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  relieved: 'bg-rose-500/10 text-rose-700 border-rose-500/30',
};

// ── Sprint T-Phase-1.2.5h-a · Multi-tenant key migration (Bucket C) ──────
/**
 * Entity-scoped storage key factory (preferred for all new code).
 * @deprecated EMPLOYEES_KEY — use employeesKey(entityCode) instead.
 * Backward-compat: hooks fall back to legacy key on first read and migrate.
 */
// [JWT] GET /api/peoplepay/employees?entityCode={e}
export const employeesKey = (entityCode: string): string =>
  entityCode ? `erp_employees_${entityCode}` : 'erp_employees';
