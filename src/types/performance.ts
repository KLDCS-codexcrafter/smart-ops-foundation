/** performance.ts — Sprint 13 Performance, Talent & Compensation types */

export type PerformanceTab = 'reviews' | '9box' | 'succession' | 'compensation';

// ── Appraisal Cycle ───────────────────────────────────────────────
export type CycleStatus = 'draft' | 'active' | 'closed';

export interface AppraisalCycle {
  id: string;
  cycleCode: string;        // AC-000001
  name: string;             // e.g. "Annual Appraisal FY 2025-26"
  type: string;             // "Annual" | "Mid-Year" | "Probation" | "Quarterly"
  financialYear: string;    // "2025-26"
  startDate: string;
  endDate: string;
  ratingScale: number;      // 3 | 5 | 10
  status: CycleStatus;
  created_at: string;
  updated_at: string;
}

// ── KRA (Key Result Area) item ────────────────────────────────────
export interface KRAItem {
  id: string;
  kra: string;              // "Revenue Growth"
  metric: string;           // "Achieve ₹X crore target"
  weightage: number;        // % (all KRAs should sum to 100)
  targetValue: string;
  actualValue: string;
  selfRating: number;
  managerRating: number;
}

// ── Performance Review ────────────────────────────────────────────
export type ReviewStatus = 'draft' | 'self_review' | 'manager_review' | 'hr_review' | 'completed';

export interface PerformanceReview {
  id: string;
  reviewCode: string;       // PR-000001
  cycleId: string;
  cycleName: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  designation: string;
  departmentName: string;
  managerId: string;
  managerName: string;
  kras: KRAItem[];
  selfRatingOverall: number;
  managerRatingOverall: number;
  hrRatingFinal: number;
  performanceScore: number;  // 1-5 normalised
  potentialScore: number;    // 1-3 HR assessed: 1=Low 2=Medium 3=High
  selfComments: string;
  managerComments: string;
  hrComments: string;
  developmentAreas: string;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

// ── Succession Plan ───────────────────────────────────────────────
export type ReadinessLevel = 'ready_now' | 'ready_1yr' | 'ready_2yr' | 'not_ready';

export interface SuccessionEntry {
  id: string;
  successorId: string;
  successorCode: string;
  successorName: string;
  readiness: ReadinessLevel;
  notes: string;
}

export interface SuccessionPlan {
  id: string;
  planCode: string;         // SP-000001
  targetRoleTitle: string;  // Critical role being planned for
  targetDepartment: string;
  currentHolderId: string;
  currentHolderName: string;
  riskLevel: string;        // "High" | "Medium" | "Low"
  successors: SuccessionEntry[];
  notes: string;
  created_at: string;
  updated_at: string;
}

// ── Compensation Action ───────────────────────────────────────────
export type CompActionType = 'increment' | 'promotion' | 'grade_change' | 'correction';

export interface CompensationAction {
  id: string;
  actionCode: string;       // CA-000001
  actionType: CompActionType;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  effectiveDate: string;
  oldCTC: number;
  newCTC: number;
  pctChange: number;        // computed: (newCTC-oldCTC)/oldCTC * 100
  oldGradeId: string;
  oldGradeName: string;
  newGradeId: string;
  newGradeName: string;
  oldDesignation: string;
  newDesignation: string;
  linkedReviewId: string;   // optional — link to PerformanceReview
  reason: string;
  approvedBy: string;
  status: 'pending' | 'approved' | 'applied';
  created_at: string;
  updated_at: string;
}

export const APPRAISAL_CYCLES_KEY  = 'erp_appraisal_cycles';
export const PERF_REVIEWS_KEY      = 'erp_performance_reviews';
/** @deprecated Use successionPlansKey(entityCode) — Sprint T-Phase-1.2.5h-b2 */
export const SUCCESSION_PLANS_KEY  = 'erp_succession_plans';
export const COMP_ACTIONS_KEY      = 'erp_comp_actions';

export const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  draft:          'bg-slate-500/10 text-slate-600 border-slate-400/30',
  self_review:    'bg-amber-500/10 text-amber-700 border-amber-500/30',
  manager_review: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  hr_review:      'bg-violet-500/10 text-violet-700 border-violet-500/30',
  completed:      'bg-green-500/10 text-green-700 border-green-500/30',
};

export const READINESS_LABELS: Record<ReadinessLevel, string> = {
  ready_now:  'Ready Now',
  ready_1yr:  'Ready in 1 Year',
  ready_2yr:  'Ready in 2 Years',
  not_ready:  'Not Ready',
};

export const READINESS_COLORS: Record<ReadinessLevel, string> = {
  ready_now:  'bg-green-500/10 text-green-700 border-green-500/30',
  ready_1yr:  'bg-blue-500/10 text-blue-700 border-blue-500/30',
  ready_2yr:  'bg-amber-500/10 text-amber-700 border-amber-500/30',
  not_ready:  'bg-red-500/10 text-red-700 border-red-500/30',
};

// ── 9-Box placement helper ────────────────────────────────────────
// performanceScore 1-5, potentialScore 1-3
// Returns col (0-2) and row (0-2 where 0=top)
export function get9BoxPosition(perfScore: number, potentialScore: number): { col: number; row: number; label: string } {
  const col = perfScore <= 2 ? 0 : perfScore <= 3.5 ? 1 : 2;
  const row = potentialScore <= 1 ? 2 : potentialScore <= 2 ? 1 : 0;
  const labels = [
    ['Inconsistent Player','Core Player','High Professional'],
    ['Under Performer','Key Player','Rising Star'],
    ['Risk','Solid Performer','Star'],
  ];
  return { col, row, label: labels[row][col] };
}

// ── Sprint T-Phase-1.2.5h-a · Multi-tenant key migration (Bucket C) ──────
// [JWT] GET /api/peoplepay/appraisal-cycles?entityCode={e}
export const appraisalCyclesKey = (e: string): string =>
  e ? `erp_appraisal_cycles_${e}` : 'erp_appraisal_cycles';
// [JWT] GET /api/peoplepay/performance-reviews?entityCode={e}
export const performanceReviewsKey = (e: string): string =>
  e ? `erp_performance_reviews_${e}` : 'erp_performance_reviews';
// [JWT] GET /api/peoplepay/comp-actions?entityCode={e}
export const compActionsKey = (e: string): string =>
  e ? `erp_comp_actions_${e}` : 'erp_comp_actions';
