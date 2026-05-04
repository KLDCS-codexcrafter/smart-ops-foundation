/**
 * @file        StoreHubPage.tsx
 * @sprint      T-Phase-1.2.6f-d-2 · Block B · D-298 (Q1=A 3-panel · Q2=A live computation)
 * @purpose     Store Hub landing — Stock Check · Reorder Suggestions · Demand Forecast.
 *              Live read-only views over voucher inventory_lines (D-128 zero-touch).
 * @decisions   D-298 · D-128 (we READ vouchers · never WRITE) · D-194
 * @reuses      store-hub-engine (Block A) · useEntityCode · shadcn UI primitives
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  computeStockBalance,
  listReorderSuggestions,
  computeDemandForecast,
} from '@/lib/store-hub-engine';

type Tab = 'stock' | 'reorder' | 'forecast';

export default function StoreHubPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tab, setTab] = useState<Tab>('stock');

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Store Hub</h1>
        <p className="text-sm text-muted-foreground">
          Live stock view · reorder suggestions · 30/60/90-day demand forecast
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="stock">Stock Check</TabsTrigger>
          <TabsTrigger value="reorder">Reorder Suggestions</TabsTrigger>
          <TabsTrigger value="forecast">Demand Forecast</TabsTrigger>
        </TabsList>
        <TabsContent value="stock"><StockCheckPanel entityCode={entityCode} /></TabsContent>
        <TabsContent value="reorder"><ReorderSuggestionsPanel entityCode={entityCode} /></TabsContent>
        <TabsContent value="forecast"><DemandForecastPanel entityCode={entityCode} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Panel 1 · Stock Check
// ============================================================
function StockCheckPanel({ entityCode }: { entityCode: string }): JSX.Element {
  const [q, setQ] = useState('');
  const rows = useMemo(() => computeStockBalance(entityCode), [entityCode]);
  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const n = q.toLowerCase();
    return rows.filter((r) =>
      r.item_name.toLowerCase().includes(n) || r.godown_name.toLowerCase().includes(n),
    );
  }, [rows, q]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Stock Balance ({filtered.length})</CardTitle>
        <Input
          placeholder="Search item / godown"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Godown</TableHead>
              <TableHead className="text-right">In</TableHead>
              <TableHead className="text-right">Out</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead>Last Movement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">
                  No stock movements found.
                </TableCell>
              </TableRow>
            ) : filtered.map((r) => (
              <TableRow key={`${r.item_id}:${r.godown_id}`}>
                <TableCell className="text-xs">{r.item_name || r.item_id}</TableCell>
                <TableCell className="text-xs">{r.godown_name}</TableCell>
                <TableCell className="font-mono text-xs text-right">{r.qty_in}</TableCell>
                <TableCell className="font-mono text-xs text-right">{r.qty_out}</TableCell>
                <TableCell className={`font-mono text-xs text-right ${r.qty_balance < 0 ? 'text-destructive' : ''}`}>
                  {r.qty_balance}
                </TableCell>
                <TableCell className="text-xs">{r.uom}</TableCell>
                <TableCell className="font-mono text-xs">{r.last_movement_date ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Panel 2 · Reorder Suggestions
// ============================================================
function ReorderSuggestionsPanel({ entityCode }: { entityCode: string }): JSX.Element {
  const rows = useMemo(() => listReorderSuggestions(entityCode), [entityCode]);

  const urgencyBadge = (u: 'critical' | 'warning' | 'normal'): JSX.Element => {
    if (u === 'critical') return <Badge variant="destructive">Critical</Badge>;
    if (u === 'warning') return <Badge className="bg-warning text-warning-foreground">Warning</Badge>;
    return <Badge variant="outline">Normal</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reorder Suggestions ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Godown</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">Reorder Level</TableHead>
              <TableHead className="text-right">Shortfall</TableHead>
              <TableHead className="text-right">Suggested Qty</TableHead>
              <TableHead>Urgency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">
                  No items currently below reorder threshold.
                </TableCell>
              </TableRow>
            ) : rows.map((r) => (
              <TableRow key={`${r.item_id}:${r.godown_id}`}>
                <TableCell className="text-xs">{r.item_name || r.item_id}</TableCell>
                <TableCell className="text-xs">{r.godown_name}</TableCell>
                <TableCell className="font-mono text-xs text-right">{r.current_balance} {r.uom}</TableCell>
                <TableCell className="font-mono text-xs text-right">{r.reorder_level}</TableCell>
                <TableCell className="font-mono text-xs text-right text-destructive">{r.shortfall}</TableCell>
                <TableCell className="font-mono text-xs text-right">{r.reorder_qty}</TableCell>
                <TableCell>{urgencyBadge(r.urgency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Panel 3 · Demand Forecast
// ============================================================
function DemandForecastPanel({ entityCode }: { entityCode: string }): JSX.Element {
  const rows = useMemo(() => computeDemandForecast(entityCode), [entityCode]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Demand Forecast ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Godown</TableHead>
              <TableHead className="text-right">30d</TableHead>
              <TableHead className="text-right">60d</TableHead>
              <TableHead className="text-right">90d</TableHead>
              <TableHead className="text-right">Avg/Day</TableHead>
              <TableHead className="text-right">Days Cover</TableHead>
              <TableHead className="text-right">Forecast 30d</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-6">
                  No consumption history in the last 90 days.
                </TableCell>
              </TableRow>
            ) : rows.map((r) => (
              <TableRow key={`${r.item_id}:${r.godown_id}`}>
                <TableCell className="text-xs">{r.item_name || r.item_id}</TableCell>
                <TableCell className="text-xs">{r.godown_id}</TableCell>
                <TableCell className="font-mono text-xs text-right">{r.consumed_30d}</TableCell>
                <TableCell className="font-mono text-xs text-right">{r.consumed_60d}</TableCell>
                <TableCell className="font-mono text-xs text-right">{r.consumed_90d}</TableCell>
                <TableCell className="font-mono text-xs text-right">{r.avg_daily_consumption.toFixed(2)}</TableCell>
                <TableCell className={`font-mono text-xs text-right ${r.days_of_cover !== null && r.days_of_cover < 15 ? 'text-destructive' : ''}`}>
                  {r.days_of_cover ?? '—'}
                </TableCell>
                <TableCell className="font-mono text-xs text-right">{r.forecast_30d}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
