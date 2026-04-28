/**
 * gamification.ts — Telecaller gamification · Canvas Wave 4 (T-Phase-1.1.1h)
 * [JWT] GET/POST /api/salesx/gamification
 *
 * Points system, levels, badges, streaks, leaderboard.
 */

export interface PointsRule {
  call_made: number;
  call_interested: number;
  call_converted: number;
  call_callback: number;
  wa_template_sent: number;
  follow_up_on_time: number;
  daily_streak_day: number;
}

export const DEFAULT_POINTS_RULE: PointsRule = {
  call_made: 5,
  call_interested: 10,
  call_converted: 50,
  call_callback: 8,
  wa_template_sent: 3,
  follow_up_on_time: 15,
  daily_streak_day: 5,
};

export const LEVEL_THRESHOLDS: number[] = [
  0, 100, 300, 700, 1500, 3000, 6000, 12000, 25000, 50000,
];

export const LEVEL_NAMES: string[] = [
  'Rookie', 'Caller', 'Closer', 'Pro', 'Expert',
  'Veteran', 'Champion', 'Master', 'Legend', 'Operix Elite',
];

export function levelFromPoints(points: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (points >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return Math.min(level, 10);
}

export function pointsToNextLevel(points: number): { current: number; next: number; pct: number } {
  const lvl = levelFromPoints(points);
  if (lvl >= 10) return { current: points, next: points, pct: 100 };
  const currentBase = LEVEL_THRESHOLDS[lvl - 1];
  const nextBase = LEVEL_THRESHOLDS[lvl];
  const pct = Math.round(((points - currentBase) / (nextBase - currentBase)) * 100);
  return { current: points - currentBase, next: nextBase - currentBase, pct };
}

export type BadgeId =
  | 'first_call' | 'call_century' | 'call_500' | 'call_1000'
  | 'first_conversion' | 'conversion_10' | 'conversion_50'
  | 'wa_master' | 'streak_7' | 'streak_30'
  | 'early_bird' | 'night_owl' | 'team_player' | 'closer';

export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  { id: 'first_call',        name: 'First Steps',        description: 'Made your first call',                   icon: '👶', rarity: 'common' },
  { id: 'call_century',      name: 'Century',            description: 'Reached 100 calls',                      icon: '💯', rarity: 'uncommon' },
  { id: 'call_500',          name: 'Iron Voice',         description: '500 calls completed',                    icon: '📞', rarity: 'rare' },
  { id: 'call_1000',         name: 'Phone Maestro',      description: '1,000 calls — true dedication',          icon: '🎯', rarity: 'legendary' },
  { id: 'first_conversion',  name: 'First Win',          description: 'Closed your first conversion',           icon: '🎉', rarity: 'common' },
  { id: 'conversion_10',     name: 'Closer',             description: '10 conversions',                          icon: '🏆', rarity: 'uncommon' },
  { id: 'conversion_50',     name: 'Sales Surgeon',      description: '50 conversions',                          icon: '⭐', rarity: 'legendary' },
  { id: 'wa_master',         name: 'Template Wizard',    description: 'Sent 100 WhatsApp templates',             icon: '💬', rarity: 'rare' },
  { id: 'streak_7',          name: 'Consistent',         description: '7-day calling streak',                    icon: '🔥', rarity: 'uncommon' },
  { id: 'streak_30',         name: 'Unstoppable',        description: '30-day calling streak',                   icon: '🚀', rarity: 'legendary' },
  { id: 'early_bird',        name: 'Early Bird',         description: 'First call before 9 AM',                  icon: '🌅', rarity: 'common' },
  { id: 'night_owl',         name: 'Night Owl',          description: 'Calling past 8 PM',                       icon: '🦉', rarity: 'common' },
  { id: 'team_player',       name: 'Team Player',        description: '10 callbacks scheduled',                  icon: '🤝', rarity: 'uncommon' },
  { id: 'closer',            name: 'Hat-trick',          description: '5 conversions in a single day',           icon: '⚡', rarity: 'rare' },
];

export interface AgentProfile {
  id: string;
  entity_id: string;
  telecaller_id: string;
  telecaller_name: string;
  total_points: number;
  level: number;
  earned_badges: BadgeId[];
  current_streak_days: number;
  longest_streak_days: number;
  last_active_date: string | null;
  lifetime_calls: number;
  lifetime_conversions: number;
  lifetime_wa_sent: number;
  fy_points: number;
  fy_calls: number;
  fy_conversions: number;
  created_at: string;
  updated_at: string;
}

export interface PointsTransaction {
  id: string;
  entity_id: string;
  telecaller_id: string;
  points: number;
  reason: keyof PointsRule | 'manual_adjustment' | 'badge_unlock';
  source_type: 'call_session' | 'wa_send' | 'follow_up' | 'streak' | 'manual';
  source_id: string | null;
  awarded_at: string;
  created_at: string;
}

export const agentProfilesKey = (e: string) => `erp_agent_profiles_${e}`;
export const pointsTransactionsKey = (e: string) => `erp_points_transactions_${e}`;
export const pointsRuleKey = (e: string) => `erp_points_rule_${e}`;
