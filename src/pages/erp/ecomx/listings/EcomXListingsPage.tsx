/**
 * @file   src/pages/erp/ecomx/listings/EcomXListingsPage.tsx
 * @sprint Sprint 153 · EcomX · listings registry (simple + kit)
 */
import { useMemo, useState } from 'react';
import { Boxes } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listListings, listMarketplaces } from '@/lib/ecomx-engine';

export function EcomXListingsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [filter, setFilter] = useState<string>('');
  const marketplaces = useMemo(() => entityCode ? listMarketplaces(entityCode) : [], [entityCode]);
  const rows = useMemo(() => entityCode ? listListings(entityCode, filter || undefined) : [], [entityCode, filter]);

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select an entity.</div>;

  return (
    <div className="p-4 sm:p-6 md:p-10 animate-fade-in space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2"><Boxes className="h-5 w-5" /> Listings</h1>
          <p className="text-sm text-muted-foreground mt-1">DP-EC-3 · simple = 1 PIM item · kit = 1..N components (qty multiplies at ingest).</p>
        </div>
        <select
          className="px-3 py-2 rounded-lg bg-background border border-border text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All marketplaces</option>
          {marketplaces.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </header>

      <section className="glass-card rounded-2xl p-4">
        {rows.length === 0 ? (
          <div className="text-xs text-muted-foreground p-6 text-center">
            No listings yet. Create via the Unmapped SKU inbox after the first import, or use the engine API.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2">SKU</th>
                  <th className="text-left">Title</th>
                  <th className="text-left">Kind</th>
                  <th className="text-left">Status</th>
                  <th className="text-right">Components</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className="border-b border-border/40">
                    <td className="py-2 font-mono text-xs">{l.marketplaceSku}</td>
                    <td>{l.title}</td>
                    <td>{l.kind}</td>
                    <td>{l.status}</td>
                    <td className="text-right font-mono">{l.kind === 'kit' ? l.components.length : 1}</td>
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
