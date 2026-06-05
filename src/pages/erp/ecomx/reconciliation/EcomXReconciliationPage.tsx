/**
 * @file   src/pages/erp/ecomx/reconciliation/EcomXReconciliationPage.tsx
 * @sprint Sprint 154 · EcomX Money Suite · DP-EC-6/7 · three-way recon + variance dashboard
 */
import { useMemo, useState, useCallback } from 'react';
import { Scale, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listMarketplaces } from '@/lib/ecomx-engine';
import { runRecon, listReconRuns, listReconLines, createClaimFromLine } from '@/lib/ecomx-recon-engine';
import { Button } from '@/components/ui/button';
import type { EcVarianceClass } from '@/types/ecomx';
import { exportEcomxCsv } from '../lib/ecomx-csv';

const CLASS_LABEL: Record<EcVarianceClass, string> = {
  clean: 'Clean',
  short_pay: 'Short pay',
  over_pay: 'Over pay',
  return_adjustment: 'Return adj.',
  unmatched_settlement: 'Unmatched settlement',
  missing_settlement: 'Missing settlement',
};

export function EcomXReconciliationPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [mpId, setMpId] = useState('');
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [tolPaise, setTolPaise] = useState(100);
  const [tick, setTick] = useState(0);

  const marketplaces = useMemo(() => entityCode ? listMarketplaces(entityCode) : [], [entityCode]);
  const runs = useMemo(
    () => entityCode && mpId ? listReconRuns(entityCode, mpId) : [],
    [entityCode, mpId, tick],
  );
  const latestRun = runs.length > 0 ? runs[runs.length - 1] : null;
  const lines = useMemo(
    () => latestRun && entityCode ? listReconLines(entityCode, { runId: latestRun.id }) : [],
    [entityCode, latestRun, tick],
  );

  const onRun = useCallback(() => {
    if (!entityCode || !mpId) return;
    try {
      const run = runRecon(entityCode, mpId, from, to, tolPaise);
      toast.success(`Recon complete · ${Object.values(run.lineCounts).reduce((a, b) => a + b, 0)} lines`);
      setTick(x => x + 1);
    } catch (e) { toast.error((e as Error).message); }
  }, [entityCode, mpId, from, to, tolPaise]);

  const onClaim = useCallback((lineId: string) => {
    if (!entityCode) return;
    try {
      createClaimFromLine(entityCode, lineId, 'Raised from reconciliation page');
      toast.success('Claim created.');
      setTick(x => x + 1);
    } catch (e) { toast.error((e as Error).message); }
  }, [entityCode]);

  const onExport = useCallback(() => {
    const header: Array<string | number> = ['Order #', 'Class', 'Booked', 'Settled', 'Deductions', 'Net', 'Variance', 'Rate Note'];
    const body: Array<Array<string | number>> = lines.map(l => [
      l.marketplaceOrderId, l.varianceClass, l.bookedGross ?? '', l.settlementGross ?? '',
      l.deductions ?? '', l.netReceived ?? '', l.varianceAmount, l.rateAnomalyNote ?? '',
    ]);
    exportEcomxCsv([header, ...body], 'recon-lines');
  }, [lines]);

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select an entity.</div>;

  return (
    <div className="p-4 sm:p-6 md:p-10 animate-fade-in space-y-6">
      <header>
        <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2"><Scale className="h-5 w-5" /> Reconciliation</h1>
        <p className="text-sm text-muted-foreground mt-1">DP-EC-6 three-way · 6 variance classes · rate anomalies are NOTES only.</p>
      </header>

      <section className="glass-card rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Marketplace</label>
            <select className="w-full mt-1 px-2 py-2 rounded-md bg-background border border-border text-sm"
              value={mpId} onChange={(e) => setMpId(e.target.value)}>
              <option value="">Select…</option>
              {marketplaces.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">From</label>
            <input type="date" className="w-full mt-1 px-2 py-2 rounded-md bg-background border border-border text-sm"
              value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">To</label>
            <input type="date" className="w-full mt-1 px-2 py-2 rounded-md bg-background border border-border text-sm"
              value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tolerance (paise)</label>
            <input type="number" min={0} className="w-full mt-1 px-2 py-2 rounded-md bg-background border border-border text-sm font-mono"
              value={tolPaise} onChange={(e) => setTolPaise(Number(e.target.value) || 0)} />
          </div>
          <div className="flex items-end">
            <Button onClick={onRun} disabled={!mpId} className="w-full">Run reconciliation</Button>
          </div>
        </div>
      </section>

      {latestRun && (
        <section className="glass-card rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-3">Variance Dashboard · Run {latestRun.id.slice(-6)}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {(Object.entries(latestRun.lineCounts) as [EcVarianceClass, number][]).map(([k, v]) => (
              <div key={k} className="p-3 rounded-lg bg-muted/40">
                <div className="text-xs text-muted-foreground">{CLASS_LABEL[k]}</div>
                <div className="text-xl font-mono mt-1">{v}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            Total variance · <span className="font-mono">₹{latestRun.totalVariance.toFixed(2)}</span>
          </div>
        </section>
      )}

      {lines.length > 0 && (
        <section className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Recon Lines · {lines.length}</h2>
            <Button size="sm" variant="outline" onClick={onExport}>Export CSV</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2">Order #</th><th>Class</th>
                  <th className="text-right">Booked</th><th className="text-right">Settled</th>
                  <th className="text-right">Variance</th><th>Rate Note</th><th></th>
                </tr>
              </thead>
              <tbody>
                {lines.slice(0, 200).map(l => (
                  <tr key={l.id} className="border-b border-border/40">
                    <td className="font-mono py-1">{l.marketplaceOrderId}</td>
                    <td>{CLASS_LABEL[l.varianceClass]}</td>
                    <td className="text-right font-mono">{l.bookedGross?.toFixed(2) ?? '—'}</td>
                    <td className="text-right font-mono">{l.settlementGross?.toFixed(2) ?? '—'}</td>
                    <td className={`text-right font-mono ${l.varianceAmount < 0 ? 'text-destructive' : l.varianceAmount > 0 ? 'text-warning' : ''}`}>
                      {l.varianceAmount.toFixed(2)}
                    </td>
                    <td className="text-xs text-muted-foreground max-w-xs truncate">{l.rateAnomalyNote ?? ''}</td>
                    <td>
                      {!l.claimId && l.varianceClass !== 'clean' && (
                        <Button size="sm" variant="outline" onClick={() => onClaim(l.id)}>
                          <Plus className="h-3 w-3 mr-1" />Claim
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
