/**
 * @file   src/pages/erp/ecomx/returns/EcomXReturnsPage.tsx
 * @sprint Sprint 154 · EcomX Money Suite · DP-EC-8 · returns register
 */
import { useMemo, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listMarketplaces } from '@/lib/ecomx-engine';
import { listReturns } from '@/lib/ecomx-recon-engine';

export function EcomXReturnsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [mpId, setMpId] = useState('');

  const marketplaces = useMemo(() => entityCode ? listMarketplaces(entityCode) : [], [entityCode]);
  const rows = useMemo(
    () => entityCode ? listReturns(entityCode, mpId ? { marketplaceId: mpId } : undefined) : [],
    [entityCode, mpId],
  );

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select an entity.</div>;

  return (
    <div className="p-4 sm:p-6 md:p-10 animate-fade-in space-y-6">
      <header>
        <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2"><Undo2 className="h-5 w-5" /> Returns</h1>
        <p className="text-sm text-muted-foreground mt-1">DP-EC-8 · facility label is free-text (entered manually — Inventory Hub live link is a Phase-2 seam).</p>
      </header>

      <select className="px-2 py-1 rounded-md bg-background border border-border text-xs"
        value={mpId} onChange={(e) => setMpId(e.target.value)}>
        <option value="">All marketplaces</option>
        {marketplaces.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>

      <section className="glass-card rounded-2xl p-4">
        {rows.length === 0 ? (
          <div className="text-xs text-muted-foreground p-6 text-center">No returns yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2">Order #</th><th>Kind</th><th>Facility</th><th>Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-border/40">
                    <td className="py-1 font-mono">{r.marketplaceOrderId}</td>
                    <td>{r.kind}</td>
                    <td className="text-muted-foreground">{r.facilityLabel}</td>
                    <td className="font-mono">{r.createdAt.slice(0, 10)}</td>
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
