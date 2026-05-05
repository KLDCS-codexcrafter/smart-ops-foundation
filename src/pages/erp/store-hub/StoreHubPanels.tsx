/**
 * StoreHubPanels.tsx — Card #7 Block D · D-379
 * Sprint T-Phase-1.2.6f-d-2-card7-7-pre-1
 *
 * Extracted existing 3 panels (StockCheckPanel · ReorderSuggestionsPanel · DemandForecastPanel)
 * from StoreHubPage to a sibling file so StoreHubPage can be upgraded to module-based Shell.
 * D-298 thin card preserved · functionality byte-identical to prior inline implementation.
 * store-hub-engine.ts NOT modified.
 */
import { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
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

function SkeletonRows(): JSX.Element {
  return (
    <div className="space-y-2 p-4">
      {[1, 2, 3].map(i => <Skeleton key={`sk-${i}`} className="h-9 w-full" />)}
    </div>
  );
}

export function StockCheckPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 100); return () => clearTimeout(t); }, []);
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

  const handlePromote = (): void => {
    if (!selected || !deptName) { toast.error('Department required'); return; }
    setSubmitting(true);
    const r = promoteReorderToIndent({
      suggestion: selected,
      department_id: deptName.toLowerCase().replace(/\s+/g, '-'),
      department_name: deptName,
      notes,
      created_by: 'stores-mgr',
    }, entityCode);
    setSubmitting(false);
    if (r.ok) {
      toast.success(`Material Indent ${r.voucher_no} created · routing to approval`);
      setSelected(null); setDeptName(''); setNotes('');
      setRefreshTick(t => t + 1);
    } else {
      toast.error(`Promote failed: ${r.reason}`);
    }
  };

  return (
    <>
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
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-6">
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
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
                      <Send className="h-3 w-3 mr-1" />Promote to Indent
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote {selected?.item_name} to Material Indent</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-muted/50 rounded space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Item:</span><span className="font-medium">{selected.item_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Godown:</span><span>{selected.godown_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Current:</span><span>{selected.current_balance} {selected.uom}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Reorder Level:</span><span>{selected.reorder_level} {selected.uom}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shortfall:</span><span className="text-amber-600 font-medium">{selected.shortfall} {selected.uom}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Suggested Qty:</span><span className="font-bold">{selected.reorder_qty} {selected.uom}</span></div>
              </div>
              <div>
                <Label>Department</Label>
                <Input value={deptName} onChange={e => setDeptName(e.target.value)} placeholder="Production / QC / Maintenance" />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for promotion" />
              </div>
              <div className="text-xs text-muted-foreground">
                Indent will be created in submitted state · Card #3 Indent Approval Inbox takes over routing.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={handlePromote} disabled={submitting}>
              <Send className="h-4 w-4 mr-1" />Promote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
