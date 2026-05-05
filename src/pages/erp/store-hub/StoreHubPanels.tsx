/**
 * StoreHubPanels.tsx — Card #7 Block D · D-379
 * Sprint T-Phase-1.2.6f-d-2-card7-7-pre-1
 *
 * Extracted existing 3 panels (StockCheckPanel · ReorderSuggestionsPanel · DemandForecastPanel)
 * from StoreHubPage to a sibling file so StoreHubPage can be upgraded to module-based Shell.
 * D-298 thin card preserved · functionality byte-identical to prior inline implementation.
 * store-hub-engine.ts NOT modified.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  computeStockBalance,
  listReorderSuggestions,
  computeDemandForecast,
  type ReorderSuggestion,
} from '@/lib/store-hub-engine';
import { promoteReorderToIndent } from '@/lib/reorder-indent-bridge';

export function StockCheckPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
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

export function ReorderSuggestionsPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [refreshTick, setRefreshTick] = useState(0);
  const rows = useMemo(
    () => { void refreshTick; return listReorderSuggestions(entityCode); },
    [entityCode, refreshTick],
  );
  const [selected, setSelected] = useState<ReorderSuggestion | null>(null);
  const [deptName, setDeptName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

export function DemandForecastPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
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
