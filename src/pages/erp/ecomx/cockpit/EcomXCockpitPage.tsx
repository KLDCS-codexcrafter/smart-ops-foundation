/**
 * @file   src/pages/erp/ecomx/cockpit/EcomXCockpitPage.tsx
 * @sprint Sprint 155 · EcomX Cockpit · DP-EC-10 · pure read aggregation UI
 */
import { useMemo, useState } from 'react';
import { LayoutDashboard } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { buildEcomxCockpit, defaultCockpitPeriod } from '@/lib/ecomx-cockpit-engine';

export function EcomXCockpitPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const init = defaultCockpitPeriod(new Date().toISOString());
  const [from, setFrom] = useState(init.periodFrom);
  const [to, setTo] = useState(init.periodTo);

  const cockpit = useMemo(
    () => (entityCode ? buildEcomxCockpit(entityCode, from, to) : null),
    [entityCode, from, to],
  );

  if (!entityCode) {
    return <div className="p-6 text-sm text-muted-foreground">Select an entity to view the EcomX Cockpit.</div>;
  }
  if (!cockpit) return <div className="p-6" />;

  const t = cockpit.totals;
  const tiles: Array<{ label: string; value: string | number }> = [
    { label: 'Orders Booked',     value: t.ordersBooked },
    { label: 'Gross Booked ₹',    value: t.grossBooked.toFixed(2) },
    { label: 'Returned',          value: t.returned },
    { label: 'Parked B2B',        value: t.parkedB2B },
    { label: 'Unmapped SKUs',     value: t.unmappedSkus },
    { label: 'TDS 194-O ₹',       value: t.tds194oCredit.toFixed(2) },
    { label: 'GST TCS ₹',         value: t.gstTcsCredit.toFixed(2) },
    { label: 'Open Claims ₹',     value: t.openClaimsAmount.toFixed(2) },
    { label: 'Recovered ₹',       value: t.recoveredAmount.toFixed(2) },
    { label: 'Packing Evidence',  value: t.evidenceCount },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-10 animate-fade-in space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" /> EcomX Cockpit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            DP-EC-10 · pure read across orders, recon, claims and returns. No recomputation.
          </p>
        </div>
        <div className="flex items-end gap-2 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">From</span>
            <input
              type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="px-2 py-1 rounded-md bg-background border border-border font-mono"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">To</span>
            <input
              type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="px-2 py-1 rounded-md bg-background border border-border font-mono"
            />
          </label>
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="glass-card rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">{tile.label}</div>
            <div className="text-xl font-mono mt-2 break-all">{tile.value}</div>
          </div>
        ))}
      </section>

      <section className="glass-card rounded-2xl p-4">
        <h2 className="text-sm font-semibold mb-3">Channel breakdown</h2>
        {cockpit.channels.length === 0 ? (
          <div className="text-xs text-muted-foreground p-6 text-center">No marketplaces configured.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2">Marketplace</th>
                  <th className="text-right">Orders</th>
                  <th className="text-right">Gross ₹</th>
                  <th className="text-right">Parked B2B</th>
                  <th className="text-right">Returned</th>
                  <th className="text-right">Return %</th>
                  <th className="text-right">Last Recon Δ ₹</th>
                  <th className="text-right">Open Claims ₹</th>
                  <th className="text-right">Recovered ₹</th>
                </tr>
              </thead>
              <tbody>
                {cockpit.channels.map((c) => (
                  <tr key={c.marketplaceId} className="border-b border-border/40">
                    <td className="py-2">{c.marketplaceName}</td>
                    <td className="text-right font-mono">{c.ordersBooked}</td>
                    <td className="text-right font-mono">{c.grossBooked.toFixed(2)}</td>
                    <td className="text-right font-mono">{c.parkedB2B}</td>
                    <td className="text-right font-mono">{c.returned}</td>
                    <td className="text-right font-mono">{c.returnsPct.toFixed(2)}</td>
                    <td className="text-right font-mono">
                      {c.lastReconVariance === null ? '—' : c.lastReconVariance.toFixed(2)}
                    </td>
                    <td className="text-right font-mono">{c.openClaimsAmount.toFixed(2)}</td>
                    <td className="text-right font-mono">{c.recoveredAmount.toFixed(2)}</td>
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
