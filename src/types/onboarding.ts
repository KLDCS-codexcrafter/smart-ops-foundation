/** onboarding.ts — Sprint 12 Onboarding Journey types */

export type OnboardingPhase = 'pre_join' | 'day_1' | 'week_1' | 'month_1';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type DocStatus  = 'pending' | 'collected' | 'waived';
export type JourneyStatus = 'active' | 'completed' | 'on_hold';

export const PHASE_LABELS: Record<OnboardingPhase, string> = {
  pre_join: 'Pre-Join',  day_1: 'Day 1',  week_1: 'Week 1',  month_1: 'Month 1',
};

export const PHASE_ORDER: OnboardingPhase[] = ['pre_join','day_1','week_1','month_1'];

// ── Checklist Task ────────────────────────────────────────────────
export interface ChecklistTask {
  id: string;
  phase: OnboardingPhase;
  title: string;
  description: string;
  owner: string;           // "HR" | "IT" | "Manager" | "Employee"
  isMandatory: boolean;
  status: TaskStatus;
  completedBy: string;
  completedAt: string;
  notes: string;
}

// ── Document Requirement ──────────────────────────────────────────
export interface DocRequirement {
  id: string;
  docName: string;
  isMandatory: boolean;
  status: DocStatus;
  collectedDate: string;
  notes: string;
}

// ── Onboarding Journey ───────────────────────────────────────────
export interface OnboardingJourney {
  id: string;
  journeyCode: string;       // OB-000001
  candidateAppId: string;    // links to erp_job_applications
  employeeId: string;        // filled after employee record is created
  employeeCode: string;
  candidateName: string;
  jobTitle: string;
  departmentName: string;
  joiningDate: string;
  reportingManagerName: string;
  offerAmount: number;
  status: JourneyStatus;
  tasks: ChecklistTask[];
  documents: DocRequirement[];
  employeeCreated: boolean;  // true after "Create Employee Record" is done
  welcomeEmailSent: boolean;
  orientationDate: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const ONBOARDING_KEY = 'erp_onboarding_journeys';

// ── Seeded checklist tasks (applied to every new journey) ─────────
// Defined here so OnboardingPanel can use them without embedding data in JSX.
export const SEED_TASKS: Omit<ChecklistTask, "id" | "status" | "completedBy" | "completedAt" | "notes">[] = [
  // Pre-Join (HR owns)
  { phase:'pre_join', title:'Send offer letter',            description:'Issue signed offer letter to candidate',              owner:'HR',      isMandatory:true  },
  { phase:'pre_join', title:'Collect acceptance',           description:'Get signed offer acceptance from candidate',          owner:'HR',      isMandatory:true  },
  { phase:'pre_join', title:'Background verification',      description:'Initiate BGV via agency or manual check',             owner:'HR',      isMandatory:true  },
  { phase:'pre_join', title:'Send joining instructions',    description:'Email joining date, time, location, dress code',      owner:'HR',      isMandatory:true  },
  { phase:'pre_join', title:'Create system accounts',       description:'Corporate email, HRMS login, communication tools',    owner:'IT',      isMandatory:true  },
  { phase:'pre_join', title:'Assign desk / seat',           description:'Allocate workstation and notify facilities',          owner:'HR',      isMandatory:false },
  // Day 1 (HR + Manager)
  { phase:'day_1',    title:'Induction & orientation',      description:'Company overview, culture, vision, policies',         owner:'HR',      isMandatory:true  },
  { phase:'day_1',    title:'ID card & access card',        description:'Issue photo ID and building access card',             owner:'HR',      isMandatory:true  },
  { phase:'day_1',    title:'Document collection',          description:'Collect all joining documents from employee',         owner:'HR',      isMandatory:true  },
  { phase:'day_1',    title:'IT equipment handover',        description:'Laptop, peripherals, phone as per grade entitlement', owner:'IT',      isMandatory:true  },
  { phase:'day_1',    title:'Team introduction',            description:'Introduce to reporting manager and team members',     owner:'Manager', isMandatory:true  },
  { phase:'day_1',    title:'Role & KRA briefing',          description:'Explain job responsibilities and KPIs for first 90d', owner:'Manager', isMandatory:true  },
  { phase:'day_1',    title:'PF & ESIC nomination form',    description:'Fill PF nomination and ESIC form with employee',      owner:'HR',      isMandatory:true  },
  { phase:'day_1',    title:'Bank account details',         description:'Collect bank details for salary processing',          owner:'HR',      isMandatory:true  },
  // Week 1
  { phase:'week_1',   title:'HRMS self-service setup',      description:'Employee logs in to HRMS and completes profile',      owner:'Employee',isMandatory:true  },
  { phase:'week_1',   title:'Leave policy briefing',        description:'Explain leave types, accruals, and application flow', owner:'HR',      isMandatory:true  },
  { phase:'week_1',   title:'IT security training',         description:'Mandatory information security awareness training',   owner:'IT',      isMandatory:true  },
  { phase:'week_1',   title:'Payroll & CTC understanding',  description:'Walkthrough of salary structure and deductions',      owner:'HR',      isMandatory:true  },
  { phase:'week_1',   title:'Buddy assignment',             description:'Assign onboarding buddy for first 30 days',           owner:'Manager', isMandatory:false },
  { phase:'week_1',   title:'First 30-day goal setting',    description:'Manager sets measurable goals for Month 1',           owner:'Manager', isMandatory:true  },
  // Month 1
  { phase:'month_1',  title:'Probation review check-in',    description:'Mid-probation informal check-in with manager',        owner:'Manager', isMandatory:true  },
  { phase:'month_1',  title:'IT Declaration (Form 12BB)',   description:'Employee submits investment declaration to HR',        owner:'Employee',isMandatory:true  },
  { phase:'month_1',  title:'First salary confirmation',    description:'Verify first month salary is correctly processed',    owner:'HR',      isMandatory:true  },
  { phase:'month_1',  title:'Onboarding feedback survey',   description:'Employee completes onboarding experience survey',     owner:'HR',      isMandatory:false },
];

// ── Seeded document requirements ─────────────────────────────────
export const SEED_DOCS: Omit<DocRequirement,"id"|"status"|"collectedDate"|"notes">[] = [
  { docName:'Aadhaar Card (original + 2 copies)', isMandatory:true  },
  { docName:'PAN Card (original + 2 copies)',     isMandatory:true  },
  { docName:'Passport-size photographs (4)',      isMandatory:true  },
  { docName:'Educational certificates',          isMandatory:true  },
  { docName:'Last 3 months payslips',            isMandatory:true  },
  { docName:'Relieving letter (previous employer)', isMandatory:true },
  { docName:'Experience letter',                 isMandatory:false },
  { docName:'Bank account details / cancelled cheque', isMandatory:true },
  { docName:'Medical fitness certificate',       isMandatory:false },
  { docName:'Permanent address proof',           isMandatory:true  },
];
