/** recruitment.ts — Sprint 11 Recruitment, Document + Policy types */

// ── Job Requisition ───────────────────────────────────────────────
export type RequisitionStatus = 'draft' | 'pending_approval' | 'approved' | 'open' | 'on_hold' | 'closed' | 'cancelled';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';

export interface JobRequisition {
  id: string;
  reqCode: string;             // JR-000001
  jobTitle: string;
  departmentId: string;
  departmentName: string;
  reportingManagerId: string;
  reportingManagerName: string;
  gradeId: string;             // links to erp_pay_grades for CTC band
  gradeName: string;
  minCTC: number;
  maxCTC: number;
  openings: number;
  filled: number;
  employmentType: EmploymentType;
  location: string;
  experienceMin: number;       // years
  experienceMax: number;
  skills: string[];            // required skills tags
  description: string;         // JD free text
  targetDate: string;
  status: RequisitionStatus;
  approvedBy: string;
  approvedAt: string;
  rejectionReason: string;
  isInternal: boolean;
  isExternal: boolean;
  created_at: string;
  updated_at: string;
}

// ── Kanban pipeline stages ────────────────────────────────────────
export type ApplicationStage = 'applied' | 'screening' | 'interview' | 'offer_sent' | 'joined' | 'rejected';

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  applied:    'Applied',
  screening:  'Screening',
  interview:  'Interview',
  offer_sent: 'Offer Sent',
  joined:     'Joined',
  rejected:   'Rejected',
};

export const STAGE_COLORS: Record<ApplicationStage, string> = {
  applied:    'bg-slate-500/10 text-slate-700 border-slate-400/30',
  screening:  'bg-amber-500/10 text-amber-700 border-amber-500/30',
  interview:  'bg-blue-500/10 text-blue-700 border-blue-500/30',
  offer_sent: 'bg-violet-500/10 text-violet-700 border-violet-500/30',
  joined:     'bg-green-500/10 text-green-700 border-green-500/30',
  rejected:   'bg-red-500/10 text-red-700 border-red-500/30',
};

// ── Candidate Application ─────────────────────────────────────────
export interface CandidateApplication {
  id: string;
  appCode: string;             // CA-000001
  requisitionId: string;
  jobTitle: string;
  candidateName: string;
  email: string;
  phone: string;
  currentCTC: number;
  expectedCTC: number;
  noticePeriodDays: number;
  totalExperience: number;     // years (decimal e.g. 3.5)
  currentEmployer: string;
  source: string;              // LinkedIn / Naukri / Referral / Walk-in etc
  resumeRef: string;           // file reference (upload Phase 2)
  stage: ApplicationStage;
  interviewDate: string;
  interviewMode: string;       // Video / In-Person / Phone
  interviewerName: string;
  interviewFeedback: string;
  offerAmount: number;
  offerDate: string;
  joiningDate: string;
  rejectionReason: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ── HR Document ───────────────────────────────────────────────────
export type DocumentCategory = 'offer_letter' | 'appointment' | 'contract' | 'nda'
  | 'increment_letter' | 'confirmation_letter' | 'relieving_letter' | 'experience_letter' | 'other';

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  offer_letter: 'Offer Letter', appointment: 'Appointment Letter',
  contract: 'Contract / Agreement', nda: 'Non-Disclosure Agreement',
  increment_letter: 'Increment Letter', confirmation_letter: 'Confirmation Letter',
  relieving_letter: 'Relieving Letter', experience_letter: 'Experience Letter',
  other: 'Other',
};

export interface HRDocument {
  id: string;
  docCode: string;             // DOC-000001
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  category: DocumentCategory;
  title: string;
  issueDate: string;
  fileRef: string;             // filename / ref (upload Phase 2)
  notes: string;
  generatedContent: string;    // HTML/text for generated letters
  created_at: string;
  updated_at: string;
}

// ── Company Policy ────────────────────────────────────────────────
export type PolicyCategory = 'hr' | 'it' | 'finance' | 'operations' | 'compliance' | 'leave' | 'travel' | 'other';

export const POLICY_CATEGORY_LABELS: Record<PolicyCategory, string> = {
  hr: 'HR', it: 'IT & Security', finance: 'Finance', operations: 'Operations',
  compliance: 'Compliance & Legal', leave: 'Leave & Attendance',
  travel: 'Travel & Expenses', other: 'Other',
};

export interface CompanyPolicy {
  id: string;
  policyCode: string;          // POL-000001
  title: string;
  category: PolicyCategory;
  version: string;             // "v1.0", "v2.1"
  effectiveDate: string;
  reviewDate: string;
  owner: string;               // HR / IT / Finance
  content: string;             // full policy text (rich textarea)
  acknowledgementRequired: boolean;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export const JOB_REQUISITIONS_KEY  = 'erp_job_requisitions';
export const JOB_APPLICATIONS_KEY  = 'erp_job_applications';
export const HR_DOCUMENTS_KEY      = 'erp_documents';
export const COMPANY_POLICIES_KEY  = 'erp_policies';

export const REQ_STATUS_COLORS: Record<RequisitionStatus, string> = {
  draft:            'bg-slate-500/10 text-slate-600 border-slate-400/30',
  pending_approval: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  approved:         'bg-blue-500/10 text-blue-700 border-blue-500/30',
  open:             'bg-green-500/10 text-green-700 border-green-500/30',
  on_hold:          'bg-orange-500/10 text-orange-700 border-orange-500/30',
  closed:           'bg-violet-500/10 text-violet-600 border-violet-400/30',
  cancelled:        'bg-red-500/10 text-red-700 border-red-500/30',
};

// ── Sprint T-Phase-1.2.5h-a · Multi-tenant key migration ─────────────────
// Bucket B (per-entity) — recruitment data is entity-specific:
// [JWT] GET /api/peoplepay/job-requisitions?entityCode={e}
export const jobRequisitionsKey = (e: string): string =>
  e ? `erp_job_requisitions_${e}` : 'erp_job_requisitions';
// [JWT] GET /api/peoplepay/job-applications?entityCode={e}
export const jobApplicationsKey = (e: string): string =>
  e ? `erp_job_applications_${e}` : 'erp_job_applications';
// Bucket C (per-entity) — generic HR documents:
// [JWT] GET /api/peoplepay/hr-documents?entityCode={e}
export const hrDocumentsKey = (e: string): string =>
  e ? `erp_documents_${e}` : 'erp_documents';
