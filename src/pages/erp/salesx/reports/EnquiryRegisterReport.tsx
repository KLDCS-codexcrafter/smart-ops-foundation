/**
 * EnquiryRegisterReport.tsx — read-only listing of enquiries
 * Sprint 3 SalesX.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Search, Download } from 'lucide-react';
import { useEnquiries } from '@/hooks/useEnquiries';
import type { EnquiryStatus } from '@/types/enquiry';
import { onEnterNext } from '@/lib/keyboard';
import { cn } from '@/lib/utils';

interface Props { entityCode: string }

const STATUS_LABEL: Record<EnquiryStatus, string> = {
  new: 'New', assigned: 'Assigned', pending: 'Pending', in_process: 'In Process',
  demo: 'Demo', on_hold: 'On Hold', forwarded: 'Forwarded', quote: 'Quote',
  agreed: 'Agreed', sold: 'Sold', lost: 'Lost',
};
const STATUS_COLOR: Record<EnquiryStatus, string> = {
  new: 'bg-muted text-muted-foreground border-border',
  assigned: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  pending: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  in_process: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  demo: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  on_hold: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  forwarded: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  quote: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  agreed: 'bg-green-500/15 text-green-700 border-green-500/30',
  sold: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  lost: 'bg-destructive/15 text-destructive border-destructive/30',
};

export function EnquiryRegisterReportPanel({ entityCode }: Props) {
  const { enquiries } = useEnquiries(entityCode);

  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EnquiryStatus>('all');

  const filtered = useMemo(() => {
    let list = enquiries;
    if (from) list = list.filter(e => e.enquiry_date >= from);
    if (to) list = list.filter(e => e.enquiry_date <= to);
    if (statusFilter !== 'all') list = list.filter(e => e.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.enquiry_no.toLowerCase().includes(q) ||
        (e.customer_name ?? '').toLowerCase().includes(q) ||
        (e.contact_person ?? '').toLowerCase().includes(q),
      );
    }
    return list.slice().sort((a, b) => b.enquiry_date.localeCompare(a.enquiry_date));
  }, [enquiries, from, to, statusFilter, search]);

  const summary = useMemo(() => {
    const acc: Record<string, number> = { total: filtered.length };
    filtered.forEach(e => { acc[e.status] = (acc[e.status] ?? 0) + 1; });
    return acc;
  }, [filtered]);

  const exportCSV = () => {
    const headers = ['Enquiry No', 'Date', 'Type', 'Customer/Contact', 'Status', 'Priority', 'Assigned'];
    const rows = filtered.map(e => [
      e.enquiry_no, e.enquiry_date, e.enquiry_type,
      e.customer_name ?? e.contact_person ?? '',
      STATUS_LABEL[e.status], e.priority, e.assigned_executive_name ?? '',
    ]);
    const csv = [headers, ...rows].map(r =>
      r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `enquiry-register-${entityCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Enquiry Register Report</h1>
          <p className="text-sm text-muted-foreground">All enquiries with filters &amp; CSV export</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['total', 'new', 'pending', 'quote', 'lost'] as const).map(k => (
          <Card key={k}>
            <CardContent className="pt-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k}</p>
              <p className="text-2xl font-bold font-mono mt-1">{summary[k] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={onEnterNext}
                placeholder="Search enquiry no / customer / contact"
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">From</span>
              <div className="w-36"><SmartDateInput value={from} onChange={setFrom} /></div>
              <span className="text-xs text-muted-foreground">To</span>
              <div className="w-36"><SmartDateInput value={to} onChange={setTo} /></div>
            </div>
            <div className="flex gap-1 flex-wrap">
              {(['all', 'new', 'pending', 'quote', 'agreed', 'lost'] as const).map(s => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'h-7 text-xs capitalize',
                    statusFilter === s && 'bg-orange-500 hover:bg-orange-600',
                  )}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No enquiries match the current filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Enquiry No</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Customer / Contact</TableHead>
                  <TableHead className="text-xs">Priority</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Assigned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs font-mono">{e.enquiry_no}</TableCell>
                    <TableCell className="text-xs">{e.enquiry_date}</TableCell>
                    <TableCell className="text-xs capitalize">{e.enquiry_type}</TableCell>
                    <TableCell className="text-xs">
                      {e.customer_name ?? e.contact_person ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs capitalize">{e.priority}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px]', STATUS_COLOR[e.status])}>
                        {STATUS_LABEL[e.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{e.assigned_executive_name ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function EnquiryRegisterReport(props: Props) {
  return <EnquiryRegisterReportPanel {...props} />;
}
