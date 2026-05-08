/**
 * @file        JobWorkOutRegister.tsx
 * @sprint      T-Phase-1.A.2.c-Job-Work-Tally-Parity
 * @decisions   D-NEW-X
 * @[JWT]       GET /api/job-work-out?dateFrom&dateTo&vendorId&status
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Package, AlertCircle } from 'lucide-react';
import { useJobWorkOutOrders } from '@/hooks/useJobWorkOutOrders';
import { useEntityCode } from '@/hooks/useEntityCode';
import { round2 } from '@/lib/decimal-helpers';
import type { JobWorkOutOrderStatus } from '@/types/job-work-out-order';

const STATUS_BADGES: Record<JobWorkOutOrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft:               { label: 'Draft',     variant: 'outline' },
  sent:                { label: 'Sent',      variant: 'default' },
  partially_received:  { label: 'Partial',   variant: 'secondary' },
  received:            { label: 'Received',  variant: 'default' },
  pre_closed:          { label: 'Pre-Closed',variant: 'outline' },
  cancelled:           { label: 'Cancelled', variant: 'destructive' },
};

export function JobWorkOutRegisterPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { jwos } = useJobWorkOutOrders(entityCode);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [vendorFilter, setVendorFilter] = useState('__all__');
  const [statusFilter, setStatusFilter] = useState<JobWorkOutOrderStatus | '__all__'>('__all__');

  const vendors = useMemo(() => {
    const map = new Map<string, string>();
    for (const j of jwos) map.set(j.vendor_id, j.vendor_name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [jwos]);

  const filtered = useMemo(() => {
    return jwos.filter(j => {
      if (dateFrom && j.jwo_date < dateFrom) return false;
      if (dateTo && j.jwo_date > dateTo) return false;
      if (vendorFilter !== '__all__' && j.vendor_id !== vendorFilter) return false;
      if (statusFilter !== '__all__' && j.status !== statusFilter) return false;
      return true;
    });
  }, [jwos, dateFrom, dateTo, vendorFilter, statusFilter]);

  const kpi = useMemo(() => {
    let totalValue = 0;
    let totalSent = 0;
    let totalReceived = 0;
    for (const j of filtered) {
      totalValue = round2(totalValue + j.total_jw_value);
      totalSent += j.total_sent_qty;
      totalReceived += j.total_received_qty;
    }
    return {
      count: filtered.length,
      totalValue,
      totalSent,
      totalReceived,
      pending: round2(totalSent - totalReceived),
    };
  }, [filtered]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Job Work Out Register</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">JWOs</div><div className="text-2xl font-mono">{kpi.count}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Value</div><div className="text-2xl font-mono">₹{kpi.totalValue.toLocaleString('en-IN')}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Sent Qty</div><div className="text-2xl font-mono">{kpi.totalSent.toLocaleString('en-IN')}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Received Qty</div><div className="text-2xl font-mono">{kpi.totalReceived.toLocaleString('en-IN')}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pending Qty</div><div className="text-2xl font-mono text-amber-600">{kpi.pending.toLocaleString('en-IN')}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div><Label>From</Label><Input type="date" className="font-mono" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" className="font-mono" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
          <div><Label>Vendor</Label>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All vendors</SelectItem>
                {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All statuses</SelectItem>
                {(Object.keys(STATUS_BADGES) as JobWorkOutOrderStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_BADGES[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Doc No</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Sent Qty</TableHead>
                <TableHead className="text-right">Recvd Qty</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">JW Value (₹)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Process</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  <AlertCircle className="h-4 w-4 inline mr-2" /> No JWOs match the filters
                </TableCell></TableRow>
              ) : filtered.map(j => {
                const pending = j.total_sent_qty - j.total_received_qty;
                const badge = STATUS_BADGES[j.status];
                return (
                  <TableRow key={j.id}>
                    <TableCell className="font-mono">{j.jwo_date}</TableCell>
                    <TableCell className="font-mono">{j.doc_no}</TableCell>
                    <TableCell>{j.vendor_name}</TableCell>
                    <TableCell className="text-right font-mono">{j.total_sent_qty.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right font-mono">{j.total_received_qty.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right font-mono text-amber-600">{pending.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right font-mono">₹{j.total_jw_value.toLocaleString('en-IN')}</TableCell>
                    <TableCell><Badge variant={badge.variant}>{badge.label}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{j.nature_of_processing ?? '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default JobWorkOutRegisterPanel;
