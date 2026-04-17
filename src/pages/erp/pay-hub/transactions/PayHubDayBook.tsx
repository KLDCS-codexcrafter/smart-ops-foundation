/**
 * PayHubDayBook.tsx — Pay Hub activity log panel (ph-daybook)
 * Mirrors FineCore DayBook layout. Reads payroll runs via useDayBook(entityCode, 'people').
 */
import { useState, useMemo } from 'react';
import { BookOpen, Download, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDayBook } from '@/hooks/useDayBook';
import { onEnterNext } from '@/lib/keyboard';
import { inr, fmtDate, today, exportCSV } from '@/pages/erp/finecore/reports/reportUtils';

interface PayHubDayBookPanelProps {
  entityCode: string;
  onNavigate?: (m: string) => void;
}

const TYPE_FILTER = ['All', 'Payroll Run'];

function typeBadge(type: string) {
  if (type === 'Payroll Run') {
    return <Badge className="text-[10px] bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30">Payroll Run</Badge>;
  }
  return <Badge variant="outline" className="text-[10px]">{type}</Badge>;
}

function statusBadge(s: string) {
  if (s === 'posted' || s === 'locked') {
    return <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">{s}</Badge>;
  }
  if (s === 'approved') {
    return <Badge className="text-[10px] bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">approved</Badge>;
  }
  if (s === 'calculated') {
    return <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">calculated</Badge>;
  }
  return <Badge variant="outline" className="text-[10px]">{s || 'draft'}</Badge>;
}

export function PayHubDayBookPanel({ entityCode, onNavigate }: PayHubDayBookPanelProps) {
  const entries = useDayBook(entityCode, 'people');
  const t = today();
  const monthStart = t.slice(0, 8) + '01';
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(t);
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = entries.filter(e => e.date >= dateFrom && e.date <= dateTo);
    if (typeFilter !== 'All') result = result.filter(e => e.type === typeFilter);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(e =>
        e.reference.toLowerCase().includes(s) || e.party.toLowerCase().includes(s)
      );
    }
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, dateFrom, dateTo, typeFilter, search]);

  const totalRuns = filtered.length;
  const totalNet = filtered.reduce((s, e) => s + e.amount, 0);
  const employeeCount = filtered.reduce((s, e) => {
    const m = e.party.match(/^(\d+)/);
    return s + (m ? parseInt(m[1], 10) : 0);
  }, 0);

  const handleExport = () => {
    exportCSV('payhub-daybook.csv',
      ['Date', 'Time', 'Type', 'Reference', 'Party', 'Amount', 'Status'],
      filtered.map(e => [e.date, e.time, e.type, e.reference, e.party, String(e.amount), e.status])
    );
  };

  return (
    <div data-keyboard-form className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-violet-500" />
          <h2 className="text-lg font-bold">Pay Hub — Day Book</h2>
        </div>
        <Button data-primary variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      <Card><CardContent className="p-3 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">From</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" onKeyDown={onEnterNext} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">To</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" onKeyDown={onEnterNext} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Type</label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{TYPE_FILTER.map(t => <SelectItem key={t} value={t}><span className="text-xs">{t}</span></SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[160px]">
          <label className="text-[10px] text-muted-foreground">Search</label>
          <Input placeholder="Reference or party..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" onKeyDown={onEnterNext} />
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Entries', value: String(totalRuns) },
          { label: 'Employees Touched', value: String(employeeCount) },
          { label: 'Total Net Pay', value: inr(totalNet) },
        ].map(c => (
          <Card key={c.label}><CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">{c.label}</p>
            <p className="text-sm font-bold font-mono">{c.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No people activity in this period</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Time</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Reference</TableHead>
                <TableHead className="text-xs">Party</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(e => (
                <TableRow
                  key={e.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onNavigate?.(e.module)}
                >
                  <TableCell className="text-xs">{fmtDate(e.date)}</TableCell>
                  <TableCell className="text-xs font-mono">{e.time || '—'}</TableCell>
                  <TableCell>{typeBadge(e.type)}</TableCell>
                  <TableCell className="text-xs font-mono">{e.reference}</TableCell>
                  <TableCell className="text-xs">{e.party || '—'}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{inr(e.amount)}</TableCell>
                  <TableCell className="text-center">{statusBadge(e.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}
    </div>
  );
}
