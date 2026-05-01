/**
 * ItemMovementHistoryReport.tsx — standalone Movement History report.
 * Sprint T-Phase-1.2.6 · D-216 echo: derived on demand from source vouchers.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Download } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { getItemMovementHistory, type MovementType } from '@/lib/item-movement-engine';
import type { InventoryItem } from '@/types/inventory-item';

const TYPE_LABELS: Record<MovementType, string> = {
  grn_inward: 'GRN',
  min_outward: 'MIN',
  consumption: 'Consumption',
  cycle_count_adjustment: 'Cycle Count',
  stock_transfer: 'Transfer',
  rtv: 'RTV',
  sample_outward: 'Sample',
  demo_outward: 'Demo',
};

const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export function ItemMovementHistoryReportPanel() {
  const { entityCode } = useCardEntitlement();

  const items = useMemo<InventoryItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('erp_inventory_items') || '[]'); } catch { return []; }
  }, []);
  const today = new Date().toISOString().slice(0, 10);
  const ninetyAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const [itemId, setItemId] = useState<string>(items[0]?.id ?? '');
  const [from, setFrom] = useState(ninetyAgo);
  const [to, setTo] = useState(today);

  const history = useMemo(
    () => itemId ? getItemMovementHistory(itemId, entityCode, from, to) : null,
    [itemId, entityCode, from, to],
  );

  function exportCsv() {
    if (!history) return;
    const rows = [
      ['Date', 'Type', 'Voucher', 'Qty', 'Rate', 'Value', 'From', 'To', 'Party', 'Narration'].join(','),
      ...history.events.map(e => [
        e.event_date.slice(0, 10), TYPE_LABELS[e.event_type], e.source_voucher_no,
        e.qty_change, e.rate, e.value_change,
        e.from_godown_name ?? '', e.to_godown_name ?? '', e.party_name ?? '',
        (e.narration ?? '').replace(/,/g, ';'),
      ].join(',')),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `movement_${history.item_name}_${from}_${to}.csv`;
    a.click();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-600" /> Item Movement History
          </h1>
          <p className="text-xs text-muted-foreground">Unified timeline · derived from GRN/MIN/CE/Cycle Count/RTV/Sample/Demo</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1">
          <Download className="h-4 w-4" /> CSV
        </Button>
      </div>

      <Card><CardContent className="p-3 grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Item</Label>
          <Select value={itemId} onValueChange={setItemId}>
            <SelectTrigger><SelectValue placeholder="Pick item" /></SelectTrigger>
            <SelectContent>
              {items.slice(0, 200).map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </CardContent></Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">
          {history?.item_name || 'Pick an item'} · Net Δ: {history ? fmt(history.closing_balance) : 0}
        </CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Type</TableHead>
              <TableHead>Voucher</TableHead>
              <TableHead className="text-right">Qty Δ</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Value Δ</TableHead>
              <TableHead>From → To</TableHead>
              <TableHead>Party</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(!history || history.events.length === 0) && (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-xs text-muted-foreground">No movements in this window</TableCell></TableRow>
              )}
              {history?.events.map(e => (
                <TableRow key={e.event_id}>
                  <TableCell className="text-xs">{e.event_date.slice(0, 10)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{TYPE_LABELS[e.event_type]}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{e.source_voucher_no}</TableCell>
                  <TableCell className={`text-right font-mono text-xs ${e.qty_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {e.qty_change >= 0 ? '+' : ''}{fmt(e.qty_change)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(e.rate)}</TableCell>
                  <TableCell className={`text-right font-mono text-xs ${e.value_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ₹{fmt(e.value_change)}
                  </TableCell>
                  <TableCell className="text-xs">{e.from_godown_name ?? '—'} → {e.to_godown_name ?? '—'}</TableCell>
                  <TableCell className="text-xs">{e.party_name ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
