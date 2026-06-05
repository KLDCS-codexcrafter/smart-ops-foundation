/**
 * @file   src/pages/erp/ecomx/claims/EcomXClaimsPage.tsx
 * @sprint Sprint 154 · EcomX Money Suite · DP-EC-7 · claims register (append-only history)
 */
import { useMemo, useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listMarketplaces } from '@/lib/ecomx-engine';
import { listClaims, updateClaimStatus, getClaimsStats } from '@/lib/ecomx-recon-engine';
import { Button } from '@/components/ui/button';
import type { EcClaimStatus } from '@/types/ecomx';

const STATUSES: EcClaimStatus[] = ['open', 'raised', 'settled', 'rejected'];

export function EcomXClaimsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [mpId, setMpId] = useState('');
  const [statusFilter, setStatusFilter] = useState<EcClaimStatus | ''>('');
  const [tick, setTick] = useState(0);

  const marketplaces = useMemo(() => entityCode ? listMarketplaces(entityCode) : [], [entityCode]);
  const claims = useMemo(() => {
    if (!entityCode) return [];
    return listClaims(entityCode, {
      ...(mpId ? { marketplaceId: mpId } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, mpId, statusFilter, tick]);
  const stats = useMemo(
    () => entityCode ? getClaimsStats(entityCode, mpId || undefined) : { openCount: 0, openAmount: 0, recoveredAmount: 0, totalAmount: 0 },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, mpId, tick],
  );

  const onTransition = useCallback((claimId: string, next: EcClaimStatus) => {
    if (!entityCode) return;
    const note = window.prompt(`Mandatory note for status → ${next}:`)?.trim();
    if (!note) { toast.error('Note is mandatory.'); return; }
    try {
      updateClaimStatus(entityCode, claimId, { status: next, note });
      toast.success('Claim updated.');
      setTick(x => x + 1);
    } catch (e) { toast.error((e as Error).message); }
  }, [entityCode]);

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select an entity.</div>;

  return (
    <div className="p-4 sm:p-6 md:p-10 animate-fade-in space-y-6">
      <header>
        <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Claims</h1>
        <p className="text-sm text-muted-foreground mt-1">DP-EC-7 · recover every rupee · statusHistory is append-only.</p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-2xl p-4"><div className="text-xs text-muted-foreground">Open</div><div className="text-xl font-mono mt-1">{stats.openCount}</div></div>
        <div className="glass-card rounded-2xl p-4"><div className="text-xs text-muted-foreground">Open ₹</div><div className="text-xl font-mono mt-1">{stats.openAmount.toFixed(2)}</div></div>
        <div className="glass-card rounded-2xl p-4"><div className="text-xs text-muted-foreground">Recovered ₹</div><div className="text-xl font-mono mt-1 text-success">{stats.recoveredAmount.toFixed(2)}</div></div>
        <div className="glass-card rounded-2xl p-4"><div className="text-xs text-muted-foreground">Total ₹</div><div className="text-xl font-mono mt-1">{stats.totalAmount.toFixed(2)}</div></div>
      </section>

      <div className="flex flex-wrap gap-2">
        <select className="px-2 py-1 rounded-md bg-background border border-border text-xs"
          value={mpId} onChange={(e) => setMpId(e.target.value)}>
          <option value="">All marketplaces</option>
          {marketplaces.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="px-2 py-1 rounded-md bg-background border border-border text-xs"
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as EcClaimStatus | '')}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <section className="glass-card rounded-2xl p-4">
        {claims.length === 0 ? (
          <div className="text-xs text-muted-foreground p-6 text-center">No claims in this view.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2">Order #</th><th>Reason</th>
                  <th className="text-right">Amount</th><th className="text-right">Recovered</th>
                  <th>Status</th><th>History</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map(c => (
                  <tr key={c.id} className="border-b border-border/40">
                    <td className="py-1 font-mono">{c.marketplaceOrderId}</td>
                    <td className="max-w-xs truncate">{c.reason}</td>
                    <td className="text-right font-mono">{c.amount.toFixed(2)}</td>
                    <td className="text-right font-mono text-success">{c.recoveredAmount.toFixed(2)}</td>
                    <td>{c.status}</td>
                    <td className="font-mono">{c.statusHistory.length}</td>
                    <td>
                      <div className="flex gap-1">
                        {STATUSES.filter(s => s !== c.status).map(s => (
                          <Button key={s} size="sm" variant="outline" className="text-xs h-6 px-2"
                            onClick={() => onTransition(c.id, s)}>{s}</Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
