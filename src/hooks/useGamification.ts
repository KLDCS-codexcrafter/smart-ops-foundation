/**
 * useGamification.ts — XP, levels, badges, leaderboard
 * [JWT] /api/salesx/gamification
 */
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type {
  AgentProfile, PointsTransaction, BadgeId, PointsRule,
} from '@/types/gamification';
import {
  agentProfilesKey, pointsTransactionsKey, pointsRuleKey,
  DEFAULT_POINTS_RULE, BADGE_CATALOG, levelFromPoints,
} from '@/types/gamification';

function ls<T>(k: string): T[] {
  try { return JSON.parse(localStorage.getItem(k) || '[]') as T[]; }
  catch { return []; }
}

function lsObj<T>(k: string, def: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) as T : def;
  } catch { return def; }
}

const todayISO = () => new Date().toISOString().split('T')[0];

export function useGamification(entityCode: string) {
  const pKey = agentProfilesKey(entityCode);
  const tKey = pointsTransactionsKey(entityCode);
  const rKey = pointsRuleKey(entityCode);

  const [profiles, setProfiles] = useState<AgentProfile[]>(() => ls<AgentProfile>(pKey));
  const [transactions, setTransactions] = useState<PointsTransaction[]>(() => ls<PointsTransaction>(tKey));
  const [rule, setRule] = useState<PointsRule>(() => lsObj<PointsRule>(rKey, DEFAULT_POINTS_RULE));

  const persistProfiles = useCallback((next: AgentProfile[]) => {
    // [JWT] POST /api/salesx/agent-profiles
    localStorage.setItem(pKey, JSON.stringify(next));
    setProfiles(next);
  }, [pKey]);

  const persistTransactions = useCallback((next: PointsTransaction[]) => {
    // [JWT] POST /api/salesx/points-transactions
    localStorage.setItem(tKey, JSON.stringify(next));
    setTransactions(next);
  }, [tKey]);

  const updateRule = useCallback((next: PointsRule) => {
    // [JWT] POST /api/salesx/points-rule
    localStorage.setItem(rKey, JSON.stringify(next));
    setRule(next);
  }, [rKey]);

  const ensureProfile = useCallback((
    telecallerId: string,
    telecallerName: string,
  ): AgentProfile => {
    const list = ls<AgentProfile>(pKey);
    const existing = list.find(p => p.telecaller_id === telecallerId);
    if (existing) return existing;
    const now = new Date().toISOString();
    const fresh: AgentProfile = {
      id: `prof-${Date.now()}-${telecallerId}`,
      entity_id: entityCode,
      telecaller_id: telecallerId, telecaller_name: telecallerName,
      total_points: 0, level: 1,
      earned_badges: [],
      current_streak_days: 0, longest_streak_days: 0, last_active_date: null,
      lifetime_calls: 0, lifetime_conversions: 0, lifetime_wa_sent: 0,
      fy_points: 0, fy_calls: 0, fy_conversions: 0,
      created_at: now, updated_at: now,
    };
    persistProfiles([...list, fresh]);
    return fresh;
  }, [pKey, entityCode, persistProfiles]);

  const awardPoints = useCallback((
    telecallerId: string,
    telecallerName: string,
    points: number,
    reason: PointsTransaction['reason'],
    sourceType: PointsTransaction['source_type'],
    sourceId: string | null,
    metadata?: { isConversion?: boolean; isWaSend?: boolean; callTime?: Date },
  ) => {
    const today = todayISO();
    const now = new Date().toISOString();
    const profList = ls<AgentProfile>(pKey);
    let profile = profList.find(p => p.telecaller_id === telecallerId);
    if (!profile) {
      profile = ensureProfile(telecallerId, telecallerName);
    }
    let newStreak = profile.current_streak_days;
    let newLongest = profile.longest_streak_days;
    if (profile.last_active_date !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      newStreak = profile.last_active_date === yesterday ? profile.current_streak_days + 1 : 1;
      newLongest = Math.max(newLongest, newStreak);
    }
    const updated: AgentProfile = {
      ...profile,
      total_points: profile.total_points + points,
      fy_points: profile.fy_points + points,
      lifetime_calls: profile.lifetime_calls + (sourceType === 'call_session' ? 1 : 0),
      lifetime_conversions: profile.lifetime_conversions + (metadata?.isConversion ? 1 : 0),
      lifetime_wa_sent: profile.lifetime_wa_sent + (metadata?.isWaSend ? 1 : 0),
      fy_calls: profile.fy_calls + (sourceType === 'call_session' ? 1 : 0),
      fy_conversions: profile.fy_conversions + (metadata?.isConversion ? 1 : 0),
      current_streak_days: newStreak,
      longest_streak_days: newLongest,
      last_active_date: today,
      updated_at: now,
    };
    updated.level = levelFromPoints(updated.total_points);
    const newBadges: BadgeId[] = [];
    const has = (b: BadgeId) => updated.earned_badges.includes(b);
    if (!has('first_call') && updated.lifetime_calls >= 1) newBadges.push('first_call');
    if (!has('call_century') && updated.lifetime_calls >= 100) newBadges.push('call_century');
    if (!has('call_500') && updated.lifetime_calls >= 500) newBadges.push('call_500');
    if (!has('call_1000') && updated.lifetime_calls >= 1000) newBadges.push('call_1000');
    if (!has('first_conversion') && updated.lifetime_conversions >= 1) newBadges.push('first_conversion');
    if (!has('conversion_10') && updated.lifetime_conversions >= 10) newBadges.push('conversion_10');
    if (!has('conversion_50') && updated.lifetime_conversions >= 50) newBadges.push('conversion_50');
    if (!has('wa_master') && updated.lifetime_wa_sent >= 100) newBadges.push('wa_master');
    if (!has('streak_7') && updated.current_streak_days >= 7) newBadges.push('streak_7');
    if (!has('streak_30') && updated.current_streak_days >= 30) newBadges.push('streak_30');
    if (metadata?.callTime) {
      const h = metadata.callTime.getHours();
      if (!has('early_bird') && h < 9) newBadges.push('early_bird');
      if (!has('night_owl') && h >= 20) newBadges.push('night_owl');
    }
    updated.earned_badges = [...updated.earned_badges, ...newBadges];

    newBadges.forEach(bId => {
      const def = BADGE_CATALOG.find(b => b.id === bId);
      if (def) toast.success(`🎉 Badge unlocked: ${def.name}`);
    });

    const newProfList = profList.find(p => p.id === updated.id)
      ? profList.map(p => p.id === updated.id ? updated : p)
      : [...profList, updated];
    persistProfiles(newProfList);

    const txn: PointsTransaction = {
      id: `pt-${Date.now()}`,
      entity_id: entityCode,
      telecaller_id: telecallerId,
      points, reason, source_type: sourceType, source_id: sourceId,
      awarded_at: now, created_at: now,
    };
    persistTransactions([...ls<PointsTransaction>(tKey), txn]);
    return { profile: updated, newBadges };
  }, [pKey, tKey, entityCode, ensureProfile, persistProfiles, persistTransactions]);

  const leaderboard = useMemo(() =>
    [...profiles].sort((a, b) => b.total_points - a.total_points),
  [profiles]);

  const getLeaderboardForPeriod = useCallback((period: 'today' | 'week' | 'month') => {
    const now = Date.now();
    const cutoff = period === 'today'
      ? now - 86400000
      : period === 'week'
        ? now - 7 * 86400000
        : now - 30 * 86400000;
    const map = new Map<string, number>();
    transactions
      .filter(t => new Date(t.awarded_at).getTime() >= cutoff)
      .forEach(t => map.set(t.telecaller_id, (map.get(t.telecaller_id) ?? 0) + t.points));
    return profiles
      .map(p => ({ ...p, period_points: map.get(p.telecaller_id) ?? 0 }))
      .filter(p => p.period_points > 0)
      .sort((a, b) => b.period_points - a.period_points);
  }, [profiles, transactions]);

  return {
    profiles, transactions, rule,
    ensureProfile, awardPoints, updateRule,
    leaderboard, getLeaderboardForPeriod,
  };
}
