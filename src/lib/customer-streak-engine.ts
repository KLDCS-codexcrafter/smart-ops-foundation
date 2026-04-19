/**
 * customer-streak-engine.ts — Monthly ordering streak with grace
 * Out-of-box #2. Pure engine — no React, no localStorage.
 */

import type { CustomerStreakState, StreakMilestone } from '@/types/customer-streak';
import { STREAK_MILESTONES } from '@/types/customer-streak';

interface OrderLite { placed_at: string; }

function monthKey(iso: string): string {
  return iso.slice(0, 7);   // YYYY-MM
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function computeStreak(
  customerId: string, entityCode: string,
  orders: OrderLite[], existing: CustomerStreakState | null,
  now: Date = new Date(),
): CustomerStreakState {
  if (orders.length === 0) {
    return existing ?? {
      entity_id: entityCode, customer_id: customerId,
      current_streak_months: 0, longest_streak_months: 0,
      last_qualifying_month: '',
      grace_used: false,
      active_milestones: [],
      updated_at: now.toISOString(),
    };
  }

  // Build set of months with at least 1 order
  const orderedMonths = new Set(orders.map(o => monthKey(o.placed_at)));

  // Walk backwards from current month, count consecutive months present
  // Allow 1 gap if grace not used
  let cursor = monthKey(now.toISOString());
  let streak = 0;
  let graceUsed = false;

  while (true) {
    if (orderedMonths.has(cursor)) {
      streak++;
    } else {
      if (!graceUsed && streak > 0) {
        graceUsed = true;  // forgive one gap
      } else {
        break;
      }
    }
    cursor = prevMonth(cursor);
    if (streak > 48) break;  // safety cap
  }

  const longest = Math.max(streak, existing?.longest_streak_months ?? 0);

  // Check new milestones unlocked
  const activeMilestoneIds = new Set(existing?.active_milestones.map(m => m.id) ?? []);
  const newMilestones: StreakMilestone[] = [];
  for (const m of STREAK_MILESTONES) {
    const id = `ms-${m.months_required}-${m.kind}`;
    if (streak >= m.months_required && !activeMilestoneIds.has(id)) {
      newMilestones.push({
        id, months_required: m.months_required,
        title: m.title, description: m.description,
        kind: m.kind, value: m.value,
        unlocked_at: now.toISOString(),
      });
    }
  }

  return {
    entity_id: entityCode, customer_id: customerId,
    current_streak_months: streak,
    longest_streak_months: longest,
    last_qualifying_month: Array.from(orderedMonths).sort().reverse()[0] ?? '',
    grace_used: graceUsed,
    active_milestones: [...(existing?.active_milestones ?? []), ...newMilestones],
    updated_at: now.toISOString(),
  };
}

/** Next milestone + months remaining (for UI nudge). */
export function nextMilestone(streak: CustomerStreakState): {
  milestone: typeof STREAK_MILESTONES[number]; months_to_go: number;
} | null {
  const next = STREAK_MILESTONES.find(m => m.months_required > streak.current_streak_months);
  if (!next) return null;
  return {
    milestone: next,
    months_to_go: next.months_required - streak.current_streak_months,
  };
}
