/**
 * @file   src/pages/erp/ecomx/unmapped/EcomXUnmappedPage.tsx
 * @sprint Sprint 153 · EcomX · unmapped SKU inbox (DP-EC-4)
 */
import { useMemo, useState } from 'react';
import { Inbox } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listUnmappedSkus } from '@/lib/ecomx-engine';

export function EcomXUnmappedPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tick] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => entityCode ? listUnmappedSkus(entityCode) : [], [entityCode, tick]);

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select an entity.</div>;
  return (
    <div className="p-4 sm:p-6 md:p-10 animate-fade-in space-y-6">
      <header>
        <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2"><Inbox className="h-5 w-5" /> Unmapped SKUs</h1>
        <p className="text-sm text-muted-foreground mt-1">Honest triad: unknown SKUs are never silently dropped — every occurrence is counted here.</p>
      </header>
      <section className="glass-card rounded-2xl p-4">
        {rows.length === 0 ? (
          <div className="text-xs text-muted-foreground p-6 text-center">Inbox empty.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2">SKU</th>
                  <th className="text-left">Sample title</th>
                  <th className="text-right">Occurrences</th>
                  <th className="text-left">First seen</th>
                  <th className="text-left">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-b border-border/40">
                    <td className="py-2 font-mono text-xs">{u.marketplaceSku}</td>
                    <td>{u.sampleTitle || '—'}</td>
                    <td className="text-right font-mono">{u.occurrences}</td>
                    <td className="text-xs text-muted-foreground">{u.firstSeenAt.slice(0, 10)}</td>
                    <td>{u.resolvedListingId ? 'yes' : '—'}</td>
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
