/**
 * CustomerRewards.tsx — Sprint 13b · Module ch-t-rewards
 * Balance card · streak progression · rewards catalog · redeem flow.
 */

import { useEffect, useMemo, useState } from 'react';
import { Award, Gift, Flame, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatINR } from '@/lib/india-validations';
import {
  loyaltyLedgerKey, loyaltyStateKey, loyaltyRewardsKey,
  TIER_THRESHOLDS,
  type CustomerLoyaltyState, type LoyaltyLedgerEntry, type LoyaltyReward, type LoyaltyTier,
} from '@/types/customer-loyalty';
import {
  rebuildState, eligibleRewards, graceRemainingDays,
} from '@/lib/loyalty-engine';
import {
  customerStreakKey, STREAK_MILESTONES, type CustomerStreakState,
} from '@/types/customer-streak';
import { computeStreak, nextMilestone } from '@/lib/customer-streak-engine';
import {
  customerOrdersKey, type CustomerOrder,
} from '@/types/customer-order';
import { logAudit } from '@/lib/card-audit-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const ENTITY = DEFAULT_ENTITY_SHORTCODE;

const DEMO_REWARDS: LoyaltyReward[] = [
  { id: 'rw-100',  code: 'V100', title: '₹100 off voucher',     description: 'Apply on next order',  points_cost: 1000, reward_type: 'discount_voucher', value_paise: 10000, min_tier: 'bronze',   max_redeems_per_customer: null, active: true },
  { id: 'rw-500',  code: 'V500', title: '₹500 off voucher',     description: 'Apply on next order',  points_cost: 4500, reward_type: 'discount_voucher', value_paise: 50000, min_tier: 'silver',   max_redeems_per_customer: null, active: true },
  { id: 'rw-sam',  code: 'SAM',  title: 'Free 100g sample',     description: 'Try our newest item',  points_cost: 500,  reward_type: 'free_item',                            min_tier: 'bronze',   max_redeems_per_customer: 5,    active: true },
  { id: 'rw-del',  code: 'DEL',  title: 'Free delivery voucher',description: 'One free delivery',    points_cost: 800,  reward_type: 'discount_voucher', value_paise: 5000,  min_tier: 'bronze',   max_redeems_per_customer: 3,    active: true },
  { id: 'rw-2x',   code: '2X',   title: '2× points weekend',    description: 'Bonus earn for 48hrs', points_cost: 2000, reward_type: 'upgrade',                              min_tier: 'gold',     max_redeems_per_customer: 1,    active: true },
  { id: 'rw-1k',   code: 'V1K',  title: '₹1000 voucher (Plat)', description: 'Platinum-only reward', points_cost: 8000, reward_type: 'discount_voucher', value_paise: 100000,min_tier: 'platinum', max_redeems_per_customer: null, active: true },
];

const TIER_RANK: Record<LoyaltyTier, number> = { bronze: 0, silver: 1, gold: 2, platinum: 3 };

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; } catch { return []; }
}
function setLs<T>(k: string, v: T[]): void {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
}

function getCustomerId(): string {
  try {
    const raw = localStorage.getItem('4ds_login_credential');
    if (!raw) return 'cust-demo';
    const p = JSON.parse(raw);
    return `cust-${p.value ?? 'demo'}`;
  } catch { return 'cust-demo'; }
}

export function CustomerRewardsPanel() {
  const customerId = getCustomerId();
  const [state, setState] = useState<CustomerLoyaltyState | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [redemptionCounts, setRedemptionCounts] = useState<Map<string, number>>(new Map());
  const [streak, setStreak] = useState<CustomerStreakState | null>(null);
  const [confirming, setConfirming] = useState<LoyaltyReward | null>(null);

  // Hydrate
  useEffect(() => {
    // Seed rewards if empty
    let allRewards = ls<LoyaltyReward>(loyaltyRewardsKey(ENTITY));
    if (allRewards.length === 0) {
      allRewards = DEMO_REWARDS;
      setLs(loyaltyRewardsKey(ENTITY), allRewards);
    }
    setRewards(allRewards);

    const ledger = ls<LoyaltyLedgerEntry>(loyaltyLedgerKey(ENTITY));
    const states = ls<CustomerLoyaltyState>(loyaltyStateKey(ENTITY));
    const prev = states.find(s => s.customer_id === customerId) ?? null;
    setState(rebuildState(customerId, ENTITY, ledger, prev));

    // Redemption counts per reward
    const counts = new Map<string, number>();
    ledger
      .filter(e => e.customer_id === customerId && e.action === 'redeem_reward' && e.ref_type === 'reward')
      .forEach(e => {
        if (e.ref_id) counts.set(e.ref_id, (counts.get(e.ref_id) ?? 0) + 1);
      });
    setRedemptionCounts(counts);

    // Streak from orders
    const orders = ls<CustomerOrder>(customerOrdersKey(ENTITY))
      .filter(o => o.customer_id === customerId && o.placed_at)
      .map(o => ({ placed_at: o.placed_at as string }));
    const streakStates = ls<CustomerStreakState>(customerStreakKey(ENTITY));
    const prevStreak = streakStates.find(s => s.customer_id === customerId) ?? null;
    const fresh = computeStreak(customerId, ENTITY, orders, prevStreak);
    setStreak(fresh);
    // Persist updated streak
    const idx = streakStates.findIndex(s => s.customer_id === customerId);
    if (idx >= 0) streakStates[idx] = fresh; else streakStates.push(fresh);
    setLs(customerStreakKey(ENTITY), streakStates);
  }, [customerId]);

  const eligible = useMemo(
    () => state ? eligibleRewards(state, rewards, redemptionCounts) : [],
    [state, rewards, redemptionCounts],
  );
  const eligibleIds = useMemo(() => new Set(eligible.map(r => r.id)), [eligible]);

  const tier = state?.current_tier ?? 'bronze';
  const balance = state?.points_balance ?? 0;
  const grace = state ? graceRemainingDays(state) : null;
  const lifetime = state?.lifetime_points_earned ?? 0;
  const nextThreshold =
    tier === 'bronze'   ? TIER_THRESHOLDS.silver :
    tier === 'silver'   ? TIER_THRESHOLDS.gold :
    tier === 'gold'     ? TIER_THRESHOLDS.platinum :
    TIER_THRESHOLDS.platinum;
  const tierProgress = Math.min(100, Math.round((lifetime / nextThreshold) * 100));
  const pointsToNext = Math.max(0, nextThreshold - lifetime);

  const milestoneNext = streak ? nextMilestone(streak) : null;

  const doRedeem = (r: LoyaltyReward) => {
    const ledger = ls<LoyaltyLedgerEntry>(loyaltyLedgerKey(ENTITY));
    const now = new Date().toISOString();
    ledger.push({
      id: `lle-${Date.now()}`,
      entity_id: ENTITY, customer_id: customerId,
      action: 'redeem_reward',
      points_delta: -r.points_cost,
      ref_type: 'reward', ref_id: r.id,
      note: `Redeemed ${r.title}`,
      created_at: now,
      expires_at: null,
    });
    setLs(loyaltyLedgerKey(ENTITY), ledger);

    const states = ls<CustomerLoyaltyState>(loyaltyStateKey(ENTITY));
    const prev = states.find(s => s.customer_id === customerId) ?? null;
    const fresh = rebuildState(customerId, ENTITY, ledger, prev);
    setState(fresh);
    const sIdx = states.findIndex(s => s.customer_id === customerId);
    if (sIdx >= 0) states[sIdx] = fresh; else states.push(fresh);
    setLs(loyaltyStateKey(ENTITY), states);

    // Bump redemption count
    setRedemptionCounts(prev => {
      const m = new Map(prev);
      m.set(r.id, (m.get(r.id) ?? 0) + 1);
      return m;
    });

    logAudit({
      entityCode: ENTITY,
      userId: customerId,
      userName: customerId,
      cardId: 'customer-hub',
      moduleId: 'ch-t-rewards',
      action: 'voucher_post',
      refType: 'reward',
      refId: r.id,
      refLabel: `Redeemed ${r.title} (−${r.points_cost} pts)`,
    });

    toast.success(`Redeemed: ${r.title}`);
    setConfirming(null);
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-6xl">
      <header>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Gift className="h-5 w-5 text-teal-500" />
          Loyalty Rewards
        </h1>
      </header>

      {/* Balance card */}
      <Card className="p-5 bg-teal-500/5 border-teal-500/30">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
          <div>
            <p className="text-xs text-muted-foreground uppercase">Available points</p>
            <p className="text-4xl font-mono font-bold text-teal-700 dark:text-teal-300 mt-1">{balance}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="capitalize border-teal-500/40 text-teal-700 dark:text-teal-300">
                <Award className="h-3 w-3 mr-1" /> {tier}
              </Badge>
              {grace !== null && (
                <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">
                  Grace: {grace} days
                </Badge>
              )}
            </div>
            {tier !== 'platinum' && (
              <div className="mt-3 max-w-md">
                <Progress value={tierProgress} className="h-2" />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {pointsToNext} points to next tier
                </p>
              </div>
            )}
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-[11px] text-muted-foreground">Lifetime earned</p>
            <p className="font-mono text-sm font-semibold">{lifetime}</p>
            <p className="text-[11px] text-muted-foreground mt-2">Lifetime redeemed</p>
            <p className="font-mono text-sm font-semibold">{state?.lifetime_points_redeemed ?? 0}</p>
          </div>
        </div>
      </Card>

      {/* Streak card */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-500" />
            Monthly Streak
          </p>
          {streak?.grace_used && (
            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">
              Grace used
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase">Current</p>
            <p className="text-2xl font-mono font-bold text-teal-700 dark:text-teal-300">
              {streak?.current_streak_months ?? 0}<span className="text-xs font-normal text-muted-foreground"> mo</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase">Longest</p>
            <p className="text-2xl font-mono font-bold">
              {streak?.longest_streak_months ?? 0}<span className="text-xs font-normal text-muted-foreground"> mo</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase">Last Qualifying</p>
            <p className="text-sm font-mono mt-2">{streak?.last_qualifying_month || '—'}</p>
          </div>
        </div>
        {milestoneNext && (
          <p className="text-xs text-muted-foreground mb-3">
            <span className="font-semibold text-foreground">Next:</span> {milestoneNext.milestone.title} —
            <span className="font-mono"> {milestoneNext.months_to_go}</span> month(s) to go ·
            unlocks <span className="font-medium">{milestoneNext.milestone.description}</span>
          </p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {STREAK_MILESTONES.map(m => {
            const id = `ms-${m.months_required}-${m.kind}`;
            const unlocked = streak?.active_milestones.some(am => am.id === id) ?? false;
            return (
              <div
                key={id}
                className={`rounded-lg border p-2.5 ${unlocked ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border'}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold">{m.title}</p>
                  {unlocked
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{m.description}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Rewards catalog */}
      <div>
        <p className="text-sm font-semibold mb-2">Rewards Catalog</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rewards.filter(r => r.active).map(r => {
            const used = redemptionCounts.get(r.id) ?? 0;
            const isEligible = eligibleIds.has(r.id);
            const tierTooLow = TIER_RANK[tier] < TIER_RANK[r.min_tier];
            const exhausted = r.max_redeems_per_customer !== null && used >= r.max_redeems_per_customer;
            return (
              <Card key={r.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{r.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>
                  </div>
                  {r.value_paise && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">{formatINR(r.value_paise)}</Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <Badge variant="outline" className="text-[10px] capitalize">Min: {r.min_tier}</Badge>
                  {r.max_redeems_per_customer !== null && (
                    <Badge variant="outline" className="text-[10px]">
                      Used {used}/{r.max_redeems_per_customer}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="font-mono font-bold text-teal-700 dark:text-teal-300">{r.points_cost} pts</p>
                  <Button
                    size="sm"
                    disabled={!isEligible || exhausted || tierTooLow}
                    onClick={() => setConfirming(r)}
                    className="h-7 text-[11px] bg-teal-500 hover:bg-teal-600 text-white"
                  >
                    {tierTooLow ? 'Tier too low' : exhausted ? 'Exhausted' : !isEligible ? 'Not enough' : 'Redeem'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={!!confirming} onOpenChange={o => !o && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem {confirming?.title}?</DialogTitle>
            <DialogDescription>
              {confirming?.points_cost} points will be deducted from your balance.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>Cancel</Button>
            <Button
              onClick={() => confirming && doRedeem(confirming)}
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              Confirm Redeem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CustomerRewardsPanel;
