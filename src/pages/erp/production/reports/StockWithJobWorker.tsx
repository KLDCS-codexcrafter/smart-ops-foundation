/**
 * @file        StockWithJobWorker.tsx
 * @sprint      T-Phase-1.A.2.c-Job-Work-Tally-Parity
 * @decisions   D-NEW-X
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Package } from 'lucide-react';
import { useJobWorkOutOrders } from '@/hooks/useJobWorkOutOrders';
import { useEntityCode } from '@/hooks/useEntityCode';
import { round2 } from '@/lib/decimal-helpers';

interface StockRow {
  vendor_id: string;
  vendor_name: string;
  jwo_doc_no: string;
  jwo_date: string;
  item_code: string;
  item_name: string;
  sent_qty: number;
  received_qty: number;
  pending_qty: number;
  jw_rate: number;
  pending_value: number;
  age_days: number;
  expected_return_date: string;
  is_overdue: boolean;
  ageing_bucket: '0-30' | '31-60' | '61-90' | '90+';
}

export function StockWithJobWorkerPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { jwos } = useJobWorkOutOrders(entityCode);
  const [vendorFilter, setVendorFilter] = useState('__all__');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const stockRows = useMemo<StockRow[]>(() => {
    const today = Date.now();
    const rows: StockRow[] = [];
    for (const j of jwos) {
      if (j.status !== 'sent' && j.status !== 'partially_received') continue;
      for (const l of j.lines) {
        const pending = l.sent_qty - l.received_qty;
        if (pending <= 0) continue;
        const ageDays = Math.floor((today - new Date(j.jwo_date).getTime()) / 86400000);
        const isOverdue = new Date(j.expected_return_date).getTime() < today;
        const bucket: StockRow['ageing_bucket'] =
          ageDays <= 30 ? '0-30' : ageDays <= 60 ? '31-60' : ageDays <= 90 ? '61-90' : '90+';
        rows.push({
          vendor_id: j.vendor_id, vendor_name: j.vendor_name,
          jwo_doc_no: j.doc_no, jwo_date: j.jwo_date,
          item_code: l.item_code, item_name: l.item_name,
          sent_qty: l.sent_qty, received_qty: l.received_qty, pending_qty: pending,
          jw_rate: l.job_work_rate, pending_value: round2(pending * l.job_work_rate),
          age_days: ageDays, expected_return_date: j.expected_return_date,
          is_overdue: isOverdue, ageing_bucket: bucket,
        });
      }
    }
    return rows;
  }, [jwos]);

  const vendors = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of stockRows) map.set(r.vendor_id, r.vendor_name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [stockRows]);

  const filtered = useMemo(() => stockRows.filter(r => {
    if (vendorFilter !== '__all__' && r.vendor_id !== vendorFilter) return false;
    if (overdueOnly && !r.is_overdue) return false;
    return true;
  }), [stockRows, vendorFilter, overdueOnly]);

  const totalValue = useMemo(() => round2(filtered.reduce((s, r) => s + r.pending_value, 0)), [filtered]);

  const ageingBadge = (b: StockRow['ageing_bucket']) => {
    const variant: 'default' | 'secondary' | 'destructive' = b === '0-30' ? 'default' : b === '31-60' ? 'secondary' : 'destructive';
    return <Badge variant={variant}>{b}d</Badge>;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Stock With Job Worker</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Open Lines</div><div className="text-2xl font-mono">{filtered.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pending Value</div><div className="text-2xl font-mono">₹{totalValue.toLocaleString('en-IN')}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Overdue Lines</div><div className="text-2xl font-mono text-destructive">{filtered.filter(r => r.is_overdue).length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div><Label>Vendor</Label>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All vendors</SelectItem>
                {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2"><Switch checked={overdueOnly} onCheckedChange={setOverdueOnly} /><Label>Overdue only</Label></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Vendor</TableHead><TableHead>JWO</TableHead><TableHead>Item</TableHead>
              <TableHead className="text-right">Sent</TableHead><TableHead className="text-right">Recvd</TableHead>
              <TableHead className="text-right">Pending</TableHead><TableHead className="text-right">Value (₹)</TableHead>
              <TableHead>Age</TableHead><TableHead>Bucket</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No pending stock</TableCell></TableRow>
              ) : filtered.map((r, i) => (
                <TableRow key={`${r.jwo_doc_no}-${r.item_code}-${i}`}>
                  <TableCell>{r.vendor_name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.jwo_doc_no}</TableCell>
                  <TableCell>{r.item_name}</TableCell>
                  <TableCell className="text-right font-mono">{r.sent_qty}</TableCell>
                  <TableCell className="text-right font-mono">{r.received_qty}</TableCell>
                  <TableCell className="text-right font-mono text-amber-600">{r.pending_qty}</TableCell>
                  <TableCell className="text-right font-mono">₹{r.pending_value.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="font-mono">{r.age_days}d</TableCell>
                  <TableCell>{ageingBadge(r.ageing_bucket)}</TableCell>
                  <TableCell>{r.is_overdue ? <Badge variant="destructive">Overdue</Badge> : <Badge variant="default">OK</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default StockWithJobWorkerPanel;
