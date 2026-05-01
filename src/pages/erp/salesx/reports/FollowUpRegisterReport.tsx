/**
 * MONEY-MATH-AUDITED · Sprint T-Phase-1.2.5h-c1
 * No money math in this file — only follow-up counts and day-overdue calculations.
 * Marker added for audit trail consistency.
 */
/**
 * FollowUpRegisterReport.tsx — Overdue follow-ups register (Sprint 4)
 * Read-only. Reads from useEnquiries.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import { useEnquiries } from '@/hooks/useEnquiries';
import { cn } from '@/lib/utils';

interface Props {
  entityCode: string;
  onNavigate?: (m: string) => void;
}

const todayISO = () => new Date().toISOString().split('T')[0];

export function FollowUpRegisterReportPanel({ entityCode, onNavigate }: Props) {
  const { enquiries } = useEnquiries(entityCode);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<'today' | 'week' | 'all'>('all');

  const today = todayISO();

  const rows = useMemo(() => {
    return enquiries
      .filter(e => ['new', 'assigned', 'pending', 'in_process'].includes(e.status))
      .map(e => {
        const lastFU = e.follow_ups[e.follow_ups.length - 1];
        const lastDate = lastFU?.follow_up_date ?? e.enquiry_date;
        const daysOverdue = Math.floor(
          (new Date(today).getTime() - new Date(lastDate).getTime()) / 86400000,
        );
        return { enquiry: e, lastDate, daysOverdue };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [enquiries, today]);

  const filtered = useMemo(() => {
    let list = rows;
    if (period === 'today') list = list.filter(r => r.daysOverdue === 0);
    else if (period === 'week') list = list.filter(r => r.daysOverdue >= 0 && r.daysOverdue <= 7);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.enquiry.enquiry_no.toLowerCase().includes(q) ||
        (r.enquiry.customer_name ?? '').toLowerCase().includes(q) ||
        (r.enquiry.contact_person ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, period, search]);

  const summary = useMemo(() => {
    const overdue = rows.filter(r => r.daysOverdue > 0).length;
    const dueToday = rows.filter(r => r.daysOverdue === 0).length;
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartISO = weekStart.toISOString().split('T')[0];
    const completed = enquiries.reduce((s, e) => s + e.follow_ups.filter(f =>
      f.follow_up_date && f.follow_up_date >= weekStartISO &&
      ['agreed', 'sold', 'quote'].includes(f.status),
    ).length, 0);
    const avgDaysOverdue = overdue > 0
      ? Math.round(rows.filter(r => r.daysOverdue > 0).reduce((s, r) => s + r.daysOverdue, 0) / overdue)
      : 0;
    return { overdue, dueToday, completed, avgDaysOverdue };
  }, [rows, enquiries, today]);

  const renderBadge = (n: number) => {
    if (n < 0) return <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30">Due in {Math.abs(n)} days</Badge>;
    if (n === 0) return <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-700 border-amber-500/30">Due today</Badge>;
    return <Badge variant="outline" className="text-[10px] bg-destructive/15 text-destructive border-destructive/30">{n} days overdue</Badge>;
  };

  return (
    <div className="space-y-4" data-keyboard-form>
      <div>
        <h1 className="text-2xl font-bold">Follow-Up Register</h1>
        <p className="text-sm text-muted-foreground">Overdue, due-today and upcoming follow-ups</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><p className="text-[10px] text-muted-foreground uppercase">Total Overdue</p><p className="text-2xl font-bold font-mono mt-1 text-destructive">{summary.overdue}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-[10px] text-muted-foreground uppercase">Due Today</p><p className="text-2xl font-bold font-mono mt-1 text-amber-700">{summary.dueToday}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-[10px] text-muted-foreground uppercase">Completed (Week)</p><p className="text-2xl font-bold font-mono mt-1 text-success">{summary.completed}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-[10px] text-muted-foreground uppercase">Avg Days Overdue</p><p className="text-2xl font-bold font-mono mt-1">{summary.avgDaysOverdue}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={onEnterNext}
                placeholder="Search enquiry / customer / contact"
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              {(['all', 'today', 'week'] as const).map(p => (
                <Button
                  key={p} size="sm"
                  variant={period === p ? 'default' : 'outline'}
                  onClick={() => setPeriod(p)}
                  className={cn('h-7 text-xs capitalize', period === p && 'bg-orange-500 hover:bg-orange-600')}
                >
                  {p === 'all' ? 'All' : p === 'today' ? 'Today' : 'This Week'}
                </Button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground text-sm">No follow-ups match the filter.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Enquiry No</TableHead>
                  <TableHead className="text-xs">Company / Contact</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Scheduled</TableHead>
                  <TableHead className="text-xs">Overdue</TableHead>
                  <TableHead className="text-xs">Telecaller</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.enquiry.id}>
                    <TableCell className="text-xs font-mono">{r.enquiry.enquiry_no}</TableCell>
                    <TableCell className="text-xs">{r.enquiry.customer_name ?? r.enquiry.contact_person ?? '—'}</TableCell>
                    <TableCell className="text-xs capitalize">{r.enquiry.enquiry_type}</TableCell>
                    <TableCell className="text-xs">{r.lastDate}</TableCell>
                    <TableCell>{renderBadge(r.daysOverdue)}</TableCell>
                    <TableCell className="text-xs">{r.enquiry.assigned_executive_name ?? '—'}</TableCell>
                    <TableCell className="text-xs capitalize">{r.enquiry.status.replace(/_/g, ' ')}</TableCell>
                    <TableCell>
                      {onNavigate && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px]"
                          onClick={() => onNavigate('sx-t-telecaller')}>
                          Open in Telecaller
                        </Button>
                      )}
                    </TableCell>
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

export default function FollowUpRegisterReport(props: Props) { return <FollowUpRegisterReportPanel {...props} />; }
