/**
 * MobileCustomerRewardsPage.tsx — Loyalty rewards (mobile)
 * Sprint T-Phase-1.1.1l-d · Reads loyaltyStateKey + loyaltyRewardsKey.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Gift, Sparkles } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import {
  type LoyaltyReward, type CustomerLoyaltyState,
  loyaltyStateKey, loyaltyRewardsKey,
} from '@/types/customer-loyalty';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MobileCustomerRewardsPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const myState = useMemo<CustomerLoyaltyState | null>(() => {
    if (!session) return null;
    const states = loadList<CustomerLoyaltyState>(loyaltyStateKey(session.entity_code));
    return states.find(s => s.customer_id === session.user_id) ?? null;
  }, [session]);

  const rewards = useMemo<LoyaltyReward[]>(() => {
    if (!session) return [];
    return loadList<LoyaltyReward>(loyaltyRewardsKey(session.entity_code)).filter(r => r.active);
  }, [session]);

  if (!session) return null;

  const balance = myState?.points_balance ?? 0;
  const tier = myState?.tier ?? 'bronze';

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Rewards</h1>
      </div>

      <Card className="p-4 bg-amber-500/5 border-amber-500/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Points Balance</p>
            <p className="text-2xl font-mono font-bold text-amber-700">{balance.toLocaleString('en-IN')}</p>
          </div>
          <Badge variant="outline" className="uppercase">{tier}</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Earn more by placing orders
        </p>
      </Card>

      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        Available Rewards ({rewards.length})
      </p>
      {rewards.length === 0 ? (
        <Card className="p-6 text-center">
          <Gift className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No rewards available</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {rewards.map(r => (
            <Card key={r.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{r.description}</p>
                  {r.value_paise && <p className="text-[10px] text-green-700 font-mono mt-1">Worth {fmtINR(r.value_paise)}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-bold">{r.points_cost.toLocaleString('en-IN')}</p>
                  <p className="text-[9px] text-muted-foreground">points</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
