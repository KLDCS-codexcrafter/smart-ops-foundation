/**
 * call-quality.ts — Call quality scoring + coaching · Canvas Wave 5 (T-Phase-1.1.1i)
 * [JWT] GET/POST/PUT/DELETE /api/salesx/call-quality
 */

export interface QualityCriterion {
  id: string;
  entity_id: string;
  criterion_code: string;
  criterion_name: string;
  description: string | null;
  weight_pct: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CriterionScore {
  criterion_id: string;
  criterion_code: string;
  criterion_name: string;
  weight_pct: number;
  score: number;
  comment: string | null;
}

export type ReviewStatus = 'pending' | 'in_review' | 'completed' | 'disputed';

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending:   'Pending Review',
  in_review: 'In Review',
  completed: 'Completed',
  disputed:  'Disputed by Agent',
};

export const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  pending:   'bg-amber-500/15 text-amber-700 border-amber-500/30',
  in_review: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  completed: 'bg-green-500/15 text-green-700 border-green-500/30',
  disputed:  'bg-red-500/15 text-red-700 border-red-500/30',
};

export interface CallReview {
  id: string;
  entity_id: string;
  call_session_id: string;
  call_session_no: string;
  telecaller_id: string;
  telecaller_name: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewed_at: string;
  scores: CriterionScore[];
  total_score: number;
  status: ReviewStatus;
  overall_comment: string | null;
  agent_acknowledged: boolean;
  agent_acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CoachingActionStatus = 'open' | 'in_progress' | 'done' | 'dropped';

export interface CoachingActionItem {
  id: string;
  text: string;
  due_date: string | null;
  status: CoachingActionStatus;
  completed_at: string | null;
}

export interface CoachingFeedback {
  id: string;
  entity_id: string;
  review_id: string | null;
  telecaller_id: string;
  telecaller_name: string;
  coach_id: string;
  coach_name: string;
  feedback_date: string;
  strengths: string;
  improvements: string;
  action_items: CoachingActionItem[];
  agent_response: string | null;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
}

export const qualityCriteriaKey = (e: string) => `erp_quality_criteria_${e}`;
export const callReviewsKey = (e: string) => `erp_call_reviews_${e}`;
export const coachingFeedbackKey = (e: string) => `erp_coaching_feedback_${e}`;
