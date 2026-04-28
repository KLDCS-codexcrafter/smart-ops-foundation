/**
 * useCallQuality.ts — CRUD for criteria, reviews, coaching feedback
 * [JWT] /api/salesx/call-quality
 */
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type {
  QualityCriterion, CallReview, CoachingFeedback, CriterionScore,
} from '@/types/call-quality';
import {
  qualityCriteriaKey, callReviewsKey, coachingFeedbackKey,
} from '@/types/call-quality';

function ls<T>(k: string): T[] {
  try { return JSON.parse(localStorage.getItem(k) || '[]') as T[]; }
  catch { return []; }
}

export function useCallQuality(entityCode: string) {
  const cKey = qualityCriteriaKey(entityCode);
  const rKey = callReviewsKey(entityCode);
  const fKey = coachingFeedbackKey(entityCode);

  const [criteria, setCriteria] = useState<QualityCriterion[]>(() => ls<QualityCriterion>(cKey));
  const [reviews, setReviews] = useState<CallReview[]>(() => ls<CallReview>(rKey));
  const [feedback, setFeedback] = useState<CoachingFeedback[]>(() => ls<CoachingFeedback>(fKey));

  const persistCriteria = useCallback((next: QualityCriterion[]) => {
    // [JWT] PUT /api/salesx/call-quality/criteria
    localStorage.setItem(cKey, JSON.stringify(next));
    setCriteria(next);
  }, [cKey]);

  const persistReviews = useCallback((next: CallReview[]) => {
    // [JWT] PUT /api/salesx/call-quality/reviews
    localStorage.setItem(rKey, JSON.stringify(next));
    setReviews(next);
  }, [rKey]);

  const persistFeedback = useCallback((next: CoachingFeedback[]) => {
    // [JWT] PUT /api/salesx/call-quality/coaching
    localStorage.setItem(fKey, JSON.stringify(next));
    setFeedback(next);
  }, [fKey]);

  const saveCriterion = useCallback((
    data: Omit<QualityCriterion, 'id' | 'created_at' | 'updated_at'> & { id?: string },
  ) => {
    const now = new Date().toISOString();
    const list = ls<QualityCriterion>(cKey);
    if (data.id) {
      const idx = list.findIndex(c => c.id === data.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...data, id: data.id, updated_at: now };
    } else {
      list.push({ ...data, id: `qc-${Date.now()}`, created_at: now, updated_at: now });
    }
    persistCriteria(list);
    return list;
  }, [cKey, persistCriteria]);

  const deleteCriterion = useCallback((id: string) => {
    persistCriteria(ls<QualityCriterion>(cKey).filter(c => c.id !== id));
  }, [cKey, persistCriteria]);

  const saveReview = useCallback((
    data: Omit<CallReview, 'id' | 'created_at' | 'updated_at'> & { id?: string },
  ) => {
    const now = new Date().toISOString();
    const list = ls<CallReview>(rKey);
    if (data.id) {
      const idx = list.findIndex(r => r.id === data.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...data, id: data.id, updated_at: now };
    } else {
      list.push({ ...data, id: `rv-${Date.now()}`, created_at: now, updated_at: now });
    }
    persistReviews(list);
    return list;
  }, [rKey, persistReviews]);

  const deleteReview = useCallback((id: string) => {
    persistReviews(ls<CallReview>(rKey).filter(r => r.id !== id));
  }, [rKey, persistReviews]);

  const acknowledgeReview = useCallback((id: string) => {
    const now = new Date().toISOString();
    const list = ls<CallReview>(rKey).map(r =>
      r.id === id
        ? { ...r, agent_acknowledged: true, agent_acknowledged_at: now, updated_at: now }
        : r,
    );
    persistReviews(list);
    toast.success('Review acknowledged');
  }, [rKey, persistReviews]);

  const disputeReview = useCallback((id: string) => {
    const now = new Date().toISOString();
    const list = ls<CallReview>(rKey).map(r =>
      r.id === id
        ? { ...r, status: 'disputed' as const, updated_at: now }
        : r,
    );
    persistReviews(list);
    toast.success('Review disputed — supervisor notified');
  }, [rKey, persistReviews]);

  const saveFeedback = useCallback((
    data: Omit<CoachingFeedback, 'id' | 'created_at' | 'updated_at'> & { id?: string },
  ) => {
    const now = new Date().toISOString();
    const list = ls<CoachingFeedback>(fKey);
    if (data.id) {
      const idx = list.findIndex(f => f.id === data.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...data, id: data.id, updated_at: now };
    } else {
      list.push({ ...data, id: `cf-${Date.now()}`, created_at: now, updated_at: now });
    }
    persistFeedback(list);
    return list;
  }, [fKey, persistFeedback]);

  const deleteFeedback = useCallback((id: string) => {
    persistFeedback(ls<CoachingFeedback>(fKey).filter(f => f.id !== id));
  }, [fKey, persistFeedback]);

  const acknowledgeFeedback = useCallback((id: string, response?: string) => {
    const now = new Date().toISOString();
    const list = ls<CoachingFeedback>(fKey).map(f =>
      f.id === id
        ? { ...f, is_acknowledged: true, acknowledged_at: now,
            agent_response: response ?? f.agent_response, updated_at: now }
        : f,
    );
    persistFeedback(list);
    toast.success('Feedback acknowledged');
  }, [fKey, persistFeedback]);

  const computeWeightedScore = useCallback((scores: CriterionScore[]): number => {
    if (scores.length === 0) return 0;
    const totalWeight = scores.reduce((s, x) => s + x.weight_pct, 0);
    if (totalWeight === 0) return 0;
    const weighted = scores.reduce((s, x) => s + x.score * x.weight_pct, 0);
    return Math.round(weighted / totalWeight);
  }, []);

  const activeCriteria = useMemo(() =>
    criteria.filter(c => c.is_active).sort((a, b) => a.display_order - b.display_order),
  [criteria]);

  return {
    criteria, activeCriteria, reviews, feedback,
    saveCriterion, deleteCriterion,
    saveReview, deleteReview, acknowledgeReview, disputeReview,
    saveFeedback, deleteFeedback, acknowledgeFeedback,
    computeWeightedScore,
  };
}
