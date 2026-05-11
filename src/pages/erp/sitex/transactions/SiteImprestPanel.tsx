/**
 * @file        src/pages/erp/sitex/transactions/SiteImprestPanel.tsx
 * @purpose     Site Imprest UI · Live Gauge OOB #7 · replenishment workflow · transaction log
 * @sprint      T-Phase-1.A.15a · Q-LOCK-2a · Block A.3
 */
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PiggyBank } from 'lucide-react';
import {
  getImprestBySite, replenishImprest, approveReplenishment,
  listImprestTransactions, createImprest, computeImprestHealthMetrics,
} from '@/lib/sitex-imprest-engine';
import { listSites } from '@/lib/sitex-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import type { SiteImprest } from '@/types/sitex';

interface Props { onNavigate: (m: string) => void }

export function SiteImprestPanel({ onNavigate: _onNavigate }: Props): JSX.Element {
  const entity = DEFAULT_ENTITY_SHORTCODE;
  const sites = useMemo(() => listSites(entity), [entity]);
  const [siteId, setSiteId] = useState<string>(sites[0]?.id ?? '');
  const [imprest, setImprest] = useState<SiteImprest | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!siteId) return;
    let i = getImprestBySite(entity, siteId);
    if (!i) {
      const site = sites.find((s) => s.id === siteId);
      i = createImprest(entity, siteId, site?.branch_id ?? '', site?.imprest_limit ?? 100000);
    }
    setImprest(i);
  }, [siteId, refresh, sites, entity]);

  const metrics = imprest ? computeImprestHealthMetrics(entity, siteId) : null;
  const utilPct = metrics?.utilization_pct ?? 0;
  const gaugeColor = utilPct < 70 ? 'bg-success' : utilPct < 90 ? 'bg-warning' : 'bg-destructive';

  const handleReplenish = (): void => {
    if (!imprest || !amount) return;
    const req = {
      id: `REQ-${Date.now()}`,
      imprest_id: imprest.id,
      site_id: siteId,
      amount_requested: Number(amount),
      reason,
      status: 'pending' as const,
      requested_by: 'demo-user',
      requested_at: new Date().toISOString(),
      approved_by: null,
      approved_at: null,
      bd_ledger_voucher_id: null,
    };
    const r = replenishImprest(entity, req);
    if (r.allowed && r.replenishment_id) {
      approveReplenishment(entity, r.replenishment_id, 'demo-approver');
      setAmount('');
      setReason('');
      setRefresh((x) => x + 1);
    }
  };

  const txns = imprest ? listImprestTransactions(entity, imprest.id) : [];

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <PiggyBank className="h-6 w-6 text-amber-600" />
        <h1 className="text-2xl font-bold">Site Imprest · Live Gauge</h1>
      </div>

      <Card className="p-4">
        <label className="text-sm font-medium block mb-2">Site</label>
        <select className="w-full border rounded-lg px-3 py-2 bg-background"
          value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          <option value="">Select site...</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.site_code} · {s.site_name}</option>)}
        </select>
      </Card>

      {imprest && (
        <Card className="p-6 space-y-4">
          <div className="flex justify-between items-baseline">
            <div>
              <div className="text-sm text-muted-foreground">Current Balance</div>
              <div className="text-3xl font-bold font-mono">₹{imprest.current_balance.toLocaleString('en-IN')}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Limit</div>
              <div className="text-xl font-mono">₹{imprest.imprest_limit.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Utilization</span>
              <Badge variant="outline" className={gaugeColor}>{utilPct.toFixed(1)}%</Badge>
            </div>
            <Progress value={Math.min(100, utilPct)} className="h-3" />
          </div>
          <div className="text-xs text-muted-foreground">
            Days since replenishment: {metrics?.days_since_replenishment} · 30-day volume: ₹{(metrics?.txn_volume_30d ?? 0).toLocaleString('en-IN')}
          </div>
        </Card>
      )}

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Request Replenishment</h2>
        <Input placeholder="Amount (₹)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button onClick={handleReplenish} disabled={!imprest || !amount}>Submit & Auto-Approve (demo)</Button>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-3">Transaction Log</h2>
        {txns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {txns.slice().reverse().map((t) => (
              <div key={t.id} className="flex justify-between border-b pb-2">
                <div>
                  <Badge variant="outline">{t.txn_type}</Badge>
                  <span className="ml-2 text-muted-foreground">{new Date(t.posted_at).toLocaleString('en-IN')}</span>
                </div>
                <div className="font-mono">₹{t.amount.toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
