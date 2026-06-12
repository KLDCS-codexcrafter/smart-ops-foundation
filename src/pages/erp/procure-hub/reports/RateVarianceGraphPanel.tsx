/**
 * @file        RateVarianceGraphPanel.tsx
 * @purpose     Time-series rate trend · framework ReportChart with contract reference annotation.
 * @sprint      T-Phase-1.A.3.d-Procure360-Variance-Trident-Polish · RPT-12c chart-layer swap
 * @decisions   D-NEW-AR
 * @reuses      useItemRates · rate-contract-engine.findActiveRate (3-arg) · po-management-engine
 */
import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck } from 'lucide-react';
import { ReportChart } from '@/components/operix-core/report-framework';
import { defaultChartConfig, signReport } from '@/lib/report-framework';
import { useItemRates } from '@/hooks/useItemRates';
import { findActiveRate } from '@/lib/rate-contract-engine';
import { listPurchaseOrders } from '@/lib/po-management-engine';
import type { ItemRateHistory } from '@/types/item-rate-history';
import { round2 } from '@/lib/decimal-helpers';

const fmtDate = (iso: string): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

export function RateVarianceGraphPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { history } = useItemRates();

  const stdPurchase = useMemo<ItemRateHistory[]>(
    () => history.filter((h) => h.rate_type === 'std_purchase'),
    [history],
  );

  const itemOptions = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; latest: string }>();
    for (const h of stdPurchase) {
      const cur = seen.get(h.item_id);
      if (!cur || h.effective_from > cur.latest) {
        seen.set(h.item_id, { id: h.item_id, name: h.item_name, latest: h.effective_from });
      }
    }
    return Array.from(seen.values())
      .sort((a, b) => b.latest.localeCompare(a.latest))
      .slice(0, 50);
  }, [stdPurchase]);

  const [selectedItemId, setSelectedItemId] = useState<string>(itemOptions[0]?.id ?? '');

  const seriesData = useMemo(() => {
    if (!selectedItemId) return [];
    return stdPurchase
      .filter((h) => h.item_id === selectedItemId)
      .sort((a, b) => a.effective_from.localeCompare(b.effective_from))
      .map((h) => ({
        date: h.effective_from,
        dateLabel: fmtDate(h.effective_from),
        rate: h.new_rate,
        reason: h.change_reason,
        category: h.change_reason_category,
      }));
  }, [stdPurchase, selectedItemId]);

  const contractRate = useMemo<number | null>(() => {
    if (!selectedItemId || !entityCode) return null;
    const pos = listPurchaseOrders(entityCode);
    let latestVendor: string | null = null;
    let latestPoTime = 0;
    for (const po of pos) {
      const has = po.lines.some((l) => l.item_id === selectedItemId);
      if (!has) continue;
      const t = new Date(po.created_at).getTime();
      if (t > latestPoTime) {
        latestPoTime = t;
        latestVendor = po.vendor_id;
      }
    }
    if (!latestVendor) return null;
    const match = findActiveRate(entityCode, latestVendor, selectedItemId);
    return match && match.line.agreed_rate > 0 ? match.line.agreed_rate : null;
  }, [entityCode, selectedItemId]);

  const kpis = useMemo(() => {
    const itemsTracked = itemOptions.length;
    const recent90d = stdPurchase.filter((h) => Date.now() - new Date(h.effective_from).getTime() < 90 * 86_400_000);
    const avgPctChange = recent90d.length > 0
      ? round2(recent90d.reduce((s, h) => s + (h.old_rate ? Math.abs(((h.new_rate - h.old_rate) / h.old_rate) * 100) : 0), 0) / recent90d.length)
      : 0;
    return { itemsTracked, recentChanges: recent90d.length, avgPctChange };
  }, [itemOptions, stdPurchase]);

  const hash = useMemo(() => signReport(seriesData), [seriesData]);
  const short = hash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Rate Variance Graph</h1>
          <p className="text-sm text-muted-foreground">Item rate trend over time · with contract reference overlay.</p>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono" data-testid="pr-rate-variance-integrity-badge" title={hash}>
          <ShieldCheck className="h-3 w-3 mr-1" />{short}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Items Tracked</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.itemsTracked}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Recent Changes (90d)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.recentChanges}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg % Change (90d)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.avgPctChange}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Item</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedItemId} onValueChange={setSelectedItemId}>
            <SelectTrigger><SelectValue placeholder="Pick an item with rate history" /></SelectTrigger>
            <SelectContent>
              {itemOptions.map((it) => (
                <SelectItem key={it.id} value={it.id}>
                  {it.name} · last change {fmtDate(it.latest)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card data-testid="pr-rate-variance-chart-host">
        <CardContent className="p-4">
          {seriesData.length < 2 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {itemOptions.length === 0 ? 'No rate history yet.' : 'Pick an item with at least 2 rate changes to view trend.'}
            </div>
          ) : (
            <>
              {contractRate !== null && (
                <p className="text-xs text-muted-foreground mb-2">
                  Active contract reference: ₹{contractRate.toLocaleString('en-IN')}
                </p>
              )}
              <div style={{ width: '100%', height: 320 }}>
                <ReportChart
                  data={seriesData}
                  config={defaultChartConfig({
                    chartType: 'line', xKey: 'dateLabel',
                    series: [{ key: 'rate', label: 'Rate ₹' }],
                  })}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
