/**
 * BinUtilizationReport.tsx — Sprint T-Phase-1.2.6
 * Reads BinLabel + stock balances, computes utilization, recommends actions.
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Boxes } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { BinLabel } from '@/types/bin-label';

interface BalanceRow {
  item_id: string; item_name: string;
  godown_id: string; godown_name: string;
  qty: number; updated_at: string;
}
interface ItemLite { id: string; bin_id?: string | null }

type Recommendation = 'Optimal' | 'Consolidate' | 'Reassign — overflow risk' | 'Reassign or Clear';

interface BinRow {
  bin: BinLabel;
  total_qty: number;
  itemCount: number;
  utilization: number;
  lastActivity: string | null;
  recommendation: Recommendation;
}

function computeRecommendation(util: number, lastActivityIso: string | null): Recommendation {
  const days = lastActivityIso
    ? (Date.now() - Date.parse(lastActivityIso)) / 86400000 : Number.POSITIVE_INFINITY;
  if (util === 0 && days > 90) return 'Reassign or Clear';
  if (util < 20 && days > 60) return 'Consolidate';
  if (util > 90) return 'Reassign — overflow risk';
  return 'Optimal';
}

export function BinUtilizationReportPanel() {
  const { entityCode } = useCardEntitlement();

  const data = useMemo(() => {
    const bins: BinLabel[] = JSON.parse(localStorage.getItem(`erp_bin_labels_${entityCode}`) || '[]');
    const balances: BalanceRow[] = JSON.parse(localStorage.getItem(`erp_stock_balance_${entityCode}`) || '[]');
    // erp_inventory_items has a bin_id assignment per item (one bin per item — soft mapping)
    const items: ItemLite[] = JSON.parse(localStorage.getItem('erp_inventory_items') || '[]');
    const itemBin = new Map(items.map(i => [i.id, i.bin_id ?? null]));

    const rows: BinRow[] = bins.map(b => {
      // Sum qty for balances whose item.bin_id matches this bin AND godown matches
      const here = balances.filter(bal =>
        bal.godown_id === b.godown_id && itemBin.get(bal.item_id) === b.id,
      );
      const total = here.reduce((s, x) => s + x.qty, 0);
      const last = here.reduce<string | null>((acc, x) => !acc || x.updated_at > acc ? x.updated_at : acc, null);
      const cap = b.capacity ?? null;
      const util = cap && cap > 0 ? (total / cap) * 100 : 0;
      return {
        bin: b,
        total_qty: total,
        itemCount: here.length,
        utilization: util,
        lastActivity: last,
        recommendation: computeRecommendation(util, last),
      };
    });

    const measured = rows.filter(r => r.bin.capacity != null && r.bin.capacity > 0);
    const unmeasured = rows.filter(r => !r.bin.capacity);
    return { measured, unmeasured };
  }, [entityCode]);

  const kpis = useMemo(() => {
    const m = data.measured;
    const total = m.length;
    const avg = total ? Math.round(m.reduce((s, r) => s + r.utilization, 0) / total) : 0;
    const over = m.filter(r => r.utilization > 100).length;
    const empty = m.filter(r => r.total_qty === 0).length;
    const dead = m.filter(r => r.lastActivity && (Date.now() - Date.parse(r.lastActivity)) / 86400000 > 90).length;
    return { total, avg, over, empty, dead };
  }, [data.measured]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Boxes className="h-5 w-5 text-cyan-600" /> Bin Utilization
        </h1>
        <p className="text-xs text-muted-foreground">Capacity vs current stock per bin</p>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Bins', val: kpis.total },
          { label: 'Avg Util', val: kpis.avg + '%' },
          { label: 'Over-Cap', val: kpis.over },
          { label: 'Empty', val: kpis.empty },
          { label: 'Dead 90d+', val: kpis.dead },
        ].map(k => (
          <Card key={k.label}><CardContent className="p-3">
            <div className="text-[10px] uppercase text-muted-foreground">{k.label}</div>
            <div className="text-lg font-semibold font-mono">{k.val}</div>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="measured">
        <TabsList>
          <TabsTrigger value="measured">Measured ({data.measured.length})</TabsTrigger>
          <TabsTrigger value="unmeasured">Unmeasured Bins ({data.unmeasured.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="measured">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Bin</TableHead><TableHead>Godown</TableHead>
                <TableHead className="text-right">Capacity</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total Qty</TableHead>
                <TableHead className="text-right">Util %</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Recommendation</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.measured.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-6 text-xs text-muted-foreground">No measured bins · set capacity on Bin Labels</TableCell></TableRow>
                )}
                {data.measured.map(r => (
                  <TableRow key={r.bin.id}>
                    <TableCell className="font-mono text-xs">{r.bin.location_code}</TableCell>
                    <TableCell className="text-xs">{r.bin.godown_name}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.bin.capacity} {r.bin.capacity_unit}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.itemCount}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.total_qty.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.utilization.toFixed(0)}%</TableCell>
                    <TableCell className="text-xs">{r.lastActivity ? r.lastActivity.slice(0, 10) : '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        r.recommendation === 'Optimal' ? 'bg-emerald-500/10 text-emerald-700' :
                        r.recommendation === 'Consolidate' ? 'bg-amber-500/10 text-amber-700' :
                        'bg-red-500/10 text-red-700'
                      }>{r.recommendation}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="unmeasured">
          <Card><CardContent className="p-3 text-xs text-muted-foreground">
            {data.unmeasured.length === 0
              ? 'All bins have capacity defined.'
              : `${data.unmeasured.length} bins have no capacity set. Edit Bin Labels and set capacity + unit to include them in utilization.`}
            <ul className="list-disc pl-5 mt-2">
              {data.unmeasured.slice(0, 50).map(r => <li key={r.bin.id}>{r.bin.location_code} — {r.bin.godown_name}</li>)}
            </ul>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
