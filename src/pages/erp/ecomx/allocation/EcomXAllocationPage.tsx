/**
 * @file   src/pages/erp/ecomx/allocation/EcomXAllocationPage.tsx
 * @sprint Sprint 154 · EcomX Money Suite · DP-EC-9 · channel allocation + stock-file export
 */
import { useMemo, useState, useCallback } from 'react';
import { Split, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listMarketplaces, listListings } from '@/lib/ecomx-engine';
import { listAllocations, upsertAllocation, buildStockExportRows } from '@/lib/ecomx-recon-engine';
import { Button } from '@/components/ui/button';
import { exportEcomxCsv } from '../lib/ecomx-csv';

export function EcomXAllocationPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [mpId, setMpId] = useState('');
  const [storeItemId, setStoreItemId] = useState('');
  const [allocatedQty, setAllocatedQty] = useState(0);
  const [bufferPct, setBufferPct] = useState(10);
  const [availableQty, setAvailableQty] = useState<number | ''>('');
  const [tick, setTick] = useState(0);

  const marketplaces = useMemo(() => entityCode ? listMarketplaces(entityCode) : [], [entityCode]);
  const listings = useMemo(
    () => entityCode && mpId ? listListings(entityCode, mpId) : [],
    [entityCode, mpId],
  );
  const rows = useMemo(
    () => entityCode && mpId ? listAllocations(entityCode, { marketplaceId: mpId }) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, mpId, tick],
  );

  const onSave = useCallback(() => {
    if (!entityCode || !mpId || !storeItemId) return;
    try {
      upsertAllocation(entityCode, {
        marketplaceId: mpId, storeItemId, variantId: null,
        allocatedQty, bufferPct,
        availableQtyEntered: availableQty === '' ? null : Number(availableQty),
      });
      toast.success('Allocation saved.');
      setTick(x => x + 1);
    } catch (e) { toast.error((e as Error).message); }
  }, [entityCode, mpId, storeItemId, allocatedQty, bufferPct, availableQty]);

  const onExport = useCallback(() => {
    if (!entityCode || !mpId) return;
    const stock = buildStockExportRows(entityCode, mpId);
    const header: Array<string | number> = ['SKU', 'Qty'];
    const body: Array<Array<string | number>> = stock.map(s => [s.marketplaceSku, s.qty]);
    exportEcomxCsv([header, ...body], 'stock-file');
  }, [entityCode, mpId]);

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select an entity.</div>;

  return (
    <div className="p-4 sm:p-6 md:p-10 animate-fade-in space-y-6">
      <header>
        <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2"><Split className="h-5 w-5" /> Channel Allocation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          DP-EC-9 · Σ allocated ≤ available · exported qty = floor(allocated × (1 − buffer/100)).
          Available is entered manually — Inventory Hub live link is a Phase-2 seam.
        </p>
      </header>

      <section className="glass-card rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Marketplace</label>
            <select className="w-full mt-1 px-2 py-2 rounded-md bg-background border border-border text-sm"
              value={mpId} onChange={(e) => { setMpId(e.target.value); setStoreItemId(''); }}>
              <option value="">Select…</option>
              {marketplaces.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Listing (storeItem)</label>
            <select className="w-full mt-1 px-2 py-2 rounded-md bg-background border border-border text-sm"
              value={storeItemId} onChange={(e) => setStoreItemId(e.target.value)}>
              <option value="">Select…</option>
              {listings.map(l => l.storeItemId
                ? <option key={l.id} value={l.storeItemId}>{l.marketplaceSku}</option> : null)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Allocated qty</label>
            <input type="number" min={0} className="w-full mt-1 px-2 py-2 rounded-md bg-background border border-border text-sm font-mono"
              value={allocatedQty} onChange={(e) => setAllocatedQty(Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Buffer %</label>
            <input type="number" min={0} max={100} className="w-full mt-1 px-2 py-2 rounded-md bg-background border border-border text-sm font-mono"
              value={bufferPct} onChange={(e) => setBufferPct(Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Available (manual)</label>
            <input type="number" min={0} className="w-full mt-1 px-2 py-2 rounded-md bg-background border border-border text-sm font-mono"
              value={availableQty} onChange={(e) => setAvailableQty(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={onSave} disabled={!mpId || !storeItemId}>Save allocation</Button>
          <Button variant="outline" onClick={onExport} disabled={!mpId || rows.length === 0}>
            <Download className="h-3 w-3 mr-1" />Export stock file
          </Button>
        </div>
      </section>

      {mpId && (
        <section className="glass-card rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-3">Allocations · {rows.length}</h2>
          {rows.length === 0 ? (
            <div className="text-xs text-muted-foreground p-6 text-center">No allocations yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2">SKU</th>
                    <th className="text-right">Allocated</th>
                    <th className="text-right">Buffer %</th>
                    <th className="text-right">Available</th>
                    <th className="text-right">Export Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const exportQty = Math.max(0, Math.floor(r.allocatedQty * (1 - r.bufferPct / 100)));
                    return (
                      <tr key={r.id} className="border-b border-border/40">
                        <td className="py-1 font-mono">{r.marketplaceSku}</td>
                        <td className="text-right font-mono">{r.allocatedQty}</td>
                        <td className="text-right font-mono">{r.bufferPct}</td>
                        <td className="text-right font-mono">{r.availableQtyEntered ?? '—'}</td>
                        <td className="text-right font-mono">{exportQty}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
