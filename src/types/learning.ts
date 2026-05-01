/** learning.ts — Sprint 14 Learning & Development types */

export type LearningTab = 'catalog' | 'enrollments' | 'skills' | 'certifications';

// ── Training Course ───────────────────────────────────────────────
export type CourseType = 'instructor_led' | 'e_learning' | 'on_the_job' | 'workshop' | 'webinar' | 'self_study';
export type CourseStatus = 'draft' | 'published' | 'archived';

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  instructor_led: 'Instructor-Led', e_learning: 'E-Learning',
  on_the_job: 'On-the-Job', workshop: 'Workshop',
  webinar: 'Webinar', self_study: 'Self Study',
};

export interface TrainingCourse {
  id: string;
  courseCode: string;       // TRN-000001
  title: string;
  category: string;         // "Leadership" | "Technical" | "Compliance" | "Soft Skills" etc.
  type: CourseType;
  durationHours: number;
  provider: string;         // Internal / External vendor name
  cost: number;             // per participant
  description: string;
  skills: string[];         // skill tags this course builds
  mandatoryFor: string[];   // designation / grade codes for mandatory assignment
  status: CourseStatus;
  created_at: string;
  updated_at: string;
}

// ── Training Enrollment ───────────────────────────────────────────
export type EnrollmentStatus = 'enrolled' | 'in_progress' | 'completed' | 'dropped' | 'no_show';

export const ENROLLMENT_STATUS_COLORS: Record<EnrollmentStatus, string> = {
  enrolled:    'bg-blue-500/10 text-blue-700 border-blue-500/30',
  in_progress: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  completed:   'bg-green-500/10 text-green-700 border-green-500/30',
  dropped:     'bg-red-500/10 text-red-700 border-red-500/30',
  no_show:     'bg-slate-500/10 text-slate-500 border-slate-400/30',
};

export interface TrainingEnrollment {
  id: string;
  enrollCode: string;       // ENR-000001
  courseId: string;
  courseTitle: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  scheduledDate: string;
  completedDate: string;
  score: number;            // 0-100, 0 if not scored
  passed: boolean;
  feedbackRating: number;   // 1-5
  feedbackComment: string;
  status: EnrollmentStatus;
  nominatedBy: string;      // "Self" | "Manager" | "HR"
  created_at: string;
  updated_at: string;
}

// ── Skill + Skill Matrix ──────────────────────────────────────────
export type ProficiencyLevel = 0 | 1 | 2 | 3 | 4;
// 0=Not Assessed, 1=Beginner, 2=Intermediate, 3=Advanced, 4=Expert

export const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  0: 'Not Assessed', 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced', 4: 'Expert',
};

export const PROFICIENCY_COLORS: Record<ProficiencyLevel, string> = {
  0: 'bg-slate-100 text-slate-400',
  1: 'bg-red-100 text-red-700',
  2: 'bg-amber-100 text-amber-700',
  3: 'bg-blue-100 text-blue-700',
  4: 'bg-green-100 text-green-700',
};

export interface SkillRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  skillCategory: string;
  skillName: string;
  currentLevel: ProficiencyLevel;
  targetLevel: ProficiencyLevel;
  assessedBy: string;
  assessedDate: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ── Certification ─────────────────────────────────────────────────
export interface CertificationRecord {
  id: string;
  certCode: string;         // CERT-000001
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  certificationName: string;
  issuingBody: string;
  certNumber: string;
  issueDate: string;
  expiryDate: string;       // empty if no expiry
  isExpired: boolean;
  isRenewable: boolean;
  renewalReminderDays: number; // days before expiry to alert
  fileRef: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const TRAINING_COURSES_KEY   = 'erp_training_courses';
export const ENROLLMENTS_KEY        = 'erp_training_enrollments';
/**
 * EMPLOYEE_SKILLS_KEY holds BOTH the global skill catalog (Bucket A · Standing-Rules
 * tenant-global) AND per-employee skill assignments. Sprint T-Phase-1.2.5h-b2
 * splits the assignment subset to a per-entity factory; the catalog stays here.
 */
export const EMPLOYEE_SKILLS_KEY    = 'erp_employee_skills';
// [JWT] GET /api/peoplepay/employee-skill-assignments?entityCode={e}
export const employeeSkillAssignmentsKey = (e: string): string =>
  e ? `erp_employee_skill_assignments_${e}` : 'erp_employee_skill_assignments';
export const CERTIFICATIONS_KEY     = 'erp_certifications';

// ── Seeded skill catalog (25 skills across 5 categories) ──────────
// Exported so component can populate dropdowns and build matrix headers.
export interface SkillCatalogItem { category: string; skill: string; }

export const SKILL_CATALOG: SkillCatalogItem[] = [
  // Technical
  { category:'Technical', skill:'JavaScript / TypeScript' },
  { category:'Technical', skill:'React / Frontend' },
  { category:'Technical', skill:'Python' },
  { category:'Technical', skill:'SQL / Databases' },
  { category:'Technical', skill:'Cloud (AWS / Azure / GCP)' },
  // Leadership & Management
  { category:'Leadership', skill:'Team Management' },
  { category:'Leadership', skill:'Strategic Planning' },
  { category:'Leadership', skill:'Change Management' },
  { category:'Leadership', skill:'Decision Making' },
  { category:'Leadership', skill:'Coaching & Mentoring' },
  // Communication
  { category:'Communication', skill:'Presentation Skills' },
  { category:'Communication', skill:'Written Communication' },
  { category:'Communication', skill:'Negotiation' },
  { category:'Communication', skill:'Client Management' },
  { category:'Communication', skill:'Cross-Cultural Communication' },
  // Finance & Compliance
  { category:'Finance', skill:'Financial Analysis' },
  { category:'Finance', skill:'Budgeting' },
  { category:'Finance', skill:'Statutory Compliance' },
  { category:'Finance', skill:'Audit & Risk' },
  { category:'Finance', skill:'Payroll Management' },
  // Soft Skills
  { category:'Soft Skills', skill:'Problem Solving' },
  { category:'Soft Skills', skill:'Time Management' },
  { category:'Soft Skills', skill:'Adaptability' },
  { category:'Soft Skills', skill:'Collaboration' },
  { category:'Soft Skills', skill:'Critical Thinking' },
];

// unique categories in SKILL_CATALOG order
export const SKILL_CATEGORIES = ['Technical','Leadership','Communication','Finance','Soft Skills'];

/**
 * GLOBAL KEYS (Sprint T-Phase-1.2.5h-a verified): TRAINING_COURSES_KEY,
 * EMPLOYEE_SKILLS_KEY, CERTIFICATIONS_KEY, ENROLLMENTS_KEY are intentionally
 * tenant-global. Rationale: course/skill/certification catalogs and enrollment
 * metadata are shared across entities. Audited: 2026-05-01 · Bucket A.
 */
