/**
 * demo-seed-data.ts — Complete demo/seed data for Operix ERP
 * Pure TypeScript data — no imports from hooks or pages.
 * All statutory numbers are fictional but format-correct.
 * [JWT] Replace localStorage writes with POST /api/demo/seed
 */

import type { Employee } from '@/types/employee';
import type { SalaryStructure, SalaryStructureComponent, PayGrade } from '@/types/pay-hub';
import type { Shift, LeaveType, HolidayCalendar, Holiday, AttendanceType,
  OvertimeRule, LoanType, BonusConfig, GratuityNPSSettings } from '@/types/payroll-masters';

// ── 3.1 Company Profiles ────────────────────────────────────────────────

export interface DemoCompanyProfile {
  id: string;
  entityCode: string;
  type: 'parent' | 'subsidiary' | 'branch';
  legalEntityName: string;
  tradingBrandName: string;
  businessEntity: string;
  industry: string;
  businessActivity: string;
  pan: string;
  cin?: string;
  gstin: string;
  gstRegistrationType?: string;
  tan?: string;
  msmeUdyam?: string;
  llpin?: string;
  iec?: string;
  adCode?: string;
  lutStatus?: string;
  lutRefNo?: string;
  rcmcNo?: string;
  specialZone?: string;
  addressLine: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  phone?: string;
  email?: string;
  website?: string;
  fyStartMonth?: number;
  baseCurrency?: string;
  mrpTaxTreatment?: string;
  bankAccounts?: { name: string; accountNo: string; ifsc: string; branch: string; isPrimary: boolean }[];
  partnerCapital?: { name: string; din: string; pct: number }[];
}

export const DEMO_COMPANY_PROFILES: DemoCompanyProfile[] = [
  {
    id: 'e1', entityCode: 'SMRT', type: 'parent',
    legalEntityName: 'Aryan Metals & Alloys Pvt Ltd',
    tradingBrandName: 'Aryan Metals',
    businessEntity: 'Private Limited',
    industry: 'Manufacturing',
    businessActivity: 'Manufacturing',
    pan: 'AABCA1234A',
    cin: 'U27100MH2020PTC345678',
    gstin: '27AABCA1234A1Z5',
    gstRegistrationType: 'Regular',
    tan: 'MUMA12345A',
    msmeUdyam: 'UDYAM-MH-27-0012345',
    addressLine: 'Plot 47, MIDC Industrial Estate, Andheri East',
    city: 'Mumbai', state: 'Maharashtra', stateCode: '27',
    pincode: '400093',
    phone: '022-28234567', email: 'accounts@aryanmetals.in',
    website: 'www.aryanmetals.in',
    fyStartMonth: 3,
    baseCurrency: 'INR',
    mrpTaxTreatment: 'exclusive',
    bankAccounts: [
      { name: 'HDFC Bank Current A/c', accountNo: '00012345678901', ifsc: 'HDFC0000001', branch: 'Andheri East', isPrimary: true },
      { name: 'SBI Current A/c', accountNo: '31234567890', ifsc: 'SBIN0001234', branch: 'MIDC Andheri', isPrimary: false },
    ],
  },
  {
    id: 'e2', entityCode: 'DGTL', type: 'subsidiary',
    legalEntityName: 'SmartOps Digital LLP',
    tradingBrandName: 'SmartOps Digital',
    businessEntity: 'LLP',
    industry: 'Technology',
    businessActivity: 'IT Services',
    pan: 'AABCD1234E',
    llpin: 'AAA-1234',
    gstin: '24AABCD1234E1Z3',
    tan: 'AHMA12345B',
    addressLine: '5th Floor, Pinnacle Business Park, Prahlad Nagar',
    city: 'Ahmedabad', state: 'Gujarat', stateCode: '24', pincode: '380015',
    partnerCapital: [
      { name: 'Arjun Mehta Capital A/c', din: '01234567', pct: 60 },
      { name: 'Priya Sharma Capital A/c', din: '01234568', pct: 40 },
    ],
  },
  {
    id: 'e3', entityCode: 'EXPT', type: 'branch',
    legalEntityName: 'Aryan Metals & Alloys Pvt Ltd — Kandla SEZ Unit',
    tradingBrandName: 'Aryan Exports SEZ',
    businessEntity: 'Branch Office',
    specialZone: 'SEZ',
    industry: 'Manufacturing',
    businessActivity: 'Import / Export',
    pan: 'AABCA1234A',
    gstin: '24AABCA1234A2Z3',
    iec: 'AABCA1234',
    adCode: '1234567',
    lutStatus: 'active',
    lutRefNo: 'AD240000001234TZ2526',
    rcmcNo: 'EEPC/MH/123456',
    addressLine: 'Plot 23, Free Trade Zone, Kandla SEZ',
    city: 'Gandhidham', state: 'Gujarat', stateCode: '24', pincode: '370240',
  },
];

// ── 3.2 Employees — 15 complete profiles ────────────────────────────────

const now = new Date().toISOString();

function emp(
  code: string, sal: string, first: string, mid: string, last: string,
  gender: Employee['gender'], dob: string, blood: string,
  marital: Employee['maritalStatus'], aadhaar: string, pan: string,
  empType: Employee['employmentType'], doj: string, dept: string, deptName: string,
  designation: string, gradeId: string, gradeName: string,
  reportMgr: string, reportMgrName: string, shift: string,
  mobile: string, email: string, emergName: string, emergRel: string, emergPhone: string,
  addr: string, pin: string,
  bankHolder: string, bankAccNo: string, ifsc: string, bankName: string, bankBranch: string,
  uan: string, esiIp: string, ptState: string,
  structId: string, structName: string, annualCTC: number,
  equipment: Employee['equipmentIssued'],
): Employee {
  const confDate = new Date(doj);
  confDate.setMonth(confDate.getMonth() + 6);
  return {
    id: code.toLowerCase().replace(/-/g, ''),
    empCode: code,
    salutation: sal,
    firstName: first,
    middleName: mid,
    lastName: last,
    displayName: `${first} ${last}`,
    photoRef: '',
    dob,
    gender,
    bloodGroup: blood,
    nationality: 'Indian',
    maritalStatus: marital,
    anniversary: '',
    aadhaar,
    pan,
    passportNo: '',
    passportExpiry: '',
    passportIssueCountry: '',
    drivingLicenceNo: '',
    drivingLicenceExpiry: '',
    employmentType: empType,
    doj,
    confirmationDate: confDate.toISOString().split('T')[0],
    noticePeriodDays: empType === 'contract' ? 7 : 30,
    departmentId: dept,
    departmentName: deptName,
    divisionId: '',
    divisionName: '',
    designation,
    gradeId,
    gradeName,
    reportingManagerId: reportMgr,
    reportingManagerName: reportMgrName,
    workLocation: 'Head Office — Mumbai',
    shiftCode: shift,
    weeklyOff: ['Sunday'],
    biometricId: '',
    essLoginEnabled: true,
    is_salesman: false,
    personalMobile: mobile,
    personalEmail: email,
    emergencyContactName: emergName,
    emergencyContactRelation: emergRel,
    emergencyContactPhone: emergPhone,
    currentAddressLine: addr,
    currentStateCode: '27',
    currentStateName: 'Maharashtra',
    currentDistrictCode: 'MUM',
    currentDistrictName: 'Mumbai',
    currentCityCode: 'MUM',
    currentCityName: 'Mumbai',
    currentPincode: pin,
    permanentSameAsCurrent: true,
    permanentAddressLine: addr,
    permanentStateCode: '27',
    permanentStateName: 'Maharashtra',
    permanentDistrictCode: 'MUM',
    permanentDistrictName: 'Mumbai',
    permanentCityCode: 'MUM',
    permanentCityName: 'Mumbai',
    permanentPincode: pin,
    bankAccountHolder: bankHolder,
    bankAccountNo: bankAccNo,
    bankIfsc: ifsc,
    bankName,
    bankBranchName: bankBranch,
    bankBranchCity: 'Mumbai',
    bankAccountType: 'salary',
    uan,
    esiIpNumber: esiIp,
    pfApplicable: true,
    pfWageCeilingOverride: 0,
    esiApplicable: annualCTC / 12 <= 21000,
    ptStateCode: ptState,
    tdsApplicable: true,
    taxRegime: annualCTC >= 1500000 ? 'old' : 'new',
    form12BBSubmitted: annualCTC >= 500000,
    vpfPercentage: 0,
    salaryStructureId: structId,
    salaryStructureName: structName,
    annualCTC,
    ctcEffectiveFrom: '2025-04-01',
    salaryRevisions: [],
    familyMembers: [],
    documents: [],
    equipmentIssued: equipment,
    loanDetails: [],
    licPolicies: [],
    elOpeningBalance: 15,
    medicalRembCap: 15000,
    prevEmployerDetails: [],
    entityId: 'e1',
    status: 'active',
    created_at: now,
    updated_at: now,
  };
}

export const DEMO_EMPLOYEES: Employee[] = [
  emp('EMP-000001', 'Mr', 'Arjun', '', 'Mehta', 'male', '1975-03-15', 'O+', 'married',
    '234567890123', 'AABPM1234A', 'permanent', '2015-04-01', 'dept-mgmt', 'Management',
    'Managing Director', 'grade-a', 'Grade A', '', '', 'GEN',
    '9876543210', 'arjun.mehta@aryanmetals.in', 'Sunita Mehta', 'Spouse', '9876543211',
    'Flat 1201, Oberoi Splendor, Andheri West', '400053',
    'Arjun Mehta', '00012345678901', 'HDFC0000001', 'HDFC Bank', 'Andheri East',
    '101234567890', '', '27',
    'ss-director', 'Director CTC', 4800000,
    [
      { id: 'eq-001', assetCode: 'LAP-001', description: 'MacBook Pro 16"', serialNo: 'C02XG1YHJG5H', dateIssued: '2023-04-01', expectedReturn: '', status: 'issued' },
      { id: 'eq-002', assetCode: 'MOB-001', description: 'iPhone 15 Pro', serialNo: 'DNQXR0JKPH', dateIssued: '2023-10-01', expectedReturn: '', status: 'issued' },
    ]),
  emp('EMP-000002', 'Mrs', 'Priya', '', 'Sharma', 'female', '1980-07-22', 'A+', 'married',
    '345678901234', 'BBSPS2345B', 'permanent', '2016-06-15', 'dept-fin', 'Finance',
    'General Manager — Finance', 'grade-a', 'Grade A', 'emp000001', 'Arjun Mehta', 'GEN',
    '9876543220', 'priya.sharma@aryanmetals.in', 'Rahul Sharma', 'Spouse', '9876543221',
    '302, Lodha Palava, Dombivli East', '421204',
    'Priya Sharma', '23456789012', 'ICIC0001234', 'ICICI Bank', 'Dombivli',
    '101234567891', '', '27',
    'ss-director', 'Director CTC', 3600000, []),
  emp('EMP-000003', 'Mr', 'Rahul', '', 'Gupta', 'male', '1985-11-10', 'B+', 'married',
    '456789012345', 'CCRPG3456C', 'permanent', '2017-01-10', 'dept-prod', 'Production',
    'Production Manager', 'grade-b', 'Grade B', 'emp000001', 'Arjun Mehta', 'GEN',
    '9876543230', 'rahul.gupta@aryanmetals.in', 'Meena Gupta', 'Spouse', '9876543231',
    '15, Gokuldham Society, Goregaon East', '400063',
    'Rahul Gupta', '34567890123', 'SBIN0001234', 'SBI', 'Goregaon',
    '101234567892', '', '27',
    'ss-manager', 'Manager CTC', 1800000, []),
  emp('EMP-000004', 'Mrs', 'Sunita', '', 'Patel', 'female', '1983-02-28', 'AB+', 'married',
    '567890123456', 'DDAPP4567D', 'permanent', '2017-07-01', 'dept-hr', 'Human Resources',
    'HR Manager', 'grade-b', 'Grade B', 'emp000001', 'Arjun Mehta', 'GEN',
    '9876543240', 'sunita.patel@aryanmetals.in', 'Rajesh Patel', 'Spouse', '9876543241',
    '8, Raheja Vihar, Powai', '400076',
    'Sunita Patel', '45678901234', 'HDFC0002345', 'HDFC Bank', 'Powai',
    '101234567893', '', '27',
    'ss-manager', 'Manager CTC', 1500000, []),
  emp('EMP-000005', 'Mr', 'Amit', '', 'Singh', 'male', '1982-09-05', 'O-', 'married',
    '678901234567', 'EESAS5678E', 'permanent', '2018-03-15', 'dept-sales', 'Sales',
    'Sales Manager', 'grade-b', 'Grade B', 'emp000001', 'Arjun Mehta', 'GEN',
    '9876543250', 'amit.singh@aryanmetals.in', 'Neha Singh', 'Spouse', '9876543251',
    '42, Hiranandani Estate, Thane', '400607',
    'Amit Singh', '56789012345', 'UTIB0001234', 'Axis Bank', 'Thane',
    '101234567894', '', '27',
    'ss-manager', 'Manager CTC', 1800000, []),
  emp('EMP-000006', 'Ms', 'Deepika', '', 'Rao', 'female', '1992-04-18', 'A-', 'single',
    '789012345678', 'FFDPR6789F', 'permanent', '2019-08-01', 'dept-fin', 'Finance',
    'Senior Accounts Executive', 'grade-c', 'Grade C', 'emp000002', 'Priya Sharma', 'GEN',
    '9876543260', 'deepika.rao@aryanmetals.in', 'Ramesh Rao', 'Father', '9876543261',
    '101, Sai Darshan CHS, Malad West', '400064',
    'Deepika Rao', '67890123456', 'SBIN0005678', 'SBI', 'Malad',
    '101234567895', '', '27',
    'ss-executive', 'Executive CTC', 720000, []),
  emp('EMP-000007', 'Mr', 'Vijay', '', 'Kumar', 'male', '1990-12-01', 'B-', 'married',
    '890123456789', 'GGKVK7890G', 'permanent', '2020-01-15', 'dept-purchase', 'Purchase',
    'Purchase Executive', 'grade-c', 'Grade C', 'emp000005', 'Amit Singh', 'GEN',
    '9876543270', 'vijay.kumar@aryanmetals.in', 'Meera Kumar', 'Spouse', '9876543271',
    '25, Neelkanth Heights, Borivali West', '400092',
    'Vijay Kumar', '78901234567', 'HDFC0003456', 'HDFC Bank', 'Borivali',
    '101234567896', '', '27',
    'ss-executive', 'Executive CTC', 600000, []),
  emp('EMP-000008', 'Ms', 'Kavitha', '', 'Nair', 'female', '1993-06-25', 'O+', 'single',
    '901234567890', 'HHBKN8901H', 'permanent', '2020-04-01', 'dept-hr', 'Human Resources',
    'HR Executive', 'grade-c', 'Grade C', 'emp000004', 'Sunita Patel', 'GEN',
    '9876543280', 'kavitha.nair@aryanmetals.in', 'Suresh Nair', 'Father', '9876543281',
    '12, Saraswati Niwas, Kandivali East', '400101',
    'Kavitha Nair', '89012345678', 'ICIC0002345', 'ICICI Bank', 'Kandivali',
    '101234567897', '', '27',
    'ss-executive', 'Executive CTC', 540000, []),
  emp('EMP-000009', 'Mr', 'Mohan', '', 'Das', 'male', '1988-01-14', 'A+', 'married',
    '012345678901', 'IIDMD9012I', 'permanent', '2019-11-01', 'dept-prod', 'Production',
    'Production Supervisor', 'grade-c', 'Grade C', 'emp000003', 'Rahul Gupta', 'GEN',
    '9876543290', 'mohan.das@aryanmetals.in', 'Rani Das', 'Spouse', '9876543291',
    '7, Krishna Nagar, Mulund West', '400080',
    'Mohan Das', '90123456789', 'SBIN0006789', 'SBI', 'Mulund',
    '101234567898', '', '27',
    'ss-executive', 'Executive CTC', 660000, []),
  emp('EMP-000010', 'Mrs', 'Rekha', '', 'Agarwal', 'female', '1991-08-30', 'B+', 'married',
    '123456789012', 'JJERA0123J', 'permanent', '2021-01-05', 'dept-admin', 'Administration',
    'Admin Executive', 'grade-c', 'Grade C', 'emp000004', 'Sunita Patel', 'GEN',
    '9876543300', 'rekha.agarwal@aryanmetals.in', 'Sunil Agarwal', 'Spouse', '9876543301',
    '33, Sahyadri CHS, Ghatkopar East', '400077',
    'Rekha Agarwal', '01234567890', 'UTIB0002345', 'Axis Bank', 'Ghatkopar',
    '101234567899', '', '27',
    'ss-executive', 'Executive CTC', 480000, []),
  emp('EMP-000011', 'Mr', 'Santosh', '', 'Jha', 'male', '1984-05-20', 'AB-', 'married',
    '234567890124', 'KKSJ1234K', 'permanent', '2018-09-01', 'dept-warehouse', 'Warehouse',
    'Warehouse Manager', 'grade-b', 'Grade B', 'emp000003', 'Rahul Gupta', 'GEN',
    '9876543310', 'santosh.jha@aryanmetals.in', 'Anita Jha', 'Spouse', '9876543311',
    '18, MHADA Colony, Bhandup West', '400078',
    'Santosh Jha', '12345678901', 'SBIN0007890', 'SBI', 'Bhandup',
    '101234567800', '', '27',
    'ss-manager', 'Manager CTC', 1200000, []),
  emp('EMP-000012', 'Ms', 'Nisha', '', 'Verma', 'female', '1995-10-12', 'O+', 'single',
    '345678901235', 'LLNV2345L', 'permanent', '2022-02-01', 'dept-it', 'IT',
    'IT Executive', 'grade-c', 'Grade C', 'emp000004', 'Sunita Patel', 'GEN',
    '9876543320', 'nisha.verma@aryanmetals.in', 'Anil Verma', 'Father', '9876543321',
    '5, Saket Residency, Chembur', '400071',
    'Nisha Verma', '23456789013', 'HDFC0004567', 'HDFC Bank', 'Chembur',
    '101234567801', '', '27',
    'ss-executive', 'Executive CTC', 540000, []),
  emp('EMP-000013', 'Mr', 'Ravi', '', 'Krishnan', 'male', '1981-07-08', 'A+', 'married',
    '456789012346', 'MMRK3456M', 'permanent', '2017-11-01', 'dept-qa', 'Quality Assurance',
    'QA Manager', 'grade-b', 'Grade B', 'emp000003', 'Rahul Gupta', 'GEN',
    '9876543330', 'ravi.krishnan@aryanmetals.in', 'Lakshmi Krishnan', 'Spouse', '9876543331',
    '22, Mahavir Nagar, Jogeshwari West', '400102',
    'Ravi Krishnan', '34567890124', 'ICIC0003456', 'ICICI Bank', 'Jogeshwari',
    '101234567802', '', '27',
    'ss-manager', 'Manager CTC', 1440000, []),
  emp('EMP-000014', 'Ms', 'Pooja', '', 'Iyer', 'female', '1994-03-25', 'B+', 'single',
    '567890123457', 'NNPI4567N', 'permanent', '2022-06-01', 'dept-sales', 'Sales',
    'Marketing Executive', 'grade-c', 'Grade C', 'emp000005', 'Amit Singh', 'GEN',
    '9876543340', 'pooja.iyer@aryanmetals.in', 'Venkatesh Iyer', 'Father', '9876543341',
    '9, Dadar Tower, Dadar West', '400028',
    'Pooja Iyer', '45678901235', 'SBIN0008901', 'SBI', 'Dadar',
    '101234567803', '', '27',
    'ss-executive', 'Executive CTC', 600000, []),
  emp('EMP-000015', 'Mr', 'Suresh', '', 'Naidu', 'male', '1998-11-30', 'O-', 'single',
    '678901234568', 'OOSN5678O', 'contract', '2023-04-01', 'dept-prod', 'Production',
    'Factory Worker (contract)', 'grade-d', 'Grade D', 'emp000009', 'Mohan Das', 'MRN',
    '9876543350', 'suresh.naidu@aryanmetals.in', 'Venkat Naidu', 'Father', '9876543351',
    '3, Labour Colony, MIDC Andheri', '400093',
    'Suresh Naidu', '56789012346', 'SBIN0009012', 'SBI', 'MIDC Andheri',
    '101234567804', '1234567890', '27',
    'ss-worker', 'Worker Wages', 252000,
    [{ id: 'eq-003', assetCode: 'SAF-001', description: 'Safety Helmet + Gloves', serialNo: 'SAF-2023-015', dateIssued: '2023-04-01', expectedReturn: '', status: 'issued' }]),
];

// ── 3.3 Salary Structures — 4 ──────────────────────────────────────────

function ssComp(
  phId: string, code: string, name: string, type: 'earning' | 'deduction' | 'employer_contribution',
  calc: SalaryStructureComponent['calculationType'], basis: string, value: number, max: number, sort: number,
): SalaryStructureComponent {
  return { payHeadId: phId, payHeadCode: code, payHeadName: name, payHeadType: type,
    calculationType: calc, calculationBasis: basis, calculationValue: value, maxValueMonthly: max, sortOrder: sort };
}

export const DEMO_SALARY_STRUCTURES: SalaryStructure[] = [
  {
    id: 'ss-director', code: 'SS-DIR', name: 'Director CTC', description: 'CTC structure for Grade A — Directors & GMs',
    basedOn: 'ctc', minCTC: 2400000, maxCTC: 12000000,
    components: [
      ssComp('phseed01', 'BASIC', 'Basic Salary', 'earning', 'percentage_ctc', 'ctc', 40, 0, 1),
      ssComp('phseed02', 'HRA', 'House Rent Allowance', 'earning', 'percentage_basic', 'basic', 50, 0, 2),
      ssComp('phseed05', 'SPCL', 'Special Allowance', 'earning', 'balancing', '', 0, 0, 3),
      ssComp('phseed08', 'EMP_PF', 'Employee PF', 'deduction', 'percentage_basic', 'basic', 12, 1800, 10),
      ssComp('phseed10', 'PT', 'Professional Tax', 'deduction', 'slab', '', 0, 0, 11),
      ssComp('phseed11', 'TDS', 'Income Tax (TDS)', 'deduction', 'computed', '', 0, 0, 12),
    ],
    applicableGrades: ['grade-a'], applicableDesignations: [],
    effectiveFrom: '2025-04-01', effectiveTo: '', status: 'active',
    created_at: now, updated_at: now,
  },
  {
    id: 'ss-manager', code: 'SS-MGR', name: 'Manager CTC', description: 'CTC structure for Grade B — Managers',
    basedOn: 'ctc', minCTC: 840000, maxCTC: 2400000,
    components: [
      ssComp('phseed01', 'BASIC', 'Basic Salary', 'earning', 'percentage_ctc', 'ctc', 40, 0, 1),
      ssComp('phseed02', 'HRA', 'House Rent Allowance', 'earning', 'percentage_basic', 'basic', 50, 0, 2),
      ssComp('phseed04', 'CONV', 'Conveyance Allowance', 'earning', 'fixed', '', 1600, 0, 3),
      ssComp('phseed07', 'MED', 'Medical Allowance', 'earning', 'fixed', '', 1250, 0, 4),
      ssComp('phseed05', 'SPCL', 'Special Allowance', 'earning', 'balancing', '', 0, 0, 5),
      ssComp('phseed08', 'EMP_PF', 'Employee PF', 'deduction', 'percentage_basic', 'basic', 12, 1800, 10),
      ssComp('phseed10', 'PT', 'Professional Tax', 'deduction', 'slab', '', 0, 0, 11),
      ssComp('phseed11', 'TDS', 'Income Tax (TDS)', 'deduction', 'computed', '', 0, 0, 12),
    ],
    applicableGrades: ['grade-b'], applicableDesignations: [],
    effectiveFrom: '2025-04-01', effectiveTo: '', status: 'active',
    created_at: now, updated_at: now,
  },
  {
    id: 'ss-executive', code: 'SS-EXEC', name: 'Executive CTC', description: 'CTC structure for Grade C — Executives',
    basedOn: 'ctc', minCTC: 300000, maxCTC: 840000,
    components: [
      ssComp('phseed01', 'BASIC', 'Basic Salary', 'earning', 'percentage_ctc', 'ctc', 40, 0, 1),
      ssComp('phseed02', 'HRA', 'House Rent Allowance', 'earning', 'percentage_basic', 'basic', 50, 0, 2),
      ssComp('phseed04', 'CONV', 'Conveyance Allowance', 'earning', 'fixed', '', 800, 0, 3),
      ssComp('phseed07', 'MED', 'Medical Allowance', 'earning', 'fixed', '', 1250, 0, 4),
      ssComp('phseed05', 'SPCL', 'Special Allowance', 'earning', 'balancing', '', 0, 0, 5),
      ssComp('phseed08', 'EMP_PF', 'Employee PF', 'deduction', 'percentage_basic', 'basic', 12, 1800, 10),
      ssComp('phseed09', 'EMP_ESI', 'Employee ESI', 'deduction', 'percentage_gross', 'gross', 0.75, 0, 11),
      ssComp('phseed10', 'PT', 'Professional Tax', 'deduction', 'slab', '', 0, 0, 12),
      ssComp('phseed11', 'TDS', 'Income Tax (TDS)', 'deduction', 'computed', '', 0, 0, 13),
    ],
    applicableGrades: ['grade-c'], applicableDesignations: [],
    effectiveFrom: '2025-04-01', effectiveTo: '', status: 'active',
    created_at: now, updated_at: now,
  },
  {
    id: 'ss-worker', code: 'SS-WRK', name: 'Worker Wages', description: 'Wage structure for Grade D — Workers',
    basedOn: 'ctc', minCTC: 180000, maxCTC: 300000,
    components: [
      ssComp('phseed01', 'BASIC', 'Basic Salary', 'earning', 'percentage_ctc', 'ctc', 70, 0, 1),
      ssComp('phseed03', 'DA', 'Dearness Allowance', 'earning', 'percentage_basic', 'basic', 15, 0, 2),
      ssComp('phseed05', 'SPCL', 'Attendance Bonus', 'earning', 'fixed', '', 500, 0, 3),
      ssComp('phseed08', 'EMP_PF', 'Employee PF', 'deduction', 'percentage_basic', 'basic', 12, 1800, 10),
      ssComp('phseed09', 'EMP_ESI', 'Employee ESI', 'deduction', 'percentage_gross', 'gross', 0.75, 0, 11),
      ssComp('phseed10', 'PT', 'Professional Tax', 'deduction', 'slab', '', 0, 0, 12),
    ],
    applicableGrades: ['grade-d'], applicableDesignations: [],
    effectiveFrom: '2025-04-01', effectiveTo: '', status: 'active',
    created_at: now, updated_at: now,
  },
];

// ── 3.4 Pay Grades — 4 ─────────────────────────────────────────────────

export const DEMO_PAY_GRADES: PayGrade[] = [
  { id: 'grade-a', code: 'GR-A', name: 'Grade A', level: 1,
    minCTC: 2400000, maxCTC: 12000000, minGross: 200000, maxGross: 1000000, minBasic: 80000, maxBasic: 400000,
    salaryStructureId: 'ss-director', salaryStructureName: 'Director CTC',
    promotionCriteriaYears: 0, promotionCriteriaRating: 0, nextGrades: [],
    description: 'Directors, C-Suite, General Managers', status: 'active', created_at: now, updated_at: now },
  { id: 'grade-b', code: 'GR-B', name: 'Grade B', level: 2,
    minCTC: 840000, maxCTC: 2400000, minGross: 70000, maxGross: 200000, minBasic: 28000, maxBasic: 80000,
    salaryStructureId: 'ss-manager', salaryStructureName: 'Manager CTC',
    promotionCriteriaYears: 3, promotionCriteriaRating: 4, nextGrades: ['grade-a'],
    description: 'Senior Managers, Department Heads', status: 'active', created_at: now, updated_at: now },
  { id: 'grade-c', code: 'GR-C', name: 'Grade C', level: 3,
    minCTC: 300000, maxCTC: 840000, minGross: 25000, maxGross: 70000, minBasic: 10000, maxBasic: 28000,
    salaryStructureId: 'ss-executive', salaryStructureName: 'Executive CTC',
    promotionCriteriaYears: 2, promotionCriteriaRating: 3.5, nextGrades: ['grade-b'],
    description: 'Executives, Supervisors, Officers', status: 'active', created_at: now, updated_at: now },
  { id: 'grade-d', code: 'GR-D', name: 'Grade D', level: 4,
    minCTC: 180000, maxCTC: 300000, minGross: 15000, maxGross: 25000, minBasic: 10500, maxBasic: 17500,
    salaryStructureId: 'ss-worker', salaryStructureName: 'Worker Wages',
    promotionCriteriaYears: 2, promotionCriteriaRating: 3, nextGrades: ['grade-c'],
    description: 'Workers, Helpers, Contract Staff', status: 'active', created_at: now, updated_at: now },
];

// ── 3.5 Holiday Calendar — FY 2025-26 ──────────────────────────────────

const hol = (date: string, name: string, type: Holiday['type'], stCode: string, stName: string): Holiday => ({
  id: `hol-${date}`, date, name, localName: name, type, stateCode: stCode, stateName: stName,
  counties: stCode ? [`IN-${stCode}`] : [], isOptional: false, isFixed: true,
  source: 'manual', description: '',
});

export const DEMO_HOLIDAY_DATES = [
  '2025-04-14', '2025-08-15', '2025-10-02', '2025-10-24', '2025-11-01',
  '2025-11-03', '2025-12-25', '2026-01-26', '2026-03-14', '2026-03-31',
];

export const DEMO_HOLIDAY_CALENDAR: HolidayCalendar = {
  id: 'hcal-fy2526',
  name: 'National & Maharashtra 2025-26',
  calendarLevel: 'company',
  parentCalendarId: '',
  entityId: 'e1',
  entityType: 'parent_company',
  fromDate: '2025-04-01',
  toDate: '2026-03-31',
  stateCode: 'MH',
  stateName: 'Maharashtra',
  location: 'Head Office — Mumbai',
  description: 'FY 2025-26 holiday calendar for Aryan Metals',
  holidays: [
    hol('2025-04-14', 'Dr. Ambedkar Jayanti', 'national', '', ''),
    hol('2025-08-15', 'Independence Day', 'national', '', ''),
    hol('2025-10-02', 'Gandhi Jayanti', 'national', '', ''),
    hol('2025-10-24', 'Dussehra', 'state', 'MH', 'Maharashtra'),
    hol('2025-11-01', 'Diwali', 'national', '', ''),
    hol('2025-11-03', 'Diwali (Padwa)', 'state', 'MH', 'Maharashtra'),
    hol('2025-12-25', 'Christmas', 'national', '', ''),
    hol('2026-01-26', 'Republic Day', 'national', '', ''),
    hol('2026-03-14', 'Holi', 'national', '', ''),
    hol('2026-03-31', 'Gudi Padwa', 'state', 'MH', 'Maharashtra'),
  ],
  inheritedHolidays: [],
  status: 'active',
  created_at: now,
  updated_at: now,
};

// ── 3.6 Supplementary masters ──────────────────────────────────────────

export const DEMO_SHIFTS: Shift[] = [
  { id: 'sh-demo-01', code: 'GEN', name: 'General Shift', startTime: '09:00', endTime: '18:00',
    breakDuration: 60, breakStartTime: '13:00', gracePeriodIn: 10, gracePeriodOut: 10,
    weeklyOff: ['Sunday'], rotationPattern: 'none', overtimeAfter: 9, nightShift: false,
    halfDayHours: 4, fullDayHours: 8.5, color: '#6366f1', status: 'active', created_at: now, updated_at: now },
  { id: 'sh-demo-02', code: 'MRN', name: 'Morning Shift', startTime: '06:00', endTime: '14:00',
    breakDuration: 30, breakStartTime: '10:00', gracePeriodIn: 10, gracePeriodOut: 5,
    weeklyOff: ['Sunday'], rotationPattern: 'none', overtimeAfter: 8, nightShift: false,
    halfDayHours: 4, fullDayHours: 7.5, color: '#22c55e', status: 'active', created_at: now, updated_at: now },
  { id: 'sh-demo-03', code: 'EVE', name: 'Evening Shift', startTime: '14:00', endTime: '22:00',
    breakDuration: 30, breakStartTime: '18:00', gracePeriodIn: 10, gracePeriodOut: 5,
    weeklyOff: ['Sunday'], rotationPattern: 'none', overtimeAfter: 8, nightShift: false,
    halfDayHours: 4, fullDayHours: 7.5, color: '#f59e0b', status: 'active', created_at: now, updated_at: now },
];

export const DEMO_LEAVE_TYPES: LeaveType[] = [
  { id: 'lt-demo-cl', code: 'CL', name: 'Casual Leave', shortName: 'CL', daysPerYear: 12,
    carryForward: false, maxCarryForward: 0, carryForwardExpiryMonths: 0,
    encashable: false, encashmentRatePct: 0, maxEncashmentDays: 0,
    applicableFrom: 'joining', customApplicableAfterDays: 0, proRata: false,
    clubbingAllowed: false, minDaysAtOnce: 0.5, maxDaysAtOnce: 3,
    advanceNoticeDays: 1, documentRequired: false, documentRequiredAfterDays: 0,
    applicableGender: 'all', paidLeave: true, halfDayAllowed: true,
    status: 'active', created_at: now, updated_at: now },
  { id: 'lt-demo-sl', code: 'SL', name: 'Sick Leave', shortName: 'SL', daysPerYear: 12,
    carryForward: false, maxCarryForward: 0, carryForwardExpiryMonths: 0,
    encashable: false, encashmentRatePct: 0, maxEncashmentDays: 0,
    applicableFrom: 'joining', customApplicableAfterDays: 0, proRata: false,
    clubbingAllowed: false, minDaysAtOnce: 0.5, maxDaysAtOnce: 7,
    advanceNoticeDays: 0, documentRequired: true, documentRequiredAfterDays: 3,
    applicableGender: 'all', paidLeave: true, halfDayAllowed: true,
    status: 'active', created_at: now, updated_at: now },
  { id: 'lt-demo-el', code: 'EL', name: 'Earned Leave / PL', shortName: 'EL', daysPerYear: 15,
    carryForward: true, maxCarryForward: 30, carryForwardExpiryMonths: 0,
    encashable: true, encashmentRatePct: 100, maxEncashmentDays: 30,
    applicableFrom: 'confirmation', customApplicableAfterDays: 0, proRata: true,
    clubbingAllowed: true, minDaysAtOnce: 1, maxDaysAtOnce: 30,
    advanceNoticeDays: 7, documentRequired: false, documentRequiredAfterDays: 0,
    applicableGender: 'all', paidLeave: true, halfDayAllowed: false,
    status: 'active', created_at: now, updated_at: now },
  { id: 'lt-demo-ml', code: 'ML', name: 'Maternity Leave', shortName: 'ML', daysPerYear: 182,
    carryForward: false, maxCarryForward: 0, carryForwardExpiryMonths: 0,
    encashable: false, encashmentRatePct: 0, maxEncashmentDays: 0,
    applicableFrom: 'confirmation', customApplicableAfterDays: 0, proRata: false,
    clubbingAllowed: false, minDaysAtOnce: 1, maxDaysAtOnce: 182,
    advanceNoticeDays: 30, documentRequired: true, documentRequiredAfterDays: 0,
    applicableGender: 'female', paidLeave: true, halfDayAllowed: false,
    status: 'active', created_at: now, updated_at: now },
  { id: 'lt-demo-pl', code: 'PL', name: 'Paternity Leave', shortName: 'PL', daysPerYear: 7,
    carryForward: false, maxCarryForward: 0, carryForwardExpiryMonths: 0,
    encashable: false, encashmentRatePct: 0, maxEncashmentDays: 0,
    applicableFrom: 'joining', customApplicableAfterDays: 0, proRata: false,
    clubbingAllowed: false, minDaysAtOnce: 1, maxDaysAtOnce: 7,
    advanceNoticeDays: 7, documentRequired: false, documentRequiredAfterDays: 0,
    applicableGender: 'male', paidLeave: true, halfDayAllowed: false,
    status: 'active', created_at: now, updated_at: now },
  { id: 'lt-demo-co', code: 'CO', name: 'Compensatory Off', shortName: 'CO', daysPerYear: 0,
    carryForward: true, maxCarryForward: 30, carryForwardExpiryMonths: 3,
    encashable: false, encashmentRatePct: 0, maxEncashmentDays: 0,
    applicableFrom: 'joining', customApplicableAfterDays: 0, proRata: false,
    clubbingAllowed: false, minDaysAtOnce: 0.5, maxDaysAtOnce: 1,
    advanceNoticeDays: 1, documentRequired: false, documentRequiredAfterDays: 0,
    applicableGender: 'all', paidLeave: true, halfDayAllowed: true,
    status: 'active', created_at: now, updated_at: now },
];

export const DEMO_LOAN_TYPES: LoanType[] = [
  { id: 'lnt-demo-01', code: 'LN-FA', name: 'Festival Advance',
    interestRatePct: 0, interestType: 'nil', maxAmountMultiplier: 3, maxTenureMonths: 12,
    eligibleAfterDays: 180, status: 'active', created_at: now, updated_at: now },
  { id: 'lnt-demo-02', code: 'LN-PL', name: 'Personal Loan',
    interestRatePct: 10, interestType: 'simple', maxAmountMultiplier: 6, maxTenureMonths: 24,
    eligibleAfterDays: 365, status: 'active', created_at: now, updated_at: now },
  { id: 'lnt-demo-03', code: 'LN-ED', name: 'Education Loan',
    interestRatePct: 8, interestType: 'simple', maxAmountMultiplier: 10, maxTenureMonths: 36,
    eligibleAfterDays: 365, status: 'active', created_at: now, updated_at: now },
];

export const DEMO_BONUS_CONFIGS: BonusConfig[] = [
  { id: 'bn-demo-01', code: 'BN-ANN', name: 'Annual Bonus',
    bonusType: 'statutory', calculationType: 'percentage_basic', value: 8.33,
    minPercent: 8.33, maxPercent: 20, eligibilityDays: 30, eligibilityWageCeiling: 21000,
    taxable: true, effectiveFrom: '2025-04-01', status: 'active', created_at: now, updated_at: now },
];

export const DEMO_GRATUITY_NPS: GratuityNPSSettings = {
  gratuity: {
    eligibilityYears: 5,
    calculationFormula: '(Basic + DA) x 15/26 x Years of Service',
    maxGratuityAmount: 2000000,
    taxExemptLimit: 2000000,
    applicableAct: 'payment_of_gratuity_act_1972',
    updated_at: now,
  },
  nps: {
    employeeContributionPct: 10,
    employerContributionPct: 10,
    tierType: 'tier1',
    fundManager: 'SBI Pension Fund',
    investmentChoice: 'auto',
    updated_at: now,
  },
};

export const DEMO_ATTENDANCE_TYPES: AttendanceType[] = [
  { id: 'at-demo-01', code: 'P', name: 'Present', shortName: 'P', baseType: 'present', paidStatus: 'full_paid', color: '#22c55e', countAsWorkingDay: true, requiresApproval: false, allowManualEntry: true, status: 'active', created_at: now, updated_at: now },
  { id: 'at-demo-02', code: 'A', name: 'Absent', shortName: 'A', baseType: 'absent', paidStatus: 'unpaid', color: '#ef4444', countAsWorkingDay: false, requiresApproval: false, allowManualEntry: true, status: 'active', created_at: now, updated_at: now },
  { id: 'at-demo-03', code: 'HD', name: 'Half Day', shortName: 'HD', baseType: 'half_day', paidStatus: 'half_paid', color: '#f59e0b', countAsWorkingDay: true, requiresApproval: false, allowManualEntry: true, status: 'active', created_at: now, updated_at: now },
  { id: 'at-demo-04', code: 'WFH', name: 'Work From Home', shortName: 'WFH', baseType: 'work_from_home', paidStatus: 'full_paid', color: '#3b82f6', countAsWorkingDay: true, requiresApproval: true, allowManualEntry: true, status: 'active', created_at: now, updated_at: now },
];

export const DEMO_OVERTIME_RULES: OvertimeRule[] = [
  { id: 'ot-demo-01', code: 'OT-STD', name: 'Standard Overtime', description: 'Double rate for weekday OT, triple for holidays',
    minOvertimeHours: 1, maxOvertimeHoursDaily: 4, maxOvertimeHoursWeekly: 12, maxOvertimeHoursMonthly: 48,
    slabs: [
      { id: 'ots-1', fromHours: 0, toHours: 2, rateMultiplier: 2, dayType: 'weekday' },
      { id: 'ots-2', fromHours: 2, toHours: 4, rateMultiplier: 2.5, dayType: 'weekday' },
      { id: 'ots-3', fromHours: 0, toHours: 8, rateMultiplier: 3, dayType: 'holiday' },
    ],
    effectiveFrom: '2025-04-01', status: 'active', created_at: now, updated_at: now },
];
